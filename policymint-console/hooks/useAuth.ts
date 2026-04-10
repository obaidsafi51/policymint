'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useChainId, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { SIWE_CHAIN_ID } from '@/lib/auth/constants';

interface SessionResponse {
  success: boolean;
  operator_wallet: string;
  agent_ids: string[];
  expires_at: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const wrongNetwork = useMemo(
    () => isConnected && chainId !== SIWE_CHAIN_ID,
    [chainId, isConnected],
  );

  const refreshSession = useCallback(async () => {
    if (!isConnected || !connectedAddress) {
      setAuthenticated(false);
      setAddress(null);
      setAgentIds([]);
      setExpiresAt(null);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/proxy/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        setAuthenticated(false);
        setAddress(null);
        setAgentIds([]);
        setExpiresAt(null);
        return;
      }

      const data = (await response.json()) as SessionResponse;
      const sessionAddress = data.operator_wallet ? data.operator_wallet.toLowerCase() : null;

      if (sessionAddress && sessionAddress === connectedAddress.toLowerCase()) {
        setAuthenticated(true);
        setAddress(data.operator_wallet);
        setAgentIds(Array.isArray(data.agent_ids) ? data.agent_ids : []);
        setExpiresAt(data.expires_at ?? null);
      } else {
        setAuthenticated(false);
        setAddress(null);
        setAgentIds([]);
        setExpiresAt(null);
      }
    } catch {
      setAuthenticated(false);
      setAddress(null);
      setAgentIds([]);
      setExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, [connectedAddress, isConnected]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async () => {
    if (!connectedAddress) {
      throw new Error('connect wallet first');
    }

    if (wrongNetwork) {
      throw new Error('Please switch to Ethereum Sepolia to sign in.');
    }

    setLoading(true);

    try {
      const nonceResponse = await fetch('/api/proxy/auth/nonce', {
        method: 'GET',
        credentials: 'include',
      });

      if (!nonceResponse.ok) {
        throw new Error('failed to fetch nonce');
      }

      const nonce = await nonceResponse.text();

      const message = new SiweMessage({
        domain: window.location.host,
        address: connectedAddress,
        statement: 'Sign in to PolicyMint Operator Console',
        uri: window.location.origin,
        version: '1',
        chainId: SIWE_CHAIN_ID,
        nonce,
      }).prepareMessage();

      const signature = await signMessageAsync({ message });

      const verifyResponse = await fetch('/api/proxy/auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyResponse.ok) {
        const text = await verifyResponse.text();
        throw new Error(text || 'verification failed');
      }

      const data = (await verifyResponse.json()) as {
        success: boolean;
        operator_wallet: string;
        agent_ids: string[];
      };
      setAuthenticated(Boolean(data.success));
      setAddress(data.operator_wallet ?? null);
      setAgentIds(Array.isArray(data.agent_ids) ? data.agent_ids : []);

      const sessionResponse = await fetch('/api/proxy/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      if (sessionResponse.ok) {
        const sessionData = (await sessionResponse.json()) as SessionResponse;
        setExpiresAt(sessionData.expires_at ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [connectedAddress, signMessageAsync, wrongNetwork]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/proxy/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setAuthenticated(false);
      setAddress(null);
      setAgentIds([]);
      setExpiresAt(null);
      queryClient.clear();
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshSession();
    }, 30 * 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [authenticated, refreshSession]);

  return {
    loading,
    authenticated,
    address,
    agentIds,
    expiresAt,
    isConnected,
    connectedAddress,
    chainId,
    wrongNetwork,
    signIn,
    signOut,
    refreshSession,
  };
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { SIWE_CHAIN_ID } from '@/lib/auth/constants';

interface SessionResponse {
  address: string | null;
  chainId?: number;
}

export function useAuth() {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const wrongNetwork = useMemo(
    () => isConnected && chainId !== SIWE_CHAIN_ID,
    [chainId, isConnected],
  );

  const refreshSession = useCallback(async () => {
    if (!isConnected || !connectedAddress) {
      setAuthenticated(false);
      setAddress(null);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await response.json()) as SessionResponse;
      const sessionAddress = data.address ? data.address.toLowerCase() : null;

      if (sessionAddress && sessionAddress === connectedAddress.toLowerCase()) {
        setAuthenticated(true);
        setAddress(data.address);
      } else {
        setAuthenticated(false);
        setAddress(null);
      }
    } catch {
      setAuthenticated(false);
      setAddress(null);
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
      const nonceResponse = await fetch('/api/auth/nonce', {
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

      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyResponse.ok) {
        const text = await verifyResponse.text();
        throw new Error(text || 'verification failed');
      }

      const data = (await verifyResponse.json()) as { ok: boolean; address: string };
      setAuthenticated(Boolean(data.ok));
      setAddress(data.address);
    } finally {
      setLoading(false);
    }
  }, [connectedAddress, signMessageAsync, wrongNetwork]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'DELETE',
        credentials: 'include',
      });
      setAuthenticated(false);
      setAddress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    authenticated,
    address,
    isConnected,
    connectedAddress,
    chainId,
    wrongNetwork,
    signIn,
    signOut,
    refreshSession,
  };
}

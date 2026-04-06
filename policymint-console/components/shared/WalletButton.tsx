'use client';

import { ConnectKitButton } from 'connectkit';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { formatAddress } from '@/lib/formatAddress';
import { useAuth } from '@/hooks/useAuth';

const AUTO_SIGN_IN_SUPPRESS_KEY = 'policymint:autoSignInSuppressed';

interface WalletButtonProps {
  autoSignIn?: boolean;
}

export function WalletButton({ autoSignIn = false }: WalletButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const attemptedAutoSignInFor = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSignInSuppressed, setAutoSignInSuppressed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.sessionStorage.getItem(AUTO_SIGN_IN_SUPPRESS_KEY) === '1';
  });
  const {
    loading,
    authenticated,
    address,
    isConnected,
    connectedAddress,
    wrongNetwork,
    signIn,
    signOut,
  } = useAuth();

  const displayAddress = useMemo(
    () => formatAddress(address ?? connectedAddress ?? ''),
    [address, connectedAddress],
  );
  const addressChipClass =
    'inline-flex h-9 items-center rounded-base border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 font-[var(--font-mono)] text-[13px]';

  async function handleSignIn() {
    try {
      setError(null);
      setAutoSignInSuppressed(false);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(AUTO_SIGN_IN_SUPPRESS_KEY);
      }
      await signIn();
      if (pathname === '/') {
        router.replace('/dashboard');
        return;
      }
      router.refresh();
    } catch (caughtError) {
      attemptedAutoSignInFor.current = null;
      const message = caughtError instanceof Error ? caughtError.message : 'Authentication failed';
      setError(message);
    }
  }

  useEffect(() => {
    if (
      !autoSignIn ||
      autoSignInSuppressed ||
      !isConnected ||
      !connectedAddress ||
      authenticated ||
      loading ||
      wrongNetwork
    ) {
      return;
    }

    const normalizedAddress = connectedAddress.toLowerCase();
    if (attemptedAutoSignInFor.current === normalizedAddress) {
      return;
    }

    attemptedAutoSignInFor.current = normalizedAddress;
    void handleSignIn();
  }, [autoSignIn, autoSignInSuppressed, authenticated, connectedAddress, isConnected, loading, wrongNetwork]);

  useEffect(() => {
    if (!isConnected) {
      attemptedAutoSignInFor.current = null;
    }
  }, [isConnected]);

  async function handleSignOut() {
    try {
      setError(null);
      setAutoSignInSuppressed(true);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(AUTO_SIGN_IN_SUPPRESS_KEY, '1');
      }
      await signOut();
      router.push('/');
      router.refresh();
    } catch {
      setError('Failed to sign out');
    }
  }

  if (!isConnected) {
    return <ConnectKitButton theme="auto" />;
  }

  if (loading) {
    return (
      <div className="inline-flex h-8 items-center rounded-base border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[12px] text-[var(--text-secondary)]">
        loading...
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div className="inline-flex h-8 items-center gap-2 rounded-base border border-[var(--border-danger)] bg-[var(--bg-surface)] px-3 text-[12px] text-[var(--text-danger)]">
        <span className="font-[var(--font-mono)]">{displayAddress}</span>
        <span>Wrong network</span>
      </div>
    );
  }

  if (!authenticated) {
    if (autoSignIn) {
      const showManualSignIn = autoSignInSuppressed || Boolean(error);

      return (
        <div className="inline-flex items-center gap-2">
          <span className={`${addressChipClass} text-[var(--text-secondary)]`}>
            {displayAddress}
          </span>
          {showManualSignIn ? (
            <button
              type="button"
              onClick={() => void handleSignIn()}
              disabled={loading}
              className="focus-ring inline-flex h-9 min-w-[92px] items-center justify-center rounded-base border border-[var(--border-focus)] bg-[var(--border-focus)] px-4 text-[13px] font-semibold text-[var(--text-on-brand)] disabled:opacity-70"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          ) : (
            <span className="rounded-base border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
              {loading ? 'Awaiting signature…' : 'Preparing sign-in…'}
            </span>
          )}
          {error ? <span className="text-[11px] text-[var(--text-danger)]">{error}</span> : null}
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-2">
        <span className={`${addressChipClass} text-[var(--text-secondary)]`}>
          {displayAddress}
        </span>
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={loading}
          className="focus-ring inline-flex h-9 min-w-[92px] items-center justify-center rounded-base border border-[var(--border-focus)] bg-[var(--border-focus)] px-4 text-[13px] font-semibold text-[var(--text-on-brand)] disabled:opacity-70"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {error ? <span className="text-[11px] text-[var(--text-danger)]">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`${addressChipClass} text-[var(--text-primary)]`}>
        {displayAddress}
      </span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="focus-ring inline-flex h-9 items-center justify-center rounded-base border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[13px] text-[var(--text-secondary)]"
      >
        Sign out
      </button>
      {error ? <span className="text-[11px] text-[var(--text-danger)]">{error}</span> : null}
    </div>
  );
}

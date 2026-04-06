'use client';

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import { SWRConfig } from 'swr';
import { wagmiConfig } from '@/lib/wagmiConfig';

const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ConnectKitProvider>
          <SWRConfig value={{ revalidateOnFocus: false }}>{children}</SWRConfig>
        </ConnectKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

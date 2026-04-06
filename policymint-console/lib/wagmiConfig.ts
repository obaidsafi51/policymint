import { createConfig, createStorage, cookieStorage, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;

function isValidWalletConnectProjectId(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  const knownPlaceholderValues = new Set([
    'your_walletconnect_project_id',
    'YOUR_WALLETCONNECT_PROJECT_ID',
    'replace_me',
    'changeme',
  ]);

  if (!normalized || knownPlaceholderValues.has(normalized)) {
    return false;
  }

  return /^[a-fA-F0-9]{32}$/.test(normalized);
}

const hasWalletConnectProjectId =
  isValidWalletConnectProjectId(projectId);

const connectors = [
  injected(),
  ...(hasWalletConnectProjectId
    ? [
        walletConnect({
          projectId,
          showQrModal: true,
          metadata: {
            name: 'PolicyMint Console',
            description: 'Policy-protected autonomous trading operator console',
            url: 'https://policymint.vercel.app',
            icons: ['https://policymint.vercel.app/favicon.ico'],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors,
  transports: {
    [sepolia.id]: http(rpcUrl),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

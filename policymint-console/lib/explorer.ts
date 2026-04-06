export function txExplorerBaseUrl(chainId?: number) {
  void chainId;
  return 'https://sepolia.etherscan.io';
}

export function txExplorerLink(txHash: string, chainId?: number) {
  return `${txExplorerBaseUrl(chainId)}/tx/${txHash}`;
}

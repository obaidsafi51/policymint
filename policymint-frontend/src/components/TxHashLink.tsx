import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface TxHashLinkProps {
  hash: string;
  explorerBaseUrl?: string;
}

export function TxHashLink({ hash, explorerBaseUrl = "https://etherscan.io/tx" }: TxHashLinkProps) {
  const truncated = `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  
  return (
    <Link href={`${explorerBaseUrl}/${hash}`} target="_blank" className="font-mono text-brand hover:underline flex items-center gap-1 group">
      {truncated}
      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

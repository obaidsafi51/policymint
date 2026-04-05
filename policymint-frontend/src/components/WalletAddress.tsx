"use client";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface WalletAddressProps {
  address: string;
}

export function WalletAddress({ address }: WalletAddressProps) {
  const [copied, setCopied] = useState(false);
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button 
      onClick={handleCopy}
      className="font-mono text-secondary hover:text-brand flex items-center gap-2 group transition-colors"
      title="Copy to clipboard"
    >
      {truncated}
      {copied ? (
        <Check size={12} className="text-success" />
      ) : (
        <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

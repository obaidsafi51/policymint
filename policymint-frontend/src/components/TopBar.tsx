"use client";
import { ConnectKitButton } from "connectkit";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDarkMode = stored ? stored === "dark" : true;
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const pathname = usePathname();

  return (
    <header className="flex justify-between items-center w-full px-8 py-3 h-16 shrink-0 bg-page border-b-0.5 border-border-default z-40">
      <div className="flex items-center gap-8">
        <span className="md:hidden text-xl font-bold text-brand tracking-tighter">PolicyMint</span>
        <div className="hidden md:flex gap-6">
          <Link href="/" className={`pb-1 font-['Manrope'] text-sm font-medium tracking-tight transition-colors duration-200 ${pathname === '/' ? 'text-brand border-b-2 border-brand' : 'text-secondary hover:text-brand border-b-2 border-transparent'}`}>Dashboard</Link>
          <Link href="/agents" className={`pb-1 font-['Manrope'] text-sm font-medium tracking-tight transition-colors duration-200 ${pathname === '/agents' ? 'text-brand border-b-2 border-brand' : 'text-secondary hover:text-brand border-b-2 border-transparent'}`}>Agents</Link>
          <Link href="/policies" className={`pb-1 font-['Manrope'] text-sm font-medium tracking-tight transition-colors duration-200 ${pathname === '/policies' ? 'text-brand border-b-2 border-brand' : 'text-secondary hover:text-brand border-b-2 border-transparent'}`}>Policies</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="text-secondary hover:text-primary transition-colors flex items-center justify-center p-2 rounded-tile border-0.5 border-transparent hover:border-border-default"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={16} strokeWidth={1.2} /> : <Moon size={16} strokeWidth={1.2} />}
        </button>
        <ConnectKitButton.Custom>
          {({ isConnected, show, address, ensName }) => {
            return (
              <button
                onClick={show}
                className="bg-transparent border-0.5 border-border-default hover:border-hover text-primary font-medium px-4 py-2 rounded-tile transition-colors flex items-center gap-2 text-sm"
              >
                {isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-success inline-block"></span>
                    <span className="font-mono">
                      {ensName ??
                        `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                    </span>
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </button>
            );
          }}
        </ConnectKitButton.Custom>
      </div>
    </header>
  );
}

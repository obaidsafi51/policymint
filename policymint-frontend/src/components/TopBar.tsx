"use client";

import { ConnectKitButton } from "connectkit";
import { useEffect } from "react";
import { Bell, Settings } from "lucide-react";

export function TopBar() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDarkMode = stored !== "light";
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <header className="flex justify-between items-center w-full px-4 sm:px-8 py-3 h-16 shrink-0 bg-page border-b-0.5 border-border-default z-40 gap-3">
      <p className="text-sm font-medium text-primary truncate min-w-0">
        <span className="text-tertiary">&gt;</span> Dashboard Overview
      </p>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 rounded-full border-0.5 border-border-default bg-card px-2.5 sm:px-3 py-1.5 max-sm:py-1 max-sm:px-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[11px] font-medium text-brand uppercase tracking-wider">System Live</span>
        </div>
        <button
          type="button"
          className="text-secondary hover:text-primary transition-colors p-2 rounded-tile border-0.5 border-transparent hover:border-border-default"
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="text-secondary hover:text-primary transition-colors p-2 rounded-tile border-0.5 border-transparent hover:border-border-default"
          aria-label="Settings"
        >
          <Settings size={18} strokeWidth={1.5} />
        </button>
        <ConnectKitButton.Custom>
          {({ isConnected, show, address, ensName }) => (
            <button
              type="button"
              onClick={show}
              className={
                isConnected
                  ? "border-0.5 border-border-default bg-transparent text-primary font-medium px-4 py-2 rounded-tile transition-colors flex items-center gap-2 text-sm hover:border-hover"
                  : "bg-brand text-on-brand font-medium px-4 py-2 rounded-tile transition-opacity hover:opacity-90 text-sm flex items-center gap-2"
              }
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success inline-block shrink-0" />
                  <span className="font-mono text-xs sm:text-sm">
                    {ensName ?? `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                  </span>
                </>
              ) : (
                "Connect Wallet"
              )}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </header>
  );
}

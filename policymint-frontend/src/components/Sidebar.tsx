"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Shield, FileText, ReceiptText } from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Policies", href: "/policies", icon: Shield },
  { name: "Simulate", href: "/simulate", icon: FileText },
  { name: "Audit Log", href: "/audit", icon: ReceiptText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col h-full py-6 bg-surface w-64 border-r-0.5 border-border-default shrink-0 z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
          <Shield size={18} className="text-on-brand" style={{ fill: 'currentColor' }} />
        </div>
        <div>
          <h1 className="text-brand font-medium font-['Manrope'] tracking-tighter leading-none">PolicyMint</h1>
          <p className="text-[10px] text-tertiary uppercase tracking-widest font-medium">Operator</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 flex flex-col gap-1">
        {menuItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-['Manrope'] text-sm font-medium transition-all duration-300 relative ${
                isActive 
                  ? "text-brand bg-brand/5" 
                  : "text-secondary hover:bg-card hover:text-brand"
              }`}
              title={item.name}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand rounded-r-md" />
              )}
              <Icon size={20} className="shrink-0" style={isActive ? { fill: 'currentColor' } : {}} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="px-8 pb-4 flex flex-col gap-3">
         <div className="flex flex-col gap-3 pb-4 border-b-0.5 border-border-default mb-2">
            <a href="#" className="flex items-center justify-between text-secondary hover:text-primary transition-colors text-xs font-medium">
              <span>Documentation</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
            <a href="#" className="flex items-center justify-between text-secondary hover:text-primary transition-colors text-xs font-medium">
              <span>Support & Help</span>
            </a>
         </div>
         <button className="w-full bg-brand text-[#064430] font-medium px-4 py-3 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap text-sm">
           Deploy agent
         </button>
         <button className="w-full bg-transparent border-0.5 border-brand text-brand font-medium px-4 py-3 rounded-xl hover:bg-brand/10 transition-colors whitespace-nowrap text-sm">
           New Policy
         </button>
      </div>
    </aside>
  );
}

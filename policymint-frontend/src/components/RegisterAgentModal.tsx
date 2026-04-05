import { useState } from "react";
import { Copy, CheckCircle2, AlertTriangle, ExternalLink, X } from "lucide-react";

interface RegisterAgentModalProps {
  onClose: () => void;
}

export function RegisterAgentModal({ onClose }: RegisterAgentModalProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [strategy, setStrategy] = useState("Rebalancing");

  const [agentName, setAgentName] = useState("MarketGuard-v1");
  const [chainId, setChainId] = useState("Base Sepolia");
  const [wallet, setWallet] = useState("0x71C2345a67890b1234567890c1234567890d1234");
  const [uri, setUri] = useState("ipfs://...");

  const handleMint = () => {
    setIsMinting(true);
    setTimeout(() => {
      setIsMinting(false);
      setIsSuccess(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-[#0a1210]/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f2926] rounded-2xl flex max-w-[900px] w-full max-h-[90vh] overflow-hidden border-0.5 border-[#2c3d36] shadow-2xl">
        
        {/* LEFT PANEL */}
        <div className="flex-1 p-8 border-r-0.5 border-[#2c3d36]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-medium text-white">Register Agent</h2>
            <button onClick={onClose} className="text-secondary hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-[#7EAA9A] font-medium">Agent Name</label>
                <input 
                  value={agentName} onChange={e => setAgentName(e.target.value)}
                  className="bg-[#151d1a] border-0.5 border-[#2c3d36] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#34d399]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-[#7EAA9A] font-medium">Chain ID</label>
                <select 
                  value={chainId} onChange={e => setChainId(e.target.value)}
                  className="bg-[#151d1a] border-0.5 border-[#2c3d36] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#34d399] appearance-none"
                >
                  <option>Base Sepolia</option>
                  <option>Ethereum Mainnet</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-[#7EAA9A] font-medium">Deployer Wallet</label>
              <input 
                value={wallet} onChange={e => setWallet(e.target.value)}
                className="bg-[#151d1a] border-0.5 border-[#2c3d36] rounded-lg px-4 py-3 text-sm text-white focus:outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-[#7EAA9A] font-medium">Metadata URI (IPFS/Arweave)</label>
              <input 
                value={uri} onChange={e => setUri(e.target.value)}
                className="bg-[#151d1a] border-0.5 border-[#2c3d36] rounded-lg px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 mb-2">
              <label className="text-[10px] uppercase tracking-widest text-[#7EAA9A] font-medium">Strategy Type</label>
              <div className="flex gap-2">
                {['Rebalancing', 'Arbitrage', 'Custom'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setStrategy(type)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border-0.5 transition-all ${
                      strategy === type 
                      ? "bg-[#34d399]/10 border-[#34d399] text-[#34d399]" 
                      : "bg-transparent border-[#2c3d36] text-secondary hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleMint}
              disabled={isMinting || isSuccess}
              className={`w-full py-3 rounded-lg font-medium tracking-wide uppercase text-sm transition-all ${
                isSuccess 
                  ? "bg-[#2c3d36] text-[#7EAA9A] cursor-not-allowed" 
                  : "bg-[#34d399] text-[#064430] hover:opacity-90"
              }`}
            >
              {isMinting ? "MINTING..." : "INITIALIZE SMART AGENT"}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[400px] p-8 flex flex-col justify-center bg-[#1a2320]">
          {!isSuccess ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#7EAA9A] mb-4 animate-[spin_4s_linear_infinite]" />
              <p className="text-secondary text-sm">Awaiting initialization...</p>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center mb-6 text-on-brand shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Registration Successful</h3>
              <p className="text-tertiary text-sm mb-8 leading-relaxed">Agent has been minted on-chain and registered to your sentinel console.</p>
              
              <div className="flex flex-col gap-6 flex-1">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#7EAA9A] font-medium">Agent UUID</span>
                  <div className="bg-[#101513] rounded-lg p-3 text-xs font-mono text-[#34d399] break-all border-0.5 border-[#1f2926]">
                    550e8400-e29b-41d4-a716-446655440000
                  </div>
                </div>

                <div className="flex flex-col gap-3 bg-[#381e24] border-0.5 border-[#5c2732] rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#e74c6f] text-xs font-medium uppercase tracking-wider">
                    <AlertTriangle size={14} /> One-Time Reveal Key
                  </div>
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 bg-[#150a0d] border-0.5 border-[#5c2732] rounded-lg px-3 py-2 text-xs font-mono text-[#e74c6f] break-all">
                      pm_live_293847293847293847293847293847
                    </div>
                    <button className="bg-[#e74c6f] text-[#381e24] hover:bg-[#c23e5a] px-3 rounded-lg flex items-center justify-center transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-[#c23e5a] text-[10px] leading-tight">This key will not be shown again. Copy it now. Access to the agent terminal depends on this credential.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-[#7EAA9A] font-medium">ERC-8004 Token</span>
                  <a href="#" className="text-success text-xs font-mono hover:underline inline-flex items-center gap-1">
                    token_id: 1,024 <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <button onClick={onClose} className="w-full mt-8 bg-[#2c3d36] hover:bg-[#384a42] text-white py-3 rounded-lg text-sm font-medium transition-colors">
                Close & Go to Terminal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

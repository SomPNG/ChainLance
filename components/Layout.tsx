
import React from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  setRole: (role: UserRole) => void;
  walletConnected: boolean;
  account: string | null;
  onConnectWallet: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, setRole, walletConnected, account, onConnectWallet }) => {
  const truncatedAccount = account 
    ? `${account.substring(0, 4)}...${account.substring(account.length - 4)}` 
    : 'Connect Phantom';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">ChainLance</span>
          </div>

          <nav className="flex items-center gap-6">
            <div className="bg-slate-100 p-1 rounded-lg flex">
              <button
                onClick={() => setRole('CLIENT')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  role === 'CLIENT' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Hire
              </button>
              <button
                onClick={() => setRole('FREELANCER')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  role === 'FREELANCER' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Work
              </button>
            </div>

            <button
              onClick={onConnectWallet}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                walletConnected
                  ? 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${walletConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              {truncatedAccount}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t bg-slate-50 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
          <p>© 2024 ChainLance. Solana Mainnet Compatible.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-violet-600">On-Chain Docs</a>
            <a href="#" className="hover:text-violet-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

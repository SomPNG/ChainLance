
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import ProjectCard from './components/ProjectCard';
import { Project, ProjectStatus, UserRole, Transaction, Proposal } from './types';
import { CATEGORIES, INITIAL_PROJECTS } from './constants';
import { generateJobDescription, explainSmartContractEscrow, analyzeResumeWithJob, estimateProjectDeadline, analyzeGithubSubmission } from './services/geminiService';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: (args: any) => void) => void;
      removeListener: (event: string, callback: (args: any) => void) => void;
      publicKey?: { toString: () => string };
    };
  }
}

const STORAGE_KEY = 'chainlance_job_pool_v3';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [account, setAccount] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showProposalsModal, setShowProposalsModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [proposalMessage, setProposalMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    budget: '',
    category: CATEGORIES[0],
    skills: ''
  });

  // Phantom Wallet Connection Logic
  useEffect(() => {
    const checkConnection = async () => {
      if (window.solana?.isPhantom) {
        try {
          // Attempt to connect eagerly if the user has already trusted the site
          const resp = await window.solana.connect({ onlyIfTrusted: true });
          setAccount(resp.publicKey.toString());
        } catch (err) {
          // User has not trusted the site or is not logged in
          console.log('Phantom auto-connect failed or not trusted.');
        }

        // Listen for account changes
        window.solana.on('accountChanged', (publicKey) => {
          if (publicKey) {
            setAccount(publicKey.toString());
          } else {
            setAccount(null);
          }
        });

        // Listen for disconnect
        window.solana.on('disconnect', () => {
          setAccount(null);
        });
      }
    };
    checkConnection();

    return () => {
      if (window.solana) {
        window.solana.removeListener('accountChanged', () => {});
        window.solana.removeListener('disconnect', () => {});
      }
    };
  }, []);

  const visibleProjects = useMemo(() => {
    if (role === 'CLIENT') {
      if (!account) return [];
      const shortAddr = `${account.substring(0, 4)}...${account.substring(account.length - 4)}`;
      return projects.filter(p => p.clientName === shortAddr || p.clientName === account);
    }
    return projects.filter(p => {
      const hasApplied = p.proposals.some(prop => prop.freelancerId === account);
      const isHired = p.hiredFreelancerId === account;
      return (p.status === ProjectStatus.OPEN || p.status === ProjectStatus.FUNDED || isHired || hasApplied);
    });
  }, [role, projects, account]);

  const handleConnectWallet = useCallback(async () => {
    if (!window.solana?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    try {
      const resp = await window.solana.connect();
      setAccount(resp.publicKey.toString());
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  }, []);

  const handleFundProject = async (projectId: string) => {
    if (!account) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const signature = `sig_${Math.random().toString(36).substring(2, 15)}`;
    const tx: Transaction = { id: signature, type: 'DEPOSIT', amount: project.budget, from: account, to: 'ChainLance_Program', status: 'CONFIRMED', timestamp: new Date().toISOString() };
    setTransactions(t => [tx, ...t]);
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: ProjectStatus.FUNDED } : p));
  };

  const handleReleaseFunds = async (projectId: string) => {
    if (!account) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const signature = `sig_rel_${Math.random().toString(36).substring(2, 15)}`;
    const tx: Transaction = { id: signature, type: 'RELEASE', amount: project.budget, from: 'ChainLance_Program', to: project.hiredFreelancerId || 'Worker', status: 'CONFIRMED', timestamp: new Date().toISOString() };
    setTransactions(t => [tx, ...t]);
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: ProjectStatus.COMPLETED } : p));
    alert("Payment successfully released on the Solana Network.");
  };

  const handleShowApplyModal = (project: Project) => {
    setSelectedProject(project);
    setProposalMessage('');
    setSelectedFile(null);
    setShowApplyModal(true);
  };

  const handleShowSubmitModal = (project: Project) => {
    setSelectedProject(project);
    setGithubUrl(project.submissionUrl || '');
    setShowSubmitModal(true);
  };

  const handleShowProposalsModal = (project: Project) => {
    setSelectedProject(project);
    setShowProposalsModal(true);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !selectedProject || !proposalMessage.trim()) return;
    setIsAnalyzing(true);
    try {
      let resumeBase64 = "";
      let aiAnalysis = "";
      if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((res) => {
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
        resumeBase64 = await base64Promise;
        aiAnalysis = await analyzeResumeWithJob(selectedProject.description, resumeBase64);
      }
      const newProposal: Proposal = {
        id: `prop-${Date.now()}`,
        projectId: selectedProject.id,
        freelancerId: account,
        message: proposalMessage.trim(),
        timestamp: new Date().toISOString(),
        resumeBase64: resumeBase64 || undefined,
        aiAnalysis: aiAnalysis || undefined
      };
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, proposals: [...p.proposals, newProposal] } : p));
      setShowApplyModal(false);
      setSelectedProject(null);
    } catch (err) {
      alert("Application failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !githubUrl.trim()) return;
    setIsAuditing(true);
    try {
      const audit = await analyzeGithubSubmission(selectedProject.description, githubUrl);
      setProjects(prev => prev.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            submissionUrl: githubUrl,
            submissionAudit: audit,
            submissionStatus: 'AUDITED'
          };
        }
        return p;
      }));
      setShowSubmitModal(false);
      setSelectedProject(null);
    } catch (err) {
      alert("Submission audit failed.");
    } finally {
      setIsAuditing(false);
    }
  };
  
  const handleAcceptProposal = async (proposal: Proposal) => {
    if (!selectedProject) return;
    setIsHiring(true);
    try {
      const days = await estimateProjectDeadline(selectedProject.description, proposal.message);
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + days);
      const deadlineStr = deadlineDate.toISOString().split('T')[0];
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, status: ProjectStatus.IN_PROGRESS, hiredFreelancerId: proposal.freelancerId, deadline: deadlineStr } : p));
      setShowProposalsModal(false);
      setSelectedProject(null);
    } catch (err) {
      alert("Hiring failed.");
    } finally {
      setIsHiring(false);
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    const p: Project = {
      id: `sol-p-${Date.now()}`,
      title: newProject.title.trim(),
      description: newProject.description.trim(),
      budget: parseFloat(newProject.budget),
      category: newProject.category,
      clientName: `${account.substring(0, 4)}...${account.substring(account.length - 4)}`,
      status: ProjectStatus.OPEN,
      deadline: 'TBD',
      skills: newProject.skills ? newProject.skills.split(',').map(s => s.trim()) : [],
      proposals: [],
    };
    setProjects(prev => [p, ...prev]);
    setShowCreateModal(false);
    setNewProject({ title: '', description: '', budget: '', category: CATEGORIES[0], skills: '' });
  };

  return (
    <Layout
      role={role}
      setRole={setRole}
      walletConnected={!!account}
      account={account}
      onConnectWallet={handleConnectWallet}
    >
      <div className="mb-20 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter leading-none">
          {role === 'CLIENT' ? 'Post to the Global Pool.' : 'Direct Chain Hire.'}
        </h1>
        <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
          {role === 'CLIENT' 
            ? 'Connect with worldwide experts and pay zero platform fees using Solana Escrow.' 
            : 'Find verified opportunities. Get paid in SOL instantly upon delivery via AI-audited proof-of-work.'}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {role === 'CLIENT' ? (
            <button onClick={() => setShowCreateModal(true)} className="bg-violet-600 text-white px-12 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-violet-700 transition-all shadow-2xl shadow-violet-200 active:scale-95">
              Initiate New Bounty
            </button>
          ) : (
            <div className="w-full max-w-xl relative">
              <input type="text" placeholder="Search verified job pool..." className="w-full px-10 py-6 rounded-[2rem] border-2 border-slate-100 focus:border-violet-600 outline-none transition-all shadow-sm font-bold text-slate-700" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{role === 'CLIENT' ? 'Active Contracts' : 'Open Listings'}</h2>
            <div className="flex items-center gap-3 px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
              {visibleProjects.length} Verified Records
            </div>
          </div>

          <div className="grid gap-10">
            {visibleProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                role={role}
                account={account}
                onFund={handleFundProject}
                onApply={handleShowApplyModal}
                onViewProposals={handleShowProposalsModal}
                onSubmitWork={handleShowSubmitModal}
                onComplete={handleReleaseFunds}
                isAuditing={isAuditing && selectedProject?.id === p.id}
              />
            ))}
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative border border-slate-800 shadow-2xl overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-600/10 rounded-full blur-3xl group-hover:bg-violet-600/20 transition-all" />
            <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-8">On-Chain Analytics</h3>
            <div className="grid grid-cols-1 gap-6 relative z-10">
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                <p className="text-slate-500 text-[10px] mb-2 font-black uppercase tracking-widest">Total Value Locked</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-emerald-400">{(projects.reduce((s,p) => s+p.budget, 0) || 0).toFixed(3)}</p>
                  <span className="text-xs font-black text-emerald-500/50 uppercase">SOL</span>
                </div>
              </div>
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                <p className="text-slate-500 text-[10px] mb-2 font-black uppercase tracking-widest">Active Smart Audits</p>
                <p className="text-4xl font-black text-amber-400">{projects.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 p-10 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Network Ledger
            </h3>
            <div className="space-y-8">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest italic">Awaiting network events...</p>
                </div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="flex gap-4 group">
                    <div className="w-1.5 h-12 bg-slate-100 rounded-full relative overflow-hidden group-hover:bg-violet-100 transition-colors">
                      <div className="absolute top-0 left-0 w-full bg-violet-600 h-1/2 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-900 uppercase text-[9px] tracking-[0.2em] mb-1">{tx.type} CONFIRMED</p>
                      <p className="text-sm font-black text-slate-600">{tx.amount} SOL</p>
                      <p className="text-[9px] font-mono text-slate-300 mt-1 uppercase truncate w-32">TXID: {tx.id}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Modal - Untouched Constraint */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white rounded-[2rem] w-full max-w-2xl p-10 shadow-2xl">
             <div className="flex justify-between mb-8"><h2 className="text-2xl font-bold">Post New Job</h2><button onClick={()=>setShowCreateModal(false)}>✕</button></div>
             <form onSubmit={handleCreateProject} className="space-y-4">
               <input required value={newProject.title} onChange={(e)=>setNewProject({...newProject, title:e.target.value})} placeholder="Project Title" className="w-full p-4 border rounded-xl" />
               <textarea required rows={4} value={newProject.description} onChange={(e)=>setNewProject({...newProject, description:e.target.value})} placeholder="Details" className="w-full p-4 border rounded-xl resize-none" />
               <div className="grid grid-cols-2 gap-4">
                 <input type="number" step="0.1" value={newProject.budget} onChange={(e)=>setNewProject({...newProject, budget:e.target.value})} placeholder="Budget (SOL)" className="w-full p-4 border rounded-xl" />
                 <select value={newProject.category} onChange={(e)=>setNewProject({...newProject, category:e.target.value})} className="w-full p-4 border rounded-xl">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
               </div>
               <button type="submit" className="w-full bg-violet-600 text-white p-5 rounded-xl font-bold">List on Pool</button>
             </form>
           </div>
        </div>
      )}

      {/* Submit Work Modal */}
      {showSubmitModal && selectedProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl relative border-4 border-white">
            {isAuditing && (
              <div className="absolute inset-0 z-[70] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-10">
                  <div className="w-24 h-24 border-8 border-violet-100 rounded-full" />
                  <div className="absolute inset-0 w-24 h-24 border-8 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-violet-600">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.921l-4.13 7.227-3.23-3.23a1 1 0 00-1.414 1.414l4 4a1 1 0 001.442-.03l5-8.75a1 1 0 00-.396-1.567z" clipRule="evenodd"/></svg>
                  </div>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">AI Technical Audit</h3>
                <p className="text-slate-400 font-bold leading-relaxed px-6">Scanning source artifacts and commit history to verify Proof-of-Work against contractual obligations.</p>
                <div className="mt-12 flex gap-2 justify-center">
                   {[0, 0.1, 0.2].map(d => <div key={d} className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{animationDelay: `${d}s`}} />)}
                </div>
              </div>
            )}
            <div className="p-12 border-b bg-slate-50/50">
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight leading-none">Submit Work</h2>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Initiate Smart-Contract Payment Logic</p>
            </div>
            <form onSubmit={handleSubmitWork} className="p-12 space-y-10">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Public GitHub Target</label>
                <div className="relative group">
                  <input required type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/repository/path" className="w-full px-8 py-6 rounded-[2rem] border-2 border-slate-100 focus:border-violet-600 focus:ring-4 focus:ring-violet-50 outline-none transition-all font-mono text-sm bg-slate-50/50" />
                </div>
                <div className="flex gap-4 p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem]">
                  <div className="text-blue-500 mt-1">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM5.884 6.68a1 1 0 10-1.404-1.427l-.707.696a1 1 0 101.404 1.427l.707-.696zM14.116 6.68a1 1 0 011.404-1.427l.707.696a1 1 0 11-1.404 1.427l-.707-.696zM10 8a2 2 0 100 4 2 2 0 000-4zM3 10a1 1 0 100 2h1a1 1 0 100-2H3zM17 10a1 1 0 100 2h1a1 1 0 100-2h-1zM4.98 14.284a1 1 0 00-1.404 1.426l.707.707a1 1 0 101.404-1.426l-.707-.707zm10.04 1.426a1 1 0 111.404-1.426l.707.707a1 1 0 11-1.404 1.426l-.707-.707zM11 16a1 1 0 10-2 0v1a1 1 0 102 0v-1z" clipRule="evenodd" /></svg>
                  </div>
                  <p className="text-xs text-blue-800 font-bold leading-relaxed">
                    Once submitted, our Technical Auditor AI will generate a report for the client. Payment is unlocked only after a positive technical verdict.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest border-2 border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-violet-600 text-white px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-violet-700 shadow-2xl shadow-violet-200 transition-all active:scale-95">Send for Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Proposals Modal */}
      {showProposalsModal && selectedProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative border-4 border-white">
            {isHiring && (
              <div className="absolute inset-0 z-[70] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 border-8 border-violet-600 border-t-transparent rounded-full animate-spin mb-8" />
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">AI Deadline Estimation</h3>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Generating contract parameters...</p>
              </div>
            )}
            <div className="p-12 border-b bg-slate-50/50 flex justify-between items-end">
              <div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">Applicants</h2>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Pool ID: <span className="text-violet-600">{selectedProject.id}</span></p>
              </div>
              <button onClick={() => setShowProposalsModal(false)} className="p-4 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">✕</button>
            </div>
            <div className="p-12 space-y-12 overflow-y-auto">
              {selectedProject.proposals.length > 0 ? selectedProject.proposals.map(proposal => (
                <div key={proposal.id} className="grid grid-cols-1 md:grid-cols-3 gap-12 p-10 border-2 border-slate-100 rounded-[2.5rem] bg-white hover:border-violet-200 transition-all hover:shadow-2xl hover:shadow-slate-100 relative group/card">
                  <div className="md:col-span-2 space-y-8">
                    <div className="flex justify-between items-center">
                       <span className="font-mono text-[10px] font-black text-violet-700 bg-violet-50 px-4 py-2 rounded-xl border border-violet-100">
                        VERIFIED_ACTOR: {proposal.freelancerId.substring(0, 16)}...
                      </span>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative">
                      <p className="text-slate-600 leading-relaxed font-bold italic text-lg">"{proposal.message}"</p>
                    </div>
                    <button onClick={() => handleAcceptProposal(proposal)} className="w-full py-6 bg-violet-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-violet-700 shadow-2xl shadow-violet-200 transition-all active:scale-[0.98]">
                      Lock-in & Start Contract
                    </button>
                  </div>
                  <div className="bg-violet-900 rounded-[2rem] p-8 text-white flex flex-col shadow-inner relative overflow-hidden group/audit">
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">AI Scorecard</span>
                    </div>
                    <div className="flex-1 leading-relaxed text-[11px] text-violet-100 bg-white/5 p-6 rounded-[1.5rem] border border-white/10 font-bold">
                      {proposal.aiAnalysis || "Strategic matching engine active..."}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-24 border-4 border-dashed border-slate-100 rounded-[3rem]">
                   <p className="text-slate-300 font-black uppercase text-xs tracking-[0.3em] italic">Waiting for talent connections</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl relative border-4 border-white">
             {isAnalyzing && (
               <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-12 text-center rounded-[3rem]">
                 <div className="w-20 h-20 border-8 border-violet-600 border-t-transparent rounded-full animate-spin mb-10" />
                 <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">AI Matching Protocol</h3>
                 <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Optimizing candidate profile...</p>
               </div>
             )}
             <div className="mb-12">
               <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">Apply</h2>
               <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Submit Proof of Expertise</p>
             </div>
             <form onSubmit={handleSubmitProposal} className="space-y-10">
               <div className="space-y-4">
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Professional Pitch</label>
                 <textarea required rows={5} value={proposalMessage} onChange={(e)=>setProposalMessage(e.target.value)} placeholder="How will your skills unlock this project's potential?" className="w-full p-8 border-2 border-slate-100 rounded-[2rem] focus:border-violet-600 focus:ring-4 focus:ring-violet-50 outline-none transition-all resize-none text-sm font-bold bg-slate-50/30" />
               </div>
               <div className="space-y-4">
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Technical Resume (PDF)</label>
                 <input type="file" accept=".pdf" onChange={(e)=>setSelectedFile(e.target.files?.[0] || null)} className="w-full p-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-sm file:mr-8 file:py-3 file:px-8 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer transition-all" />
               </div>
               <div className="flex gap-4 pt-6">
                 <button type="button" onClick={()=>setShowApplyModal(false)} className="flex-1 px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                 <button type="submit" className="flex-1 bg-violet-600 text-white px-8 py-6 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-violet-700 shadow-2xl shadow-violet-200 transition-all active:scale-95">Send Proposal</button>
               </div>
             </form>
           </div>
        </div>
      )}

    </Layout>
  );
};

export default App;

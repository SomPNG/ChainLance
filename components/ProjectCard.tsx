
import React from 'react';
import { Project, ProjectStatus, UserRole, Proposal } from '../types';

interface ProjectCardProps {
  project: Project;
  role: UserRole;
  account: string | null;
  onApply: (project: Project) => void;
  onFund: (id: string) => void;
  onViewProposals: (project: Project) => void;
  onSubmitWork: (project: Project) => void;
  onComplete?: (id: string) => void;
  // Added isAuditing prop to track AI audit status
  isAuditing?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  role, 
  account, 
  onApply, 
  onFund, 
  onViewProposals, 
  onSubmitWork, 
  onComplete,
  // Destructured isAuditing from props
  isAuditing 
}) => {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.OPEN: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.FUNDED: return 'bg-amber-100 text-amber-700';
      case ProjectStatus.IN_PROGRESS: return 'bg-violet-100 text-violet-700';
      case ProjectStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Helper to check ownership since clientName might be truncated in some logic
  const shortAddr = account ? `${account.substring(0, 4)}...${account.substring(account.length - 4)}` : '';
  const isProjectOwner = account && (project.clientName === account || project.clientName === shortAddr);
  
  const isHiredWorker = account && project.hiredFreelancerId === account;
  const isClientRole = role === 'CLIENT';
  const isFreelancerRole = role === 'FREELANCER';
  
  const hasApplied = account && project.proposals?.some(p => p.freelancerId === account);
  const isAudited = project.submissionStatus === 'AUDITED';
  const isRecommended = project.submissionAudit?.includes('RECOMMENDED FOR PAYMENT');

  return (
    <div className={`bg-white rounded-[2rem] border-2 transition-all overflow-hidden ${isHiredWorker && isFreelancerRole ? 'border-violet-500 shadow-2xl shadow-violet-100' : 'border-slate-100 hover:border-slate-200 hover:shadow-xl'}`}>
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                {project.category}
              </span>
              {isHiredWorker && isFreelancerRole && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-600 text-white shadow-lg shadow-violet-200">
                  Your Active Contract
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
              {project.title}
            </h3>
            <p className="text-sm font-medium text-slate-400">Escrow ID: {project.id}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ')}
          </span>
        </div>

        <p className="text-slate-500 mb-8 leading-relaxed font-medium">
          {project.description}
        </p>

        {/* Phase-specific UI Sections */}
        {project.status === ProjectStatus.IN_PROGRESS && (
          <div className="mb-8 space-y-6">
            {/* WORKER VIEW: Strictly for the hired freelancer in Work role */}
            {isFreelancerRole && isHiredWorker && (
              <div className="p-6 bg-violet-50 rounded-[2rem] border border-violet-100 relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-sm font-black text-violet-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Worker Delivery Portal
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                      <p className="text-xs text-violet-600 font-bold mb-1">Target Deadline: {project.deadline}</p>
                      <p className="text-xs text-violet-500/70 font-medium">Link your repository. ChainLance AI will verify the code implementation for payment release.</p>
                    </div>
                    <button 
                      onClick={() => onSubmitWork(project)} 
                      className="w-full sm:w-auto bg-violet-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-200 active:scale-95"
                    >
                      {project.submissionUrl ? 'Update Delivery' : 'Initiate AI Audit'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HIRER VIEW: Strictly for the project owner in Hire role */}
            {isClientRole && isProjectOwner && (
              <div className="p-8 bg-slate-900 rounded-[2rem] text-white relative border border-slate-800 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-6">
                  {isAudited ? (
                    isRecommended ? (
                      <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-xs font-black border border-emerald-500/30">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        AI PAYMENT AUTHORIZED
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-xs font-black border border-amber-500/30">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        REVISIONS NEEDED
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-800 text-slate-400 px-4 py-2 rounded-full text-xs font-black border border-slate-700 animate-pulse">
                      AWAITING DELIVERY
                    </div>
                  )}
                </div>
                
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Automated Technical Audit</h4>
                
                {project.submissionUrl ? (
                  <div className="space-y-6 relative z-10">
                    <div>
                      <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2">Technical Artifact Link</p>
                      <a href={project.submissionUrl} target="_blank" className="font-mono text-sm text-violet-200 hover:text-white transition-colors flex items-center gap-2 underline">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                        {project.submissionUrl}
                      </a>
                    </div>
                    {/* Fixed missing isAuditing variable by using prop */}
                    {isAuditing ? (
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex items-center justify-center gap-3">
                         <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">AI Agent analyzing repository...</p>
                      </div>
                    ) : isAudited && (
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                          {project.submissionAudit}
                        </p>
                      </div>
                    )}
                    {/* Fixed missing isAuditing variable by using prop */}
                    {isRecommended && !isAuditing && (
                      <div className="flex gap-4 pt-2">
                         <button 
                          onClick={() => onComplete?.(project.id)} 
                          className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                          Authorize Payment Release
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest italic">Awaiting technical artifacts from the worker...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Global Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-50">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">Escrowed Bounty</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-violet-600 tracking-tighter">{project.budget}</span>
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest">SOL</span>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Pre-Hiring Phase Actions */}
            {project.status === ProjectStatus.OPEN && (
              <>
                {isFreelancerRole && (
                  <button 
                    onClick={() => onApply(project)} 
                    disabled={!!hasApplied}
                    className={`px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${
                      hasApplied 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-violet-600 text-white hover:bg-violet-700 shadow-2xl shadow-violet-200 active:scale-95'
                    }`}
                  >
                    {hasApplied ? 'Proposal Received' : 'Apply Now'}
                  </button>
                )}
                {isClientRole && isProjectOwner && (
                  <button 
                    onClick={() => onFund?.(project.id)} 
                    className="bg-amber-500 text-white px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-2xl shadow-amber-200 active:scale-95"
                  >
                    Lock Bounty
                  </button>
                )}
              </>
            )}

            {/* Proposal Management for Client */}
            {isClientRole && isProjectOwner && project.status !== ProjectStatus.IN_PROGRESS && project.status !== ProjectStatus.COMPLETED && project.proposals.length > 0 && (
              <button 
                onClick={() => onViewProposals(project)} 
                className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Review Applicants ({project.proposals.length})
              </button>
            )}

            {/* Completion Branding */}
            {project.status === ProjectStatus.COMPLETED && (
              <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                Contract Finalized
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;

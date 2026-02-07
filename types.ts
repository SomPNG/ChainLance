
export type UserRole = 'CLIENT' | 'FREELANCER';

export enum ProjectStatus {
  OPEN = 'OPEN',
  FUNDED = 'FUNDED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED'
}

export interface Project {
  id: string;
  title: string;
  description: string;
  budget: number; // in ETH/USDC equivalent
  clientName: string;
  status: ProjectStatus;
  category: string;
  deadline: string;
  skills: string[];
  proposals: Proposal[];
  hiredFreelancerId?: string;
  submissionUrl?: string;
  submissionAudit?: string;
  submissionStatus?: 'PENDING' | 'AUDITED';
}

export interface Proposal {
  id: string;
  projectId: string;
  freelancerId: string;
  message: string;
  timestamp: string;
  resumeBase64?: string;
  aiAnalysis?: string;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'RELEASE' | 'REFUND';
  amount: number;
  from: string;
  to: string;
  status: 'PENDING' | 'CONFIRMED';
  timestamp: string;
}


import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function generateJobDescription(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Transform this rough request into a professional freelancing job description suitable for a direct-hire platform: "${prompt}". Focus on project goals, specific deliverables, and required expertise.`,
    config: {
      temperature: 0.7,
      systemInstruction: "You are an expert recruiter and project manager. You help clients write clear, professional, and attractive job posts for any industry.",
    },
  });
  return response.text || "Failed to generate description.";
}

export async function analyzeResumeWithJob(projectDesc: string, resumeBase64: string): Promise<string> {
  const cleanBase64 = resumeBase64.split(',')[1] || resumeBase64;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        },
        {
          text: `Job Description: ${projectDesc}\n\nTask: Analyze this candidate's resume against the job description. Provide a 'Match Score' (0-100), a list of 3 key strengths, and any potential missing skills. Be professional and objective.`
        }
      ]
    },
    config: {
      systemInstruction: "You are an elite AI hiring assistant. You provide high-signal analysis of resumes relative to specific job requirements.",
    },
  });
  return response.text || "Resume analysis unavailable.";
}

export async function estimateProjectDeadline(projectDesc: string, proposalMsg: string): Promise<number> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Project Description: ${projectDesc}\nFreelancer Proposal: ${proposalMsg}\n\nEstimate a realistic number of days to complete this project based on complexity. Return ONLY a single integer representing the number of days.`,
    config: {
      temperature: 0.3,
      systemInstruction: "You are a technical project manager. You estimate project timelines accurately. Return only the digit.",
    },
  });
  const days = parseInt(response.text?.trim() || "14");
  return isNaN(days) ? 14 : days;
}

export async function analyzeGithubSubmission(projectDesc: string, repoUrl: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Project Goal: ${projectDesc}\nSubmitted Repo: ${repoUrl}\n\nTask: Perform a 'Proof of Work' audit. Acknowledge the repository link and evaluate if it logically aligns with the project goals. Provide a verdict: 'RECOMMENDED FOR PAYMENT' or 'REVISIONS NEEDED'. List 2 key observations about the submission quality.`,
    config: {
      systemInstruction: "You are a Technical Auditor for a decentralized freelancing platform. You verify that work submitted meets the contractual requirements before funds are released.",
    },
  });
  return response.text || "Audit service currently offline.";
}

export async function explainSmartContractEscrow(): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Explain in simple terms how a blockchain escrow works for any freelancer and client, and why it is safer and cheaper than traditional platforms like Upwork or Fiverr.",
  });
  return response.text || "Explanation unavailable.";
}

export interface File {
  path: string;
  content: string;
  language?: string;
}

export interface GeneratedFilesResponse {
  files: Array<{
    path: string;
    content: string;
  }>;
  explanation?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
}

export type ViewMode = 'code' | 'preview';

export interface ChatState {
  messages: Message[];
  isGenerating: boolean;
}

// --- ENHANCED AGENTIC TYPES ---

export type AgentState = 
  | 'IDLE' 
  | 'PLANNING' 
  | 'PLAN_READY' 
  | 'CODING' 
  | 'VERIFYING' 
  | 'ERROR_DETECTED' 
  | 'PLANNING_FIX' 
  | 'FIX_READY'
  | 'APPLYING_PATCH';

export interface AgentStatus {
  state: AgentState;
  message: string;
  streamContent: string;
  error?: string;
  errorDetails?: ErrorDetails;
  fixAttempt?: number;
}

// New: Structured Error Information
export interface ErrorDetails {
  type: 'syntax' | 'database' | 'runtime' | 'framework' | 'unknown';
  file: string;
  line?: number;
  code?: string;
  message: string;
  stackTrace?: string;
  suggestion?: string;
}

// New: Code Patch Structure
export interface CodePatch {
  file: string;
  patches: Array<{
    lineNumber: number;
    oldCode: string;
    newCode: string;
    explanation: string;
  }>;
}

// New: Fix and Response from AI
export interface FixResponse {
  analysis: string;
  rootCause: string;
  fix: CodePatch;
  confidence: number;
}

// New: Version History
export interface CodeVersion {
  id: string;
  timestamp: number;
  files: File[];
  description: string;
  error?: ErrorDetails;
}

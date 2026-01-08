export interface File {
  path: string;
  content: string;
  language?: string; // Made optional to handle raw API responses easily
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

// --- NEW AGENTIC TYPES (For DeepSeek/Lovable Workflow) ---

// The specific life-cycle stages of the Agent
export type AgentState = 
  | 'IDLE'            // Doing nothing
  | 'PLANNING'        // Architect Mode: Streaming the plan
  | 'PLAN_READY'      // Plan complete, waiting for "Start Coding"
  | 'CODING'          // Builder Mode: Generating PHP files
  | 'VERIFYING'       // Tester Mode: Running Dry Run on Backend
  | 'ERROR_DETECTED'  // Test failed, showing error to user
  | 'PLANNING_FIX'    // Debugger Mode: Streaming fix strategy
  | 'FIX_READY';      // Fix strategy ready, waiting for "Apply Fix"

// The state object held by App.tsx to control the UI Overlay
export interface AgentStatus {
  state: AgentState;
  message: string;        // e.g., "Architecting solution...", "Verifying code..."
  streamContent: string;  // The real-time Markdown text from the AI
  error?: string;         // If verification fails, this holds the PHP error message
}

export interface File {
  path: string;
  content: string;
  language: string;
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
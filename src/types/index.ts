export interface PushoverMessage {
  token: string;
  user: string;
  message: string;
  title?: string;
  priority?: number;
  sound?: string;
  timestamp?: number;
}

export interface PushoverResponse {
  status: number;
  request: string;
  errors?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
  handler: (args: unknown) => Promise<any>;
}
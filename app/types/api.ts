export type AgentRequest = { userMessage: string };

export type AgentResponse = { response?: string; error?: string };

// New types for streaming
export enum StreamMessageType {
  AGENT_RESPONSE = "agent_response",
  SWAP_STATUS = "swap_status",
  DETAILED_STATUS = "detailed_status",
}

export type AgentStreamResponse = {
  type: StreamMessageType.AGENT_RESPONSE;
  content: string;
};

export type SwapStatusStreamResponse = {
  type: StreamMessageType.SWAP_STATUS;
  status: string;
};

export type DetailedStatusStreamResponse = {
  type: StreamMessageType.DETAILED_STATUS;
  message: string;
};

export type StreamEvent = AgentStreamResponse | SwapStatusStreamResponse | DetailedStatusStreamResponse;

export interface CampaignInfo {
  id: number;
  name: string;
}

export interface ChatResponse {
  action: string;
  reply: string;
  schemaIds?: string[];
  campaign?: CampaignInfo;
  thinking?: string;
}

export interface VerificationResult {
  schemaId: string;
  title: string;
  success: boolean;
  proof?: string;
  error?: string;
}

export interface BatchResult {
  results: VerificationResult[];
  campaign?: CampaignInfo;
}

export type EventMap = {
  status: string;
  result: BatchResult;
  chatProgress: { step: string; message: string };
  chatResult: ChatResponse;
  error: string;
};

export type EventType = keyof EventMap;

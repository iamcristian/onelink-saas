import { ThreatType, SecurityFlagStatus } from '@repo/prisma';

export interface SentinelEvaluationResult {
  isSafe: boolean;
  riskScore: number; // 0.0000 to 1.0000
  threatType?: ThreatType;
  aiConfidence: number; // 0.0000 to 1.0000
  action: 'ALLOW' | 'FLAG_FOR_REVIEW' | 'BLOCK_IMMEDIATE';
  signals: string[];
  entropy: number;
  normalizedDomain: string;
  latencyMs: number;
}

export interface SecurityFlagCreationParams {
  userId: string;
  submittedUrl: string;
  riskScore: number;
  threatType: ThreatType;
  aiConfidence: number;
  ipAddress?: string;
  status: SecurityFlagStatus;
  resolutionNotes?: string;
}

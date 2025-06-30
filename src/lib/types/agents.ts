export interface UserPreferences {
  riskTolerance: 'low' | 'medium' | 'high';
  maxInvestment: number;
  preferredAssets: string[];
  timeHorizon: 'short' | 'medium' | 'long';
  minReturnRate: number;
  excludedProtocols?: string[];
}

export interface PreferenceSchema {
  id: string;
  userId: string;
  preferences: UserPreferences;
  generatedAt: Date;
  constraints: {
    maxSlippage: number;
    minLiquidity: number;
    gasLimit: number;
  };
}

export interface ArbitrageOpportunity {
  id: string;
  type: 'dex-arbitrage' | 'cross-chain' | 'lending-borrowing' | 'staking-rewards';
  assetPair: string;
  protocolA: string;
  protocolB: string;
  priceA: number;
  priceB: number;
  expectedReturn: number;
  requiredCapital: number;
  gasEstimate: number;
  risk: 'low' | 'medium' | 'high';
  liquidity: number;
  timeDecay: number; // in minutes
  detectedAt: Date;
  expiresAt: Date;
  status: 'active' | 'executing' | 'completed' | 'expired';
}

export interface AllocationRecommendation {
  opportunityId: string;
  userId: string;
  allocatedAmount: number;
  confidence: number;
  reasoning: string;
  createdAt: Date;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  agentType: 'preference' | 'arbitrage' | 'matching';
  recipientId?: string;
  content: string;
  messageType: 'info' | 'request' | 'response' | 'alert';
  timestamp: Date;
  data?: any;
}

export interface Agent {
  id: string;
  type: 'preference' | 'arbitrage' | 'matching';
  name: string;
  status: 'active' | 'idle' | 'processing';
  lastActivity: Date;
} 
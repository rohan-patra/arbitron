export interface ArbitrageOpportunity {
  id: string;
  pair: string;
  sourceChain: string;
  targetChain: string;
  profitPercentage: number;
  confidenceScore: number;
  riskLevel: "low" | "medium" | "high";
  estimatedProfit: number;
  gasEstimate: number;
  timeToExpire: number;
  aiAnalysis: string;
}

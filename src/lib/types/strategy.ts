export interface PerformanceMetrics {
  apy: number;
  sharpeRatio: number;
  volatility: number;
  history: Array<{ date: string; value: number }>;
}

export interface TokenizedStrategy {
  id: string;
  name: string;
  description: string;
  tokenSymbol: string;
  totalSupply: number;
  currentPrice: number;
  apy: number;
  riskScore: number;
  tvl: number;
  performance: PerformanceMetrics;
  chainlinkProof: string;
}

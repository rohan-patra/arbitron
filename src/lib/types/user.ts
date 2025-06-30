export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export type PortfolioAllocation = Record<string, number>;

export interface RiskProfile {
  userId: string;
  riskTolerance: number; // 1-10 scale
  maxPositionSize: number;
  preferredChains: string[];
  autoExecute: boolean;
  notifications: NotificationSettings;
  portfolio: PortfolioAllocation;
}

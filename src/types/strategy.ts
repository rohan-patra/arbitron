export interface Strategy {
  strategyId: string;
  strategyName: string;
  description: string;
  riskProfile: {
    riskTolerance: "conservative" | "moderate" | "aggressive";
    maxDrawdown: number;
    volatilityLimit: number;
    concentrationLimit: number;
  };
  capitalAllocation: {
    totalAllocation: number;
    reserveRatio: number;
    maxPositionSize: number;
    minPositionSize: number;
  };
  arbitrageTypes: {
    crossChain: {
      enabled: boolean;
      weight: number;
      inventoryBased: boolean;
      bridgeBased: boolean;
      maxBridgeTime: number;
    };
    crossExchange: {
      enabled: boolean;
      weight: number;
      cexToCex: boolean;
      cexToDex: boolean;
      dexToDex: boolean;
    };
    triangular: {
      enabled: boolean;
      weight: number;
      singleChain: boolean;
      crossChain: boolean;
    };
    flashLoan: {
      enabled: boolean;
      weight: number;
      maxLeverageRatio: number;
    };
    yieldArbitrage: {
      enabled: boolean;
      weight: number;
      lendingProtocols: string[];
    };
  };
  executionParameters: {
    minProfitThreshold: number;
    maxSlippage: number;
    maxGasFee: number;
    executionSpeed: "instant" | "fast" | "standard" | "economic";
    mevProtection: boolean;
  };
  chainPreferences: {
    preferredChains: string[];
    excludedChains: string[];
    l1Chains: { enabled: boolean; weight: number };
    l2Chains: { enabled: boolean; weight: number };
    sidechains: { enabled: boolean; weight: number };
  };
  bridgePreferences: {
    preferredBridges: string[];
    excludedBridges: string[];
    maxBridgeFee: number;
    nativeBridges: { enabled: boolean; weight: number };
    multichainBridges: { enabled: boolean; weight: number };
  };
  tokenFilters: {
    allowedTokens: string[];
    excludedTokens: string[];
    stablecoinsOnly: boolean;
    minLiquidity: number;
    maxVolatility: number;
    minMarketCap: number;
  };
  timeConstraints: {
    operatingHours: {
      enabled: boolean;
      timezone: string;
      startTime: string;
      endTime: string;
    };
    maxHoldingPeriod: number;
    rebalanceFrequency: number;
  };
  monitoring: {
    priceDataSources: string[];
    updateFrequency: number;
    alertThresholds: {
      profitAlert: number;
      lossAlert: number;
      volumeAlert: number;
    };
  };
  riskManagement: {
    stopLoss: { enabled: boolean; threshold: number };
    positionLimits: {
      maxConcurrentTrades: number;
      maxChainExposure: number;
      maxProtocolExposure: number;
    };
    emergencyControls: {
      pauseOnVolatility: boolean;
      pauseThreshold: number;
      autoLiquidate: boolean;
    };
  };
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

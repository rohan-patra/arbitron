"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Strategy } from "~/types/strategy";

const defaultStrategy: Omit<Strategy, "strategyId"> = {
  strategyName: "",
  description: "",
  riskProfile: {
    riskTolerance: "moderate",
    maxDrawdown: 10,
    volatilityLimit: 20,
    concentrationLimit: 25,
  },
  capitalAllocation: {
    totalAllocation: 1000,
    reserveRatio: 20,
    maxPositionSize: 200,
    minPositionSize: 50,
  },
  arbitrageTypes: {
    crossChain: {
      enabled: true,
      weight: 50,
      inventoryBased: true,
      bridgeBased: false,
      maxBridgeTime: 600,
    },
    crossExchange: {
      enabled: true,
      weight: 30,
      cexToCex: false,
      cexToDex: true,
      dexToDex: true,
    },
    triangular: {
      enabled: false,
      weight: 0,
      singleChain: false,
      crossChain: false,
    },
    flashLoan: {
      enabled: false,
      weight: 0,
      maxLeverageRatio: 1,
    },
    yieldArbitrage: {
      enabled: false,
      weight: 0,
      lendingProtocols: [],
    },
  },
  executionParameters: {
    minProfitThreshold: 10,
    maxSlippage: 2,
    maxGasFee: 20,
    executionSpeed: "fast",
    mevProtection: true,
  },
  chainPreferences: {
    preferredChains: ["ethereum", "arbitrum"],
    excludedChains: [],
    l1Chains: { enabled: true, weight: 60 },
    l2Chains: { enabled: true, weight: 40 },
    sidechains: { enabled: false, weight: 0 },
  },
  bridgePreferences: {
    preferredBridges: ["layerzero"],
    excludedBridges: [],
    maxBridgeFee: 10,
    nativeBridges: { enabled: true, weight: 80 },
    multichainBridges: { enabled: true, weight: 20 },
  },
  tokenFilters: {
    allowedTokens: [],
    excludedTokens: [],
    stablecoinsOnly: false,
    minLiquidity: 100000,
    maxVolatility: 50,
    minMarketCap: 1000000,
  },
  timeConstraints: {
    operatingHours: {
      enabled: false,
      timezone: "UTC",
      startTime: "00:00",
      endTime: "23:59",
    },
    maxHoldingPeriod: 3600,
    rebalanceFrequency: 86400,
  },
  monitoring: {
    priceDataSources: ["chainlink"],
    updateFrequency: 30000,
    alertThresholds: {
      profitAlert: 100,
      lossAlert: 50,
      volumeAlert: 500000,
    },
  },
  riskManagement: {
    stopLoss: { enabled: true, threshold: 5 },
    positionLimits: {
      maxConcurrentTrades: 5,
      maxChainExposure: 40,
      maxProtocolExposure: 30,
    },
    emergencyControls: {
      pauseOnVolatility: true,
      pauseThreshold: 15,
      autoLiquidate: false,
    },
  },
};

export default function StrategyPage() {
  const params = useParams();
  const router = useRouter();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [originalStrategy, setOriginalStrategy] = useState<Strategy | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("basic");

  const isNewStrategy = params.id === "new";

  // Check if current strategy differs from original
  const hasChanges =
    strategy &&
    originalStrategy &&
    JSON.stringify(strategy) !== JSON.stringify(originalStrategy);

  useEffect(() => {
    if (isNewStrategy) {
      const newStrategy = {
        ...defaultStrategy,
        strategyId: `strategy-${Date.now()}`,
      };
      setStrategy(newStrategy);
      setOriginalStrategy(newStrategy);
      setLoading(false);
    } else {
      fetch("/api/strategies")
        .then((res) => res.json())
        .then((strategies: Strategy[]) => {
          const found = strategies.find(
            (s: Strategy) => s.strategyId === params.id,
          );
          if (found) {
            setStrategy(found);
            setOriginalStrategy(found);
          } else {
            router.push("/strategies");
          }
          setLoading(false);
        })
        .catch(() => {
          router.push("/strategies");
        });
    }
  }, [params.id, isNewStrategy, router]);

  const updateStrategy = (updates: Partial<Strategy>) => {
    if (strategy) {
      setStrategy({ ...strategy, ...updates });
    }
  };

  const updateNestedField = (path: string, value: unknown) => {
    if (!strategy) return;

    const keys = path.split(".");
    const newStrategy = { ...strategy };
    let current: Record<string, unknown> = newStrategy as Record<
      string,
      unknown
    >;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && typeof current[key] === "object" && current[key] !== null) {
        current[key] = { ...(current[key] as Record<string, unknown>) };
        current = current[key] as Record<string, unknown>;
      }
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }

    setStrategy(newStrategy);
  };

  const handleAIGenerate = async () => {
    if (!strategy || !prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/strategies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStrategy: strategy,
          prompt: prompt.trim(),
        }),
      });

      if (response.ok) {
        const updatedStrategy = (await response.json()) as Strategy;
        setStrategy(updatedStrategy);
        setPrompt("");
      }
    } catch (error) {
      console.error("Failed to generate strategy:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!strategy) return;

    try {
      if (isNewStrategy) {
        await fetch("/api/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(strategy),
        });
      } else {
        await fetch("/api/strategies/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(strategy),
        });
      }
      router.push("/strategies");
    } catch (error) {
      console.error("Failed to save strategy:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!strategy) return null;

  const sections = [
    { id: "basic", label: "Basic Info" },
    { id: "risk", label: "Risk Profile" },
    { id: "capital", label: "Capital" },
    { id: "arbitrage", label: "Arbitrage Types" },
    { id: "execution", label: "Execution" },
    { id: "chains", label: "Chains" },
    { id: "bridges", label: "Bridges" },
    { id: "tokens", label: "Tokens" },
    { id: "time", label: "Time" },
    { id: "monitoring", label: "Monitoring" },
    { id: "management", label: "Risk Management" },
  ];

  return (
    <div className="-m-6 flex h-screen bg-white">
      {/* Left Panel - Form */}
      <div className="w-1/2 overflow-y-auto border-r bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold">
              {isNewStrategy ? "Create Strategy" : "Edit Strategy"}
            </h1>
            <p className="text-gray-600">AI-Powered Configuration</p>
          </div>

          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="rounded bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
              >
                Save Strategy
              </button>
              <button
                onClick={() => router.push("/strategies")}
                className="rounded border px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Strategy Name */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">
            Strategy Name
          </label>
          <input
            type="text"
            value={strategy.strategyName}
            onChange={(e) => updateStrategy({ strategyName: e.target.value })}
            className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Enter strategy name..."
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea
            value={strategy.description}
            onChange={(e) => updateStrategy({ description: e.target.value })}
            rows={3}
            className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Describe your strategy..."
          />
        </div>

        {/* Section Navigation */}
        <div className="mb-6 flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`rounded border px-3 py-1 text-sm transition-colors ${
                activeSection === section.id
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Form Sections */}
        <div className="space-y-4">
          {activeSection === "risk" && (
            <div className="rounded border p-4">
              <h3 className="mb-4 font-medium">Risk Profile</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Risk Tolerance
                  </label>
                  <select
                    value={strategy.riskProfile.riskTolerance}
                    onChange={(e) =>
                      updateNestedField(
                        "riskProfile.riskTolerance",
                        e.target.value,
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Max Drawdown (%)
                  </label>
                  <input
                    type="number"
                    value={strategy.riskProfile.maxDrawdown}
                    onChange={(e) =>
                      updateNestedField(
                        "riskProfile.maxDrawdown",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Volatility Limit (%)
                  </label>
                  <input
                    type="number"
                    value={strategy.riskProfile.volatilityLimit}
                    onChange={(e) =>
                      updateNestedField(
                        "riskProfile.volatilityLimit",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Concentration Limit (%)
                  </label>
                  <input
                    type="number"
                    value={strategy.riskProfile.concentrationLimit}
                    onChange={(e) =>
                      updateNestedField(
                        "riskProfile.concentrationLimit",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "capital" && (
            <div className="rounded border p-4">
              <h3 className="mb-4 font-medium">Capital Allocation</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Total Allocation ($)
                  </label>
                  <input
                    type="number"
                    value={strategy.capitalAllocation.totalAllocation}
                    onChange={(e) =>
                      updateNestedField(
                        "capitalAllocation.totalAllocation",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Reserve Ratio (%)
                  </label>
                  <input
                    type="number"
                    value={strategy.capitalAllocation.reserveRatio}
                    onChange={(e) =>
                      updateNestedField(
                        "capitalAllocation.reserveRatio",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Max Position Size ($)
                  </label>
                  <input
                    type="number"
                    value={strategy.capitalAllocation.maxPositionSize}
                    onChange={(e) =>
                      updateNestedField(
                        "capitalAllocation.maxPositionSize",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Min Position Size ($)
                  </label>
                  <input
                    type="number"
                    value={strategy.capitalAllocation.minPositionSize}
                    onChange={(e) =>
                      updateNestedField(
                        "capitalAllocation.minPositionSize",
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "arbitrage" && (
            <div className="rounded border p-4">
              <h3 className="mb-4 font-medium">Arbitrage Types</h3>

              <div className="space-y-4">
                <div className="rounded border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={strategy.arbitrageTypes.crossChain.enabled}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossChain.enabled",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      <span className="font-medium">Cross-Chain</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Weight:</label>
                      <input
                        type="number"
                        value={strategy.arbitrageTypes.crossChain.weight}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossChain.weight",
                            Number(e.target.value),
                          )
                        }
                        className="w-16 rounded border px-2 py-1 text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          strategy.arbitrageTypes.crossChain.inventoryBased
                        }
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossChain.inventoryBased",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      Inventory Based
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={strategy.arbitrageTypes.crossChain.bridgeBased}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossChain.bridgeBased",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      Bridge Based
                    </label>
                  </div>
                </div>

                <div className="rounded border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={strategy.arbitrageTypes.crossExchange.enabled}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossExchange.enabled",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      <span className="font-medium">Cross-Exchange</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Weight:</label>
                      <input
                        type="number"
                        value={strategy.arbitrageTypes.crossExchange.weight}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossExchange.weight",
                            Number(e.target.value),
                          )
                        }
                        className="w-16 rounded border px-2 py-1 text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={strategy.arbitrageTypes.crossExchange.cexToCex}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossExchange.cexToCex",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      CEX-CEX
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={strategy.arbitrageTypes.crossExchange.cexToDex}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossExchange.cexToDex",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      CEX-DEX
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={strategy.arbitrageTypes.crossExchange.dexToDex}
                        onChange={(e) =>
                          updateNestedField(
                            "arbitrageTypes.crossExchange.dexToDex",
                            e.target.checked,
                          )
                        }
                        className="mr-2"
                      />
                      DEX-DEX
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - AI Prompt */}
      <div className="flex w-1/2 flex-col bg-white">
        <div className="border-b p-6">
          <h2 className="mb-2 text-xl font-semibold">AI Strategy Assistant</h2>
          <p className="text-sm text-gray-600">
            Describe how you want to modify your strategy and the AI will update
            the settings automatically.
          </p>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="relative flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: 'I want a more conservative strategy with lower risk tolerance, focusing on stablecoin arbitrage between DEXes, with a maximum drawdown of 3% and keeping 40% in reserves.'"
              className="h-40 w-full resize-none rounded border p-4 pr-20 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleAIGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="absolute right-2 bottom-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "..." : "Generate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

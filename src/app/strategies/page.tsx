"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Strategy, UserData } from "~/types/strategy";

interface ArbitrageOpportunity {
  id: string;
  type: string;
  profitPercent: number;
  maxFundAllocationUSD: number;
  durationSeconds: number;
  chainsInvolved: string[];
  tokensInvolved: string[];
  bridgesUsed: string[];
  exchangesInvolved: { cex: string[]; dex: string[] };
  riskLevel: string;
  executionSpeed: string;
  gasFeeUSD: number;
  slippagePercent: number;
  inventoryBased: boolean;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fundingStrategy, setFundingStrategy] = useState<string | null>(null);
  const [deallocatingStrategy, setDeallocatingStrategy] = useState<
    string | null
  >(null);
  const [fundAmount, setFundAmount] = useState("");
  const [deallocateAmount, setDeallocateAmount] = useState("");

  // Arbitrage demo state
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>(
    [],
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/strategies").then((res) => res.json()),
      fetch("/api/user").then((res) => res.json()),
      fetch("/arb-opportunities.json").then((res) => res.json()),
    ])
      .then(
        ([strategiesData, userData, opportunitiesData]: [
          unknown,
          unknown,
          unknown,
        ]) => {
          if (Array.isArray(strategiesData)) {
            setStrategies(strategiesData as Strategy[]);
          } else {
            setStrategies([]);
          }
          if (
            userData &&
            typeof userData === "object" &&
            "wallet" in userData
          ) {
            setUserData(userData as UserData);
          }
          if (Array.isArray(opportunitiesData)) {
            setOpportunities(opportunitiesData as ArbitrageOpportunity[]);
          }
          setLoading(false);
        },
      )
      .catch(() => {
        setStrategies([]);
        setLoading(false);
      });
  }, []);

  // Arbitrage execution demo
  useEffect(() => {
    if (opportunities.length === 0) return;

    const scheduleNextExecution = () => {
      const delay = Math.random() * 10000 + 5000; // 5-15 seconds
      timeoutRef.current = setTimeout(() => {
        executeArbitrageDemo();
      }, delay);
    };

    const executeArbitrageDemo = async () => {
      if (isExecuting) return;

      // Get fresh strategies data
      const currentStrategies = strategies.filter((s) => s.fundedAmount > 0);
      if (currentStrategies.length === 0) {
        console.log("No funded strategies available");
        scheduleNextExecution();
        return;
      }

      console.log(
        "Starting arbitrage execution with strategies:",
        currentStrategies.map((s) => ({
          id: s.strategyId,
          funded: s.fundedAmount,
        })),
      );
      setIsExecuting(true);

      try {
        const response = await fetch("/api/strategies/execute-demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategies: currentStrategies,
            opportunities,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("API response:", result);

          const {
            logs: generatedLogs,
            selectedStrategy,
            selectedOpportunity: _selectedOpportunity,
            executionTime,
            profitPercent,
            allocatedAmount,
          } = result;

          // Calculate profit amount from percentage and allocated amount
          const profitAmount = allocatedAmount * profitPercent;

          // Add logs progressively
          for (let i = 0; i < generatedLogs.length; i++) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 2000 + 500),
            );

            const logEntry: LogEntry = {
              timestamp: new Date().toLocaleTimeString(),
              message: generatedLogs[i],
              type:
                i === 0
                  ? "info"
                  : i === generatedLogs.length - 1
                    ? "success"
                    : "info",
            };

            setLogs((prev) => [...prev, logEntry]);
          }

          // Wait for execution to complete, then update strategy funding
          setTimeout(() => {
            if (selectedStrategy && profitAmount > 0) {
              console.log(
                `Adding profit: $${profitAmount.toFixed(2)} to strategy ${selectedStrategy}`,
              );

              setStrategies((prev) => {
                const updated = prev.map((s) =>
                  s.strategyId === selectedStrategy
                    ? { ...s, fundedAmount: s.fundedAmount + profitAmount }
                    : s,
                );
                console.log(
                  "Updated strategies:",
                  updated.map((s) => ({
                    id: s.strategyId,
                    funded: s.fundedAmount,
                  })),
                );
                return updated;
              });

              const completionLog: LogEntry = {
                timestamp: new Date().toLocaleTimeString(),
                message: `✅ Arbitrage completed successfully. Profit: $${profitAmount.toFixed(2)} (${(profitPercent * 100).toFixed(2)}%) added to ${currentStrategies.find((s) => s.strategyId === selectedStrategy)?.strategyName}`,
                type: "success",
              };

              setLogs((prev) => [...prev, completionLog]);
            }

            setIsExecuting(false);
            scheduleNextExecution();
          }, executionTime);
        } else {
          setIsExecuting(false);
          scheduleNextExecution();
        }
      } catch (error) {
        console.error("Demo execution failed:", error);
        setIsExecuting(false);
        scheduleNextExecution();
      }
    };

    scheduleNextExecution();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [opportunities]); // Only depend on opportunities to avoid infinite re-renders

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "conservative":
        return "text-green-600";
      case "moderate":
        return "text-yellow-600";
      case "aggressive":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const handleFundStrategy = async () => {
    if (!fundingStrategy || !fundAmount || !userData) return;

    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > (userData?.wallet?.usdcBalance ?? 0)) {
      alert("Insufficient balance");
      return;
    }

    try {
      const response = await fetch("/api/strategies/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId: fundingStrategy, amount }),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          newBalance: number;
          newFundedAmount: number;
        };

        // Update local state
        setUserData((prev) =>
          prev ? { ...prev, wallet: { usdcBalance: result.newBalance } } : null,
        );
        setStrategies((prev) =>
          prev.map((s) =>
            s.strategyId === fundingStrategy
              ? { ...s, fundedAmount: result.newFundedAmount }
              : s,
          ),
        );

        setFundingStrategy(null);
        setFundAmount("");
      } else {
        const error = (await response.json()) as { error?: string };
        alert(error.error ?? "Failed to fund strategy");
      }
    } catch {
      alert("Failed to fund strategy");
    }
  };

  const handleDeallocateStrategy = async () => {
    if (!deallocatingStrategy || !deallocateAmount || !userData) return;

    const amount = parseFloat(deallocateAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const strategy = strategies.find(
      (s) => s.strategyId === deallocatingStrategy,
    );
    if (!strategy || amount > strategy.fundedAmount) {
      alert("Insufficient funds in strategy");
      return;
    }

    try {
      const response = await fetch("/api/strategies/deallocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId: deallocatingStrategy, amount }),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          newBalance: number;
          newFundedAmount: number;
        };

        // Update local state
        setUserData((prev) =>
          prev ? { ...prev, wallet: { usdcBalance: result.newBalance } } : null,
        );
        setStrategies((prev) =>
          prev.map((s) =>
            s.strategyId === deallocatingStrategy
              ? { ...s, fundedAmount: result.newFundedAmount }
              : s,
          ),
        );

        setDeallocatingStrategy(null);
        setDeallocateAmount("");
      } else {
        const error = (await response.json()) as { error?: string };
        alert(error.error ?? "Failed to deallocate funds");
      }
    } catch {
      alert("Failed to deallocate funds");
    }
  };

  return (
    <div className="min-h-full bg-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">Trading Strategies</h1>
          <p className="text-gray-600">
            Manage your AI-powered arbitrage strategies and create new ones
          </p>
        </div>

        {userData && (
          <div className="text-right">
            <div className="text-lg font-semibold">
              ${(userData?.wallet?.usdcBalance ?? 0).toLocaleString()} USDC
            </div>
            <div className="text-sm text-gray-500">Available Balance</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading strategies...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <div key={strategy.strategyId} className="rounded border p-4">
              <div className="mb-3">
                <h3 className="mb-1 text-lg font-semibold">
                  {strategy.strategyName}
                </h3>
                <p className="line-clamp-2 text-sm text-gray-600">
                  {strategy.description}
                </p>
              </div>

              <div className="mb-3 flex items-center justify-between border-t pt-3">
                <span
                  className={`text-sm font-medium ${getRiskColor(strategy.riskProfile.riskTolerance)}`}
                >
                  {strategy.riskProfile.riskTolerance}
                </span>
                <div className="text-right">
                  <div className="font-semibold">
                    ${(strategy.fundedAmount ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">funded</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/strategies/${strategy.strategyId}`}
                  className="flex-1 rounded bg-green-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setFundingStrategy(strategy.strategyId)}
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Fund
                </button>

                {strategy.fundedAmount > 0 && (
                  <button
                    onClick={() => setDeallocatingStrategy(strategy.strategyId)}
                    className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                  >
                    Deallocate
                  </button>
                )}
              </div>
            </div>
          ))}

          <Link
            href="/strategies/new"
            className="flex min-h-[140px] flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 p-6 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600"
          >
            <div className="mb-2 text-2xl">+</div>
            <div className="font-medium">New Strategy</div>
            <div className="mt-1 text-center text-sm">
              Create an AI-powered arbitrage strategy
            </div>
          </Link>
        </div>
      )}

      {/* Arbitrage Execution Logs */}
      <div className="mt-8">
        <button
          onClick={() => setIsLogsExpanded(!isLogsExpanded)}
          className="mb-4 flex w-full items-center justify-between rounded border p-3 font-medium transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <span>Arbitrage Execution Logs</span>
            {isExecuting && (
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            )}
            {logs.length > 0 && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                {logs.length} entries
              </span>
            )}
          </div>
          <span
            className={`transition-transform ${isLogsExpanded ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>

        {isLogsExpanded && (
          <div className="rounded border bg-black font-mono text-sm text-green-400">
            <div className="border-b border-gray-700 bg-gray-900 px-4 py-2 text-white">
              <span className="text-gray-400">●</span> Arbitrage Agent Terminal
            </div>
            <div className="max-h-96 overflow-x-hidden overflow-y-auto p-4">
              {logs.length === 0 ? (
                <div className="text-gray-500">
                  Waiting for arbitrage opportunities...
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0 text-xs whitespace-nowrap text-gray-500">
                        [{log.timestamp}]
                      </span>
                      <span
                        className={`leading-relaxed break-words whitespace-pre-wrap ${
                          log.type === "success"
                            ? "text-green-400"
                            : log.type === "warning"
                              ? "text-yellow-400"
                              : log.type === "error"
                                ? "text-red-400"
                                : "text-gray-300"
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Funding Modal */}
      {fundingStrategy && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-w-90vw w-96 rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold">Fund Strategy</h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="Enter amount..."
                className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                min="0"
                step="0.01"
              />
            </div>

            <div className="mb-6 text-sm text-gray-600">
              Available: ${userData?.wallet.usdcBalance.toLocaleString()} USDC
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleFundStrategy}
                className="flex-1 rounded bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
              >
                Confirm Deposit
              </button>
              <button
                onClick={() => {
                  setFundingStrategy(null);
                  setFundAmount("");
                }}
                className="rounded border px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deallocate Modal */}
      {deallocatingStrategy && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-w-90vw w-96 rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold">Deallocate Funds</h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={deallocateAmount}
                onChange={(e) => setDeallocateAmount(e.target.value)}
                placeholder="Enter amount..."
                className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                min="0"
                step="0.01"
              />
            </div>

            <div className="mb-6 text-sm text-gray-600">
              Funded: $
              {strategies
                .find((s) => s.strategyId === deallocatingStrategy)
                ?.fundedAmount?.toLocaleString() ?? 0}{" "}
              USDC
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeallocateStrategy}
                className="flex-1 rounded bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
              >
                Confirm Withdrawal
              </button>
              <button
                onClick={() => {
                  setDeallocatingStrategy(null);
                  setDeallocateAmount("");
                }}
                className="rounded border px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

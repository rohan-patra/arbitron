"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Strategy, UserData } from "~/types/strategy";

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

  useEffect(() => {
    Promise.all([
      fetch("/api/strategies").then((res) => res.json()),
      fetch("/api/user").then((res) => res.json()),
    ])
      .then(([strategiesData, userData]: [unknown, unknown]) => {
        if (Array.isArray(strategiesData)) {
          setStrategies(strategiesData as Strategy[]);
        } else {
          setStrategies([]);
        }
        if (userData && typeof userData === "object" && "wallet" in userData) {
          setUserData(userData as UserData);
        }
        setLoading(false);
      })
      .catch(() => {
        setStrategies([]);
        setLoading(false);
      });
  }, []);

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
    } catch (_error) {
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
    } catch (_error) {
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

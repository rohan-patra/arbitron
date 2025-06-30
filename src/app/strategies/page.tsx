"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Strategy } from "~/types/strategy";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/strategies")
      .then((res) => res.json())
      .then((data) => {
        setStrategies(Array.isArray(data) ? data : []);
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

  return (
    <div className="min-h-full bg-white">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">Trading Strategies</h1>
        <p className="text-gray-600">
          Manage your AI-powered arbitrage strategies and create new ones
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading strategies...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <Link
              key={strategy.strategyId}
              href={`/strategies/${strategy.strategyId}`}
              className="block rounded border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="mb-3">
                <h3 className="mb-1 text-lg font-semibold">
                  {strategy.strategyName}
                </h3>
                <p className="line-clamp-2 text-sm text-gray-600">
                  {strategy.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span
                  className={`text-sm font-medium ${getRiskColor(strategy.riskProfile.riskTolerance)}`}
                >
                  {strategy.riskProfile.riskTolerance}
                </span>
                <div className="text-right">
                  <div className="font-semibold">
                    $
                    {strategy.capitalAllocation.totalAllocation.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">allocated</div>
                </div>
              </div>
            </Link>
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
    </div>
  );
}

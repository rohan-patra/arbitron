"use client";

import { useState, useEffect } from "react";

interface ArbitrageType {
  enabled: boolean;
  priority: number;
  scanInterval: number;
  detectionLogic: {
    type: string;
  } & Record<string, unknown>;
  dataRequirements: string[];
  executionRequirements: Record<string, unknown>;
}

interface ArbitrageConfig {
  arbitrageDetectionConfig: {
    globalSettings: {
      scanInterval: number;
      maxConcurrentScans: number;
      minProfitThreshold: number;
      gasEstimationBuffer: number;
    };
    arbitrageTypes: Record<string, ArbitrageType>;
    detectionPipeline: {
      dataIngestion: {
        sources: string[];
        caching: boolean;
        validation: boolean;
      };
      opportunityScoring: {
        profitWeight: number;
        riskWeight: number;
        executionSpeedWeight: number;
        competitionWeight: number;
      };
      executionQueue: {
        prioritization: string;
        conflictResolution: string;
        resourceAllocation: string;
      };
    };
  };
}

export default function ArbitrageConfigPage() {
  const [config, setConfig] = useState<ArbitrageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/arb-definitions.json");
        if (!response.ok) {
          throw new Error("Failed to load arbitrage configuration");
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const formatCamelCase = (str: string) => {
    return str
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? "text-green-600" : "text-gray-400";
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return "text-green-600";
    if (priority <= 6) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-full bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">
            Loading arbitrage configuration...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-full bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">No configuration data available</div>
        </div>
      </div>
    );
  }

  const { globalSettings, arbitrageTypes, detectionPipeline } =
    config.arbitrageDetectionConfig;
  const enabledTypes = Object.entries(arbitrageTypes).filter(
    ([, type]) => type.enabled,
  );
  const disabledTypes = Object.entries(arbitrageTypes).filter(
    ([, type]) => !type.enabled,
  );

  return (
    <div className="min-h-full bg-white">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">Arbitrage Configuration</h1>
        <p className="text-gray-600">
          Current arbitrage detection settings and strategies
        </p>
      </div>

      {/* Global Settings */}
      <div className="mb-6 rounded border p-6">
        <h2 className="mb-4 text-xl font-semibold">Global Settings</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm text-gray-600">Scan Interval</div>
            <div className="font-semibold">{globalSettings.scanInterval}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Max Concurrent Scans</div>
            <div className="font-semibold">
              {globalSettings.maxConcurrentScans}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Min Profit Threshold</div>
            <div className="font-semibold">
              {(globalSettings.minProfitThreshold * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Gas Estimation Buffer</div>
            <div className="font-semibold">
              {globalSettings.gasEstimationBuffer}x
            </div>
          </div>
        </div>
      </div>

      {/* Detection Pipeline */}
      <div className="mb-6 rounded border p-6">
        <h2 className="mb-4 text-xl font-semibold">Detection Pipeline</h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Data Ingestion */}
          <div>
            <h3 className="mb-3 text-lg font-medium">Data Ingestion</h3>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-600">Sources</div>
                <div className="text-sm">
                  {detectionPipeline.dataIngestion.sources.join(", ")}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Caching</span>
                <span
                  className={`text-sm ${detectionPipeline.dataIngestion.caching ? "text-green-600" : "text-gray-400"}`}
                >
                  {detectionPipeline.dataIngestion.caching
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Validation</span>
                <span
                  className={`text-sm ${detectionPipeline.dataIngestion.validation ? "text-green-600" : "text-gray-400"}`}
                >
                  {detectionPipeline.dataIngestion.validation
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Opportunity Scoring */}
          <div>
            <h3 className="mb-3 text-lg font-medium">Opportunity Scoring</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Profit Weight</span>
                <span className="text-sm font-medium">
                  {(
                    detectionPipeline.opportunityScoring.profitWeight * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Weight</span>
                <span className="text-sm font-medium">
                  {(
                    detectionPipeline.opportunityScoring.riskWeight * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Speed Weight</span>
                <span className="text-sm font-medium">
                  {(
                    detectionPipeline.opportunityScoring.executionSpeedWeight *
                    100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Competition Weight
                </span>
                <span className="text-sm font-medium">
                  {(
                    detectionPipeline.opportunityScoring.competitionWeight * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Execution Queue */}
          <div>
            <h3 className="mb-3 text-lg font-medium">Execution Queue</h3>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-600">Prioritization</div>
                <div className="text-sm font-medium">
                  {formatCamelCase(
                    detectionPipeline.executionQueue.prioritization.replace(
                      /_/g,
                      " ",
                    ),
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Conflict Resolution</div>
                <div className="text-sm font-medium">
                  {formatCamelCase(
                    detectionPipeline.executionQueue.conflictResolution.replace(
                      /_/g,
                      " ",
                    ),
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Resource Allocation</div>
                <div className="text-sm font-medium">
                  {formatCamelCase(
                    detectionPipeline.executionQueue.resourceAllocation,
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Arbitrage Types */}
      <div className="mb-6 rounded border p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Active Arbitrage Types ({enabledTypes.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {enabledTypes.map(([typeName, typeConfig]) => (
            <div key={typeName} className="rounded border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {formatCamelCase(typeName)}
                </h3>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-sm font-medium ${getPriorityColor(typeConfig.priority)}`}
                  >
                    Priority {typeConfig.priority}
                  </span>
                  <span
                    className={`text-sm ${getStatusColor(typeConfig.enabled)}`}
                  >
                    ●
                  </span>
                </div>
              </div>

              <div className="mb-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Scan Interval</span>
                  <span>{typeConfig.scanInterval}ms</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Detection Type</span>
                  <span>
                    {formatCamelCase(
                      typeConfig.detectionLogic.type.replace(/_/g, " "),
                    )}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 text-sm font-medium text-gray-600">
                  Data Requirements
                </div>
                <div className="flex flex-wrap gap-1">
                  {typeConfig.dataRequirements.map((req, index) => (
                    <span
                      key={index}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                    >
                      {formatCamelCase(req.replace(/_/g, " "))}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">
                  Key Requirements
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(typeConfig.executionRequirements)
                    .filter(
                      ([, value]) => value === true || Array.isArray(value),
                    )
                    .slice(0, 3)
                    .map(([key, value], index) => (
                      <span
                        key={index}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                      >
                        {Array.isArray(value)
                          ? `${formatCamelCase(key.replace(/([A-Z])/g, " $1"))} (${value.length})`
                          : formatCamelCase(key.replace(/([A-Z])/g, " $1"))}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disabled Arbitrage Types */}
      {disabledTypes.length > 0 && (
        <div className="mb-6 rounded border p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-600">
            Disabled Arbitrage Types ({disabledTypes.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {disabledTypes.map(([typeName, typeConfig]) => (
              <div
                key={typeName}
                className="rounded border border-gray-200 p-3 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-600">
                    {formatCamelCase(typeName)}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">
                      Priority {typeConfig.priority}
                    </span>
                    <span
                      className={`text-sm ${getStatusColor(typeConfig.enabled)}`}
                    >
                      ●
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {formatCamelCase(
                    typeConfig.detectionLogic.type.replace(/_/g, " "),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

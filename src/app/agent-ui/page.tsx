"use client";

import React, { useState, useEffect } from "react";
import { AgentOrchestrator } from "../../lib/agents/AgentOrchestrator";
import type {
  AgentMessage,
  ArbitrageOpportunity,
  AllocationRecommendation,
  PreferenceSchema,
} from "../../lib/types/agents";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: "system" | "agent" | "user" | "error" | "debug" | "info" | "warn";
  source?: string;
  message: string;
  data?: unknown;
}

export default function TempTestPage() {
  const [orchestrator] = useState(() => new AgentOrchestrator());
  const [userText, setUserText] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    isRunning: boolean;
    metrics: {
      messagesExchanged: number;
      activeOpportunities: number;
      totalRecommendations: number;
      systemLogs: number;
    };
  } | null>(null);
  const [showDebugLogs, setShowDebugLogs] = useState(true);
  const [apiKeyStatus, setApiKeyStatus] = useState<
    "checking" | "valid" | "invalid"
  >("checking");

  const addLog = (
    type: LogEntry["type"],
    message: string,
    source?: string,
    data?: unknown,
  ) => {
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      source,
      message,
      data,
    };
    setLogs((prev) => [...prev, logEntry].slice(-200)); // Keep last 200 logs, newest at bottom
  };

  // Check API key on mount
  useEffect(() => {
    const checkApiKey = () => {
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (apiKey && apiKey.length > 10) {
        setApiKeyStatus("valid");
        addLog(
          "system",
          "OpenRouter API key detected and valid",
          "environment",
        );
      } else {
        setApiKeyStatus("invalid");
        addLog(
          "error",
          "OpenRouter API key not found or invalid. Set NEXT_PUBLIC_OPENROUTER_API_KEY in your .env file",
          "environment",
        );
      }
    };

    checkApiKey();
  }, []);

  useEffect(() => {
    // Set up comprehensive event listeners
    const handleAgentMessage = (message: AgentMessage) => {
      // Show the actual agent message content with better formatting
      const preview =
        message.content.length > 200
          ? `${message.content.substring(0, 200)}...`
          : message.content;
      addLog("agent", `💬 ${preview}`, `${message.agentType} agent`, message);
    };

    const handleOpportunityDiscovered = (opportunity: ArbitrageOpportunity) => {
      addLog(
        "system",
        `🎯 NEW OPPORTUNITY: ${opportunity.assetPair} | ${opportunity.protocolA} → ${opportunity.protocolB} | ${opportunity.expectedReturn.toFixed(2)}% return | ${opportunity.risk} risk | $${opportunity.requiredCapital.toFixed(0)} capital`,
        "arbitrage agent",
        opportunity,
      );
    };

    const handleRecommendationGenerated = (
      recommendation: AllocationRecommendation,
    ) => {
      addLog(
        "system",
        `💡 RECOMMENDATION: Allocate $${recommendation.allocatedAmount.toFixed(0)} to opportunity ${recommendation.opportunityId} (${(recommendation.confidence * 100).toFixed(0)}% confidence)`,
        "matching agent",
        recommendation,
      );
    };

    const handlePreferencesProcessed = (schema: PreferenceSchema) => {
      addLog(
        "system",
        `✅ USER PROFILE: ${schema.preferences.riskTolerance.toUpperCase()} risk tolerance | $${schema.preferences.maxInvestment.toLocaleString()} max investment | Assets: ${schema.preferences.preferredAssets.join(", ").toUpperCase()} | Min return: ${schema.preferences.minReturnRate}%`,
        "preference agent",
        schema,
      );
    };

    const handleSystemStarted = () => {
      addLog(
        "system",
        "Multi-agent system started successfully",
        "orchestrator",
      );
    };

    const handleSystemStopped = () => {
      addLog("system", "Multi-agent system stopped", "orchestrator");
    };

    // Handle system logs from orchestrator
    const handleSystemLog = (logData: {
      level: LogEntry["type"];
      message: string;
      source?: string;
      data?: unknown;
    }) => {
      // Don't filter debug logs here - let the UI filter them
      addLog(logData.level, logData.message, logData.source, logData.data);
    };

    orchestrator.on("agentMessage", handleAgentMessage);
    orchestrator.on("opportunityDiscovered", handleOpportunityDiscovered);
    orchestrator.on("recommendationGenerated", handleRecommendationGenerated);
    orchestrator.on("preferencesProcessed", handlePreferencesProcessed);
    orchestrator.on("systemStarted", handleSystemStarted);
    orchestrator.on("systemStopped", handleSystemStopped);
    orchestrator.on("systemLog", handleSystemLog);

    // Update system status periodically
    const statusInterval = setInterval(() => {
      setSystemStatus(orchestrator.getSystemStatus());
    }, 2000);

    // Start the system automatically if API key is valid
    if (apiKeyStatus === "valid") {
      orchestrator
        .start()
        .then(() => {
          addLog(
            "system",
            "System initialized and ready for input",
            "orchestrator",
          );
        })
        .catch((error) => {
          addLog(
            "error",
            `Failed to start system: ${error.message}`,
            "orchestrator",
          );
        });
    }

    return () => {
      orchestrator.removeAllListeners();
      clearInterval(statusInterval);
      orchestrator.stop();
    };
  }, [orchestrator, apiKeyStatus, showDebugLogs]);

  const processUserText = async () => {
    if (!userText.trim()) return;
    if (apiKeyStatus !== "valid") {
      addLog(
        "error",
        "Cannot process input: OpenRouter API key is not valid",
        "system",
      );
      return;
    }

    setIsProcessing(true);
    addLog(
      "user",
      `Processing input: "${userText.substring(0, 100)}${userText.length > 100 ? "..." : ""}"`,
      "user",
    );

    try {
      const userId = `user-${Date.now()}`;
      addLog(
        "system",
        `Starting preference analysis for user ${userId}`,
        "orchestrator",
      );

      console.log(
        "🎯 Frontend: About to call orchestrator.processUserInput...",
      );
      const schema = await orchestrator.processUserInput(userText, userId);
      console.log("🎯 Frontend: Received schema from orchestrator:", schema);

      addLog(
        "system",
        `✅ Preference analysis complete! Found: ${schema.preferences.riskTolerance} risk, $${schema.preferences.maxInvestment} max investment`,
        "orchestrator",
      );

      // Clear the input after successful processing
      setUserText("");

      // Trigger a conversation about the user's preferences
      void setTimeout(() => {
        console.log("🎯 Frontend: Starting agent conversation simulation...");
        orchestrator.simulateAgentConversation(
          `user preferences: ${schema.preferences.riskTolerance} risk tolerance with ${schema.preferences.preferredAssets.join(", ")} assets`,
        );
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog("error", `❌ Error processing input: ${errorMessage}`, "system");
      console.error("🎯 Frontend: Error processing user text:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    orchestrator.clearLogs();
    addLog("system", "Logs cleared", "ui");
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "system":
        return "⚙️";
      case "agent":
        return "🤖";
      case "user":
        return "👤";
      case "error":
        return "❌";
      case "debug":
        return "🔍";
      case "info":
        return "ℹ️";
      case "warn":
        return "⚠️";
      default:
        return "📝";
    }
  };

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "system":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "agent":
        return "text-green-600 bg-green-50 border-green-200";
      case "user":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "debug":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "warn":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const sampleTexts = [
    "I want to invest $10,000 in low-risk ETH and USDC arbitrage opportunities with at least 5% return",
    "I'm looking for aggressive DeFi yield farming strategies with $50,000. I can handle high risk for 20%+ returns",
    "Conservative approach with $5,000 for stablecoin arbitrage. Safety is my priority, 3-7% returns are fine",
    "Medium risk tolerance, $25,000 budget for cross-chain arbitrage between Ethereum and Arbitrum",
    "High-frequency MEV opportunities with $100,000. I want maximum returns and can handle complexity",
  ];

  const filteredLogs = showDebugLogs
    ? logs
    : logs.filter((log) => log.type !== "debug");

  const stopSystem = () => {
    orchestrator.stop();
    addLog("system", "System stopped by user", "ui");
  };

  const exportArbitrageOpportunities = () => {
    const opportunities = orchestrator.getAllOpportunitiesWithDetails();
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalOpportunities: opportunities.length,
      systemMetrics: systemStatus?.metrics || {},
      opportunities: opportunities.map((opp) => ({
        id: opp.id,
        type: opp.type,
        assetPair: opp.assetPair,
        protocolA: opp.protocolA,
        protocolB: opp.protocolB,
        priceA: opp.priceA,
        priceB: opp.priceB,
        expectedReturn: opp.expectedReturn,
        requiredCapital: opp.requiredCapital,
        gasEstimate: opp.gasEstimate,
        risk: opp.risk,
        liquidity: opp.liquidity,
        timeDecay: opp.timeDecay,
        detectedAt: opp.detectedAt.toISOString(),
        expiresAt: opp.expiresAt.toISOString(),
        status: opp.status,
        timeRemaining: Math.max(
          0,
          Math.floor((opp.expiresAt.getTime() - Date.now()) / 60000),
        ), // minutes
      })),
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arbitrage-opportunities-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog(
      "system",
      `Exported ${opportunities.length} arbitrage opportunities to JSON file`,
      "export",
    );
  };

  const exportSystemLogs = () => {
    const allLogs = [...logs];
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalLogs: allLogs.length,
      systemMetrics: systemStatus?.metrics || {},
      logs: allLogs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog(
      "system",
      `Exported ${allLogs.length} system logs to JSON file`,
      "export",
    );
  };

  return (
    <div className="min-h-full bg-white">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">Agent UI</h1>
        <p className="text-gray-600">
          Monitor and interact with the multi-agent arbitrage framework
        </p>

        {/* API Key Status */}
        <div
          className={`mt-4 inline-flex items-center rounded border px-3 py-1 text-sm ${
            apiKeyStatus === "valid"
              ? "border-green-200 bg-green-50 text-green-800"
              : apiKeyStatus === "invalid"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
        >
          {apiKeyStatus === "valid" && "✅ API Key Valid"}
          {apiKeyStatus === "invalid" && "❌ API Key Missing/Invalid"}
          {apiKeyStatus === "checking" && "🔄 Checking API Key..."}
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-6 rounded border p-6">
        <h2 className="mb-4 text-xl font-semibold">Input Text</h2>

        {/* Sample texts */}
        <div className="mb-4">
          <p className="mb-2 text-sm text-gray-600">Quick samples:</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {sampleTexts.map((sample, index) => (
              <button
                key={index}
                onClick={() => setUserText(sample)}
                className="rounded border p-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Describe your arbitrage preferences, risk tolerance, investment amount, etc."
          className="mb-4 h-32 w-full resize-none rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {userText.length} characters
          </span>
          <button
            onClick={processUserText}
            disabled={!userText.trim() || isProcessing}
            className="rounded bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Process with Agents"}
          </button>
        </div>

        {apiKeyStatus === "invalid" && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">
              <strong>Missing API Key:</strong> Add your OpenRouter API key to
              your <code>.env.local</code> file:
            </p>
            <pre className="mt-2 rounded bg-red-100 p-2 text-xs">
              NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key_here
            </pre>
          </div>
        )}
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className="mb-6 rounded border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">System Status</h3>
            <div className="flex items-center space-x-2">
              {systemStatus.isRunning && (
                <button
                  onClick={stopSystem}
                  className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  🛑 Stop System
                </button>
              )}
              <button
                onClick={exportArbitrageOpportunities}
                disabled={systemStatus.metrics.activeOpportunities === 0}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                📥 Export Opportunities (
                {systemStatus.metrics.activeOpportunities})
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-5">
            <div>
              <span className="text-gray-600">Status:</span>
              <span
                className={`ml-2 rounded border px-2 py-1 text-xs ${
                  systemStatus.isRunning
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-gray-200 bg-gray-50 text-gray-800"
                }`}
              >
                {systemStatus.isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Messages:</span>
              <span className="ml-2 font-mono">
                {systemStatus.metrics.messagesExchanged}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Opportunities:</span>
              <span className="ml-2 font-mono">
                {systemStatus.metrics.activeOpportunities}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Recommendations:</span>
              <span className="ml-2 font-mono">
                {systemStatus.metrics.totalRecommendations}
              </span>
            </div>
            <div>
              <span className="text-gray-600">System Logs:</span>
              <span className="ml-2 font-mono">
                {systemStatus.metrics.systemLogs}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Logs Section */}
      <div className="mb-6 rounded border">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-xl font-semibold">
            System Logs ({filteredLogs.length})
          </h2>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showDebugLogs}
                onChange={(e) => setShowDebugLogs(e.target.checked)}
                className="mr-2"
              />
              Show Debug
            </label>
            <button
              onClick={clearLogs}
              className="rounded bg-gray-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="h-96 overflow-x-hidden overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No logs yet. Process some text to see the agents in action.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`w-full max-w-full overflow-hidden rounded border p-3 ${getLogColor(log.type)}`}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span>{getLogIcon(log.type)}</span>
                      <span className="text-sm font-medium">
                        {log.source || log.type}
                      </span>
                    </div>
                    <span className="text-xs opacity-75">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="overflow-x-auto text-sm break-words">
                    {log.message}
                  </p>
                  {log.data ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs opacity-75">
                        View data
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-gray-100 p-2 text-xs break-words whitespace-pre-wrap">
                        {typeof log.data === "string"
                          ? log.data
                          : JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded border p-4">
        <h3 className="mb-3 text-lg font-semibold">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              orchestrator.simulateAgentConversation(
                "market volatility analysis",
              )
            }
            disabled={apiKeyStatus !== "valid"}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Simulate Market Discussion
          </button>
          <button
            onClick={() =>
              orchestrator.simulateAgentConversation(
                "gas optimization strategies",
              )
            }
            disabled={apiKeyStatus !== "valid"}
            className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            Simulate Gas Discussion
          </button>
          <button
            onClick={() =>
              orchestrator.simulateAgentConversation(
                "risk management protocols",
              )
            }
            disabled={apiKeyStatus !== "valid"}
            className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            Simulate Risk Discussion
          </button>
          <button
            onClick={() => orchestrator.setDebugMode(!showDebugLogs)}
            className="rounded bg-gray-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            Toggle Debug Mode
          </button>
          <button
            onClick={exportSystemLogs}
            disabled={logs.length === 0}
            className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            📄 Export Logs ({logs.length})
          </button>
          <button
            onClick={() => addLog("system", "Manual test log entry", "tester")}
            className="rounded bg-gray-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            Add Test Log
          </button>
        </div>

        {apiKeyStatus === "invalid" && (
          <p className="mt-2 text-xs text-gray-600">
            ⚠️ Some actions are disabled because the OpenRouter API key is not
            configured.
          </p>
        )}
      </div>
    </div>
  );
}

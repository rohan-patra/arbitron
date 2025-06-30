'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentOrchestrator } from '../../lib/agents/AgentOrchestrator';
import type { 
  AgentMessage, 
  ArbitrageOpportunity, 
  AllocationRecommendation,
  PreferenceSchema 
} from '../../lib/types/agents';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'system' | 'agent' | 'user' | 'error' | 'debug' | 'info' | 'warn';
  source?: string;
  message: string;
  data?: any;
}

export default function TempTestPage() {
  const [orchestrator] = useState(() => new AgentOrchestrator());
  const [userText, setUserText] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [showDebugLogs, setShowDebugLogs] = useState(true);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], message: string, source?: string, data?: any) => {
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      source,
      message,
      data,
    };
    setLogs(prev => [logEntry, ...prev].slice(0, 200)); // Keep last 200 logs
  };

  // Check API key on mount
  useEffect(() => {
    const checkApiKey = () => {
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (apiKey && apiKey.length > 10) {
        setApiKeyStatus('valid');
        addLog('system', 'OpenRouter API key detected and valid', 'environment');
      } else {
        setApiKeyStatus('invalid');
        addLog('error', 'OpenRouter API key not found or invalid. Set NEXT_PUBLIC_OPENROUTER_API_KEY in your .env file', 'environment');
      }
    };
    
    checkApiKey();
  }, []);

  useEffect(() => {
    // Set up comprehensive event listeners
    const handleAgentMessage = (message: AgentMessage) => {
      // Show the actual agent message content with better formatting
      const preview = message.content.length > 200 ? `${message.content.substring(0, 200)}...` : message.content;
      addLog('agent', `💬 ${preview}`, `${message.agentType} agent`, message);
    };

    const handleOpportunityDiscovered = (opportunity: ArbitrageOpportunity) => {
      addLog('system', `🎯 NEW OPPORTUNITY: ${opportunity.assetPair} | ${opportunity.protocolA} → ${opportunity.protocolB} | ${opportunity.expectedReturn.toFixed(2)}% return | ${opportunity.risk} risk | $${opportunity.requiredCapital.toFixed(0)} capital`, 'arbitrage agent', opportunity);
    };

    const handleRecommendationGenerated = (recommendation: AllocationRecommendation) => {
      addLog('system', `💡 RECOMMENDATION: Allocate $${recommendation.allocatedAmount.toFixed(0)} to opportunity ${recommendation.opportunityId} (${(recommendation.confidence * 100).toFixed(0)}% confidence)`, 'matching agent', recommendation);
    };

    const handlePreferencesProcessed = (schema: PreferenceSchema) => {
      addLog('system', `✅ USER PROFILE: ${schema.preferences.riskTolerance.toUpperCase()} risk tolerance | $${schema.preferences.maxInvestment.toLocaleString()} max investment | Assets: ${schema.preferences.preferredAssets.join(', ').toUpperCase()} | Min return: ${schema.preferences.minReturnRate}%`, 'preference agent', schema);
    };

    const handleSystemStarted = () => {
      addLog('system', 'Multi-agent system started successfully', 'orchestrator');
    };

    const handleSystemStopped = () => {
      addLog('system', 'Multi-agent system stopped', 'orchestrator');
    };

    // Handle system logs from orchestrator
    const handleSystemLog = (logData: any) => {
      // Don't filter debug logs here - let the UI filter them
      addLog(logData.level, logData.message, logData.source, logData.data);
    };

    orchestrator.on('agentMessage', handleAgentMessage);
    orchestrator.on('opportunityDiscovered', handleOpportunityDiscovered);
    orchestrator.on('recommendationGenerated', handleRecommendationGenerated);
    orchestrator.on('preferencesProcessed', handlePreferencesProcessed);
    orchestrator.on('systemStarted', handleSystemStarted);
    orchestrator.on('systemStopped', handleSystemStopped);
    orchestrator.on('systemLog', handleSystemLog);

    // Update system status periodically
    const statusInterval = setInterval(() => {
      setSystemStatus(orchestrator.getSystemStatus());
    }, 2000);

    // Start the system automatically if API key is valid
    if (apiKeyStatus === 'valid') {
      orchestrator.start().then(() => {
        addLog('system', 'System initialized and ready for input', 'orchestrator');
      }).catch((error) => {
        addLog('error', `Failed to start system: ${error.message}`, 'orchestrator');
      });
    }

    return () => {
      orchestrator.removeAllListeners();
      clearInterval(statusInterval);
      orchestrator.stop();
    };
  }, [orchestrator, apiKeyStatus, showDebugLogs]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const processUserText = async () => {
    if (!userText.trim()) return;
    if (apiKeyStatus !== 'valid') {
      addLog('error', 'Cannot process input: OpenRouter API key is not valid', 'system');
      return;
    }
    
    setIsProcessing(true);
    addLog('user', `Processing input: "${userText.substring(0, 100)}${userText.length > 100 ? '...' : ''}"`, 'user');
    
    try {
      const userId = `user-${Date.now()}`;
      addLog('system', `Starting preference analysis for user ${userId}`, 'orchestrator');
      
      console.log('🎯 Frontend: About to call orchestrator.processUserInput...');
      const schema = await orchestrator.processUserInput(userText, userId);
      console.log('🎯 Frontend: Received schema from orchestrator:', schema);
      
      addLog('system', `✅ Preference analysis complete! Found: ${schema.preferences.riskTolerance} risk, $${schema.preferences.maxInvestment} max investment`, 'orchestrator');
      
      // Clear the input after successful processing
      setUserText('');
      
      // Trigger a conversation about the user's preferences
      setTimeout(() => {
        console.log('🎯 Frontend: Starting agent conversation simulation...');
        orchestrator.simulateAgentConversation(`user preferences: ${schema.preferences.riskTolerance} risk tolerance with ${schema.preferences.preferredAssets.join(', ')} assets`);
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog('error', `❌ Error processing input: ${errorMessage}`, 'system');
      console.error('🎯 Frontend: Error processing user text:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    orchestrator.clearLogs();
    addLog('system', 'Logs cleared', 'ui');
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'system': return '⚙️';
      case 'agent': return '🤖';
      case 'user': return '👤';
      case 'error': return '❌';
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      default: return '📝';
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'system': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'agent': return 'text-green-600 bg-green-50 border-green-200';
      case 'user': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'debug': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const sampleTexts = [
    "I want to invest $10,000 in low-risk ETH and USDC arbitrage opportunities with at least 5% return",
    "I'm looking for aggressive DeFi yield farming strategies with $50,000. I can handle high risk for 20%+ returns",
    "Conservative approach with $5,000 for stablecoin arbitrage. Safety is my priority, 3-7% returns are fine",
    "Medium risk tolerance, $25,000 budget for cross-chain arbitrage between Ethereum and Arbitrum",
    "High-frequency MEV opportunities with $100,000. I want maximum returns and can handle complexity"
  ];

  const filteredLogs = showDebugLogs ? logs : logs.filter(log => log.type !== 'debug');

  const stopSystem = () => {
    orchestrator.stop();
    addLog('system', 'System stopped by user', 'ui');
  };

  const exportArbitrageOpportunities = () => {
    const opportunities = orchestrator.getAllOpportunitiesWithDetails();
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalOpportunities: opportunities.length,
      systemMetrics: systemStatus?.metrics || {},
      opportunities: opportunities.map(opp => ({
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
        timeRemaining: Math.max(0, Math.floor((opp.expiresAt.getTime() - Date.now()) / 60000)), // minutes
      }))
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arbitrage-opportunities-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog('system', `Exported ${opportunities.length} arbitrage opportunities to JSON file`, 'export');
  };

  const exportSystemLogs = () => {
    const allLogs = [...logs];
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalLogs: allLogs.length,
      systemMetrics: systemStatus?.metrics || {},
      logs: allLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog('system', `Exported ${allLogs.length} system logs to JSON file`, 'export');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Multi-Agent System Tester
          </h1>
          <p className="text-gray-600 mt-2">
            Paste text to test the multi-agent arbitrage framework with detailed logging
          </p>
          
          {/* API Key Status */}
          <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm ${
            apiKeyStatus === 'valid' ? 'bg-green-100 text-green-800' :
            apiKeyStatus === 'invalid' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {apiKeyStatus === 'valid' && '✅ API Key Valid'}
            {apiKeyStatus === 'invalid' && '❌ API Key Missing/Invalid'}
            {apiKeyStatus === 'checking' && '🔄 Checking API Key...'}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Input Text</h2>
          
          {/* Sample texts */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Quick samples:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setUserText(sample)}
                  className="text-left text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded border"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
          
          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Paste your text here... Describe your arbitrage preferences, risk tolerance, investment amount, etc."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {userText.length} characters
            </span>
            <button
              onClick={processUserText}
              disabled={!userText.trim() || isProcessing}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process with Agents'}
            </button>
          </div>

          {apiKeyStatus === 'invalid' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                <strong>Missing API Key:</strong> Add your OpenRouter API key to your <code>.env.local</code> file:
              </p>
              <pre className="text-xs bg-red-100 p-2 mt-2 rounded">
                NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key_here
              </pre>
            </div>
          )}
        </div>

        {/* System Status */}
        {systemStatus && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">System Status</h3>
              <div className="flex items-center space-x-2">
                {systemStatus.isRunning && (
                  <button
                    onClick={stopSystem}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    🛑 Stop System
                  </button>
                )}
                <button
                  onClick={exportArbitrageOpportunities}
                  disabled={systemStatus.metrics.activeOpportunities === 0}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  📥 Export Opportunities ({systemStatus.metrics.activeOpportunities})
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  systemStatus.isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {systemStatus.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Messages:</span>
                <span className="ml-2 font-mono">{systemStatus.metrics.messagesExchanged}</span>
              </div>
              <div>
                <span className="text-gray-600">Opportunities:</span>
                <span className="ml-2 font-mono">{systemStatus.metrics.activeOpportunities}</span>
              </div>
              <div>
                <span className="text-gray-600">Recommendations:</span>
                <span className="ml-2 font-mono">{systemStatus.metrics.totalRecommendations}</span>
              </div>
              <div>
                <span className="text-gray-600">System Logs:</span>
                <span className="ml-2 font-mono">{systemStatus.metrics.systemLogs}</span>
              </div>
            </div>
          </div>
        )}

        {/* Logs Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">System Logs ({filteredLogs.length})</h2>
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
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Clear Logs
              </button>
            </div>
          </div>
          
          <div className="h-96 overflow-y-auto p-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No logs yet. Process some text to see the agents in action.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${getLogColor(log.type)}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span>{getLogIcon(log.type)}</span>
                        <span className="font-medium text-sm">
                          {log.source || log.type}
                        </span>
                      </div>
                      <span className="text-xs opacity-75">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{log.message}</p>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer opacity-75">
                          View data
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => orchestrator.simulateAgentConversation('market volatility analysis')}
              disabled={apiKeyStatus !== 'valid'}
              className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              Simulate Market Discussion
            </button>
            <button
              onClick={() => orchestrator.simulateAgentConversation('gas optimization strategies')}
              disabled={apiKeyStatus !== 'valid'}
              className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
            >
              Simulate Gas Discussion
            </button>
            <button
              onClick={() => orchestrator.simulateAgentConversation('risk management protocols')}
              disabled={apiKeyStatus !== 'valid'}
              className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
            >
              Simulate Risk Discussion
            </button>
            <button
              onClick={() => orchestrator.setDebugMode(!showDebugLogs)}
              className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Toggle Debug Mode
            </button>
            <button
              onClick={exportSystemLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 disabled:opacity-50"
            >
              📄 Export Logs ({logs.length})
            </button>
            <button
              onClick={() => addLog('system', 'Manual test log entry', 'tester')}
              className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Add Test Log
            </button>
          </div>
          
          {apiKeyStatus === 'invalid' && (
            <p className="text-xs text-gray-600 mt-2">
              ⚠️ Some actions are disabled because the OpenRouter API key is not configured.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 
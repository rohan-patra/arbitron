'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentOrchestrator } from '../../lib/agents/AgentOrchestrator';
import type { 
  AgentMessage, 
  ArbitrageOpportunity, 
  AllocationRecommendation,
  PreferenceSchema 
} from '../../lib/types/agents';

export function AgentDashboard() {
  const [orchestrator] = useState(() => new AgentOrchestrator());
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [recommendations, setRecommendations] = useState<AllocationRecommendation[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [userInput, setUserInput] = useState('');
  const [isSystemRunning, setIsSystemRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up event listeners
    const handleAgentMessage = (message: AgentMessage) => {
      setMessages(prev => [message, ...prev].slice(0, 50)); // Keep last 50 messages
    };

    const handleOpportunityDiscovered = (opportunity: ArbitrageOpportunity) => {
      setOpportunities(prev => [opportunity, ...prev.filter(o => o.id !== opportunity.id)]);
    };

    const handleRecommendationGenerated = (recommendation: AllocationRecommendation) => {
      setRecommendations(prev => [recommendation, ...prev].slice(0, 20));
    };

    const handleSystemStarted = () => {
      setIsSystemRunning(true);
    };

    const handleSystemStopped = () => {
      setIsSystemRunning(false);
    };

    orchestrator.on('agentMessage', handleAgentMessage);
    orchestrator.on('opportunityDiscovered', handleOpportunityDiscovered);
    orchestrator.on('recommendationGenerated', handleRecommendationGenerated);
    orchestrator.on('systemStarted', handleSystemStarted);
    orchestrator.on('systemStopped', handleSystemStopped);

    // Update system status periodically
    const statusInterval = setInterval(() => {
      setSystemStatus(orchestrator.getSystemStatus());
      setOpportunities(orchestrator.getActiveOpportunities());
    }, 2000);

    return () => {
      orchestrator.removeAllListeners();
      clearInterval(statusInterval);
      orchestrator.stop();
    };
  }, [orchestrator]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSystem = async () => {
    await orchestrator.start();
    // Simulate some initial conversation
    await orchestrator.simulateAgentConversation('DeFi yield farming');
  };

  const stopSystem = () => {
    orchestrator.stop();
  };

  const processUserPreferences = async () => {
    if (!userInput.trim()) return;
    
    try {
      await orchestrator.processUserInput(userInput, `user-${Date.now()}`);
      setUserInput('');
    } catch (error) {
      console.error('Error processing user input:', error);
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'preference': return '🎯';
      case 'arbitrage': return '🔍';
      case 'matching': return '🤝';
      default: return '🤖';
    }
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case 'alert': return 'text-red-600 bg-red-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'request': return 'text-yellow-600 bg-yellow-50';
      case 'response': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Multi-Agent Arbitrage Framework
        </h1>
        <p className="text-gray-600 mt-2">
          Watch three AI agents collaborate to find and allocate arbitrage opportunities
        </p>
      </div>

      {/* System Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">System Control</h2>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isSystemRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {isSystemRunning ? '🟢 Running' : '⭕ Stopped'}
            </span>
            <button
              onClick={isSystemRunning ? stopSystem : startSystem}
              className={`px-4 py-2 rounded-md font-medium ${
                isSystemRunning 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isSystemRunning ? 'Stop System' : 'Start System'}
            </button>
          </div>
        </div>

        {/* User Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Describe your arbitrage preferences (e.g., 'I want low risk ETH opportunities with $5000')"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && processUserPreferences()}
          />
          <button
            onClick={processUserPreferences}
            disabled={!userInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Process Preferences
          </button>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">📊 System Metrics</h3>
            <div className="space-y-2 text-sm">
              <div>Messages Exchanged: <span className="font-mono">{systemStatus.metrics.messagesExchanged}</span></div>
              <div>Active Opportunities: <span className="font-mono">{systemStatus.metrics.activeOpportunities}</span></div>
              <div>Recommendations: <span className="font-mono">{systemStatus.metrics.totalRecommendations}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">🤖 Agent Status</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(systemStatus.agents).map(([key, agent]: [string, any]) => (
                <div key={key} className="flex items-center justify-between">
                  <span>{getAgentIcon(key)} {agent.name.split(' ')[0]}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    agent.status === 'active' ? 'bg-green-100 text-green-800' :
                    agent.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">⚡ Latest Activity</h3>
            <div className="text-sm text-gray-600">
              {messages.length > 0 && messages[0] ? (
                <div>
                  <div className="font-medium">{getAgentIcon(messages[0].agentType)} {messages[0].agentType} agent</div>
                  <div className="text-xs">{messages[0].timestamp.toLocaleTimeString()}</div>
                </div>
              ) : (
                'No activity yet'
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Communications */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">💬 Agent Communications</h2>
            <p className="text-sm text-gray-600">Real-time inter-agent messaging</p>
          </div>
          <div className="h-96 overflow-y-auto p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`p-3 rounded-lg ${getMessageTypeColor(message.messageType)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {getAgentIcon(message.agentType)} {message.agentType} agent
                    </span>
                    <span className="text-xs opacity-75">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                  {message.recipientId && (
                    <p className="text-xs opacity-75 mt-1">
                      → {message.recipientId}
                    </p>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the system to see agent communications.
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Active Opportunities */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">🔍 Active Opportunities</h2>
            <p className="text-sm text-gray-600">Live arbitrage opportunities detected</p>
          </div>
          <div className="h-96 overflow-y-auto p-4">
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div key={opp.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{opp.assetPair}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      opp.risk === 'low' ? 'bg-green-100 text-green-800' :
                      opp.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {opp.risk} risk
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{opp.protocolA} ↔ {opp.protocolB}</div>
                    <div className="flex justify-between">
                      <span>Return: {opp.expectedReturn.toFixed(2)}%</span>
                      <span>Capital: ${opp.requiredCapital.toFixed(0)}</span>
                    </div>
                    <div className="text-xs">
                      Expires: {opp.expiresAt.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {opportunities.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No active opportunities. The arbitrage agent will find some soon!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">🤝 Allocation Recommendations</h2>
            <p className="text-sm text-gray-600">AI-generated investment allocations</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <div key={`${rec.opportunityId}-${rec.userId}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">User {rec.userId.split('-')[1]}</span>
                    <span className="text-sm text-gray-600">
                      Confidence: {(rec.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Amount: <span className="font-mono">${rec.allocatedAmount.toFixed(0)}</span>
                  </div>
                  <p className="text-sm">{rec.reasoning}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    {rec.createdAt.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Demo Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">🎮 Demo Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => orchestrator.simulateAgentConversation('cross-chain arbitrage')}
            className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Simulate Cross-Chain Discussion
          </button>
          <button
            onClick={() => orchestrator.simulateAgentConversation('yield farming')}
            className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Simulate Yield Farming Discussion
          </button>
          <button
            onClick={() => orchestrator.simulateAgentConversation('MEV opportunities')}
            className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Simulate MEV Discussion
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Click these buttons to see the agents have natural language conversations about different arbitrage topics.
        </p>
      </div>
    </div>
  );
} 
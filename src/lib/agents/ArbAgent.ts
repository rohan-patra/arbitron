import { OpenRouterClient } from '../openrouter';
import type { ArbitrageOpportunity, AgentMessage } from '../types/agents';
import { EventEmitter } from 'events';

export class ArbAgent extends EventEmitter {
  private openRouter: OpenRouterClient;
  public id: string;
  public name: string;
  public status: 'active' | 'idle' | 'processing';
  public lastActivity: Date;
  private opportunities: Map<string, ArbitrageOpportunity>;
  private scanInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.openRouter = new OpenRouterClient();
    this.id = 'arb-agent-001';
    this.name = 'Arbitrage Detection Agent';
    this.status = 'idle';
    this.lastActivity = new Date();
    this.opportunities = new Map();
  }

  startScanning(intervalMs: number = 30000) {
    this.status = 'active';
    this.scanInterval = setInterval(() => {
      this.scanForOpportunities();
    }, intervalMs);
    
    // Initial scan
    this.scanForOpportunities();
  }

  stopScanning() {
    this.status = 'idle';
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  async scanForOpportunities(): Promise<ArbitrageOpportunity[]> {
    this.status = 'processing';
    this.lastActivity = new Date();

    try {
      // Mock market data for demonstration
      const mockMarketData = this.generateMockMarketData();
      
      // Use AI to identify opportunities
      const aiResponse = await this.openRouter.findArbitrageOpportunities(mockMarketData);
      
      // Parse AI response and generate opportunities
      const newOpportunities = this.parseOpportunitiesFromAI(aiResponse, mockMarketData);
      
      // Update opportunity store
      for (const opp of newOpportunities) {
        this.opportunities.set(opp.id, opp);
        this.emit('opportunityFound', opp);
        await this.announceOpportunity(opp);
      }

      // Clean up expired opportunities
      this.cleanupExpiredOpportunities();
      
      this.status = 'active';
      return newOpportunities;
    } catch (error) {
      this.status = 'active';
      console.error('Error scanning for opportunities:', error);
      return [];
    }
  }

  private generateMockMarketData() {
    const assets = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'ARB', 'OP'];
    const protocols = ['Uniswap V3', 'SushiSwap', 'Curve', 'Balancer', 'PancakeSwap', 'QuickSwap'];
    
    return {
      timestamp: new Date().toISOString(),
      prices: assets.map(asset => ({
        asset,
        protocols: protocols.map(protocol => ({
          protocol,
          price: this.generateRandomPrice(asset),
          liquidity: Math.random() * 10000000 + 100000,
          volume24h: Math.random() * 1000000 + 50000,
        })),
      })),
      gasPrice: Math.random() * 50 + 10, // 10-60 gwei
      networkLoad: Math.random() * 100,
    };
  }

  private generateRandomPrice(asset: string): number {
    const basePrices: Record<string, number> = {
      'ETH': 3000,
      'USDC': 1.0,
      'USDT': 1.0,
      'DAI': 1.0,
      'WBTC': 65000,
      'ARB': 2.5,
      'OP': 3.2,
    };
    
    const basePrice = basePrices[asset] || 1.0;
    const variance = (Math.random() - 0.5) * 0.05; // ±2.5% variance
    return basePrice * (1 + variance);
  }

  private parseOpportunitiesFromAI(aiResponse: string, marketData: any): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Since we're mocking, create realistic opportunities
    const now = new Date();
    const assets = ['ETH/USDC', 'WBTC/ETH', 'ARB/USDC', 'OP/ETH'];
    
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      const asset = assets[Math.floor(Math.random() * assets.length)] || 'ETH/USDC';
      const protocols = ['Uniswap V3', 'SushiSwap', 'Curve', 'Balancer'];
      const protocolA = protocols[Math.floor(Math.random() * protocols.length)] || 'Uniswap V3';
      const protocolB = protocols.filter(p => p !== protocolA)[Math.floor(Math.random() * 3)] || 'SushiSwap';
      
      const priceA = this.generateRandomPrice('ETH');
      const priceDiff = (Math.random() * 0.03 + 0.005); // 0.5% to 3.5% difference
      const priceB = priceA * (1 + priceDiff);
      
      const opportunity: ArbitrageOpportunity = {
        id: `arb-${Date.now()}-${i}`,
        type: Math.random() > 0.5 ? 'dex-arbitrage' : 'cross-chain',
        assetPair: asset,
        protocolA,
        protocolB,
        priceA,
        priceB,
        expectedReturn: priceDiff * 100,
        requiredCapital: Math.random() * 50000 + 1000,
        gasEstimate: Math.random() * 200000 + 50000,
        risk: this.calculateRiskLevel(priceDiff),
        liquidity: Math.random() * 5000000 + 100000,
        timeDecay: Math.random() * 15 + 5, // 5-20 minutes
        detectedAt: now,
        expiresAt: new Date(now.getTime() + (Math.random() * 20 + 5) * 60000), // 5-25 minutes
        status: 'active',
      };
      
      opportunities.push(opportunity);
    }
    
    return opportunities;
  }

  private calculateRiskLevel(priceDiff: number): 'low' | 'medium' | 'high' {
    if (priceDiff < 0.01) return 'low';
    if (priceDiff < 0.025) return 'medium';
    return 'high';
  }

  private async announceOpportunity(opportunity: ArbitrageOpportunity) {
    const message = await this.openRouter.generateAgentMessage(
      'arbitrage',
      `New arbitrage opportunity found: ${opportunity.assetPair} between ${opportunity.protocolA} and ${opportunity.protocolB}, expected return: ${opportunity.expectedReturn.toFixed(2)}%, risk: ${opportunity.risk}`,
      'alert'
    );

    const agentMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      agentId: this.id,
      agentType: 'arbitrage',
      content: message,
      messageType: 'alert',
      timestamp: new Date(),
      data: opportunity,
    };

    this.emit('message', agentMessage);
  }

  private cleanupExpiredOpportunities() {
    const now = new Date();
    for (const [id, opp] of this.opportunities.entries()) {
      if (opp.expiresAt < now) {
        this.opportunities.delete(id);
        this.emit('opportunityExpired', opp);
      }
    }
  }

  getActiveOpportunities(): ArbitrageOpportunity[] {
    const now = new Date();
    return Array.from(this.opportunities.values()).filter(opp => 
      opp.expiresAt > now && opp.status === 'active'
    );
  }

  async respondToMessage(message: AgentMessage): Promise<void> {
    if (message.agentType === 'matching' && message.messageType === 'request') {
      // Respond to matching agent requests for opportunity details
      const response = await this.openRouter.generateAgentMessage(
        'arbitrage',
        `Providing opportunity details: ${this.getActiveOpportunities().length} active opportunities available`,
        'response'
      );

      const responseMessage: AgentMessage = {
        id: `msg-${Date.now()}`,
        agentId: this.id,
        agentType: 'arbitrage',
        recipientId: message.agentId,
        content: response,
        messageType: 'response',
        timestamp: new Date(),
        data: this.getActiveOpportunities(),
      };

      this.emit('message', responseMessage);
    }
  }
} 
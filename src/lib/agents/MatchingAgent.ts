import { OpenRouterClient } from '../openrouter';
import type { 
  PreferenceSchema, 
  ArbitrageOpportunity, 
  AllocationRecommendation, 
  AgentMessage 
} from '../types/agents';
import { EventEmitter } from 'events';

export class MatchingAgent extends EventEmitter {
  private openRouter: OpenRouterClient;
  public id: string;
  public name: string;
  public status: 'active' | 'idle' | 'processing';
  public lastActivity: Date;
  private userPreferences: Map<string, PreferenceSchema>;
  private recommendations: Map<string, AllocationRecommendation[]>;

  constructor() {
    super();
    this.openRouter = new OpenRouterClient();
    this.id = 'matching-agent-001';
    this.name = 'Preference Matching Agent';
    this.status = 'idle';
    this.lastActivity = new Date();
    this.userPreferences = new Map();
    this.recommendations = new Map();
  }

  addUserPreferences(schema: PreferenceSchema) {
    this.userPreferences.set(schema.userId, schema);
    this.emit('preferencesUpdated', schema);
  }

  async analyzeOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): Promise<AllocationRecommendation[]> {
    this.status = 'processing';
    this.lastActivity = new Date();

    const allRecommendations: AllocationRecommendation[] = [];

    try {
      for (const [userId, preferences] of this.userPreferences.entries()) {
        const userRecommendations = await this.matchUserToOpportunities(
          preferences,
          opportunities
        );
        
        allRecommendations.push(...userRecommendations);
        this.recommendations.set(userId, userRecommendations);
        
        // Announce recommendations
        for (const rec of userRecommendations) {
          await this.announceRecommendation(rec, preferences);
        }
      }

      this.status = 'idle';
      return allRecommendations;
    } catch (error) {
      this.status = 'idle';
      console.error('Error analyzing opportunities:', error);
      return [];
    }
  }

  private async matchUserToOpportunities(
    preferences: PreferenceSchema,
    opportunities: ArbitrageOpportunity[]
  ): Promise<AllocationRecommendation[]> {
    // Filter opportunities based on user constraints
    const filteredOpportunities = this.filterOpportunitiesByPreferences(
      opportunities,
      preferences
    );

    if (filteredOpportunities.length === 0) {
      return [];
    }

    // Use AI to generate sophisticated matching
    const aiResponse = await this.openRouter.matchOpportunities(
      preferences.preferences,
      filteredOpportunities
    );

    // Parse AI response and create recommendations
    const recommendations = this.parseRecommendationsFromAI(
      aiResponse,
      preferences,
      filteredOpportunities
    );

    return recommendations;
  }

  private filterOpportunitiesByPreferences(
    opportunities: ArbitrageOpportunity[],
    preferences: PreferenceSchema
  ): ArbitrageOpportunity[] {
    return opportunities.filter(opp => {
      // Check asset preferences
      const hasPreferredAsset = preferences.preferences.preferredAssets.some(asset =>
        opp.assetPair.toLowerCase().includes(asset.toLowerCase())
      );

      // Check risk tolerance
      const riskMatch = this.isRiskCompatible(opp.risk, preferences.preferences.riskTolerance);

      // Check capital requirements
      const capitalMatch = opp.requiredCapital <= preferences.preferences.maxInvestment;

      // Check minimum return
      const returnMatch = opp.expectedReturn >= preferences.preferences.minReturnRate;

      // Check protocol exclusions
      const protocolMatch = !preferences.preferences.excludedProtocols?.some(excluded =>
        opp.protocolA.toLowerCase().includes(excluded.toLowerCase()) ||
        opp.protocolB.toLowerCase().includes(excluded.toLowerCase())
      );

      return hasPreferredAsset && riskMatch && capitalMatch && returnMatch && protocolMatch;
    });
  }

  private isRiskCompatible(oppRisk: string, userRisk: string): boolean {
    const riskLevels = { low: 1, medium: 2, high: 3 };
    return riskLevels[oppRisk as keyof typeof riskLevels] <= 
           riskLevels[userRisk as keyof typeof riskLevels];
  }

  private parseRecommendationsFromAI(
    aiResponse: string,
    preferences: PreferenceSchema,
    opportunities: ArbitrageOpportunity[]
  ): AllocationRecommendation[] {
    const recommendations: AllocationRecommendation[] = [];
    
    // For demo purposes, create smart allocation recommendations
    const maxAllocation = preferences.preferences.maxInvestment;
    let remainingCapital = maxAllocation;
    
    // Sort opportunities by expected return and risk compatibility
    const sortedOpportunities = opportunities.sort((a, b) => {
      const aScore = this.calculateOpportunityScore(a, preferences);
      const bScore = this.calculateOpportunityScore(b, preferences);
      return bScore - aScore;
    });

    for (const opp of sortedOpportunities.slice(0, 3)) { // Max 3 allocations
      if (remainingCapital <= 0) break;
      
      const allocationPercentage = this.calculateAllocationPercentage(
        opp,
        preferences,
        remainingCapital
      );
      
      const allocatedAmount = Math.min(
        remainingCapital * allocationPercentage,
        opp.requiredCapital
      );

      if (allocatedAmount >= 100) { // Minimum $100 allocation
        const recommendation: AllocationRecommendation = {
          opportunityId: opp.id,
          userId: preferences.userId,
          allocatedAmount,
          confidence: this.calculateConfidence(opp, preferences),
          reasoning: this.generateReasoning(opp, preferences, allocatedAmount),
          createdAt: new Date(),
        };

        recommendations.push(recommendation);
        remainingCapital -= allocatedAmount;
      }
    }

    return recommendations;
  }

  private calculateOpportunityScore(
    opp: ArbitrageOpportunity,
    preferences: PreferenceSchema
  ): number {
    let score = 0;
    
    // Return rate score (40% weight)
    score += (opp.expectedReturn / 10) * 40;
    
    // Risk alignment score (30% weight)
    const riskScore = this.isRiskCompatible(opp.risk, preferences.preferences.riskTolerance) ? 30 : 0;
    score += riskScore;
    
    // Liquidity score (20% weight)
    score += Math.min(opp.liquidity / 1000000, 1) * 20;
    
    // Time remaining score (10% weight)
    const timeRemaining = (opp.expiresAt.getTime() - Date.now()) / (1000 * 60);
    score += Math.min(timeRemaining / 30, 1) * 10;
    
    return score;
  }

  private calculateAllocationPercentage(
    opp: ArbitrageOpportunity,
    preferences: PreferenceSchema,
    remainingCapital: number
  ): number {
    const riskMultipliers = { low: 0.2, medium: 0.4, high: 0.6 };
    const userRiskMultiplier = riskMultipliers[preferences.preferences.riskTolerance];
    const oppRiskMultiplier = riskMultipliers[opp.risk as keyof typeof riskMultipliers];
    
    // Base allocation on risk compatibility and expected return
    const baseAllocation = Math.min(userRiskMultiplier, oppRiskMultiplier);
    const returnBonus = Math.min(opp.expectedReturn / 20, 0.3); // Max 30% bonus for high returns
    
    return Math.min(baseAllocation + returnBonus, 0.8); // Max 80% of remaining capital
  }

  private calculateConfidence(
    opp: ArbitrageOpportunity,
    preferences: PreferenceSchema
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Risk alignment increases confidence
    if (this.isRiskCompatible(opp.risk, preferences.preferences.riskTolerance)) {
      confidence += 0.2;
    }
    
    // High liquidity increases confidence
    if (opp.liquidity > 1000000) {
      confidence += 0.15;
    }
    
    // Return rate within reasonable bounds increases confidence
    if (opp.expectedReturn >= 2 && opp.expectedReturn <= 15) {
      confidence += 0.15;
    }
    
    return Math.min(confidence, 1.0);
  }

  private generateReasoning(
    opp: ArbitrageOpportunity,
    preferences: PreferenceSchema,
    amount: number
  ): string {
    const percentage = ((amount / preferences.preferences.maxInvestment) * 100).toFixed(1);
    
    return `Allocating ${percentage}% (${amount.toFixed(0)}) to ${opp.assetPair} arbitrage between ${opp.protocolA} and ${opp.protocolB}. Expected return: ${opp.expectedReturn.toFixed(2)}%, risk level: ${opp.risk}, aligns with user's ${preferences.preferences.riskTolerance} risk tolerance.`;
  }

  private async announceRecommendation(
    recommendation: AllocationRecommendation,
    preferences: PreferenceSchema
  ) {
    const message = await this.openRouter.generateAgentMessage(
      'matching',
      `New allocation recommendation for user ${preferences.userId}: ${recommendation.reasoning}`,
      'info'
    );

    const agentMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      agentId: this.id,
      agentType: 'matching',
      content: message,
      messageType: 'info',
      timestamp: new Date(),
      data: recommendation,
    };

    this.emit('message', agentMessage);
    this.emit('recommendation', recommendation);
  }

  getUserRecommendations(userId: string): AllocationRecommendation[] {
    return this.recommendations.get(userId) || [];
  }

  async respondToMessage(message: AgentMessage): Promise<void> {
    // Handle requests from other agents
    const response = await this.openRouter.generateAgentMessage(
      'matching',
      `Processing request: ${message.content}`,
      'response'
    );

    const responseMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      agentId: this.id,
      agentType: 'matching',
      recipientId: message.agentId,
      content: response,
      messageType: 'response',
      timestamp: new Date(),
    };

    this.emit('message', responseMessage);
  }
} 
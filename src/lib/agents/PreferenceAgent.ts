import { OpenRouterClient } from '../openrouter';
import type { UserPreferences, PreferenceSchema, AgentMessage } from '../types/agents';
import { EventEmitter } from 'events';

export class PreferenceAgent extends EventEmitter {
  private openRouter: OpenRouterClient;
  public id: string;
  public name: string;
  public status: 'active' | 'idle' | 'processing';
  public lastActivity: Date;

  constructor() {
    super();
    this.openRouter = new OpenRouterClient();
    this.id = 'preference-agent-001';
    this.name = 'Preference Schema Agent';
    this.status = 'idle';
    this.lastActivity = new Date();
  }

  async processUserPreferences(userInput: string, userId: string): Promise<PreferenceSchema> {
    this.status = 'processing';
    this.lastActivity = new Date();

    try {
      // Try to generate schema using OpenRouter first
      let preferences: UserPreferences;
      
      try {
        const schemaResponse = await this.openRouter.generateSchema(userInput);
        preferences = this.parsePreferencesFromAI(schemaResponse, userInput);
      } catch (apiError) {
        console.warn('OpenRouter API failed, using fallback parsing:', apiError);
        // Fallback to manual parsing if API fails
        preferences = this.extractPreferencesFromText(userInput);
      }
      
      const schema: PreferenceSchema = {
        id: `pref-${Date.now()}-${userId}`,
        userId,
        preferences,
        generatedAt: new Date(),
        constraints: this.generateConstraints(preferences),
      };

      // Communicate with other agents
      await this.broadcastPreferenceUpdate(schema);
      
      this.status = 'idle';
      this.emit('schemaGenerated', schema);
      
      return schema;
    } catch (error) {
      this.status = 'idle';
      console.error('Error processing user preferences:', error);
      throw error;
    }
  }

  private parsePreferencesFromAI(aiResponse: string, userInput: string): UserPreferences {
    // Fallback parsing if AI response is not perfect JSON
    try {
      const parsed = JSON.parse(aiResponse);
      return parsed;
    } catch {
      // Manual parsing as fallback
      return this.extractPreferencesFromText(userInput);
    }
  }

  private extractPreferencesFromText(text: string): UserPreferences {
    const lowerText = text.toLowerCase();
    
    // Extract risk tolerance
    let riskTolerance: 'low' | 'medium' | 'high' = 'medium';
    if (lowerText.includes('conservative') || lowerText.includes('low risk') || lowerText.includes('safe')) {
      riskTolerance = 'low';
    } else if (lowerText.includes('aggressive') || lowerText.includes('high risk') || lowerText.includes('risky')) {
      riskTolerance = 'high';
    }

    // Extract investment amount
    const amountMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const maxInvestment = amountMatch ? parseFloat(amountMatch[1]?.replace(/,/g, '') || '1000') : 1000;

    // Extract assets
    const commonAssets = ['eth', 'btc', 'usdc', 'usdt', 'dai', 'matic', 'arb', 'op'];
    const preferredAssets = commonAssets.filter(asset => 
      lowerText.includes(asset) || lowerText.includes(asset.toUpperCase())
    );

    // Extract time horizon
    let timeHorizon: 'short' | 'medium' | 'long' = 'medium';
    if (lowerText.includes('short') || lowerText.includes('quick') || lowerText.includes('fast')) {
      timeHorizon = 'short';
    } else if (lowerText.includes('long') || lowerText.includes('hold')) {
      timeHorizon = 'long';
    }

    // Extract return rate
    const returnMatch = text.match(/(\d+(?:\.\d+)?)%/);
    const minReturnRate = returnMatch ? parseFloat(returnMatch[1] || '5') : 5.0;

    return {
      riskTolerance,
      maxInvestment,
      preferredAssets: preferredAssets.length > 0 ? preferredAssets : ['eth', 'usdc'],
      timeHorizon,
      minReturnRate,
    };
  }

  private generateConstraints(preferences: UserPreferences) {
    const riskMultipliers = { low: 0.5, medium: 1.0, high: 2.0 };
    const multiplier = riskMultipliers[preferences.riskTolerance];

    return {
      maxSlippage: Math.min(5.0 * multiplier, 10.0), // Max 10% slippage
      minLiquidity: preferences.maxInvestment * 2, // 2x investment as min liquidity
      gasLimit: preferences.riskTolerance === 'high' ? 500000 : 200000,
    };
  }

  private async broadcastPreferenceUpdate(schema: PreferenceSchema) {
    try {
      const message = await this.openRouter.generateAgentMessage(
        'preference',
        `New user preference schema generated: ${schema.preferences.riskTolerance} risk, ${schema.preferences.maxInvestment} max investment, preferred assets: ${schema.preferences.preferredAssets.join(', ')}`,
        'info'
      );

      const agentMessage: AgentMessage = {
        id: `msg-${Date.now()}`,
        agentId: this.id,
        agentType: 'preference',
        content: message,
        messageType: 'info',
        timestamp: new Date(),
        data: schema,
      };

      this.emit('message', agentMessage);
    } catch (error) {
      console.warn('OpenRouter API failed for broadcastPreferenceUpdate, using fallback:', error);
      
      // Fallback message
      const fallbackMessage = `🎯 New user profile created: ${schema.preferences.riskTolerance.toUpperCase()} risk tolerance, $${schema.preferences.maxInvestment} budget, interested in ${schema.preferences.preferredAssets.join(', ')} with minimum ${schema.preferences.minReturnRate}% returns.`;

      const agentMessage: AgentMessage = {
        id: `msg-${Date.now()}`,
        agentId: this.id,
        agentType: 'preference',
        content: fallbackMessage,
        messageType: 'info',
        timestamp: new Date(),
        data: schema,
      };

      this.emit('message', agentMessage);
    }
  }

  async respondToMessage(message: AgentMessage): Promise<void> {
    if (message.agentType === 'matching' && message.messageType === 'request') {
      try {
        // Respond to matching agent requests for preference clarification
        const response = await this.openRouter.generateAgentMessage(
          'preference',
          `Responding to matching agent request: ${message.content}`,
          'response'
        );

        const responseMessage: AgentMessage = {
          id: `msg-${Date.now()}`,
          agentId: this.id,
          agentType: 'preference',
          recipientId: message.agentId,
          content: response,
          messageType: 'response',
          timestamp: new Date(),
        };

        this.emit('message', responseMessage);
      } catch (error) {
        console.warn('OpenRouter API failed for respondToMessage, using fallback:', error);
        
        // Fallback response
        const fallbackResponse = `📋 I can help clarify user preferences. Currently managing preference schemas for risk tolerance, investment amounts, asset preferences, and return expectations.`;

        const responseMessage: AgentMessage = {
          id: `msg-${Date.now()}`,
          agentId: this.id,
          agentType: 'preference',
          recipientId: message.agentId,
          content: fallbackResponse,
          messageType: 'response',
          timestamp: new Date(),
        };

        this.emit('message', responseMessage);
      }
    }
  }
} 
import { OpenRouterClient } from "../openrouter";
import type {
  UserPreferences,
  PreferenceSchema,
  AgentMessage,
} from "../types/agents";
import { EventEmitter } from "events";

export class PreferenceAgent extends EventEmitter {
  private openRouter: OpenRouterClient;
  public id: string;
  public name: string;
  public status: "active" | "idle" | "processing";
  public lastActivity: Date;

  constructor() {
    super();
    this.openRouter = new OpenRouterClient();
    this.id = "preference-agent-001";
    this.name = "Preference Schema Agent";
    this.status = "idle";
    this.lastActivity = new Date();
  }

  async processUserPreferences(
    userInput: string,
    userId: string,
  ): Promise<PreferenceSchema> {
    this.status = "processing";
    this.lastActivity = new Date();

    try {
      console.log("🎯 PreferenceAgent: Starting OpenRouter API call...");

      // Generate schema using OpenRouter
      const schemaResponse = await this.openRouter.generateSchema(userInput);
      console.log(
        "🎯 PreferenceAgent: Received OpenRouter response:",
        schemaResponse?.substring(0, 200),
      );

      // Parse the AI response and create structured preferences
      const preferences = this.parsePreferencesFromAI(
        schemaResponse,
        userInput,
      );
      console.log("🎯 PreferenceAgent: Parsed preferences:", preferences);

      const schema: PreferenceSchema = {
        id: `pref-${Date.now()}-${userId}`,
        userId,
        preferences,
        generatedAt: new Date(),
        constraints: this.generateConstraints(preferences),
      };

      console.log("🎯 PreferenceAgent: Broadcasting preference update...");
      // Communicate with other agents
      await this.broadcastPreferenceUpdate(schema);

      this.status = "idle";
      this.emit("schemaGenerated", schema);
      console.log(
        "🎯 PreferenceAgent: Schema generation completed successfully",
      );

      return schema;
    } catch (error) {
      this.status = "idle";
      console.error(
        "🎯 PreferenceAgent: Error processing user preferences:",
        error,
      );
      throw error;
    }
  }

  private parsePreferencesFromAI(
    aiResponse: string,
    userInput: string,
  ): UserPreferences {
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
    let riskTolerance: "low" | "medium" | "high" = "medium";
    if (
      lowerText.includes("conservative") ||
      lowerText.includes("low risk") ||
      lowerText.includes("safe")
    ) {
      riskTolerance = "low";
    } else if (
      lowerText.includes("aggressive") ||
      lowerText.includes("high risk") ||
      lowerText.includes("risky")
    ) {
      riskTolerance = "high";
    }

    // Extract investment amount
    const amountRegex = /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/;
    const amountMatch = amountRegex.exec(text);
    const maxInvestment = amountMatch
      ? parseFloat(amountMatch[1]?.replace(/,/g, "") || "1000")
      : 1000;

    // Extract assets
    const commonAssets = [
      "eth",
      "btc",
      "usdc",
      "usdt",
      "dai",
      "matic",
      "arb",
      "op",
    ];
    const preferredAssets = commonAssets.filter(
      (asset) =>
        lowerText.includes(asset) || lowerText.includes(asset.toUpperCase()),
    );

    // Extract time horizon
    let timeHorizon: "short" | "medium" | "long" = "medium";
    if (
      lowerText.includes("short") ||
      lowerText.includes("quick") ||
      lowerText.includes("fast")
    ) {
      timeHorizon = "short";
    } else if (lowerText.includes("long") || lowerText.includes("hold")) {
      timeHorizon = "long";
    }

    // Extract return rate
    const returnRegex = /(\d+(?:\.\d+)?)%/;
    const returnMatch = returnRegex.exec(text);
    const minReturnRate = returnMatch ? parseFloat(returnMatch[1] || "5") : 5.0;

    return {
      riskTolerance,
      maxInvestment,
      preferredAssets:
        preferredAssets.length > 0 ? preferredAssets : ["eth", "usdc"],
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
      gasLimit: preferences.riskTolerance === "high" ? 500000 : 200000,
    };
  }

  private async broadcastPreferenceUpdate(schema: PreferenceSchema) {
    console.log(
      "🎯 PreferenceAgent: Generating agent message via OpenRouter...",
    );

    const message = await this.openRouter.generateAgentMessage(
      "preference",
      `New user preference schema generated: ${schema.preferences.riskTolerance} risk, ${schema.preferences.maxInvestment} max investment, preferred assets: ${schema.preferences.preferredAssets.join(", ")}`,
      "info",
    );

    console.log(
      "🎯 PreferenceAgent: Generated message:",
      message?.substring(0, 100),
    );

    const agentMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      agentId: this.id,
      agentType: "preference",
      content: message,
      messageType: "info",
      timestamp: new Date(),
      data: schema,
    };

    this.emit("message", agentMessage);
    console.log("🎯 PreferenceAgent: Message emitted successfully");
  }

  async respondToMessage(message: AgentMessage): Promise<void> {
    if (message.agentType === "matching" && message.messageType === "request") {
      // Respond to matching agent requests for preference clarification
      const response = await this.openRouter.generateAgentMessage(
        "preference",
        `Responding to matching agent request: ${message.content}`,
        "response",
      );

      const responseMessage: AgentMessage = {
        id: `msg-${Date.now()}`,
        agentId: this.id,
        agentType: "preference",
        recipientId: message.agentId,
        content: response,
        messageType: "response",
        timestamp: new Date(),
      };

      this.emit("message", responseMessage);
    }
  }
}

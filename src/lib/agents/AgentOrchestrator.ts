import { PreferenceAgent } from "./PreferenceAgent";
import { ArbAgent } from "./ArbAgent";
import { MatchingAgent } from "./MatchingAgent";
import type {
  AgentMessage,
  PreferenceSchema,
  ArbitrageOpportunity,
  AllocationRecommendation,
} from "../types/agents";
import { EventEmitter } from "events";

interface SystemLog {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  source: string;
  message: string;
  data?: any;
}

export class AgentOrchestrator extends EventEmitter {
  private preferenceAgent: PreferenceAgent;
  private arbAgent: ArbAgent;
  private matchingAgent: MatchingAgent;
  private messageHistory: AgentMessage[] = [];
  private systemLogs: SystemLog[] = [];
  private isRunning = false;
  private debugMode = true;

  constructor() {
    super();

    // Initialize agents
    this.preferenceAgent = new PreferenceAgent();
    this.arbAgent = new ArbAgent();
    this.matchingAgent = new MatchingAgent();

    // Set up agent communication
    this.setupAgentCommunication();

    this.log("info", "orchestrator", "AgentOrchestrator initialized");
  }

  private log(
    level: SystemLog["level"],
    source: string,
    message: string,
    data?: any,
  ) {
    const logEntry: SystemLog = {
      timestamp: new Date(),
      level,
      source,
      message,
      data,
    };

    this.systemLogs.push(logEntry);

    if (this.debugMode) {
      console.log(
        `[${level.toUpperCase()}] ${source}: ${message}`,
        data ? data : "",
      );
    }

    // Emit system logs as events for the UI
    this.emit("systemLog", logEntry);
  }

  private setupAgentCommunication() {
    this.log(
      "debug",
      "orchestrator",
      "Setting up agent communication channels",
    );

    // Listen to all agent messages with detailed logging
    this.preferenceAgent.on("message", (message: AgentMessage) => {
      this.log(
        "debug",
        "preference-agent",
        `Message sent: ${message.messageType}`,
        {
          recipientId: message.recipientId,
          contentPreview: message.content.substring(0, 100),
        },
      );
      this.handleAgentMessage(message);
    });

    this.arbAgent.on("message", (message: AgentMessage) => {
      this.log(
        "debug",
        "arbitrage-agent",
        `Message sent: ${message.messageType}`,
        {
          recipientId: message.recipientId,
          contentPreview: message.content.substring(0, 100),
        },
      );
      this.handleAgentMessage(message);
    });

    this.matchingAgent.on("message", (message: AgentMessage) => {
      this.log(
        "debug",
        "matching-agent",
        `Message sent: ${message.messageType}`,
        {
          recipientId: message.recipientId,
          contentPreview: message.content.substring(0, 100),
        },
      );
      this.handleAgentMessage(message);
    });

    // Handle preference schema generation
    this.preferenceAgent.on("schemaGenerated", (schema: PreferenceSchema) => {
      this.log("info", "preference-agent", "User preference schema generated", {
        userId: schema.userId,
        riskTolerance: schema.preferences.riskTolerance,
        maxInvestment: schema.preferences.maxInvestment,
        preferredAssets: schema.preferences.preferredAssets,
      });
      this.matchingAgent.addUserPreferences(schema);
      this.emit("preferencesProcessed", schema);
    });

    // Handle opportunity discovery
    this.arbAgent.on(
      "opportunityFound",
      (opportunity: ArbitrageOpportunity) => {
        this.log(
          "info",
          "arbitrage-agent",
          "New arbitrage opportunity discovered",
          {
            opportunityId: opportunity.id,
            assetPair: opportunity.assetPair,
            expectedReturn: opportunity.expectedReturn,
            risk: opportunity.risk,
            requiredCapital: opportunity.requiredCapital,
          },
        );
        this.emit("opportunityDiscovered", opportunity);
        // Trigger matching analysis when new opportunities are found
        this.triggerMatchingAnalysis();
      },
    );

    // Handle opportunity expiration
    this.arbAgent.on(
      "opportunityExpired",
      (opportunity: ArbitrageOpportunity) => {
        this.log("debug", "arbitrage-agent", "Arbitrage opportunity expired", {
          opportunityId: opportunity.id,
          assetPair: opportunity.assetPair,
        });
      },
    );

    // Handle recommendations
    this.matchingAgent.on(
      "recommendation",
      (recommendation: AllocationRecommendation) => {
        this.log(
          "info",
          "matching-agent",
          "New allocation recommendation generated",
          {
            opportunityId: recommendation.opportunityId,
            userId: recommendation.userId,
            allocatedAmount: recommendation.allocatedAmount,
            confidence: recommendation.confidence,
          },
        );
        this.emit("recommendationGenerated", recommendation);
      },
    );

    // Handle preferences updates
    this.matchingAgent.on("preferencesUpdated", (schema: PreferenceSchema) => {
      this.log(
        "debug",
        "matching-agent",
        "User preferences updated in matching engine",
        {
          userId: schema.userId,
        },
      );
    });

    this.log(
      "info",
      "orchestrator",
      "Agent communication channels established",
    );
  }

  private handleAgentMessage(message: AgentMessage) {
    this.messageHistory.push(message);
    this.log("debug", "orchestrator", "Agent message received and logged", {
      messageId: message.id,
      from: message.agentType,
      to: message.recipientId,
      type: message.messageType,
    });

    this.emit("agentMessage", message);

    // Route messages between agents
    this.routeMessage(message);
  }

  private routeMessage(message: AgentMessage) {
    if (!message.recipientId) {
      this.log(
        "debug",
        "orchestrator",
        "Message has no recipient, broadcasting",
      );
      return;
    }

    this.log(
      "debug",
      "orchestrator",
      `Routing message to ${message.recipientId}`,
      {
        messageId: message.id,
        messageType: message.messageType,
      },
    );

    // Route messages to appropriate agents
    if (message.recipientId === this.preferenceAgent.id) {
      this.log(
        "debug",
        "orchestrator",
        "Delivering message to preference agent",
      );
      this.preferenceAgent.respondToMessage(message);
    } else if (message.recipientId === this.arbAgent.id) {
      this.log(
        "debug",
        "orchestrator",
        "Delivering message to arbitrage agent",
      );
      this.arbAgent.respondToMessage(message);
    } else if (message.recipientId === this.matchingAgent.id) {
      this.log("debug", "orchestrator", "Delivering message to matching agent");
      this.matchingAgent.respondToMessage(message);
    } else {
      this.log(
        "warn",
        "orchestrator",
        `Unknown recipient: ${message.recipientId}`,
      );
    }
  }

  private async triggerMatchingAnalysis() {
    this.log("debug", "orchestrator", "Triggering matching analysis");
    const activeOpportunities = this.arbAgent.getActiveOpportunities();

    if (activeOpportunities.length > 0) {
      this.log(
        "info",
        "orchestrator",
        `Starting matching analysis with ${activeOpportunities.length} opportunities`,
      );
      try {
        await this.matchingAgent.analyzeOpportunities(activeOpportunities);
        this.log(
          "info",
          "orchestrator",
          "Matching analysis completed successfully",
        );
      } catch (error) {
        this.log(
          "error",
          "orchestrator",
          "Error during matching analysis",
          error,
        );
      }
    } else {
      this.log(
        "debug",
        "orchestrator",
        "No active opportunities for matching analysis",
      );
    }
  }

  async start() {
    if (this.isRunning) {
      this.log("warn", "orchestrator", "System already running");
      return;
    }

    this.log("info", "orchestrator", "Starting multi-agent system");
    this.isRunning = true;

    // Start arbitrage scanning
    this.log(
      "debug",
      "orchestrator",
      "Starting arbitrage agent scanning (15s intervals)",
    );
    this.arbAgent.startScanning(15000); // Scan every 15 seconds for demo

    this.emit("systemStarted");
    this.log("info", "orchestrator", "Multi-agent system started successfully");
  }

  stop() {
    if (!this.isRunning) {
      this.log("warn", "orchestrator", "System already stopped");
      return;
    }

    this.log("info", "orchestrator", "Stopping multi-agent system");
    this.isRunning = false;
    this.arbAgent.stopScanning();

    this.emit("systemStopped");
    this.log("info", "orchestrator", "Multi-agent system stopped");
  }

  async processUserInput(
    userInput: string,
    userId: string,
  ): Promise<PreferenceSchema> {
    this.log("info", "orchestrator", `Processing user input for ${userId}`, {
      inputLength: userInput.length,
      inputPreview: userInput.substring(0, 100),
    });

    try {
      const schema = await this.preferenceAgent.processUserPreferences(
        userInput,
        userId,
      );
      this.log(
        "info",
        "orchestrator",
        `User preferences processed successfully for ${userId}`,
      );
      return schema;
    } catch (error) {
      this.log(
        "error",
        "orchestrator",
        `Error processing user input for ${userId}`,
        error,
      );
      throw error;
    }
  }

  getSystemStatus() {
    const status = {
      isRunning: this.isRunning,
      agents: {
        preference: {
          id: this.preferenceAgent.id,
          name: this.preferenceAgent.name,
          status: this.preferenceAgent.status,
          lastActivity: this.preferenceAgent.lastActivity,
        },
        arbitrage: {
          id: this.arbAgent.id,
          name: this.arbAgent.name,
          status: this.arbAgent.status,
          lastActivity: this.arbAgent.lastActivity,
        },
        matching: {
          id: this.matchingAgent.id,
          name: this.matchingAgent.name,
          status: this.matchingAgent.status,
          lastActivity: this.matchingAgent.lastActivity,
        },
      },
      metrics: {
        messagesExchanged: this.messageHistory.length,
        activeOpportunities: this.arbAgent.getActiveOpportunities().length,
        totalRecommendations: this.messageHistory.filter(
          (m) => m.messageType === "info" && m.agentType === "matching",
        ).length,
        systemLogs: this.systemLogs.length,
      },
    };

    this.log(
      "debug",
      "orchestrator",
      "System status requested",
      status.metrics,
    );
    return status;
  }

  getMessages(): AgentMessage[] {
    return [...this.messageHistory].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  getSystemLogs(): SystemLog[] {
    return [...this.systemLogs].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  getActiveOpportunities(): ArbitrageOpportunity[] {
    return this.arbAgent.getActiveOpportunities();
  }

  getUserRecommendations(userId: string): AllocationRecommendation[] {
    return this.matchingAgent.getUserRecommendations(userId);
  }

  // Public method to get all opportunities with detailed info
  getAllOpportunitiesWithDetails(): ArbitrageOpportunity[] {
    return this.arbAgent.getActiveOpportunities();
  }

  // Enhanced demo methods for testing natural language communication
  async simulateAgentConversation(topic: string) {
    this.log(
      "info",
      "orchestrator",
      `Simulating agent conversation about: ${topic}`,
    );

    const conversations = [
      {
        from: this.preferenceAgent.id,
        to: this.arbAgent.id,
        message: `Hey Arbitrage Agent, I just processed a user who's interested in ${topic}. What opportunities do you see in this space?`,
      },
      {
        from: this.arbAgent.id,
        to: this.matchingAgent.id,
        message: `Matching Agent, I've found some ${topic} opportunities. The market is showing some interesting price discrepancies.`,
      },
      {
        from: this.matchingAgent.id,
        to: this.preferenceAgent.id,
        message: `Preference Agent, can you clarify the risk tolerance for users interested in ${topic}? I want to make sure my allocations are appropriate.`,
      },
    ];

    for (const conv of conversations) {
      this.log("debug", "orchestrator", `Simulating conversation step`, {
        from: conv.from,
        to: conv.to,
        messagePreview: conv.message.substring(0, 50),
      });

      const agentMessage: AgentMessage = {
        id: `demo-${Date.now()}-${Math.random()}`,
        agentId: conv.from,
        agentType: conv.from.includes("preference")
          ? "preference"
          : conv.from.includes("arb")
            ? "arbitrage"
            : "matching",
        recipientId: conv.to,
        content: conv.message,
        messageType: "info",
        timestamp: new Date(),
      };

      this.handleAgentMessage(agentMessage);

      // Small delay for realistic conversation flow
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.log(
      "info",
      "orchestrator",
      `Agent conversation simulation completed for topic: ${topic}`,
    );
  }

  // Enable/disable debug mode
  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    this.log(
      "info",
      "orchestrator",
      `Debug mode ${enabled ? "enabled" : "disabled"}`,
    );
  }

  // Clear logs (for testing)
  clearLogs() {
    this.systemLogs = [];
    this.messageHistory = [];
    this.log("info", "orchestrator", "System logs and message history cleared");
  }
}

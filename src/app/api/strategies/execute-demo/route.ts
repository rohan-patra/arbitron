import { NextResponse } from "next/server";
import { env } from "~/env";

interface ArbitrageOpportunity {
  id: string;
  type: string;
  profitPercent: number;
  maxFundAllocationUSD: number;
  durationSeconds: number;
  chainsInvolved: string[];
  tokensInvolved: string[];
  bridgesUsed: string[];
  exchangesInvolved: { cex: string[]; dex: string[] };
  riskLevel: string;
  executionSpeed: string;
  gasFeeUSD: number;
  slippagePercent: number;
  inventoryBased: boolean;
}

interface Strategy {
  strategyId: string;
  strategyName: string;
  fundedAmount: number;
  riskProfile: { riskTolerance: string };
  arbitrageTypes: Record<string, { enabled: boolean; weight: number }>;
  chainPreferences: { enabledChains: string[] };
  tokenFilters: { allowedTokens?: string[]; stablecoinsOnly: boolean };
}

export async function POST(request: Request) {
  try {
    const { strategies, opportunities } = (await request.json()) as {
      strategies: Strategy[];
      opportunities: ArbitrageOpportunity[];
    };

    if (opportunities.length === 0 || strategies.length === 0) {
      return NextResponse.json({
        logs: ["No suitable on-chain opportunities or strategies available"],
        selectedStrategy: null,
        selectedOpportunity: null,
        executionTime: 0,
        profit: 0,
      });
    }

    const systemPrompt = `You are an AI arbitrage execution agent that generates realistic terminal-style logs for on-chain arbitrage operations using Chainlink technology.

Generate 3-7 interstitial log entries that would appear during arbitrage execution, focusing on:
- Initial opportunity detection and validation
- Chainlink price feed verification
- Cross-chain fund preparation using Chainlink CCIP when needed
- Smart contract interactions
- Transaction confirmations
- Risk monitoring
- Final profit calculation

Use technical terminology and include:
- Chainlink Data Feeds for price verification
- Chainlink CCIP for cross-chain transfers when multiple chains are involved
- Chainlink Automation for execution timing
- Real transaction hashes (use realistic fake ones)
- Gas estimation and optimization
- Slippage calculations
- MEV protection measures

Format as terminal-style logs with timestamps. Be concise but technical.
Return only a JSON array of log strings.`;

    const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate execution logs for this arbitrage opportunity:\n${JSON.stringify(opportunities[0], null, 2)}\n\nUsing strategy: ${strategies[0]?.strategyName}\nChains involved: ${opportunities[0]?.chainsInvolved.join(", ")}\nTokens: ${opportunities[0]?.tokensInvolved.join(", ")}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = await response.json();
    const logs = JSON.parse(
      data.choices[0]?.message.content
        .replace("```json", "")
        .replace("```", "")
        .trim(),
    );

    // Select random strategy and opportunity
    const fundedStrategies = strategies.filter((s) => s.fundedAmount > 0);
    console.log("Funded strategies:", fundedStrategies);

    const selectedStrategy =
      fundedStrategies[Math.floor(Math.random() * fundedStrategies.length)];
    const selectedOpportunity =
      opportunities[Math.floor(Math.random() * opportunities.length)];

    console.log(
      "Selected strategy:",
      selectedStrategy?.strategyId,
      "funded amount:",
      selectedStrategy?.fundedAmount,
    );
    console.log(
      "Selected opportunity:",
      selectedOpportunity?.id,
      "profit percent:",
      selectedOpportunity?.profitPercent,
    );

    if (!selectedStrategy || !selectedOpportunity) {
      return NextResponse.json({
        logs: ["No funded strategies available for execution"],
        selectedStrategy: null,
        selectedOpportunity: null,
        executionTime: 0,
        profit: 0,
      });
    }

    // Calculate allocation amount and return profit percentage
    const allocatedAmount = Math.min(
      selectedStrategy.fundedAmount * 0.1, // Use 10% of strategy funds
      selectedOpportunity.maxFundAllocationUSD,
    );

    console.log(
      "Allocated amount:",
      allocatedAmount,
      "Profit percent:",
      selectedOpportunity.profitPercent,
    );

    return NextResponse.json({
      logs,
      selectedStrategy: selectedStrategy.strategyId,
      selectedOpportunity: selectedOpportunity.id,
      executionTime: selectedOpportunity.durationSeconds * 1000, // Convert to milliseconds
      profitPercent: selectedOpportunity.profitPercent,
      allocatedAmount,
    });
  } catch (error) {
    console.error("Demo execution failed:", error);
    return NextResponse.json(
      { error: "Failed to generate execution demo" },
      { status: 500 },
    );
  }
}

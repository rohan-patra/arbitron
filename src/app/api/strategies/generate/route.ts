import { NextResponse } from "next/server";
import { env } from "~/env";
import type { Strategy, OpenAIResponse } from "~/types/strategy";

export async function POST(request: Request) {
  try {
    const { currentStrategy, prompt } = (await request.json()) as {
      currentStrategy: Strategy;
      prompt: string;
    };

    const systemPrompt = `You are an AI assistant specialized in configuring arbitrage trading strategies. You will receive:
1. A current strategy configuration object
2. A user's natural language request to modify the strategy

Your task is to intelligently update the strategy configuration based on the user's request. Consider these guidelines:

- For conservative strategies: Lower weights on CEX-CEX and CEX-DEX arbitrage, higher reserve ratios, lower max drawdowns
- For aggressive strategies: Higher leverage, flash loans, lower reserve ratios, higher volatility limits
- For on-chain focused strategies: Disable CEX-related arbitrage types, focus on DEX-DEX and cross-chain
- For stablecoin strategies: Enable stablecoinsOnly filter, lower volatility limits
- Maintain logical consistency between related settings

Return ONLY the updated strategy object as valid JSON, preserving the same structure.`;

    const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Current strategy: ${JSON.stringify(currentStrategy, null, 2)}\n\nUser request: ${prompt}\n\nPlease update the strategy configuration based on this request.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = (await response.json()) as OpenAIResponse;
    const updatedStrategy = JSON.parse(
      data.choices[0]!.message.content.replace("```json", "")
        .replace("```", "")
        .trim(),
    ) as Strategy;

    return NextResponse.json(updatedStrategy);
  } catch (error) {
    console.error("Strategy generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy configuration" },
      { status: 500 },
    );
  }
}

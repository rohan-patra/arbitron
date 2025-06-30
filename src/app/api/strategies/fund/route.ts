import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Strategy, UserData } from "~/types/strategy";

const strategiesPath = path.resolve(process.cwd(), "strategies.json");
const userDataPath = path.resolve(process.cwd(), "user-data.json");

export async function POST(request: Request) {
  try {
    const { strategyId, amount } = (await request.json()) as {
      strategyId: string;
      amount: number;
    };

    // Load user data
    const userData = JSON.parse(
      await fs.readFile(userDataPath, "utf-8"),
    ) as UserData;

    // Load strategies
    const strategiesData = await fs.readFile(strategiesPath, "utf-8");
    const strategies = JSON.parse(strategiesData) as Strategy[];

    // Check if user has sufficient balance
    if (userData.wallet.usdcBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 },
      );
    }

    // Find and update strategy
    const strategyIndex = strategies.findIndex(
      (s) => s.strategyId === strategyId,
    );
    if (strategyIndex === -1) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 },
      );
    }

    // Update balances
    userData.wallet.usdcBalance -= amount;
    strategies[strategyIndex]!.fundedAmount += amount;

    // Save both files
    await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2));
    await fs.writeFile(strategiesPath, JSON.stringify(strategies, null, 2));

    return NextResponse.json({
      success: true,
      newBalance: userData.wallet.usdcBalance,
      newFundedAmount: strategies[strategyIndex]!.fundedAmount,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fund strategy" },
      { status: 500 },
    );
  }
}

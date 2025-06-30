import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { UserData } from "~/types/strategy";

const userDataPath = path.resolve(process.cwd(), "user-data.json");

export async function POST(request: Request) {
  try {
    const { amount } = (await request.json()) as { amount: number };

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Load user data
    const userData = JSON.parse(
      await fs.readFile(userDataPath, "utf-8"),
    ) as UserData;

    // Add to balance
    userData.wallet.usdcBalance += amount;

    // Save updated data
    await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2));

    return NextResponse.json({
      success: true,
      newBalance: userData.wallet.usdcBalance,
      depositedAmount: amount,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to deposit funds" },
      { status: 500 },
    );
  }
}

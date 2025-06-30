import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { UserData } from "~/types/strategy";

const userDataPath = path.resolve(process.cwd(), "user-data.json");

export async function POST(request: Request) {
  try {
    const { address, amount } = (await request.json()) as {
      address: string;
      amount: number;
    };

    if (!address || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid address or amount" },
        { status: 400 },
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 },
      );
    }

    // Load user data
    const userData = JSON.parse(
      await fs.readFile(userDataPath, "utf-8"),
    ) as UserData;

    // Check sufficient balance
    if (userData.wallet.usdcBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 },
      );
    }

    // Deduct from balance
    userData.wallet.usdcBalance -= amount;

    // Save updated data
    await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2));

    // In a real application, this would trigger an actual blockchain transaction
    // For demo purposes, we just update the balance

    return NextResponse.json({
      success: true,
      newBalance: userData.wallet.usdcBalance,
      withdrawnAmount: amount,
      toAddress: address,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to withdraw funds" },
      { status: 500 },
    );
  }
}

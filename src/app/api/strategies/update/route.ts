import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Strategy } from "~/types/strategy";

const strategiesPath = path.resolve(process.cwd(), "strategies.json");

export async function POST(request: Request) {
  try {
    const updatedStrategy = (await request.json()) as Strategy;
    const data = await fs.readFile(strategiesPath, "utf-8");
    const strategies = JSON.parse(data) as Strategy[];

    const index = strategies.findIndex(
      (s: Strategy) => s.strategyId === updatedStrategy.strategyId,
    );

    if (index === -1) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 },
      );
    }

    strategies[index] = updatedStrategy;
    await fs.writeFile(strategiesPath, JSON.stringify(strategies, null, 2));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update strategy" },
      { status: 500 },
    );
  }
}

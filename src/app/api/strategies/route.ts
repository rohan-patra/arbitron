import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Strategy } from "~/types/strategy";

const strategiesPath = path.resolve(process.cwd(), "strategies.json");

export async function GET() {
  try {
    const data = await fs.readFile(strategiesPath, "utf-8");
    const strategies = JSON.parse(data) as Strategy[];
    return NextResponse.json(strategies);
  } catch {
    return NextResponse.json(
      { error: "Failed to load strategies." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const newStrategy = (await request.json()) as Strategy;
    const data = await fs.readFile(strategiesPath, "utf-8");
    const strategies = JSON.parse(data) as Strategy[];
    strategies.push(newStrategy);
    await fs.writeFile(strategiesPath, JSON.stringify(strategies, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save strategy." },
      { status: 500 },
    );
  }
}

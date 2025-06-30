import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { UserData } from "~/types/strategy";

const userDataPath = path.resolve(process.cwd(), "user-data.json");

export async function GET() {
  try {
    const data = await fs.readFile(userDataPath, "utf-8");
    const userData = JSON.parse(data) as UserData;
    return NextResponse.json(userData);
  } catch {
    return NextResponse.json(
      { error: "Failed to load user data." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const updatedUserData = (await request.json()) as UserData;
    await fs.writeFile(userDataPath, JSON.stringify(updatedUserData, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update user data." },
      { status: 500 },
    );
  }
}

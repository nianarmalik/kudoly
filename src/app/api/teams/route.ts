import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();
    const adminToken = uuidv4();

    db.prepare(
      "INSERT INTO teams (id, name, admin_token) VALUES (?, ?, ?)"
    ).run(id, name.trim(), adminToken);

    return NextResponse.json(
      { id, name: name.trim(), adminToken },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

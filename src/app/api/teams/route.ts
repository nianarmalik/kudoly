import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
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

    const db = await ensureDb();
    const id = uuidv4();
    const adminToken = uuidv4();

    await db.execute({
      sql: "INSERT INTO teams (id, name, admin_token) VALUES (?, ?, ?)",
      args: [id, name.trim(), adminToken],
    });

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

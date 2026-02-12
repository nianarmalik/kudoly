import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// POST /api/teams/[teamId]/members - Add a member (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const { name, adminToken } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Member name is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify admin access
    const team = db
      .prepare("SELECT id, admin_token FROM teams WHERE id = ?")
      .get(teamId) as { id: string; admin_token: string } | undefined;

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (!adminToken || adminToken !== team.admin_token) {
      return NextResponse.json(
        { error: "Only the team creator can add members" },
        { status: 403 }
      );
    }

    // Check for duplicate names
    const existing = db
      .prepare(
        "SELECT id FROM members WHERE team_id = ? AND LOWER(name) = LOWER(?)"
      )
      .get(teamId, name.trim());
    if (existing) {
      return NextResponse.json(
        { error: "A member with this name already exists" },
        { status: 409 }
      );
    }

    const id = uuidv4();
    db.prepare(
      "INSERT INTO members (id, team_id, name) VALUES (?, ?, ?)"
    ).run(id, teamId, name.trim());

    return NextResponse.json(
      { id, team_id: teamId, name: name.trim() },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

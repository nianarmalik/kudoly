import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/teams/[teamId]/members - Add a member (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`add-member:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { teamId } = await params;
    const { name } = await request.json();
    // Read admin token from httpOnly cookie instead of request body
    const adminToken = request.cookies.get(`kudoly_admin_${teamId}`)?.value;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Member name is required" },
        { status: 400 }
      );
    }

    const db = await ensureDb();

    // Verify admin access
    const teamResult = await db.execute({
      sql: "SELECT id, admin_token FROM teams WHERE id = ?",
      args: [teamId],
    });

    if (teamResult.rows.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (!adminToken || adminToken !== teamResult.rows[0].admin_token) {
      return NextResponse.json(
        { error: "Only the team creator can add members" },
        { status: 403 }
      );
    }

    // Check for duplicate names
    const existingResult = await db.execute({
      sql: "SELECT id FROM members WHERE team_id = ? AND LOWER(name) = LOWER(?)",
      args: [teamId, name.trim()],
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "A member with this name already exists" },
        { status: 409 }
      );
    }

    const id = uuidv4();
    await db.execute({
      sql: "INSERT INTO members (id, team_id, name) VALUES (?, ?, ?)",
      args: [id, teamId, name.trim()],
    });

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

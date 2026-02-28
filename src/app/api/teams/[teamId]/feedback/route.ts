import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { isPositiveWord } from "@/lib/sentiment";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/teams/[teamId]/feedback - Submit or update anonymous feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`feedback:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { teamId } = await params;
    const { memberId, word, voterId } = await request.json();

    if (!memberId || !word || !voterId) {
      return NextResponse.json(
        { error: "Member ID, word, and voter ID are required" },
        { status: 400 }
      );
    }

    const trimmedWord = word.trim().toLowerCase();

    if (trimmedWord.includes(" ")) {
      return NextResponse.json(
        { error: "Feedback must be a single word" },
        { status: 400 }
      );
    }

    if (!isPositiveWord(trimmedWord)) {
      return NextResponse.json(
        {
          error:
            "Only positive feedback is allowed! Try words like: amazing, brilliant, creative, dedicated, inspiring...",
        },
        { status: 422 }
      );
    }

    const db = await ensureDb();

    // Verify member belongs to team
    const memberResult = await db.execute({
      sql: "SELECT id FROM members WHERE id = ? AND team_id = ?",
      args: [memberId, teamId],
    });

    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 }
      );
    }

    // Check if this voter already gave feedback for this member
    const existingResult = await db.execute({
      sql: "SELECT id FROM feedback WHERE member_id = ? AND voter_id = ?",
      args: [memberId, voterId],
    });

    if (existingResult.rows.length > 0) {
      // Update existing feedback
      const existingId = existingResult.rows[0].id as string;
      await db.execute({
        sql: "UPDATE feedback SET word = ? WHERE id = ?",
        args: [trimmedWord, existingId],
      });
      return NextResponse.json(
        { id: existingId, memberId, word: trimmedWord, updated: true },
        { status: 200 }
      );
    } else {
      // Create new feedback
      const id = uuidv4();
      await db.execute({
        sql: "INSERT INTO feedback (id, member_id, team_id, voter_id, word) VALUES (?, ?, ?, ?, ?)",
        args: [id, memberId, teamId, voterId, trimmedWord],
      });
      return NextResponse.json(
        { id, memberId, word: trimmedWord, updated: false },
        { status: 201 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

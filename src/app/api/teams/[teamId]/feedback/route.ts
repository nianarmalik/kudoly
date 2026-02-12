import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { isPositiveWord } from "@/lib/sentiment";

// POST /api/teams/[teamId]/feedback - Submit or update anonymous feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
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

    // Validate single word
    if (trimmedWord.includes(" ")) {
      return NextResponse.json(
        { error: "Feedback must be a single word" },
        { status: 400 }
      );
    }

    // Check positivity
    if (!isPositiveWord(trimmedWord)) {
      return NextResponse.json(
        {
          error:
            "Only positive feedback is allowed! Try words like: amazing, brilliant, creative, dedicated, inspiring...",
        },
        { status: 422 }
      );
    }

    const db = getDb();

    // Verify member belongs to team
    const member = db
      .prepare("SELECT id FROM members WHERE id = ? AND team_id = ?")
      .get(memberId, teamId);
    if (!member) {
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 }
      );
    }

    // Check if this voter already gave feedback for this member
    const existing = db
      .prepare(
        "SELECT id FROM feedback WHERE member_id = ? AND voter_id = ?"
      )
      .get(memberId, voterId) as { id: string } | undefined;

    if (existing) {
      // Update existing feedback
      db.prepare("UPDATE feedback SET word = ? WHERE id = ?").run(
        trimmedWord,
        existing.id
      );
      return NextResponse.json(
        { id: existing.id, memberId, word: trimmedWord, updated: true },
        { status: 200 }
      );
    } else {
      // Create new feedback
      const id = uuidv4();
      db.prepare(
        "INSERT INTO feedback (id, member_id, team_id, voter_id, word) VALUES (?, ?, ?, ?, ?)"
      ).run(id, memberId, teamId, voterId, trimmedWord);
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

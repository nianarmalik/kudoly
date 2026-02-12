import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

// GET /api/teams/[teamId] - Get team details with members and feedback
// Pass ?admin=TOKEN to verify admin access
// Pass ?voter=VOTER_ID to get the current user's existing votes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const adminToken = request.nextUrl.searchParams.get("admin");
    const voterId = request.nextUrl.searchParams.get("voter");
    const db = getDb();

    const team = db
      .prepare("SELECT * FROM teams WHERE id = ?")
      .get(teamId) as
      | { id: string; name: string; admin_token: string; created_at: string }
      | undefined;

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isAdmin = adminToken === team.admin_token;

    const members = db
      .prepare("SELECT * FROM members WHERE team_id = ? ORDER BY name")
      .all(teamId) as {
      id: string;
      name: string;
      team_id: string;
      created_at: string;
    }[];

    // Get feedback for each member + check if current voter already voted
    const membersWithFeedback = members.map((member) => {
      const feedback = db
        .prepare(
          "SELECT word, COUNT(*) as count FROM feedback WHERE member_id = ? GROUP BY word ORDER BY count DESC"
        )
        .all(member.id) as { word: string; count: number }[];

      // Get this voter's existing feedback for this member
      let myVote: string | null = null;
      if (voterId) {
        const vote = db
          .prepare(
            "SELECT word FROM feedback WHERE member_id = ? AND voter_id = ?"
          )
          .get(member.id, voterId) as { word: string } | undefined;
        myVote = vote?.word ?? null;
      }

      return {
        ...member,
        feedback,
        myVote,
      };
    });

    return NextResponse.json({
      id: team.id,
      name: team.name,
      created_at: team.created_at,
      isAdmin,
      members: membersWithFeedback,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

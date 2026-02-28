import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// GET /api/teams/[teamId] - Get team details with members and feedback
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`get-team:${ip}`, { limit: 60, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { teamId } = await params;
    // Read admin token from httpOnly cookie instead of URL query param
    const adminToken = request.cookies.get(`kudoly_admin_${teamId}`)?.value ?? null;
    const voterId = request.nextUrl.searchParams.get("voter");
    const db = await ensureDb();

    const teamResult = await db.execute({
      sql: "SELECT * FROM teams WHERE id = ?",
      args: [teamId],
    });

    if (teamResult.rows.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const team = teamResult.rows[0];
    const isAdmin = adminToken === team.admin_token;

    const membersResult = await db.execute({
      sql: "SELECT * FROM members WHERE team_id = ? ORDER BY name",
      args: [teamId],
    });

    const membersWithFeedback = await Promise.all(
      membersResult.rows.map(async (member) => {
        const feedbackResult = await db.execute({
          sql: "SELECT word, COUNT(*) as count FROM feedback WHERE member_id = ? GROUP BY word ORDER BY count DESC",
          args: [member.id as string],
        });

        const feedback = feedbackResult.rows.map((row) => ({
          word: row.word as string,
          count: Number(row.count),
        }));

        let myVote: string | null = null;
        if (voterId) {
          const voteResult = await db.execute({
            sql: "SELECT word FROM feedback WHERE member_id = ? AND voter_id = ?",
            args: [member.id as string, voterId],
          });
          myVote =
            voteResult.rows.length > 0
              ? (voteResult.rows[0].word as string)
              : null;
        }

        return {
          id: member.id,
          name: member.name,
          team_id: member.team_id,
          created_at: member.created_at,
          feedback,
          myVote,
        };
      })
    );

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

import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`create-team:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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

    const response = NextResponse.json(
      { id, name: name.trim() },
      { status: 201 }
    );

    // Set admin token as httpOnly cookie — not exposed in URL or JS
    response.cookies.set(`kudoly_admin_${id}`, adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

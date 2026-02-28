import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// GET /api/teams/[teamId]/qr - Generate QR code for the public feedback link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`qr:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { teamId } = await params;
    // Derive origin from the request itself — never trust client-supplied origin
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "localhost:3000";
    const origin = `${proto}://${host}`;
    const publicUrl = `${origin}/team/${teamId}`;

    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#6c5ce7",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({ qr: qrDataUrl, url: publicUrl });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}

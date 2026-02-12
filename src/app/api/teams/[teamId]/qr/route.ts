import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/teams/[teamId]/qr?origin=... - Generate QR code for the public feedback link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const origin = request.nextUrl.searchParams.get("origin") || "http://localhost:3001";
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


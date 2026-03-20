import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId, type, callType, callerId, callerName, callerImage } = await req.json();

    // type = "incoming" | "accepted" | "rejected" | "ended"
    await pusherServer.trigger(`user-${targetUserId}`, "call-signal", {
      type,
      callType, // "voice" | "video"
      callerId: callerId ?? session.user.id,
      callerName: callerName ?? session.user.name,
      callerImage: callerImage ?? session.user.image,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
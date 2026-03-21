import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

async function getDbUserId(email: string | null | undefined) {
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getDbUserId(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const {
      targetUserId, type, callType,
      callerName, callerImage, callerPeerId
    } = await req.json();

    await pusherServer.trigger(`user-${targetUserId}`, "call-signal", {
      type,
      callType,
      callerId: userId,
      callerName: callerName ?? session.user.name,
      callerImage: callerImage ?? session.user.image,
      callerPeerId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
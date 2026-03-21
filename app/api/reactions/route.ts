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

    const { messageId, emoji, conversationId } = await req.json();

    // Toggle reaction — if exists remove it, if not add it
    const existing = await prisma.messageReaction.findUnique({
      where: {
        userId_messageId_emoji: { userId, messageId, emoji },
      },
    });

    if (existing) {
      await prisma.messageReaction.delete({
        where: {
          userId_messageId_emoji: { userId, messageId, emoji },
        },
      });
    } else {
      await prisma.messageReaction.create({
        data: { userId, messageId, emoji },
      });
    }

    // Fetch updated message reactions
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Broadcast to conversation
    await pusherServer.trigger(
      `conversation-${conversationId}`,
      "reaction-update",
      { messageId, reactions }
    );

    return NextResponse.json({ success: true, reactions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getDbUserId(email: string | null | undefined) {
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.id ?? null;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getDbUserId(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        user1: {
          select: {
            id: true, name: true, image: true,
            email: true, isOnline: true, lastSeen: true,
          },
        },
        user2: {
          select: {
            id: true, name: true, image: true,
            email: true, isOnline: true, lastSeen: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            messages: {
              where: { isRead: false, senderId: { not: userId } },
            },
          },
        },
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    const { targetUserId } = await req.json();

    if (!targetUserId || targetUserId === userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const [user1Id, user2Id] =
      userId < targetUserId
        ? [userId, targetUserId]
        : [targetUserId, userId];

    const existing = await prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastSeen: true } },
        user2: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastSeen: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
        _count: { select: { messages: { where: { isRead: false, senderId: { not: userId } } } } },
      },
    });

    if (existing) return NextResponse.json(existing);

    const conversation = await prisma.conversation.create({
      data: { user1Id, user2Id },
      include: {
        user1: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastSeen: true } },
        user2: { select: { id: true, name: true, image: true, email: true, isOnline: true, lastSeen: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
        _count: { select: { messages: { where: { isRead: false, senderId: { not: userId } } } } },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
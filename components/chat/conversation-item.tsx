"use client";

import { useSession } from "next-auth/react";
import { cn, formatConversationTime, truncate } from "@/lib/utils";
import { Conversation } from "@/types";
import { UserAvatar } from "./user-avatar";
import { CheckCheck } from "lucide-react";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: Props) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const other = conversation.user1Id === userId
    ? conversation.user2
    : conversation.user1;

  // ✅ Guard against undefined user
  if (!other) return null;

  const lastMessage = conversation.messages?.[0];
  const unread = conversation._count?.messages ?? 0;
  const isLastMine = lastMessage?.senderId === userId;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left",
        isActive
          ? "bg-violet-600/20 border border-violet-600/30"
          : "hover:bg-neutral-800"
      )}
    >
      <UserAvatar user={other} size="md" showOnline />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn(
            "text-sm font-semibold truncate",
            isActive ? "text-violet-400" : "text-neutral-100"
          )}>
            {other.name ?? other.email ?? "Unknown"}
          </span>
          {lastMessage && (
            <span className="text-[10px] text-neutral-500 flex-shrink-0 ml-1">
              {formatConversationTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
            {isLastMine && (
              <CheckCheck className={cn(
                "w-3 h-3 flex-shrink-0",
                lastMessage?.isRead ? "text-violet-400" : "text-neutral-600"
              )} />
            )}
            {lastMessage
              ? lastMessage.isDeleted
                ? "Message deleted"
                : truncate(lastMessage.content, 35)
              : <span className="italic">No messages yet</span>
            }
          </p>
          {unread > 0 && !isActive && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
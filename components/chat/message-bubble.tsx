"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Smile, MoreHorizontal } from "lucide-react";
import { cn, formatMessageTime } from "@/lib/utils";
import { Message } from "@/types";
import { UserAvatar } from "./user-avatar";
import { isSameDay } from "date-fns";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

interface Props {
  message: Message;
  showAvatar?: boolean;
}

export function MessageBubble({ message, showAvatar = false }: Props) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const isMine = message.senderId === userId;
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  if (message.isDeleted) {
    return (
      <div className={cn("flex px-4 mt-1", isMine ? "justify-end" : "justify-start")}>
        <p className="text-xs text-neutral-500 italic px-3 py-2 rounded-xl border border-dashed border-neutral-700">
          Message deleted
        </p>
      </div>
    );
  }

  const reactionGroups = message.reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.user.name ?? "Someone");
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: string[] }>);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-end gap-2 px-4 mt-1 group",
        isMine ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
    >
      {/* Avatar */}
      {!isMine && (
        <div className="w-8 flex-shrink-0 mb-1">
          {showAvatar && <UserAvatar user={message.sender} size="xs" />}
        </div>
      )}

      <div className={cn("flex flex-col max-w-[70%]", isMine ? "items-end" : "items-start")}>
        {!isMine && showAvatar && (
          <span className="text-xs text-neutral-500 mb-1 ml-1">{message.sender.name}</span>
        )}

        <div className="relative flex items-end gap-2">
          {/* Action buttons */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "flex items-center gap-0.5 absolute top-1/2 -translate-y-1/2 z-10",
                  isMine ? "-left-20" : "-right-20"
                )}
              >
                <div className="relative">
                  <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition-colors"
                  >
                    <Smile className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                  <AnimatePresence>
                    {showEmoji && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        className={cn(
                          "absolute bottom-full mb-1 flex gap-0.5 p-1.5 rounded-xl bg-neutral-800 border border-neutral-700 shadow-xl z-20",
                          isMine ? "right-0" : "left-0"
                        )}
                      >
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            className="text-base hover:scale-125 transition-transform p-0.5"
                            onClick={() => setShowEmoji(false)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bubble */}
          <div className={cn(
            "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
            isMine
              ? "bg-violet-600 text-white rounded-br-sm"
              : "bg-neutral-800 text-neutral-100 rounded-bl-sm"
          )}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <div className={cn("flex items-center gap-1 mt-1", isMine ? "justify-end" : "justify-start")}>
              <span className={cn("text-[10px]", isMine ? "text-violet-200" : "text-neutral-500")}>
                {formatMessageTime(message.createdAt)}
                {message.isEdited && " · edited"}
              </span>
              {isMine && (
                message.isRead
                  ? <CheckCheck className="w-3 h-3 text-violet-200" />
                  : <Check className="w-3 h-3 text-violet-200" />
              )}
            </div>
          </div>
        </div>

        {/* Reactions */}
        {Object.values(reactionGroups).length > 0 && (
          <div className={cn("flex gap-1 mt-1 flex-wrap", isMine ? "justify-end" : "justify-start")}>
            {Object.values(reactionGroups).map((r) => (
              <button
                key={r.emoji}
                title={r.users.join(", ")}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs hover:bg-neutral-700 transition-colors"
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="text-neutral-400">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
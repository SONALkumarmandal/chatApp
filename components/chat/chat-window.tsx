"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  Loader2,
  ChevronDown,
  X,
} from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { useChatStore } from "@/store/chat-store";
import { pusherClient } from "@/lib/pusher";
import { Conversation, Message } from "@/types";
import { cn, formatLastSeen } from "@/lib/utils";
import { isSameDay, format } from "date-fns";
import toast from "react-hot-toast";

interface Props {
  conversationId: string;
}

export function ChatWindow({ conversationId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = (session?.user as any)?.id;

  const {
    conversations,
    addConversation,
    messages,
    addMessage,
    setMessages,
    prependMessages,
    typingUsers,
    setTyping,
    setSidebarOpen,
  } = useChatStore();

  const conversation = conversations.find((c) => c.id === conversationId);
  const otherUser = conversation
    ? conversation.user1Id === userId
      ? conversation.user2
      : conversation.user1
    : null;

  const msgs = messages[conversationId] || [];
  const typing = typingUsers[conversationId] || [];

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  // Fetch conversation if not in store yet
  useEffect(() => {
    if (!conversation && conversationId) {
      fetch("/api/conversations")
        .then((res) => res.json())
        .then((data: Conversation[]) => {
          data.forEach((c) => addConversation(c));
        })
        .catch(console.error);
    }
  }, [conversationId, conversation, addConversation]);

  const fetchMessages = useCallback(
    async (cursor?: string) => {
      try {
        const url = `/api/messages?conversationId=${conversationId}${cursor ? `&cursor=${cursor}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (cursor) prependMessages(conversationId, data.messages);
        else setMessages(conversationId, data.messages);
        setNextCursor(data.nextCursor);
      } catch {
        toast.error("Failed to load messages");
      }
    },
    [conversationId, setMessages, prependMessages],
  );

  useEffect(() => {
    setIsLoading(true);
    fetchMessages().finally(() => setIsLoading(false));
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (!conversationId || !userId) return;
    fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    }).catch(console.error);
  }, [conversationId, userId, msgs.length]);

  useEffect(() => {
    if (atBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs.length, typing.length]);

  useEffect(() => {
    const channel = pusherClient.subscribe(`conversation-${conversationId}`);
    channel.bind("new-message", (message: Message) => {
      addMessage(conversationId, message);
    });
    channel.bind("typing", (data: any) => {
      if (data.userId !== userId) {
        setTyping(conversationId, data.userId, data.userName, data.isTyping);
      }
    });
    return () => pusherClient.unsubscribe(`conversation-${conversationId}`);
  }, [conversationId, userId, addMessage, setTyping]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = dist < 80;
    setShowScrollBtn(dist > 200);
    if (el.scrollTop < 80 && nextCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      const prev = el.scrollHeight;
      fetchMessages(nextCursor).finally(() => {
        setIsLoadingMore(false);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prev;
        });
      });
    }
  }, [nextCursor, isLoadingMore, fetchMessages]);

  const handleSend = async (content: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversationId }),
      });
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = async (isTyping: boolean) => {
    await fetch("/api/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, isTyping }),
    }).catch(console.error);
  };

  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    msgs.forEach((msg, i) => {
      const prev = msgs[i - 1];
      const showDate =
        !prev || !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt));
      const showAvatar = !prev || prev.senderId !== msg.senderId || showDate;
      if (showDate) {
        items.push(
          <div
            key={`date-${msg.id}`}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-[11px] text-neutral-500 font-medium px-2">
              {isSameDay(new Date(msg.createdAt), new Date())
                ? "Today"
                : format(new Date(msg.createdAt), "MMMM d, yyyy")}
            </span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>,
        );
      }
      items.push(
        <MessageBubble key={msg.id} message={msg} showAvatar={showAvatar} />,
      );
    });
    return items;
  };

  return (
    <div className="flex h-full bg-neutral-950 relative overflow-hidden">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-neutral-900 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            onClick={() => {
              setSidebarOpen(true);
              router.push("/chat");
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {otherUser ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <UserAvatar user={otherUser} size="sm" showOnline />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-white truncate">
                  {otherUser.name}
                </p>
                <p className="text-xs">
                  {otherUser.isOnline ? (
                    <span className="text-green-500 font-medium">Online</span>
                  ) : (
                    <span className="text-neutral-500">
                      {formatLastSeen(otherUser.lastSeen)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-neutral-800 animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-neutral-800 animate-pulse" />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (otherUser) {
                  (window as any).__startCall?.(
                    conversation?.user1Id === userId
                      ? conversation?.user2Id
                      : conversation?.user1Id,
                    otherUser,
                    "voice",
                  );
                }
              }}
              className="p-2 rounded-lg text-neutral-400 hover:text-violet-400 hover:bg-neutral-800 transition-colors"
              title="Voice call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (otherUser) {
                  (window as any).__startCall?.(
                    conversation?.user1Id === userId
                      ? conversation?.user2Id
                      : conversation?.user1Id,
                    otherUser,
                    "video",
                  );
                }
              }}
              className="p-2 rounded-lg text-neutral-400 hover:text-violet-400 hover:bg-neutral-800 transition-colors"
              title="Video call"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showInfo
                  ? "bg-violet-600/20 text-violet-400"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800",
              )}
              title="User info"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-2"
        >
          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
            </div>
          )}

          {!nextCursor && msgs.length > 0 && (
            <p className="text-center text-xs text-neutral-600 py-4">
              Beginning of conversation
            </p>
          )}

          {isLoading ? (
            <div className="space-y-4 px-4 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    i % 2 === 0 ? "flex-row" : "flex-row-reverse",
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-neutral-800 animate-pulse flex-shrink-0" />
                  <div
                    className={cn(
                      "h-10 rounded-2xl bg-neutral-800 animate-pulse",
                      i % 2 === 0 ? "w-48" : "w-36",
                    )}
                  />
                </div>
              ))}
            </div>
          ) : msgs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full py-16 text-center px-8"
            >
              {otherUser && <UserAvatar user={otherUser} size="lg" />}
              <p className="font-semibold mt-4 text-lg text-white">
                {otherUser?.name}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                Say hello to {otherUser?.name?.split(" ")[0] ?? "them"}! 👋
              </p>
            </motion.div>
          ) : (
            renderMessages()
          )}

          <TypingIndicator users={typing} />
          <div ref={bottomRef} className="h-1" />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button
            onClick={() =>
              bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="absolute bottom-24 right-6 w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg hover:bg-violet-500 transition-colors z-10"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        <MessageInput
          conversationId={conversationId}
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={isSending}
        />
      </div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && otherUser && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <h3 className="font-semibold text-white text-sm">Profile</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center py-8 px-4 gap-3">
              <UserAvatar user={otherUser} size="lg" showOnline />
              <div className="text-center">
                <p className="font-semibold text-white">{otherUser.name}</p>
                <p className="text-sm text-neutral-500">{otherUser.email}</p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  otherUser.isOnline
                    ? "bg-green-500/10 text-green-500"
                    : "bg-neutral-800 text-neutral-500",
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    otherUser.isOnline ? "bg-green-500" : "bg-neutral-500",
                  )}
                />
                {otherUser.isOnline ? "Online" : "Offline"}
              </div>
            </div>

            <div className="px-4 space-y-2">
              <div className="bg-neutral-800 rounded-xl p-3">
                <p className="text-xs text-neutral-500 mb-1">Status</p>
                <p className="text-sm text-white">
                  {(otherUser as any).status ??
                    "Hey there! I am using ChitChat."}
                </p>
              </div>
              <div className="bg-neutral-800 rounded-xl p-3">
                <p className="text-xs text-neutral-500 mb-1">Email</p>
                <p className="text-sm text-white truncate">{otherUser.email}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

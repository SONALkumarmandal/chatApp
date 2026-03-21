"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  Plus,
  LogOut,
  Moon,
  Sun,
  X,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { UserAvatar } from "./user-avatar";
import { ConversationItem } from "./conversation-item";
import { UserSearchDialog } from "./user-search-dialog";
import { useChatStore } from "@/store/chat-store";
import { getPusherClient } from "@/lib/pusher-client";
import { Conversation } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const {
    conversations,
    setConversations,
    updateConversation,
    activeConversationId,
    setActiveConversation,
  } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);

  const userId = (session?.user as any)?.id;

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        const data: Conversation[] = await res.json();
        setConversations(data);
      } catch {
        toast.error("Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchConversations();
  }, [userId, setConversations]);

  useEffect(() => {
    if (!userId) return;
    const channel = getPusherClient().subscribe(`user-${userId}`);
    channel.bind("conversation-update", (data: any) => {
      updateConversation(data.conversationId, {
        messages: [data.lastMessage],
        updatedAt: data.lastMessage.createdAt,
      });
    });
    return () => getPusherClient().unsubscribe(`user-${userId}`);
  }, [userId, updateConversation]);

const filtered = conversations.filter((c) => {
  const other = c.user1Id === userId ? c.user2 : c.user1;
  // ✅ Guard against undefined
  if (!other) return false;
  return (
    other.name?.toLowerCase().includes(query.toLowerCase()) ||
    other.email?.toLowerCase().includes(query.toLowerCase())
  );
});
  const handleSelect = (id: string) => {
    setActiveConversation(id);
    router.push(`/chat/${id}`);
  };

  return (
    <>
      <aside className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">ChitChat</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setNewChatOpen(true)}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              suppressHydrationWarning
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <Sun className="w-4 h-4" suppressHydrationWarning />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-neutral-800 text-white placeholder:text-neutral-500 border border-neutral-700 outline-none focus:border-violet-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <div className="h-10 w-10 rounded-full bg-neutral-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-neutral-800 animate-pulse" />
                  <div className="h-2.5 w-4/5 rounded bg-neutral-800 animate-pulse" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="w-8 h-8 text-neutral-700 mb-3" />
              <p className="text-sm text-neutral-500">
                {query ? "No conversations match" : "No conversations yet"}
              </p>
              {!query && (
                <button
                  onClick={() => setNewChatOpen(true)}
                  className="mt-3 text-xs text-violet-400 hover:underline"
                >
                  Start your first chat →
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((conversation, i) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <ConversationItem
                    conversation={conversation}
                    isActive={conversation.id === activeConversationId}
                    onClick={() => handleSelect(conversation.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-neutral-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-neutral-800 transition-colors group">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <UserAvatar user={session?.user ?? {}} size="sm" showOnline />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-[10px] text-green-500 font-medium">Online</p>
              </div>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <UserSearchDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
      />
    </>
  );
}

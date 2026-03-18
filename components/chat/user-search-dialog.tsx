"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MessageCircle, X } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { useChatStore } from "@/store/chat-store";
import { User } from "@/types";
import { formatLastSeen } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UserSearchDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const { addConversation, setActiveConversation } = useChatStore();

  const search = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
      setUsers(await res.json());
    } catch {
      toast.error("Failed to search users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, open, search]);

  useEffect(() => {
    if (open) { setQuery(""); search(""); }
  }, [open, search]);

  const startConversation = async (user: User) => {
    setStarting(user.id);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const conversation = await res.json();
      addConversation(conversation);
      setActiveConversation(conversation.id);
      router.push(`/chat/${conversation.id}`);
      onClose();
    } catch {
      toast.error("Failed to start conversation");
    } finally {
      setStarting(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-white">New Conversation</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-500 outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        <div className="pb-3 max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-neutral-500">
              <Search className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <ul className="px-3 space-y-0.5">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => startConversation(user)}
                    disabled={starting === user.id}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-neutral-800 transition-colors group text-left"
                  >
                    <UserAvatar user={user} size="md" showOnline />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-neutral-500">
                        {user.isOnline
                          ? <span className="text-green-500">Online</span>
                          : formatLastSeen(user.lastSeen)
                        }
                      </p>
                    </div>
                    {starting === user.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      : <MessageCircle className="w-4 h-4 text-neutral-600 group-hover:text-violet-400 transition-colors" />
                    }
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
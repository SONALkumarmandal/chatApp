"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  users: { userId: string; userName: string | null }[];
}

export function TypingIndicator({ users }: Props) {
  if (users.length === 0) return null;

  const label = users.length === 1
    ? `${users[0].userName ?? "Someone"} is typing`
    : `${users.length} people are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        className="flex items-center gap-2 px-4 pb-2"
      >
        <div className="flex items-center gap-1 bg-neutral-800 px-3 py-2 rounded-2xl rounded-bl-sm">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-neutral-500">{label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
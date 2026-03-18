"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Smile, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  conversationId: string;
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, disabled }: Props) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const isTyping = useRef(false);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [message]);

  const handleTyping = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      onTyping(true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      onTyping(false);
    }, 2000);
  }, [onTyping]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage("");
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    isTyping.current = false;
    onTyping(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-950">
      <div className={cn(
        "flex items-end gap-2 bg-neutral-800 rounded-2xl px-3 py-2",
        "focus-within:ring-2 focus-within:ring-violet-500/40 transition-all"
      )}>
        <button
          disabled
          className="flex-shrink-0 mb-0.5 p-1.5 text-neutral-600 cursor-not-allowed"
          title="Attach file (coming soon)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-neutral-500 py-1 max-h-[120px] leading-relaxed"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={cn(
            "flex-shrink-0 mb-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
            message.trim()
              ? "bg-violet-600 text-white hover:bg-violet-500"
              : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
          )}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-neutral-600 mt-1.5 ml-1">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
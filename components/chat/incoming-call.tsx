"use client";

import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { UserAvatar } from "./user-avatar";

interface Props {
  callerName: string;
  callerImage?: string | null;
  callType: "voice" | "video";
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCall({ callerName, callerImage, callType, onAccept, onReject }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-4 right-4 z-50 w-80 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent" />

      <div className="relative p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-600/30 animate-ping" />
            <UserAvatar
              user={{ name: callerName, image: callerImage }}
              size="md"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-violet-400 font-medium mb-0.5">
              Incoming {callType === "video" ? "Video" : "Voice"} Call
            </p>
            <p className="text-white font-semibold truncate">{callerName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          {/* Reject */}
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm font-medium"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </button>

          {/* Accept */}
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors text-sm font-medium"
          >
            {callType === "video"
              ? <Video className="w-4 h-4" />
              : <Phone className="w-4 h-4" />
            }
            Accept
          </button>
        </div>
      </div>
    </motion.div>
  );
}
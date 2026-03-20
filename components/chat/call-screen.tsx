"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  PhoneOff, Volume2, VolumeX,
} from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callType: "voice" | "video";
  otherUser: { name?: string | null; image?: string | null; isOnline?: boolean };
  onEnd: () => void;
  isConnecting?: boolean;
}

export function CallScreen({
  localStream,
  remoteStream,
  callType,
  otherUser,
  onEnd,
  isConnecting = false,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Attach streams to video/audio elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  // Call duration timer
  useEffect(() => {
    if (isConnecting) return;
    const timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [isConnecting]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOff;
      setIsSpeakerOff(!isSpeakerOff);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-neutral-950 flex flex-col"
    >
      {/* Video call layout */}
      {callType === "video" ? (
        <div className="flex-1 relative">
          {/* Remote video (fullscreen) */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
              <div className="text-center space-y-4">
                <UserAvatar user={otherUser} size="lg" />
                <p className="text-white font-semibold text-xl">{otherUser.name}</p>
                <p className="text-neutral-400 text-sm animate-pulse">
                  {isConnecting ? "Calling..." : "Connecting..."}
                </p>
              </div>
            </div>
          )}

          {/* Local video (pip) */}
          {localStream && (
            <div className="absolute bottom-24 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                  <UserAvatar user={{ name: "You" }} size="sm" />
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          {!isConnecting && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <p className="text-white text-sm font-mono">{formatDuration(callDuration)}</p>
            </div>
          )}
        </div>
      ) : (
        /* Voice call layout */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-neutral-900 to-neutral-950">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-violet-600/20 animate-ping scale-110" />
              <UserAvatar user={otherUser} size="lg" />
            </div>
          </motion.div>

          <div className="text-center space-y-2">
            <p className="text-white font-bold text-2xl">{otherUser.name}</p>
            <p className="text-neutral-400 text-sm">
              {isConnecting
                ? "Calling..."
                : formatDuration(callDuration)
              }
            </p>
          </div>
        </div>
      )}

      {/* Hidden audio for voice calls */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-8 bg-neutral-900/80 backdrop-blur-sm">
        <button
          onClick={toggleMute}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all",
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/40"
              : "bg-neutral-800 text-white hover:bg-neutral-700"
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleVideo}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all",
              isVideoOff
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-neutral-800 text-white hover:bg-neutral-700"
            )}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={toggleSpeaker}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all",
            isSpeakerOff
              ? "bg-red-500/20 text-red-400 border border-red-500/40"
              : "bg-neutral-800 text-white hover:bg-neutral-700"
          )}
          title={isSpeakerOff ? "Unmute speaker" : "Mute speaker"}
        >
          {isSpeakerOff ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* End call */}
        <button
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-600/30"
          title="End call"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </motion.div>
  );
}
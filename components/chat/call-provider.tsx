"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { getPeer, destroyPeer } from "@/lib/peer";
import { pusherClient } from "@/lib/pusher";
import { CallScreen } from "./call-screen";
import { IncomingCall } from "./incoming-call";
import type { MediaConnection } from "peerjs";
import toast from "react-hot-toast";

interface CallSignal {
  type: "incoming" | "accepted" | "rejected" | "ended";
  callType: "voice" | "video";
  callerId: string;
  callerName: string;
  callerImage?: string;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callType: "voice" | "video";
    otherUser: { name?: string | null; image?: string | null; isOnline?: boolean };
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isConnecting: boolean;
  } | null>(null);

  const currentCallRef = useRef<MediaConnection | null>(null);
  const targetUserIdRef = useRef<string | null>(null);

  const endCall = useCallback(() => {
    // Notify other user
    if (targetUserIdRef.current) {
      fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetUserIdRef.current,
          type: "ended",
          callType: activeCall?.callType ?? "voice",
        }),
      }).catch(console.error);
    }

    // Stop all tracks
    activeCall?.localStream?.getTracks().forEach((t) => t.stop());
    currentCallRef.current?.close();
    currentCallRef.current = null;
    targetUserIdRef.current = null;

    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall]);

  const getMedia = async (callType: "voice" | "video") => {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
  };

  // Initiate a call
  const startCall = useCallback(async (
    targetUserId: string,
    targetUser: { name?: string | null; image?: string | null },
    callType: "voice" | "video"
  ) => {
    if (!userId) return;
    try {
      const stream = await getMedia(callType);
      const peer = getPeer(userId);
      targetUserIdRef.current = targetUserId;

      // Signal the other user
      await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          type: "incoming",
          callType,
          callerName: session?.user?.name,
          callerImage: session?.user?.image,
        }),
      });

      setActiveCall({
        callType,
        otherUser: targetUser,
        localStream: stream,
        remoteStream: null,
        isConnecting: true,
      });

      // Wait for accept signal then call
      const handleAccept = () => {
        const call = peer.call(targetUserId, stream);
        currentCallRef.current = call;

        call.on("stream", (remoteStream) => {
          setActiveCall((prev) =>
            prev ? { ...prev, remoteStream, isConnecting: false } : null
          );
        });

        call.on("close", endCall);
      };

      // Store handler so we can clean it up
      (window as any).__callAcceptHandler = handleAccept;
    } catch (error) {
      toast.error("Could not access camera/microphone");
      console.error(error);
    }
  }, [userId, session, endCall]);

  // Answer incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !userId) return;
    try {
      const stream = await getMedia(incomingCall.callType);
      const peer = getPeer(userId);
      targetUserIdRef.current = incomingCall.callerId;

      // Signal caller that we accepted
      await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: incomingCall.callerId,
          type: "accepted",
          callType: incomingCall.callType,
        }),
      });

      setActiveCall({
        callType: incomingCall.callType,
        otherUser: {
          name: incomingCall.callerName,
          image: incomingCall.callerImage,
          isOnline: true,
        },
        localStream: stream,
        remoteStream: null,
        isConnecting: false,
      });

      setIncomingCall(null);

      // Answer when caller connects
      peer.on("call", (call) => {
        call.answer(stream);
        currentCallRef.current = call;

        call.on("stream", (remoteStream) => {
          setActiveCall((prev) =>
            prev ? { ...prev, remoteStream } : null
          );
        });

        call.on("close", endCall);
      });
    } catch (error) {
      toast.error("Could not access camera/microphone");
    }
  }, [incomingCall, userId, endCall]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;
    await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: incomingCall.callerId,
        type: "rejected",
        callType: incomingCall.callType,
      }),
    }).catch(console.error);
    setIncomingCall(null);
  }, [incomingCall]);

  // Listen for call signals via Pusher
  useEffect(() => {
    if (!userId) return;

    const peer = getPeer(userId);
    const channel = pusherClient.subscribe(`user-${userId}`);

    channel.bind("call-signal", (signal: CallSignal) => {
      if (signal.type === "incoming") {
        setIncomingCall(signal);
      } else if (signal.type === "accepted") {
        const handler = (window as any).__callAcceptHandler;
        if (handler) { handler(); delete (window as any).__callAcceptHandler; }
        setActiveCall((prev) => prev ? { ...prev, isConnecting: false } : null);
      } else if (signal.type === "rejected") {
        toast.error("Call was declined");
        activeCall?.localStream?.getTracks().forEach((t) => t.stop());
        setActiveCall(null);
      } else if (signal.type === "ended") {
        activeCall?.localStream?.getTracks().forEach((t) => t.stop());
        currentCallRef.current?.close();
        setActiveCall(null);
        toast("Call ended", { icon: "📞" });
      }
    });

    return () => {
      pusherClient.unsubscribe(`user-${userId}`);
      destroyPeer();
    };
  }, [userId]);

  // Expose startCall globally so chat-window can use it
  useEffect(() => {
    (window as any).__startCall = startCall;
  }, [startCall]);

  return (
    <>
      {children}

      {/* Incoming call notification */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <IncomingCall
            callerName={incomingCall.callerName}
            callerImage={incomingCall.callerImage}
            callType={incomingCall.callType}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}
      </AnimatePresence>

      {/* Active call screen */}
      <AnimatePresence>
        {activeCall && (
          <CallScreen
            localStream={activeCall.localStream}
            remoteStream={activeCall.remoteStream}
            callType={activeCall.callType}
            otherUser={activeCall.otherUser}
            onEnd={endCall}
            isConnecting={activeCall.isConnecting}
          />
        )}
      </AnimatePresence>
    </>
  );
}
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { getPusherClient } from "@/lib/pusher-client";
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
  const peerRef = useRef<any>(null);

  const endCall = useCallback(() => {
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

    activeCall?.localStream?.getTracks().forEach((t) => t.stop());
    currentCallRef.current?.close();
    currentCallRef.current = null;
    targetUserIdRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;

    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall]);

  const getMedia = async (callType: "voice" | "video") => {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
  };

  const createPeer = useCallback((id: string) => {
    if (typeof window === "undefined") return null;
    const Peer = require("peerjs").default;
    const peer = new Peer(`${id}-${Date.now()}`, {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });
    peerRef.current = peer;
    return peer;
  }, []);

  const startCall = useCallback(async (
    targetUserId: string,
    targetUser: { name?: string | null; image?: string | null },
    callType: "voice" | "video"
  ) => {
    if (!userId) return;
    try {
      const stream = await getMedia(callType);
      const peer = createPeer(userId);
      if (!peer) return;

      targetUserIdRef.current = targetUserId;

      // Tell the other user about the call and our peer id
      const myPeerId = await new Promise<string>((resolve) => {
        peer.on("open", (id: string) => resolve(id));
      });

      await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          type: "incoming",
          callType,
          callerName: session?.user?.name,
          callerImage: session?.user?.image,
          callerPeerId: myPeerId,
        }),
      });

      setActiveCall({
        callType,
        otherUser: targetUser,
        localStream: stream,
        remoteStream: null,
        isConnecting: true,
      });

      // Store stream for when accepted
      (window as any).__pendingCallStream = stream;
      (window as any).__pendingPeer = peer;
    } catch (error) {
      toast.error("Could not access camera/microphone");
      console.error(error);
    }
  }, [userId, session, createPeer]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !userId) return;
    try {
      const stream = await getMedia(incomingCall.callType);
      const peer = createPeer(userId);
      if (!peer) return;

      targetUserIdRef.current = incomingCall.callerId;

      const myPeerId = await new Promise<string>((resolve) => {
        peer.on("open", (id: string) => resolve(id));
      });

      // Signal caller we accepted and send our peer id
      await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: incomingCall.callerId,
          type: "accepted",
          callType: incomingCall.callType,
          callerPeerId: myPeerId,
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
      peer.on("call", (call: MediaConnection) => {
        call.answer(stream);
        currentCallRef.current = call;
        call.on("stream", (remoteStream: MediaStream) => {
          setActiveCall((prev) =>
            prev ? { ...prev, remoteStream } : null
          );
        });
        call.on("close", endCall);
      });
    } catch (error) {
      toast.error("Could not access camera/microphone");
      console.error(error);
    }
  }, [incomingCall, userId, createPeer, endCall]);

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

  // Listen for call signals
  useEffect(() => {
    if (!userId) return;

    const channel = getPusherClient().subscribe(`user-${userId}`);

    channel.bind("call-signal", async (signal: CallSignal & { callerPeerId?: string }) => {
      if (signal.type === "incoming") {
        // Store caller peer id for when we accept
        (window as any).__callerPeerId = signal.callerPeerId;
        setIncomingCall(signal);

      } else if (signal.type === "accepted") {
        // Receiver accepted — now make the WebRTC call
        const stream = (window as any).__pendingCallStream;
        const peer = (window as any).__pendingPeer;

        if (peer && stream && signal.callerPeerId) {
          const call = peer.call(signal.callerPeerId, stream);
          currentCallRef.current = call;

          call.on("stream", (remoteStream: MediaStream) => {
            setActiveCall((prev) =>
              prev ? { ...prev, remoteStream, isConnecting: false } : null
            );
          });
          call.on("close", endCall);
        }

        setActiveCall((prev) => prev ? { ...prev, isConnecting: false } : null);

      } else if (signal.type === "rejected") {
        toast.error("Call was declined");
        activeCall?.localStream?.getTracks().forEach((t) => t.stop());
        peerRef.current?.destroy();
        setActiveCall(null);

      } else if (signal.type === "ended") {
        activeCall?.localStream?.getTracks().forEach((t) => t.stop());
        currentCallRef.current?.close();
        peerRef.current?.destroy();
        setActiveCall(null);
        toast("Call ended", { icon: "📞" });
      }
    });

    return () => {
      getPusherClient().unsubscribe(`user-${userId}`);
    };
  }, [userId, endCall, activeCall]);

  // Expose startCall globally
  useEffect(() => {
    (window as any).__startCall = startCall;
  }, [startCall]);

  return (
    <>
      {children}

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
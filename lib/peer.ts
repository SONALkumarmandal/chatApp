import Peer from "peerjs";

let peer: Peer | null = null;

export function getPeer(userId: string): Peer {
  if (!peer || peer.destroyed) {
    peer = new Peer(userId, {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });
  }
  return peer;
}

export function destroyPeer() {
  if (peer) {
    peer.destroy();
    peer = null;
  }
}
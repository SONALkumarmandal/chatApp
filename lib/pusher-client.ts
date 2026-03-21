import PusherJs from "pusher-js";

let client: PusherJs | null = null;

export function getPusherClient(): PusherJs {
  if (!client) {
    client = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return client;
}
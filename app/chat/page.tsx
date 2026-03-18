import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/chat/sidebar";

export default async function ChatPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  return (
    <div className="flex h-screen bg-neutral-950">
      <div className="w-[320px] xl:w-[360px] flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 hidden lg:flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-violet-600/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">💬</span>
          </div>
          <h2 className="text-xl font-bold text-white">Your conversations</h2>
          <p className="text-neutral-500 text-sm">
            Select a conversation or start a new one
          </p>
        </div>
      </div>
    </div>
  );
}
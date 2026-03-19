import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/chat/sidebar";
import { ChatWindow } from "@/components/chat/chat-window";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { id } = await params;

  return (
    <div className="flex h-screen bg-neutral-950">
      <div className="hidden lg:block w-[320px] xl:w-[360px] flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 relative overflow-hidden">
        <ChatWindow conversationId={id} />
      </div>
    </div>
  );
}
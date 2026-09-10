import type { Metadata } from "next";
import { TalkSession } from "@/components/TalkSession";

export const metadata: Metadata = { title: "Conversation · SayCoach" };

export default function TalkPage() {
  return <TalkSession />;
}

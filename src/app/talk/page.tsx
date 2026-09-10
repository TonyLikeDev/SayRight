import type { Metadata } from "next";
import { TalkSession } from "@/components/TalkSession";

export const metadata: Metadata = { title: "Conversation · SayRight" };

export default function TalkPage() {
  return <TalkSession />;
}

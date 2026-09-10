import { dictionary } from "cmu-pronouncing-dictionary";
import { arpabetToIpa, tokenize } from "@/lib/phonemes";
import type { IpaWord } from "@/lib/speech/types";

const VOICELESS_END = /(P|T|K|F|TH)$/;
const SIBILANT_END = /(S|Z|SH|ZH|CH|JH)$/;

function lookup(word: string): string | undefined {
  const entry = dictionary[word];
  if (entry) return entry;
  // Possessives like "tony's" aren't in the dictionary; build them from the base word.
  if (word.endsWith("'s")) {
    const base = dictionary[word.slice(0, -2)];
    if (!base) return undefined;
    if (SIBILANT_END.test(base)) return `${base} IH0 Z`;
    return VOICELESS_END.test(base) ? `${base} S` : `${base} Z`;
  }
  return undefined;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { text?: unknown };
  if (typeof body.text !== "string" || body.text.length > 2000) {
    return Response.json({ error: "Send { text } under 2000 characters." }, { status: 400 });
  }
  const words: IpaWord[] = tokenize(body.text).map((token) => {
    const entry = lookup(token.norm);
    return entry ? { ...token, ...arpabetToIpa(entry) } : { ...token, ipa: null, phonemes: [] };
  });
  return Response.json({ words });
}

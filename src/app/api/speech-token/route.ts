// Exchanges the Azure key (server-only) for a 10-minute token the browser can use.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION?.trim().toLowerCase();
  if (!key || !region) return Response.json({ mode: "demo" });
  if (!/^[a-z0-9]+$/.test(region)) {
    return Response.json({ error: "AZURE_SPEECH_REGION looks wrong. Use a region id like eastus." }, { status: 500 });
  }

  const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" },
    cache: "no-store",
  });
  if (!res.ok) {
    return Response.json(
      { error: `Azure rejected the key (HTTP ${res.status}). Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.` },
      { status: 502 },
    );
  }
  return Response.json({ mode: "azure", token: await res.text(), region });
}

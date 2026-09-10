import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Setup · SayCoach" };
export const dynamic = "force-dynamic";

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
          ok ? "bg-good-soft text-good" : "bg-ok-soft text-ok"
        }`}
        aria-hidden="true"
      >
        {ok ? "✓" : "!"}
      </span>
      <div>
        <p className="font-medium text-ink">
          {label} <span className="font-normal text-ink-2">· {ok ? "set" : "not set"}</span>
        </p>
        <p className="text-sm text-ink-2">{detail}</p>
      </div>
    </li>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{n}</span>
      <div className="pb-2">
        <p className="font-medium text-ink">{title}</p>
        <div className="mt-1 space-y-2 text-[0.95rem] leading-relaxed text-ink-2">{children}</div>
      </div>
    </li>
  );
}

const code = "rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-ink";

export default function SetupPage() {
  const hasKey = !!process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  const hasPassword = !!process.env.APP_PASSWORD;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Setup</h1>
        <p className="mt-2 text-ink-2">Connect Azure Speech for real pronunciation scoring. It takes about five minutes.</p>
      </header>

      <Card>
        <p className="font-semibold text-ink">Status</p>
        <ul className="mt-1 divide-y divide-line">
          <Status ok={hasKey} label="AZURE_SPEECH_KEY" detail="Your Speech resource key. Stays on the server." />
          <Status ok={!!region} label="AZURE_SPEECH_REGION" detail={region ? `Region: ${region}` : "For example eastus or southeastasia."} />
          <Status
            ok={hasPassword}
            label="APP_PASSWORD"
            detail="Required once the app is online, so strangers can't use your Azure quota. Optional on your own computer."
          />
        </ul>
      </Card>

      <Card>
        <p className="font-semibold text-ink">Get a free Azure Speech key</p>
        <ol className="mt-4 space-y-4">
          <Step n={1} title="Create an Azure account">
            <p>
              Go to <span className={code}>portal.azure.com</span> and sign up. The free tier needs a card for identity
              checks but doesn&apos;t charge you.
            </p>
          </Step>
          <Step n={2} title="Create a Speech resource">
            <p>
              In the portal, search for <span className="font-medium text-ink">Speech service</span> and click Create.
              Pick any resource group, choose a region close to you (like <span className={code}>southeastasia</span>{" "}
              or <span className={code}>eastus</span>), and set the pricing tier to{" "}
              <span className="font-medium text-ink">Free F0</span>.
            </p>
            <p>The free tier includes 5 audio hours of scoring a month and 500,000 characters of neural voice.</p>
          </Step>
          <Step n={3} title="Copy the key and region">
            <p>
              Open the resource, go to <span className="font-medium text-ink">Keys and Endpoint</span>, and copy{" "}
              <span className="font-medium text-ink">KEY 1</span> and the <span className="font-medium text-ink">Location/Region</span>.
            </p>
          </Step>
          <Step n={4} title="Add them to the app">
            <p>
              On your computer, create a file named <span className={code}>.env.local</span> in the project folder:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-sm text-ink">
              {`AZURE_SPEECH_KEY=paste-key-1-here\nAZURE_SPEECH_REGION=southeastasia`}
            </pre>
            <p>
              Then restart <span className={code}>npm run dev</span>. Online (Vercel), add the same two variables plus{" "}
              <span className={code}>APP_PASSWORD</span> under Settings → Environment Variables, then redeploy.
            </p>
          </Step>
        </ol>
      </Card>
    </div>
  );
}

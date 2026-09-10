import { cookies } from "next/headers";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  if (!password) return Response.json({ ok: true });
  if (typeof body.password !== "string" || body.password !== password) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(AUTH_COOKIE, await authToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return Response.json({ ok: true });
}

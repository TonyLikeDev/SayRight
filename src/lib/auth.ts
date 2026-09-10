// A single shared password protects the deployed app (and your Azure quota).
// The cookie holds a hash of the password, so changing APP_PASSWORD signs
// every device out.

export const AUTH_COOKIE = "sayright_auth";

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`sayright:v1:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

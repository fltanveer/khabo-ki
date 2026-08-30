// Account creation runs in a Supabase Edge Function, not here. The edge
// runtime injects the service-role key, so the web host never needs it —
// nothing secret has to be configured to deploy this app.
const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/users`;

type Payload = {
  action: "register" | "create" | "reset_password";
  // A reset carries no name — the account already exists.
  name?: string;
  phone: string;
  password: string;
  role?: "staff" | "admin";
  code?: string;
};

export async function callUsersFunction(
  payload: Payload,
  accessToken?: string,
): Promise<{ error?: string }> {
  let response: Response;

  try {
    response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Anonymous callers still need the anon key to reach the function;
        // an admin sends their own session token so the function can check it.
        Authorization: `Bearer ${accessToken ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { error: "Couldn't reach the server. Try again." };
  }

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) return { error: body.error ?? "That didn't work. Try again." };
  return {};
}

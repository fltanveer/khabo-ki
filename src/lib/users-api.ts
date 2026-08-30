// Account creation runs in a Supabase Edge Function, not here. The edge
// runtime injects the service-role key, so the web host never needs it —
// nothing secret has to be configured to deploy this app.
const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/users`;

type Payload = {
  action: "register" | "create" | "reset_password" | "delete";
  // A reset carries no name — the account already exists.
  name?: string;
  // A delete carries neither: the account is named by id.
  phone?: string;
  password?: string;
  userId?: string;
  role?: "staff" | "admin";
  code?: string;
};

// `network` marks a failure that never reached the function — the request
// didn't go out, or the host answered with something that wasn't ours. It
// says nothing about the account, so callers must not report it as one.
export type UsersApiResult = { error?: string; network?: boolean };

export async function callUsersFunction(
  payload: Payload,
  accessToken?: string,
): Promise<UsersApiResult> {
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
    return { error: "Couldn't reach the server. Try again.", network: true };
  }

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (response.ok) return {};

  // No error body means the response didn't come from the function — a proxy
  // error page, a deploy in flight, a gateway timeout.
  if (!body.error) return { error: "That didn't work. Try again.", network: true };
  return { error: body.error };
}

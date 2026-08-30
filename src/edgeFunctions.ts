import { supabase } from './supabaseClient'

// Anropar en edge-funktion med anroparens egen access-token i Authorization-headern.
// Delad av alla edge-funktionsanrop i appen (create-user, delete-user,
// list-account-status, assess-candidate) — RLS/service-role-logiken på
// serversidan avgör vad anroparen faktiskt får göra.
//
// supabase-js sätter `error.message` till den generiska texten "Edge Function
// returned a non-2xx status code" vid ett icke-2xx-svar — det faktiska
// felmeddelandet våra funktioner skickar (`{ error: "..." }`) hamnar bara på
// `error.context` (Response-objektet). Läser ut det här så anropande kod kan
// lita på `error.message` rakt av.
export async function invokeEdgeFunction<T = unknown>(name: string, body?: object) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const result = await supabase.functions.invoke<T>(name, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (result.error && result.error.context instanceof Response) {
    const body = await result.error.context.clone().json().catch(() => null) as { error?: string } | null
    if (body?.error) result.error.message = body.error
  }
  return result
}

import { supabase } from './supabaseClient'

// Anropar en edge-funktion med anroparens egen access-token i Authorization-headern.
// Delad av alla edge-funktionsanrop i appen (create-user, delete-user,
// list-account-status, assess-candidate) — RLS/service-role-logiken på
// serversidan avgör vad anroparen faktiskt får göra.
export async function invokeEdgeFunction<T = unknown>(name: string, body?: object) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  return supabase.functions.invoke<T>(name, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

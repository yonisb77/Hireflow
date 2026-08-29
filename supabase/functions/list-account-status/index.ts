// Endast admin: hämtar bekräftelsestatus (har kontot loggat in/satt lösenord
// än, eller väntar det fortfarande på att inbjudan accepteras?) för
// kundkontona. Denna information finns bara i auth.users, inte i profiles,
// och kräver service role för att läsas.
//
// Deploy: supabase functions deploy list-account-status

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Saknar autentisering')

    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
    if (authError || !caller) throw new Error('Inte inloggad')

    const { data: callerProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()
    if (profileError || callerProfile?.role !== 'admin') {
      throw new Error('Endast administratörer kan se kontostatus')
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error

    const status: Record<string, boolean> = {}
    for (const u of data.users) status[u.id] = !!u.email_confirmed_at

    return new Response(JSON.stringify({ status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

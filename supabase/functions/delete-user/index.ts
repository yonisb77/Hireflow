// Endast admin: tar bort ett kundkonto (företag) permanent.
// Raderar auth-användaren, vilket kaskaderar bort dess profil, jobb och
// kandidater via foreign key-constraints med on delete cascade.
//
// Deploy: supabase functions deploy delete-user

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
      throw new Error('Endast administratörer kan ta bort konton')
    }

    const { user_id } = await req.json()
    if (!user_id) throw new Error('user_id saknas')
    if (user_id === caller.id) throw new Error('Du kan inte ta bort ditt eget konto')

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Bara kundkonton kan tas bort via denna funktion, aldrig andra admins.
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single()
    if (targetError || !targetProfile) throw new Error('Kontot hittades inte')
    if (targetProfile.role !== 'customer') throw new Error('Endast kundkonton kan tas bort här')

    const { error } = await adminClient.auth.admin.deleteUser(user_id)
    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
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

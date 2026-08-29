// Endast admin: skapar en ny inloggning (admin- eller kundkonto) och
// skickar en inbjudan via e-post för att sätta lösenord.
//
// Deploy: supabase functions deploy create-user
// Anropas från klienten med anroparens egen sessions-JWT i
// Authorization-headern; funktionen verifierar att anroparen är admin
// innan något privilegierat görs.

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

    // Klient bunden till anroparens JWT - används bara för att verifiera identitet/roll.
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
      throw new Error('Endast administratörer kan skapa konton')
    }

    const { email, role, company_name } = await req.json()
    if (!email || !role || !['admin', 'customer'].includes(role)) {
      throw new Error('E-post och kontotyp ("admin" | "customer") krävs')
    }
    if (role === 'customer' && !company_name) {
      throw new Error('Företagsnamn krävs för kundkonton')
    }

    // Adminklient, service role - kringgår RLS, kan skapa inloggningar.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { role, company_name: company_name ?? '' },
    })
    if (error) throw error

    return new Response(JSON.stringify({ user: data.user }), {
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

// Enkel AI-bedömning av kandidat: poängsätter en kandidats profil (namn,
// anteckningar, LinkedIn) mot jobbet de sökt, med hjälp av Claude.
//
// Deploy: supabase functions deploy assess-candidate
// Kräver secreten: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Körs med anroparens egen JWT (inte service role) så Postgres RLS
// säkerställer att en kund bara kan bedöma sina egna kandidater.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Assessment {
  score: number
  summary: string
  strengths: string[]
  weaknesses: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Saknar autentisering')

    // Bunden till anroparens egen JWT: RLS avgör vad de får läsa/skriva.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { candidate_id } = await req.json()
    if (!candidate_id) throw new Error('candidate_id saknas')

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single()
    if (candidateError || !candidate) throw new Error('Kandidaten hittades inte eller är inte tillgänglig')

    const { data: job } = await supabase
      .from('jobs')
      .select('title, department, description')
      .eq('id', candidate.job_id)
      .single()

    const prompt = `Du bedömer hur väl en jobbkandidat matchar en tjänst, baserat på begränsad profilinformation.
Notera: detta är en enkel/avskalad bedömning — en eventuell uppladdad CV-fil analyseras inte i sitt innehåll, bara om den finns.

Tjänst: ${job?.title ?? 'Okänd tjänst'}${job?.department ? ` (${job.department})` : ''}
${job?.description ? `Kravprofil/beskrivning: ${job.description}` : 'Ingen kravprofil angiven för tjänsten.'}

Kandidat:
Namn: ${candidate.full_name}
LinkedIn: ${candidate.linkedin_url || 'saknas'}
Anteckningar från rekryterare: ${candidate.notes || 'inga anteckningar'}
CV bifogat: ${candidate.resume_path ? 'ja (ej textanalyserat i denna version)' : 'nej'}

Ge en kort, ärlig bedömning. Svara ENDAST med giltig JSON, inget annat, i exakt detta format:
{"score": <heltal 1-10>, "summary": "<en mening>", "strengths": ["<kort punkt>", ...], "weaknesses": ["<kort punkt>", ...]}

Om informationen är för tunn för att bedöma matchning mot tjänsten, sätt score till 5 och säg det i summary.`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      throw new Error(`AI-tjänsten svarade med fel: ${errText}`)
    }

    const aiJson = await aiRes.json()
    const rawText: string = aiJson.content?.[0]?.text ?? ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI-svaret innehöll ingen giltig JSON')

    const assessment = JSON.parse(jsonMatch[0]) as Assessment

    const { data: updated, error: updateError } = await supabase
      .from('candidates')
      .update({ ai_assessment: assessment, ai_assessed_at: new Date().toISOString() })
      .eq('id', candidate_id)
      .select()
      .single()
    if (updateError) throw updateError

    return new Response(JSON.stringify({ candidate: updated }), {
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

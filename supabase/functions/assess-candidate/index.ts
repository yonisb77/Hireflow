// Enkel AI-bedömning av kandidat: poängsätter en kandidats profil (namn,
// anteckningar, LinkedIn, CV-textinnehåll) mot jobbet de sökt, med hjälp av
// Gemini (google generativelanguage API).
//
// CV-filen (PDF/DOCX) hämtas från Storage och textextraheras innan den skickas
// till modellen. Äldre .doc-format (binärt) och skannade bild-PDF:er stöds
// inte för textextraktion — bedömningen faller då tillbaka på profilinformationen.
//
// Deploy: supabase functions deploy assess-candidate
// Kräver secreten: supabase secrets set GEMINI_API_KEY=...
//
// Körs med anroparens egen JWT (inte service role) så Postgres RLS
// säkerställer att en kund bara kan bedöma sina egna kandidater (gäller även
// nedladdning av CV-filen, som skyddas av samma RLS-policy i Storage).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { extractText, getDocumentProxy } from 'npm:unpdf@1.8.1'
import mammoth from 'npm:mammoth@1.12.2'
import { Buffer } from 'node:buffer'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const GEMINI_MODEL = 'gemini-3.6-flash'

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

const MAX_RESUME_CHARS = 8000

// Kostnadsskydd: varje AI-anrop kostar (eller förbrukar gratiskvot), så en
// kandidat kan inte bedömas om igen förrän cooldownen gått ut.
const REASSESS_COOLDOWN_MS = 60_000

// Laddar ner CV-filen (skyddad av samma RLS som anroparens övriga läsningar)
// och textextraherar den. Misslyckas extraktionen (t.ex. skannad bild-PDF
// utan textlager) faller bedömningen tillbaka på profildata istället för
// att stoppa helt — `error` skickas ändå med i prompten som kontext.
async function extractResumeText(
  supabase: ReturnType<typeof createClient>,
  resumePath: string,
): Promise<{ text: string | null; error: string | null }> {
  const { data, error: downloadError } = await supabase.storage.from('resumes').download(resumePath)
  if (downloadError || !data) return { text: null, error: `nedladdning misslyckades: ${downloadError?.message ?? 'okänt fel'}` }

  const ext = resumePath.split('.').pop()?.toLowerCase()
  const buffer = await data.arrayBuffer()

  try {
    if (ext === 'pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractText(pdf, { mergePages: true })
      const trimmed = text.trim()
      return trimmed
        ? { text: trimmed.slice(0, MAX_RESUME_CHARS), error: null }
        : { text: null, error: 'PDF innehöll ingen extraherbar text (troligen skannad bild utan textlager)' }
    }
    if (ext === 'docx') {
      // npm:mammoth i Deno löser till Node-byggnaden, som bara känner igen
      // { path } eller { buffer: Buffer } — inte { arrayBuffer }, som är
      // webbläsarbyggnadens API. Fel nyckel gav "Could not find file in options".
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
      const trimmed = result.value.trim()
      return trimmed
        ? { text: trimmed.slice(0, MAX_RESUME_CHARS), error: null }
        : { text: null, error: 'DOCX innehöll ingen extraherbar text' }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { text: null, error: `extraktion kastade fel för .${ext}: ${message}` }
  }
  return { text: null, error: `filändelse .${ext} stöds inte för textextraktion` }
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

    if (candidate.ai_assessed_at) {
      const elapsedMs = Date.now() - new Date(candidate.ai_assessed_at).getTime()
      if (elapsedMs < REASSESS_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((REASSESS_COOLDOWN_MS - elapsedMs) / 1000)
        throw new Error(`Kandidaten bedömdes nyligen — vänta ${waitSeconds} sekund${waitSeconds === 1 ? '' : 'er'} innan du bedömer igen`)
      }
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('title, department, description')
      .eq('id', candidate.job_id)
      .single()

    const resumeResult = candidate.resume_path ? await extractResumeText(supabase, candidate.resume_path) : { text: null, error: null }
    const resumeText = resumeResult.text
    const resumeStatus = !candidate.resume_path
      ? 'nej'
      : resumeText
        ? 'ja (text extraherad, se nedan)'
        : `ja, men texten kunde inte extraheras (${resumeResult.error ?? 'okänd orsak'})`

    const prompt = `Du bedömer hur väl en jobbkandidat matchar en tjänst, baserat på profilinformation och (om tillgängligt) CV-innehåll.
Notera: detta är en enkel/avskalad bedömning, inte en fullständig CV-parser.

Tjänst: ${job?.title ?? 'Okänd tjänst'}${job?.department ? ` (${job.department})` : ''}
${job?.description ? `Kravprofil/beskrivning: ${job.description}` : 'Ingen kravprofil angiven för tjänsten.'}

Kandidat:
Namn: ${candidate.full_name}
LinkedIn: ${candidate.linkedin_url || 'saknas'}
Anteckningar från rekryterare: ${candidate.notes || 'inga anteckningar'}
CV bifogat: ${resumeStatus}
${resumeText ? `\nCV-innehåll (utdrag, max ${MAX_RESUME_CHARS} tecken):\n${resumeText}` : ''}

Ge en kort, ärlig bedömning. Om CV-innehåll finns ovan, väg in det tyngre än de korta anteckningarna. Svara ENDAST med giltig JSON, inget annat, i exakt detta format:
{"score": <heltal 1-10>, "summary": "<en mening>", "strengths": ["<kort punkt>", ...], "weaknesses": ["<kort punkt>", ...]}

Om informationen är för tunn för att bedöma matchning mot tjänsten, sätt score till 5 och säg det i summary.`

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // gemini-3.6-flash "tänker" internt som standard (går inte att stänga
          // av — thinkingBudget: 0 avvisas med 400) och det äter en stor del av
          // max_tokens-budgeten innan själva svaret börjar, så den behöver vara
          // rejält högre än vad bara JSON-svaret kräver.
          generationConfig: { maxOutputTokens: 3000, responseMimeType: 'application/json' },
        }),
      },
    )

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      throw new Error(`AI-tjänsten svarade med fel: ${errText}`)
    }

    const aiJson = await aiRes.json()
    const rawText: string = aiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI-svaret innehöll ingen giltig JSON')

    const assessment = JSON.parse(jsonMatch[0]) as Assessment

    // Litar inte blint på att modellen följde formatet — en trasig poäng eller
    // saknat fält skulle annars sparas rakt av och krascha rendering senare.
    const score = Math.round(Number(assessment.score))
    if (!Number.isFinite(score) || score < 1 || score > 10) throw new Error('AI-svaret hade ogiltig poäng')
    const safeAssessment: Assessment = {
      score,
      summary: String(assessment.summary ?? ''),
      strengths: Array.isArray(assessment.strengths) ? assessment.strengths.map(String) : [],
      weaknesses: Array.isArray(assessment.weaknesses) ? assessment.weaknesses.map(String) : [],
    }

    const { data: updated, error: updateError } = await supabase
      .from('candidates')
      .update({ ai_assessment: safeAssessment, ai_assessed_at: new Date().toISOString() })
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

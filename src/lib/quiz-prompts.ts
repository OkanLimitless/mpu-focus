import OpenAI from 'openai'

export type GeneratedQuestion = {
  type: 'mcq'|'short'|'scenario'
  category: string
  difficulty: 1|2|3
  prompt: string
  choices?: Array<{ key: string; text: string }>
  correct?: string | string[]
  rationales?: any
  rubric?: any
}

export type GeneratedBlueprint = {
  categories: Array<{ key: string; count: number }>
  questions: GeneratedQuestion[]
  llmMeta?: { model?: string; promptId?: string }
}

const MPU_DOMAIN_CONTEXT = `
Du bist ein deutscher MPU‑(Medizinisch‑Psychologische Untersuchung)‑Vorbereitungscoach.
Dein Ziel: Klient:innen realitätsnah auf das MPU‑Gespräch vorbereiten (ohne Rechtsberatung),
mit Fokus auf Einsicht, Verhaltensänderung, Rückfallprophylaxe und verkehrsrelevantes Wissen.

Wichtige Bereiche:
- Deliktanalyse: genauer Tatablauf, Auslöser, Verantwortung, Lernpunkte
- Einsicht & Motivation: warum war das Verhalten problematisch, was hat sich geändert?
- Verhaltensänderung: konkrete Maßnahmen (Therapie, Beratung, Selbsthilfe, Abstinenz/KT), Dauer, Stabilität
- Rückfallprophylaxe: Risikosituationen, Frühwarnzeichen, Strategien, Unterstützungsnetz
- Recht & Verkehr: BAC‑Grenzen (OWi ab 0,5‰, absolute Fahruntüchtigkeit ab 1,1‰; Rad ab 1,6‰), Trennungsvermögen (Cannabis), Punkte (Flensburg), Fahrerlaubnisrechtliche Konsequenzen

Hinweise:
- Sprache: DEUTSCH, sachlich‑empathisch, nicht moralisierend.
- Keine juristische Beratung; nur faktenbasiertes Wissen und Lernförderung.
- Prüfe Konsistenz mit den gelieferten Fallfakten.
`

const BLUEPRINT_INSTRUCTIONS = `
Erzeuge einen ausgewogenen Fragenkatalog aus den Kategorien:
- knowledge (Recht/Verkehr, Faktenwissen)
- insight (Einsicht, Verantwortung, Lernpunkte)
- behavior (Verhaltensänderung, Maßnahmen, Stabilität)
- consistency (Kohärenz mit Fallfakten)
- planning (Rückfallprophylaxe, Risikosituationen, Strategien)

Erzeuge 10–15 Fragen mit Schwierigkeitsstufen 1–3.
Fragetypen:
- MCQ (4 Optionen, 1 korrekt, 3 plausible Distraktoren + kurze Begründung)
- Short (Stichpunkte erwartet + kompakte Bewertungsrubrik)
- Scenario (Kurzfall; Musterantwort‑Stichpunkte + Rubrik)

Antworte nur als strenges JSON nach diesem Schema:
{
  "categories": [{"key":"knowledge","count":3}, ...],
  "questions": [
    {
      "type": "mcq|short|scenario",
      "category": "knowledge|insight|behavior|consistency|planning",
      "difficulty": 1|2|3,
      "prompt": "string",
      "choices": [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],
      "correct": "A" | ["A","C"],
      "rationales": {"A":"...","B":"...","C":"...","D":"..."},
      "rubric": {"points": [{"id":"kriterium","desc":"..."}]} // nur für short/scenario
    }
  ]
}
Wenn Schema zweimal verletzt wird, liefere mindestens 10 MCQs im Schema.
`

export const createOpenAIForQuiz = () => {
  if (!process.env.OPENAI_API_KEY) return null
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function generateBlueprintWithLLM(facts: any): Promise<GeneratedBlueprint> {
  const client = createOpenAIForQuiz()
  if (!client) return fallbackBlueprint()

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: MPU_DOMAIN_CONTEXT },
    { role: 'user', content: [
      { type: 'text', text: `${BLUEPRINT_INSTRUCTIONS}\n\nFALLFAKTEN (JSON):\n${JSON.stringify(facts).slice(0, 4000)}` }
    ] }
  ]

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.2,
    max_tokens: 3000,
  })
  const txt = resp.choices[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(txt) as GeneratedBlueprint
    if (!Array.isArray(parsed.questions)) throw new Error('invalid')
    return parsed
  } catch {
    // retry with stricter hint
    const retry = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [messages[0], { role: 'user', content: [{ type:'text', text: `${BLUEPRINT_INSTRUCTIONS}\n\nANTWORTE NUR ALS JSON. KEIN TEXT AUSSERHALB DES JSON.\nFALLFAKTEN:\n${JSON.stringify(facts).slice(0, 4000)}` }]}],
      temperature: 0.2,
      max_tokens: 3000,
    })
    const t2 = retry.choices[0]?.message?.content || ''
    try {
      const parsed2 = JSON.parse(t2) as GeneratedBlueprint
      if (!Array.isArray(parsed2.questions)) throw new Error('invalid2')
      return parsed2
    } catch {
      return fallbackBlueprint()
    }
  }
}

export function fallbackBlueprint(): GeneratedBlueprint {
  // Minimal, domain‑appropriate defaults
  const questions: GeneratedQuestion[] = [
    {
      type: 'mcq', category: 'knowledge', difficulty: 1,
      prompt: 'Ab welcher Blutalkoholkonzentration (BAK) gilt absolute Fahruntüchtigkeit für Pkw‑Fahrende? (Richtwert)',
      choices: [
        { key: 'A', text: '0,5‰' },
        { key: 'B', text: '1,1‰' },
        { key: 'C', text: '1,6‰' },
        { key: 'D', text: '2,0‰' },
      ],
      correct: 'B',
      rationales: { A: '0,5‰ ist Grenze OWi.', B: 'Richtwert absolute Fahruntüchtigkeit.', C: 'Radfahrer‑Grenze.', D: 'Zu hoch.' }
    },
    {
      type: 'short', category: 'planning', difficulty: 2,
      prompt: 'Nenne zwei persönliche Risikosituationen und je eine konkrete Strategie zur Vermeidung (Stichpunkte).',
      rubric: { points: [{ id: 'risiken', desc: 'Konkrete Situationen benannt' }, { id: 'strategie', desc: 'Umsetzbare Strategien benannt' }] }
    },
    {
      type: 'scenario', category: 'insight', difficulty: 2,
      prompt: 'Im MPU‑Gespräch wirst du nach deiner Einsicht gefragt. Skizziere kurz, worin der Fehler lag und was du daraus gelernt hast (Stichpunkte).',
      rubric: { points: [{ id: 'einsicht', desc: 'Kern der Einsicht erfasst' }, { id: 'lernen', desc: 'Konkrete Lernpunkte' }] }
    }
  ]
  return { categories: [
    { key: 'knowledge', count: 3 },
    { key: 'insight', count: 3 },
    { key: 'behavior', count: 3 },
    { key: 'consistency', count: 2 },
    { key: 'planning', count: 2 },
  ], questions }
}


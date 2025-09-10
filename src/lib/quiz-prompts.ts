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
    // ensure minimum size; if LLM returns too few questions, fall back to a robust default
    if ((parsed.questions || []).length < 10) {
      return fallbackBlueprint()
    }
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
  // Robust domain‑appropriate default with ~12 items across categories
  const questions: GeneratedQuestion[] = [
    // knowledge MCQs
    { type: 'mcq', category: 'knowledge', difficulty: 1,
      prompt: 'Ab welcher Blutalkoholkonzentration (BAK) gilt absolute Fahruntüchtigkeit für Pkw‑Fahrende? (Richtwert)',
      choices: [ { key: 'A', text: '0,5‰' }, { key: 'B', text: '1,1‰' }, { key: 'C', text: '1,6‰' }, { key: 'D', text: '2,0‰' } ],
      correct: 'B', rationales: { A: 'OWi‑Grenze.', B: 'Absolute Fahruntüchtigkeit Pkw.', C: 'Radfahrer‑Grenze.', D: 'Zu hoch.' } },
    { type: 'mcq', category: 'knowledge', difficulty: 1,
      prompt: 'Welche Aussage trifft auf das Trennungsvermögen (Cannabis & Fahren) zu?',
      choices: [ { key: 'A', text: 'Man darf immer fahren, wenn man sich fit fühlt.' }, { key: 'B', text: 'Trennungsvermögen bedeutet, Konsum und Fahren sicher zu trennen.' }, { key: 'C', text: 'Es gibt keine Grenzwerte oder Richtwerte.' }, { key: 'D', text: 'Konsum am Vorabend ist immer unproblematisch.' } ],
      correct: 'B', rationales: { A: 'Falsch, subjektives Empfinden reicht nicht.', B: 'Definition trifft zu.', C: 'Es gibt rechtliche Orientierung.', D: 'Kann problematisch sein.' } },
    { type: 'mcq', category: 'knowledge', difficulty: 2,
      prompt: 'Welche Konsequenz kann bei 0,5‰–1,09‰ ohne Ausfallerscheinungen eintreten?',
      choices: [ { key: 'A', text: 'Straftat' }, { key: 'B', text: 'Ordnungswidrigkeit' }, { key: 'C', text: 'Gar keine' }, { key: 'D', text: 'Nur Verwarnung' } ],
      correct: 'B', rationales: { A: 'Nicht zwingend Straftat.', B: 'Regelmäßig OWi.', C: 'Falsch.', D: 'Nicht zutreffend.' } },
    // insight / behavior / planning
    { type: 'scenario', category: 'insight', difficulty: 2,
      prompt: 'Im MPU‑Gespräch wirst du nach deiner Einsicht gefragt. Skizziere kurz, worin der Fehler lag und was du daraus gelernt hast (Stichpunkte).',
      rubric: { points: [ { id: 'einsicht', desc: 'Kern der Einsicht benannt' }, { id: 'lernen', desc: 'Konkrete Lernpunkte' } ] } },
    { type: 'short', category: 'behavior', difficulty: 2,
      prompt: 'Nenne drei Maßnahmen, die du zur Verhaltensänderung umgesetzt hast (Stichpunkte).',
      rubric: { points: [ { id: 'massnahmen', desc: 'Konkrete Maßnahmen benannt' } ] } },
    { type: 'short', category: 'planning', difficulty: 2,
      prompt: 'Nenne zwei persönliche Risikosituationen und je eine konkrete Strategie zur Vermeidung (Stichpunkte).',
      rubric: { points: [ { id: 'risiken', desc: 'Situationen benannt' }, { id: 'strategie', desc: 'Umsetzbare Strategie' } ] } },
    { type: 'short', category: 'behavior', difficulty: 2,
      prompt: 'Wie stellst du Abstinenz oder kontrollierten Konsum sicher? (Stichpunkte: Regeln/Routinen/Kontrollen)',
      rubric: { points: [ { id: 'sicherung', desc: 'Nachvollziehbare Sicherung' } ] } },
    { type: 'short', category: 'insight', difficulty: 2,
      prompt: 'Warum war dein früheres Verhalten verkehrsgefährdend? Nenne zwei Punkte (Stichpunkte).',
      rubric: { points: [ { id: 'gefahr', desc: 'Gefährdungsaspekte benannt' } ] } },
    { type: 'short', category: 'consistency', difficulty: 2,
      prompt: 'Nenne zwei Beispiele, die zeigen, dass dein jetziges Verhalten zu deinen Aussagen passt (Kohärenz).',
      rubric: { points: [ { id: 'kohärenz', desc: 'Handlung‑Aussage‑Kohärenz' } ] } },
    { type: 'scenario', category: 'planning', difficulty: 2,
      prompt: 'Du wirst zu Rückfallprophylaxe gefragt. Skizziere dein Frühwarnsystem (Stichpunkte).',
      rubric: { points: [ { id: 'frühwarn', desc: 'Frühwarnzeichen + Reaktion' } ] } },
    { type: 'mcq', category: 'knowledge', difficulty: 1,
      prompt: 'Welche Aussage zu Punkten (Flensburg) ist korrekt?',
      choices: [ { key: 'A', text: 'Punkte spielen für die Fahrerlaubnis keine Rolle.' }, { key: 'B', text: '8 Punkte führen zur Entziehung der Fahrerlaubnis.' }, { key: 'C', text: 'Ab 2 Punkten wird immer MPU angeordnet.' }, { key: 'D', text: 'Punkte verfallen nie.' } ],
      correct: 'B', rationales: { A: 'Falsch.', B: 'Regel: 8 Punkte = Entziehung.', C: 'Falsch.', D: 'Es gibt Verfall/ Tilgung.' } },
    { type: 'mcq', category: 'knowledge', difficulty: 1,
      prompt: 'Welche Aussage ist richtig? (Radfahren unter Alkohol)',
      choices: [ { key: 'A', text: 'Radfahren ist immer erlaubt.' }, { key: 'B', text: 'Ab ca. 1,6‰ droht MPU auch für Radfahrende.' }, { key: 'C', text: 'Es gibt keine Grenzwerte fürs Rad.' }, { key: 'D', text: 'Nur Pkw‑Grenzwerte sind relevant.' } ],
      correct: 'B', rationales: { A: 'Falsch.', B: 'Praxisrelevanter Richtwert.', C: 'Falsch.', D: 'Falsch.' } },
    { type: 'short', category: 'support', difficulty: 1,
      prompt: 'Wer unterstützt dich konkret im Alltag (2 Beispiele) und wie erreichst du diese Personen? (Stichpunkte).',
      rubric: { points: [ { id: 'netz', desc: 'Benennbare Unterstützung' } ] } },
  ]
  return { categories: [
    { key: 'knowledge', count: 4 },
    { key: 'insight', count: 2 },
    { key: 'behavior', count: 2 },
    { key: 'consistency', count: 1 },
    { key: 'planning', count: 2 },
  ], questions }
}

export async function evaluateShortAnswerWithLLM(answer: string, prompt: string, rubric: any, facts: any): Promise<{ score: number; feedback: string }> {
  const client = createOpenAIForQuiz()
  // Fallback: rudimentary heuristic if LLM not configured
  if (!client) {
    const len = (answer || '').trim().length
    const score = len > 120 ? 0.75 : len > 40 ? 0.5 : len > 10 ? 0.25 : 0
    return { score, feedback: 'Heuristische Bewertung (ohne KI). Bitte geben Sie mehr Details und konkrete Maßnahmen an.' }
  }

  const SYSTEM = MPU_DOMAIN_CONTEXT + `\nBewerte frei formulierte Antworten nach Rubrik. Liefere NUR kompaktes, hilfreiches Coaching‑Feedback.`
  const instruction = `
Bewerte die folgende Antwort auf eine MPU‑Übungsfrage. Nutze die Rubrik (Punkte/Kriterien) und den Fallkontext.
Gib ein JSON zurück:
{ "score": Zahl zwischen 0 und 1 in 0.25‑Schritten, "feedback": "knappes, hilfreiches Feedback (Deutsch)" }
Antwort nie außerhalb dieses JSON.

RUBRIK:
${JSON.stringify(rubric || {}, null, 2)}

FRAGE:
${prompt}

FALLFAKTEN:
${JSON.stringify(facts || {}, null, 2).slice(0, 1800)}

ANTWORT DES NUTZERS:
${(answer || '').slice(0, 1800)}
`

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: [{ type: 'text', text: instruction }] }
    ]
  })
  const txt = resp.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(txt)
    let s = Number(parsed.score)
    if (!isFinite(s)) s = 0
    // clamp to nearest 0.25 between 0 and 1
    s = Math.max(0, Math.min(1, Math.round(s / 0.25) * 0.25))
    return { score: s, feedback: String(parsed.feedback || '') }
  } catch {
    return { score: 0.5, feedback: 'Standard‑Feedback: Ergänzen Sie konkrete Beispiele, Maßnahmen und Rückfallstrategien.' }
  }
}

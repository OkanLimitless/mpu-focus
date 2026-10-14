import { z } from 'zod'

export const beratungSections = [
  {
    id: 'intro',
    label: 'Einleitung',
    description: 'Titel, Einleitung & Weiter-Button',
  },
  { id: 'adviser', label: 'Ansprechpartner', description: 'Name & persönliche Vorstellung' },
  { id: 'reviews', label: 'Kundenstimmen', description: 'Echte, freigegebene Bewertungen mit Quelle' },
  {
    id: 'trust',
    label: 'Vertrauen',
    description: 'Vorteile & Hinweise',
  },
  {
    id: 'question2',
    label: 'MPU-Grund',
    description: 'Fragetext',
  },
  {
    id: 'question1',
    label: 'Zeitrahmen',
    description: 'Fragetext',
  },
  {
    id: 'contact',
    label: 'Kontakt',
    description: 'Kontaktformular & Absenden-Button',
  },
  {
    id: 'benefits',
    label: 'Vorteile',
    description: 'Gründe für MPU Focus',
  },
  {
    id: 'success',
    label: 'Bestätigung',
    description: 'Nach erfolgreicher Anfrage',
  },
] as const

export const beratungFields = [
  { key: 'adviserName', label: 'Name', defaultValue: 'Mustafa Sahin', section: 'adviser', kind: 'text' },
  { key: 'adviserRole', label: 'Rolle', defaultValue: 'Ihr Ansprechpartner bei MPU Focus', section: 'adviser', kind: 'text' },
  { key: 'adviserDescription', label: 'Vorstellung', defaultValue: 'Persönliche Beratung zu Ihren nächsten Schritten.', section: 'adviser', kind: 'textarea' },
  { key: 'reviewsTitle', label: 'Überschrift', defaultValue: 'Erfahrungen mit MPU Focus', section: 'reviews', kind: 'text' },
  { key: 'review1Quote', label: 'Bewertung 1 · Originalzitat (optional)', defaultValue: '', section: 'reviews', kind: 'textarea' },
  { key: 'review1Author', label: 'Bewertung 1 · Angezeigter Name', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review1Source', label: 'Bewertung 1 · Quellenlink (https://)', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review1Rating', label: 'Bewertung 1 · Sterne (1–5, optional)', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review2Quote', label: 'Bewertung 2 · Originalzitat (optional)', defaultValue: '', section: 'reviews', kind: 'textarea' },
  { key: 'review2Author', label: 'Bewertung 2 · Angezeigter Name', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review2Source', label: 'Bewertung 2 · Quellenlink (https://)', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review2Rating', label: 'Bewertung 2 · Sterne (1–5, optional)', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review3Quote', label: 'Bewertung 3 · Originalzitat (optional)', defaultValue: '', section: 'reviews', kind: 'textarea' },
  { key: 'review3Author', label: 'Bewertung 3 · Angezeigter Name', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review3Source', label: 'Bewertung 3 · Quellenlink (https://)', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'review3Rating', label: 'Bewertung 3 · Sterne (1–5, optional)', defaultValue: '', section: 'reviews', kind: 'text' },
  { key: 'directContactTitle', label: 'Direkter Kontakt · Hinweis', defaultValue: 'Lieber direkt Kontakt aufnehmen?', section: 'contact', kind: 'text' },
  { key: 'phoneLabel', label: 'Telefon-Button', defaultValue: 'Jetzt anrufen', section: 'contact', kind: 'text' },
  { key: 'whatsappLabel', label: 'WhatsApp-Button', defaultValue: 'WhatsApp öffnen', section: 'contact', kind: 'text' },
  {
    key: 'introTitle',
    label: 'Hauptüberschrift',
    defaultValue: 'Kostenloses MPU-Beratungsgespräch',
    section: 'intro',
    kind: 'text',
  },
  {
    key: 'introBadge',
    label: 'Kleine Überschrift',
    defaultValue: 'In 3 Schritten zur Erstberatung',
    section: 'intro',
    kind: 'text',
  },
  {
    key: 'introDescription',
    label: 'Einleitung',
    defaultValue:
      'Klären Sie Ihre nächsten Schritte zur MPU. Kostenlos und unverbindlich.',
    section: 'intro',
    kind: 'textarea',
  },
  {
    key: 'introCallback',
    label: 'Rückruf-Hinweis',
    defaultValue: 'Sie stellen die Anfrage. Wir melden uns persönlich.',
    section: 'intro',
    kind: 'text',
  },
  {
    key: 'nextLabel',
    label: 'Weiter-Button',
    defaultValue: 'Weiter',
    section: 'intro',
    kind: 'text',
  },
  {
    key: 'headerSecurity',
    label: 'Hinweis im Kopfbereich',
    defaultValue: 'Vertrauliche Anfrage',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'headerSuccess',
    label: 'Erfolge im Kopfbereich',
    defaultValue: 'Unverbindlich',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustTitle1',
    label: 'Vorteil 1 · Überschrift',
    defaultValue: 'Individuell',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustText1',
    label: 'Vorteil 1 · Beschreibung',
    defaultValue: 'Strukturierte Vorbereitung',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustTitle2',
    label: 'Vorteil 2 · Überschrift',
    defaultValue: 'Persönlich',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustText2',
    label: 'Vorteil 2 · Beschreibung',
    defaultValue: 'Raum für Ihre Fragen',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustTitle3',
    label: 'Vorteil 3 · Überschrift',
    defaultValue: 'Verständlich',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustText3',
    label: 'Vorteil 3 · Beschreibung',
    defaultValue: 'Klarheit über den Ablauf',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustTitle4',
    label: 'Vorteil 4 · Überschrift',
    defaultValue: 'Kostenlos',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'trustText4',
    label: 'Vorteil 4 · Beschreibung',
    defaultValue: 'Unverbindliche Erstberatung',
    section: 'trust',
    kind: 'text',
  },
  {
    key: 'question1',
    label: 'Frage',
    defaultValue: 'Wann möchten Sie Ihre MPU abschließen?',
    section: 'question1',
    kind: 'textarea',
  },
  {
    key: 'question2',
    label: 'Frage',
    defaultValue: 'Was ist der Anlass für Ihre MPU?',
    section: 'question2',
    kind: 'textarea',
  },
  {
    key: 'question6',
    label: 'Frage',
    defaultValue: 'Wann passt Ihnen ein Rückruf?',
    section: 'contact',
    kind: 'textarea',
  },
  {
    key: 'questionHint6',
    label: 'Hinweis',
    defaultValue: 'Optional · mehrere Zeiten möglich',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'contactTitle',
    label: 'Überschrift',
    defaultValue: 'Wie können wir Sie erreichen?',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'contactDescription',
    label: 'Einleitung',
    defaultValue:
      'Hinterlassen Sie Ihre Kontaktdaten für die kostenlose Erstberatung.',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'contactCallback',
    label: 'Rückruf-Hinweis',
    defaultValue: 'Wir berücksichtigen Ihren Rückrufwunsch nach Möglichkeit.',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'contactFormTitle',
    label: 'Formularüberschrift',
    defaultValue: 'Ihre Kontaktdaten',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'contactFormHint',
    label: 'Formularhinweis',
    defaultValue: '* Pflichtfelder · Rückrufzeit ist optional',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'contactPhoneHint',
    label: 'Telefon-Hinweis',
    defaultValue: 'Unter dieser Nummer melden wir uns bei Ihnen.',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'submitLabel',
    label: 'Absenden-Button',
    defaultValue: 'Kostenlosen Rückruf anfordern',
    section: 'contact',
    kind: 'text',
  },
  {
    key: 'benefitsTitle',
    label: 'Überschrift',
    defaultValue: 'Warum MPU Focus wählen?',
    section: 'benefits',
    kind: 'text',
  },
  {
    key: 'benefit1',
    label: 'Vorteil 1',
    defaultValue: 'Orientierung für Ihre MPU-Vorbereitung',
    section: 'benefits',
    kind: 'text',
  },
  {
    key: 'benefit2',
    label: 'Vorteil 2',
    defaultValue: 'Kostenlose und unverbindliche Beratung',
    section: 'benefits',
    kind: 'text',
  },
  {
    key: 'benefit3',
    label: 'Vorteil 3',
    defaultValue: 'Ihre Fragen zum Ablauf besprechen',
    section: 'benefits',
    kind: 'text',
  },
  {
    key: 'benefit4',
    label: 'Vorteil 4',
    defaultValue: 'Individuelle Vorbereitung auf Ihren Fall',
    section: 'benefits',
    kind: 'text',
  },
  {
    key: 'successTitle',
    label: 'Überschrift',
    defaultValue: 'Ihre Anfrage ist angekommen.',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successDescription',
    label: 'Einleitung',
    defaultValue: 'Ihre Anfrage wurde erfolgreich übermittelt.',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successCallbackTitle',
    label: 'Rückruf · Überschrift',
    defaultValue: 'Wir rufen Sie an!',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successCallbackDescription',
    label: 'Rückruf · Beschreibung',
    defaultValue:
      'Unser Team meldet sich telefonisch, um Ihre Situation und die nächsten Schritte zu besprechen.',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successBenefit1',
    label: 'Vorteil 1',
    defaultValue: 'Kostenlose Erstberatung',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successBenefit2',
    label: 'Vorteil 2',
    defaultValue: 'Individuelle Strategie',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successBenefit3',
    label: 'Vorteil 3',
    defaultValue: 'Keine Verpflichtungen',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successBenefit4',
    label: 'Vorteil 4',
    defaultValue: 'Nächste Schritte besprechen',
    section: 'success',
    kind: 'text',
  },
  {
    key: 'successHomeLabel',
    label: 'Startseite-Button',
    defaultValue: 'Zur Startseite',
    section: 'success',
    kind: 'text',
  },
] as const

export type BeratungContent = Record<
  (typeof beratungFields)[number]['key'],
  string
>
export const defaultBeratungContent = Object.fromEntries(
  beratungFields.map((field) => [field.key, field.defaultValue])
) as BeratungContent
// Only copy is accepted. Step order, answer values, consent and attribution are excluded.
export const beratungContentSchema = z
  .object(
    Object.fromEntries(
      beratungFields.map((field) => [
        field.key,
        z
          .string()
          .trim()
          .min(/^review[123]/.test(field.key) ? 0 : 1, 'Bitte füllen Sie dieses Feld aus.')
          .max(field.kind === 'textarea' ? 1200 : 200),
      ])
    ) as unknown as Record<keyof BeratungContent, z.ZodType<string>>
  )
  .strict()
  .superRefine((copy, context) => {
    for (const number of [1, 2, 3]) {
      const ratingKey = `review${number}Rating` as keyof BeratungContent
      const rating = copy[ratingKey]
      if (rating && !/^[1-5]$/.test(rating)) context.addIssue({ code: z.ZodIssueCode.custom, path: [ratingKey], message: 'Bitte geben Sie die Originalbewertung von 1 bis 5 an oder lassen Sie das Feld leer.' })
      const keys = ['Quote', 'Author', 'Source'].map(suffix => `review${number}${suffix}` as keyof BeratungContent)
      if (!rating && !keys.some(key => copy[key])) continue
      for (const key of keys) {
        if (!copy[key]) context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Bitte ergänzen Sie Zitat, Namen und Quelle oder leeren Sie alle drei Felder.' })
      }
      const key = keys[2]
      try {
        const url = new URL(copy[key])
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsafe source')
      } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Bitte geben Sie einen öffentlichen https://-Quellenlink ein.' })
      }
    }
  })

export function getBeratungReviews(copy: BeratungContent) {
  return [1, 2, 3].map(number => ({
    quote: copy[`review${number}Quote` as keyof BeratungContent],
    author: copy[`review${number}Author` as keyof BeratungContent],
    source: copy[`review${number}Source` as keyof BeratungContent],
    rating: copy[`review${number}Rating` as keyof BeratungContent],
  })).filter(review => review.quote && review.author && review.source)
}

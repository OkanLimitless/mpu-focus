import { z } from 'zod'

export const landingSections = [
  {
    id: 'hero',
    label: 'Erster Eindruck',
    description: 'Titel, Einleitung & Bilder',
  },
  {
    id: 'leistungen',
    label: 'Leistungen',
    description: 'Angebot & Vorteile',
  },
  {
    id: 'ablauf',
    label: 'Ablauf',
    description: 'Schritte der Vorbereitung',
  },
  {
    id: 'akademie',
    label: 'Akademie',
    description: 'Lernbereich & Begleitung',
  },
  {
    id: 'faq',
    label: 'Fragen & Antworten',
    description: 'Häufige Fragen',
  },
  {
    id: 'kontakt',
    label: 'Kontakt',
    description: 'Einleitung & Handlungsaufruf',
  },
  {
    id: 'footer',
    label: 'Fußzeile',
    description: 'Abschließende Beschreibung',
  },
] as const

export const landingImages = [
  '/landing-hero-consultation.png',
  '/landing-preparation-detail.png',
  '/landing-academy-detail-v2.png',
  '/mpu-hero-premium.png',
  '/mpu-hero-split.png',
  '/mpu-hero.png',
  '/mpu-analysis.png',
  '/mpu-success.png',
] as const

export const landingFields = [
  {
    key: 'heroBenefits1',
    label: 'Vorteil 1',
    defaultValue: 'Kostenfreie Ersteinschätzung Ihres Falls',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'heroBenefits2',
    label: 'Vorteil 2',
    defaultValue: 'Persönlicher Plan statt Standardkurs',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'heroBenefits3',
    label: 'Vorteil 3',
    defaultValue: 'Lernplattform erst nach individueller Freigabe',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'trustFacts1',
    label: 'Kennzahl 1',
    defaultValue: '24h',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'trustFacts2',
    label: 'Beschreibung der Kennzahl 1',
    defaultValue: 'Rückmeldung an Werktagen',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'trustFacts3',
    label: 'Kennzahl 2',
    defaultValue: '1:1',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'trustFacts4',
    label: 'Beschreibung der Kennzahl 2',
    defaultValue: 'Persönliche Begleitung',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'trustFacts5',
    label: 'Kennzahl 3',
    defaultValue: 'Manuell',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'trustFacts6',
    label: 'Beschreibung der Kennzahl 3',
    defaultValue: 'Freigabe nach Abstimmung',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'serviceItems1',
    label: 'Leistung 1 · Überschrift',
    defaultValue: 'Standort sauber klären',
    section: 'leistungen',
    kind: 'text',
  },
  {
    key: 'serviceItems2',
    label: 'Leistung 1 · Beschreibung',
    defaultValue:
      'Wir ordnen MPU-Grund, Nachweise und Gesprächsrisiken verständlich ein, bevor Sie Zeit oder Geld investieren.',
    section: 'leistungen',
    kind: 'textarea',
  },
  {
    key: 'serviceItems3',
    label: 'Leistung 2 · Überschrift',
    defaultValue: 'Vorbereitung fokussieren',
    section: 'leistungen',
    kind: 'text',
  },
  {
    key: 'serviceItems4',
    label: 'Leistung 2 · Beschreibung',
    defaultValue:
      'Sie erhalten konkrete Schritte, klare Prioritäten und realistische Gesprächsvorbereitung für Ihren Fall.',
    section: 'leistungen',
    kind: 'textarea',
  },
  {
    key: 'serviceItems5',
    label: 'Leistung 3 · Überschrift',
    defaultValue: 'Sicherer auftreten',
    section: 'leistungen',
    kind: 'text',
  },
  {
    key: 'serviceItems6',
    label: 'Leistung 3 · Beschreibung',
    defaultValue:
      'Mit persönlichem Feedback und Simulationen wird aus Unsicherheit ein nachvollziehbarer roter Faden.',
    section: 'leistungen',
    kind: 'textarea',
  },
  {
    key: 'processSteps1',
    label: 'Schritt 1 · Überschrift',
    defaultValue: 'Erstgespräch',
    section: 'ablauf',
    kind: 'text',
  },
  {
    key: 'processSteps2',
    label: 'Schritt 1 · Beschreibung',
    defaultValue:
      'Wir sprechen über den Anlass der MPU, Ihre Unterlagen und die wichtigsten Risiken in Ihrem Fall.',
    section: 'ablauf',
    kind: 'textarea',
  },
  {
    key: 'processSteps3',
    label: 'Schritt 2 · Überschrift',
    defaultValue: 'Empfehlung',
    section: 'ablauf',
    kind: 'text',
  },
  {
    key: 'processSteps4',
    label: 'Schritt 2 · Beschreibung',
    defaultValue:
      'Sie bekommen eine klare Einschätzung, welche Vorbereitung sinnvoll ist und was Sie nicht brauchen.',
    section: 'ablauf',
    kind: 'textarea',
  },
  {
    key: 'processSteps5',
    label: 'Schritt 3 · Überschrift',
    defaultValue: 'Begleitung',
    section: 'ablauf',
    kind: 'text',
  },
  {
    key: 'processSteps6',
    label: 'Schritt 3 · Beschreibung',
    defaultValue:
      'Die Vorbereitung startet mit festen Schritten, persönlicher Rückmeldung und nachvollziehbaren Aufgaben.',
    section: 'ablauf',
    kind: 'textarea',
  },
  {
    key: 'processSteps7',
    label: 'Schritt 4 · Überschrift',
    defaultValue: 'Akademie-Zugang',
    section: 'ablauf',
    kind: 'text',
  },
  {
    key: 'processSteps8',
    label: 'Schritt 4 · Beschreibung',
    defaultValue:
      'Die Lernplattform wird erst nach Abstimmung, Zahlung und persönlicher Freigabe aktiviert.',
    section: 'ablauf',
    kind: 'text',
  },
  {
    key: 'faqs1',
    label: 'Frage 1',
    defaultValue: 'Ist das Erstgespräch kostenlos?',
    section: 'faq',
    kind: 'text',
  },
  {
    key: 'faqs2',
    label: 'Antwort 1',
    defaultValue:
      'Ja. Wir klären zuerst Ihren Fall, den sinnvollen Vorbereitungsweg und ob eine Zusammenarbeit aktuell passt.',
    section: 'faq',
    kind: 'textarea',
  },
  {
    key: 'faqs3',
    label: 'Frage 2',
    defaultValue: 'Bekomme ich sofort Zugang zur Plattform?',
    section: 'faq',
    kind: 'text',
  },
  {
    key: 'faqs4',
    label: 'Antwort 2',
    defaultValue:
      'Nein. MPU Focus ist keine automatische Selbstregistrierung. Der Zugang wird nach persönlicher Abstimmung und Freigabe aktiviert.',
    section: 'faq',
    kind: 'textarea',
  },
  {
    key: 'faqs5',
    label: 'Frage 3',
    defaultValue: 'Für welche MPU-Fälle ist MPU Focus geeignet?',
    section: 'faq',
    kind: 'text',
  },
  {
    key: 'faqs6',
    label: 'Antwort 3',
    defaultValue:
      'Für Alkohol-, Drogen-, Punkte- und weitere verkehrspsychologische Fragestellungen, sofern eine strukturierte Vorbereitung sinnvoll ist.',
    section: 'faq',
    kind: 'textarea',
  },
  {
    key: 'faqs7',
    label: 'Frage 4',
    defaultValue: 'Wie schnell erhalte ich eine Rückmeldung?',
    section: 'faq',
    kind: 'text',
  },
  {
    key: 'faqs8',
    label: 'Antwort 4',
    defaultValue:
      'In der Regel innerhalb von 24 Stunden an Werktagen. Bei dringenden Fällen priorisieren wir die Rückmeldung.',
    section: 'faq',
    kind: 'textarea',
  },
  {
    key: 'contactBenefits1',
    label: 'Kontaktvorteil 1',
    defaultValue: 'Kostenfreie Ersteinschätzung',
    section: 'kontakt',
    kind: 'text',
  },
  {
    key: 'contactBenefits2',
    label: 'Kontaktvorteil 2',
    defaultValue: 'Klare Empfehlung ohne Verkaufsdruck',
    section: 'kontakt',
    kind: 'text',
  },
  {
    key: 'contactBenefits3',
    label: 'Kontaktvorteil 3',
    defaultValue: 'Diskrete Rückmeldung an Werktagen',
    section: 'kontakt',
    kind: 'text',
  },
  {
    key: 'heroBadge',
    label: 'Kleine Überschrift',
    defaultValue: 'Persönliche MPU-Vorbereitung',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'heroSubtitle',
    label: 'Hauptbotschaft',
    defaultValue: 'Klarer Plan. Sicheres Gespräch. Persönliche Freigabe.',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'heroDescription',
    label: 'Einleitung',
    defaultValue:
      'Wir begleiten Sie strukturiert zurück zum Führerschein: mit fachlicher Einschätzung, persönlicher Vorbereitung und einer Lernplattform, die bewusst erst nach Abstimmung freigeschaltet wird.',
    section: 'hero',
    kind: 'textarea',
  },
  {
    key: 'heroCta',
    label: 'Hauptbutton',
    defaultValue: 'Kostenfreies Erstgespräch',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'secondaryCta',
    label: 'Zweiter Button',
    defaultValue: 'Ablauf ansehen',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'servicesTitle',
    label: 'Überschrift',
    defaultValue: 'Erst Klarheit, dann Vorbereitung.',
    section: 'leistungen',
    kind: 'text',
  },
  {
    key: 'servicesDescription',
    label: 'Einleitung',
    defaultValue:
      'MPU Focus reduziert Komplexität auf die nächsten sinnvollen Schritte. Keine automatische Kursstrecke, sondern persönliche Einordnung und gezielte Begleitung.',
    section: 'leistungen',
    kind: 'textarea',
  },
  {
    key: 'processTitle',
    label: 'Überschrift',
    defaultValue: 'Ein ruhiger Prozess mit klaren Entscheidungen.',
    section: 'ablauf',
    kind: 'text',
  },
  {
    key: 'processDescription',
    label: 'Einleitung',
    defaultValue:
      'Sie wissen jederzeit, warum der nächste Schritt relevant ist und was vor der MPU wirklich sitzen muss.',
    section: 'ablauf',
    kind: 'textarea',
  },
  {
    key: 'academyBadge',
    label: 'Bildbeschriftung',
    defaultValue: 'Akademie nach Freigabe',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'academyTitle',
    label: 'Überschrift',
    defaultValue: 'Digital lernen, persönlich geführt bleiben.',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'academyDescription',
    label: 'Einleitung',
    defaultValue:
      'Die Lernplattform ergänzt die persönliche Vorbereitung. Sie wird nicht verkauft wie ein Sofortprodukt, sondern passend zu Ihrem Fall freigeschaltet.',
    section: 'akademie',
    kind: 'textarea',
  },
  {
    key: 'academyFeature1',
    label: 'Vorteil 1',
    defaultValue: 'Erst Gespräch, dann Angebot',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'academyText1',
    label: 'Beschreibung 1',
    defaultValue:
      'Der Zugang folgt erst, wenn der Vorbereitungsweg geklärt ist.',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'academyFeature2',
    label: 'Vorteil 2',
    defaultValue: 'Freischaltung nach Bestätigung',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'academyText2',
    label: 'Beschreibung 2',
    defaultValue:
      'Zahlung und Zugang laufen bewusst kontrolliert statt automatisch.',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'academyFeature3',
    label: 'Vorteil 3',
    defaultValue: 'Keine falschen Erwartungen',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'academyText3',
    label: 'Beschreibung 3',
    defaultValue:
      'Sie starten nur mit einem Setup, das zu Ihrer Situation passt.',
    section: 'akademie',
    kind: 'text',
  },
  {
    key: 'faqTitle',
    label: 'Überschrift',
    defaultValue: 'Antworten ohne Kleingedrucktes.',
    section: 'faq',
    kind: 'text',
  },
  {
    key: 'contactTitle',
    label: 'Überschrift',
    defaultValue: 'Fordern Sie Ihr Erstgespräch an.',
    section: 'kontakt',
    kind: 'text',
  },
  {
    key: 'contactDescription',
    label: 'Einleitung',
    defaultValue:
      'Wir melden uns mit einer fachlichen Ersteinschätzung. Erst danach entscheiden Sie, welcher Weg sinnvoll ist.',
    section: 'kontakt',
    kind: 'textarea',
  },
  {
    key: 'footerDescription',
    label: 'Beschreibung',
    defaultValue:
      'Professionelle MPU-Vorbereitung mit persönlicher Begleitung, klarer Struktur und manueller Freischaltung nach Abstimmung.',
    section: 'footer',
    kind: 'textarea',
  },
  {
    key: 'heroTitle',
    label: 'Seitentitel',
    defaultValue: 'MPU Focus',
    section: 'hero',
    kind: 'text',
  },
  {
    key: 'contactCta',
    label: 'Kontaktbutton',
    defaultValue: 'Erstgespräch anfragen',
    section: 'kontakt',
    kind: 'text',
  },
  {
    key: 'heroImage',
    label: 'Titelbild',
    defaultValue: '/landing-hero-consultation.png',
    section: 'hero',
    kind: 'image',
  },
  {
    key: 'servicesImage',
    label: 'Bild',
    defaultValue: '/landing-preparation-detail.png',
    section: 'leistungen',
    kind: 'image',
  },
  {
    key: 'academyImage',
    label: 'Bild',
    defaultValue: '/landing-academy-detail-v2.png',
    section: 'akademie',
    kind: 'image',
  },
] as const

export type LandingField = (typeof landingFields)[number]
export type LandingContent = Record<LandingField['key'], string>
export const defaultLandingContent = Object.fromEntries(
  landingFields.map((f) => [f.key, f.defaultValue])
) as LandingContent
export const landingContentSchema = z
  .object(
    Object.fromEntries(
      landingFields.map((f) => [
        f.key,
        f.kind === 'image'
          ? z.enum(landingImages)
          : z
              .string()
              .trim()
              .min(1, 'Bitte füllen Sie dieses Feld aus.')
              .max(
                f.kind === 'textarea' ? 1200 : 200,
                'Dieser Text ist zu lang.'
              ),
      ])
    ) as unknown as Record<keyof LandingContent, z.ZodType<string>>
  )
  .strict()

export type LandingDocument = {
  draft: LandingContent
  published: LandingContent
  previousPublished: LandingContent | null
  publishedAt: string | null
  updatedBy: string | null
}
export type LandingState = {
  document: LandingDocument
  revision: string | null
}
export const initialLandingState: LandingState = {
  revision: null,
  document: {
    draft: defaultLandingContent,
    published: defaultLandingContent,
    previousPublished: null,
    publishedAt: null,
    updatedBy: null,
  },
}

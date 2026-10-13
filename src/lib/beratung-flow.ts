import type { BeratungContent } from './beratung-content'

export interface QuizData {
  timeframe: string
  reason: string
  jobLoss: boolean | undefined
  mpuChallenges: string[]
  concerns: string[]
  availability: string[]
}

export interface ContactData {
  firstName: string
  lastName: string
  email: string
  phone: string
  privacyConsent: boolean
}

export const BERATUNG_STEPS = [
  {
    questionKey: 'question2',
    type: 'single' as const,
    field: 'reason',
    options: ['Alkohol', 'Drogen', 'Punkte', 'Straftat', 'Andere'],
  },
  {
    questionKey: 'question1',
    type: 'single' as const,
    field: 'timeframe',
    options: [
      'Innerhalb von 3 Monaten',
      '3-6 Monate',
      '6-12 Monate',
      'Über 1 Jahr',
      'Noch unsicher',
    ],
  },
] as const

export const CALLBACK_OPTIONS = [
  'Vormittag (8-12 Uhr)',
  'Mittag (12-16 Uhr)',
  'Nachmittag (16-20 Uhr)',
] as const

export function contactErrors(data: ContactData) {
  return {
    firstName: data.firstName.trim()
      ? ''
      : 'Bitte geben Sie Ihren Vornamen ein.',
    lastName: data.lastName.trim()
      ? ''
      : 'Bitte geben Sie Ihren Nachnamen ein.',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
      ? ''
      : 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
    phone:
      /^[+0-9 ()/-]+$/.test(data.phone.trim()) &&
      data.phone.replace(/\D/g, '').length >= 7 &&
      data.phone.length <= 40
        ? ''
        : 'Bitte geben Sie eine gültige Telefonnummer ein.',
    privacyConsent: data.privacyConsent
      ? ''
      : 'Bitte stimmen Sie der Kontaktaufnahme zu.',
  }
}

export const BERATUNG_LEAD_ENDPOINT = '/api/leads'

export function getBeratungSteps(content: BeratungContent) {
  return BERATUNG_STEPS.map((step) => ({
    question: content[step.questionKey],
    type: step.type,
    field: step.field,
    options: [...step.options],
  }))
}

export function buildBeratungLeadPayload(
  contactData: ContactData,
  quizData: QuizData
) {
  return {
    ...contactData,
    ...quizData,
    source: 'beratung-quiz-de',
    consentAccepted: contactData.privacyConsent,
    consentVersion: 'beratung_v1',
  }
}

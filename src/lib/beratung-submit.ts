import { BERATUNG_LEAD_ENDPOINT } from './beratung-flow'

// A timeout can mean the server saved the lead but its response was lost.
// The caller retains the same request ID until the visitor changes their answers.
export async function submitBeratungRequest(payload: Record<string, unknown>, timeoutMs = 20000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(BERATUNG_LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null)
    if (response.status !== 201 || result?.success !== true || !result.leadId) {
      throw new Error(response.status === 429
        ? 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.'
        : 'Ihre Anfrage konnte nicht bestätigt werden. Ihre Angaben bleiben erhalten. Bitte versuchen Sie es erneut.')
    }
    return result as { success: true; leadId: string }
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Die Verbindung dauert zu lange. Ihre Angaben bleiben erhalten. Bitte versuchen Sie es erneut; dieselbe Anfrage wird nur einmal gespeichert.')
    if (error instanceof TypeError) throw new Error('Verbindung fehlgeschlagen. Ihre Angaben bleiben erhalten. Bitte versuchen Sie es erneut.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

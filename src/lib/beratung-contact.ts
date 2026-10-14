import 'server-only'
// Destinations are deployment configuration, outside the content editor.
export function getBeratungContact() {
  const phone = process.env.BERATUNG_PHONE || ''
  const whatsapp = process.env.BERATUNG_WHATSAPP || ''
  const valid = (value: string) => /^\+[1-9]\d{6,14}$/.test(value)
  return {
    phone: valid(phone) ? `tel:${phone}` : null,
    whatsapp: valid(whatsapp) ? `https://wa.me/${whatsapp.slice(1)}` : null,
  }
}

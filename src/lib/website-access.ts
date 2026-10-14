// Server-controlled capability: never accept editor access from profile metadata.
export function isWebsiteEditorEmail(email: string) {
  return (process.env.WEBSITE_EDITOR_EMAILS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase())
}

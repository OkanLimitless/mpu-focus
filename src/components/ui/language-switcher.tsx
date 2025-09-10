"use client"

import { useI18n } from "@/components/providers/i18n-provider"

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n()

  return (
    <select
      aria-label="Select language"
      value={lang}
      onChange={(e) => setLang(e.target.value as any)}
      className="h-9 rounded-md border bg-white px-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option value="de">DE</option>
      <option value="en">EN</option>
    </select>
  )
}


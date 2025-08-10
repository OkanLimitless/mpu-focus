"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type LanguageCode = "en" | "de";

type Dictionary = Record<string, string>;

type I18nDictionaries = Record<LanguageCode, Dictionary>;

const dictionaries: I18nDictionaries = {
  en: {
    documentProcessorTitle: "Document Processor",
    documentProcessorSubtitle: "Upload large PDF documents to extract structured data using OCR and AI analysis",
    choosePdfOrDrag: "Choose PDF file or drag and drop",
    supportsUpTo: "Supports PDF files up to 100MB (auto-optimized upload)",
    processDocument: "Process Document",
    processing: "Processing...",
    processingComplete: "Processing Complete",
    extractedData: "Extracted Data:",
    generatePdf: "Generate PDF Report",
    downloadHtml: "Download HTML",
    processAnother: "Process Another Document",
    copyExtracted: "Copy Extracted Data",
  },
  de: {
    documentProcessorTitle: "Dokumentenverarbeitung",
    documentProcessorSubtitle: "Lade große PDF-Dokumente hoch, um strukturierte Daten mit OCR und KI zu extrahieren",
    choosePdfOrDrag: "PDF auswählen oder hierher ziehen",
    supportsUpTo: "Unterstützt PDF-Dateien bis 100MB (automatisch optimiert)",
    processDocument: "Dokument verarbeiten",
    processing: "Verarbeitung...",
    processingComplete: "Verarbeitung abgeschlossen",
    extractedData: "Extrahierte Daten:",
    generatePdf: "PDF generieren",
    downloadHtml: "HTML herunterladen",
    processAnother: "Weiteres Dokument verarbeiten",
    copyExtracted: "Extrahierte Daten kopieren",
  },
};

interface I18nContextValue {
  lang: LanguageCode;
  t: (key: string) => string;
  setLang: (lang: LanguageCode) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children, initialLang = "de" as LanguageCode }: { children: React.ReactNode; initialLang?: LanguageCode }) {
  const [lang, setLang] = useState<LanguageCode>(initialLang);

  const t = useMemo(() => {
    const dict = dictionaries[lang] || dictionaries.de;
    return (key: string) => dict[key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex items-center gap-2 bg-white/90 border rounded-full px-3 py-1 shadow-sm">
      <button
        className={`text-sm ${lang === 'de' ? 'font-semibold' : 'opacity-70'}`}
        onClick={() => setLang('de')}
        aria-pressed={lang === 'de'}
      >
        DE
      </button>
      <span className="opacity-40">|</span>
      <button
        className={`text-sm ${lang === 'en' ? 'font-semibold' : 'opacity-70'}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  );
}
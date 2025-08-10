"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LanguageCode = "en" | "de";

type Dictionary = Record<string, string>;

type I18nDictionaries = Record<LanguageCode, Dictionary>;

const dictionaries: I18nDictionaries = {
  en: {
    appName: "MPU-Focus",
    adminPanel: "Admin Panel",
    // Global actions
    logout: "Logout",
    loading: "Loading...",
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    save: "Save",
    update: "Update",
    create: "Create",
    previous: "Previous",
    next: "Next",
    dashboard: "Dashboard",
    progress: "Progress",
    search: "Search",
    email: "Email Address",
    password: "Password",
    signIn: "Sign In",
    signingIn: "Signing in...",
    loginFailedTitle: "Login Failed",
    loginFailedDesc: "Please check your credentials.",
    loginSuccessTitle: "Login Successful",
    redirecting: "Redirecting...",

    // Statuses
    status_pending: "Pending",
    status_documents_uploaded: "Documents Uploaded",
    status_contract_signed: "Under Review",
    status_resubmission_required: "Resubmission Required",
    status_verified: "Verified",
    status_rejected: "Rejected",
    status_unknown: "Unknown",

    // Document Processor
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

    // Login
    loginTitle: "Login",
    loginSubtitle: "Sign in with your credentials",
    placeholderEmail: "your.email@example.com",
    placeholderPassword: "Your password",

    // Dashboard
    welcome: "Welcome",
    trainingDashboard: "Your Training Dashboard",
    trainingDashboardSub: "Track progress, access your course, and complete verification.",
    accountStatus: "Account Status:",
    overallProgress: "Overall Progress",
    chapters: "Chapters",
    completed: "Completed",
    account: "Account",
    verificationStatus: "Verification status",
    accountVerificationRequired: "Account Verification Required",
    verificationSteps: "Please complete verification steps below to upload your documents and sign the service agreement.",
    docsUploadedMsg: "Your documents have been uploaded. Please complete the contract signing process.",
    underReviewMsg: "Your documents and contract are being reviewed by our team. This typically takes 1–2 business days.",
    resubmissionMsg: "Your documents need to be updated. Please upload new documents. Your contract signature remains valid.",
    rejectedMsg: "Your submission was rejected. Please contact support for more information and to resubmit.",
    defaultVerificationMsg: "Please complete the verification process to access your account.",
    uploadId: "Upload a clear photo of your ID/passport",
    signAgreement: "Sign the service agreement digitally",
    reviewTimeline: "We will review within 1–2 business days",
    startVerificationNow: "Start Verification Now",
    uploadNewDocuments: "Upload New Documents",
    yourCourse: "Your Course",
    continueTraining: "Continue your training progress",
    courseAccessPending: "Course access pending verification",
    courseAccessLocked: "Course Access Locked",
    completeVerificationToAccess: "Complete your account verification to access the full course.",
    startVerification: "Start Verification",
    continue: "Continue",
    watchVideosAndTrack: "Watch videos, track your progress, and complete your training",
    orSelectVideo: "or select a video from the left to begin",
    identityDocument: "Identity Document",
    approved: "Approved",
    rejected: "Rejected - Please resubmit",
    underReview: "Under review",
    notUploaded: "Not uploaded",
    serviceAgreement: "Service Agreement",
    signed: "Signed",
    notSigned: "Not signed",
    accountVerification: "Account Verification",
    complete: "Complete",
    inProgress: "In progress",

    // Course page
    loadingYourCourse: "Loading your course...",
    noCourseTitle: "No Course Available",
    noCourseDesc: "There are no courses available at this time.",
    videoOf: "Video {current} of {total}",
    contentLockedTitle: "Content Locked",
    contentLockedDesc: "Complete previous chapters to unlock this content.",
    courseContent: "Course Content",
    current: "Current",
    locked: "Locked",
    videosCount: "{count} videos",
    resumeCourse: "Resume Course",

    // Admin
    nav_dashboard: "Dashboard",
    nav_users: "User Management",
    nav_leads: "Lead Management",
    nav_verification: "Verification",
    nav_chapters: "Chapters",
    nav_videos: "Videos",
    nav_dashboard_desc: "Overview and statistics",
    nav_users_desc: "Manage users and track progress",
    nav_leads_desc: "Manage and convert leads",
    nav_verification_desc: "Review user verification submissions",
    nav_chapters_desc: "Manage course chapters",
    nav_videos_desc: "Manage course videos",
    adminOverviewTitle: "Dashboard Overview",
    adminOverviewDesc: "Welcome to the admin dashboard. Here's a quick overview of your system.",
    totalUsers: "Total Users",
    activeUsers: "Active Users",
    registeredUsers: "Registered users",
    recentlyActive: "Recently active",
    manageUsers: "Manage Users",
    newLeads: "New Leads",
  },
  de: {
    appName: "MPU-Focus",
    adminPanel: "Admin Bereich",
    // Global actions
    logout: "Abmelden",
    loading: "Laden...",
    cancel: "Abbrechen",
    delete: "Löschen",
    close: "Schließen",
    save: "Speichern",
    update: "Aktualisieren",
    create: "Erstellen",
    previous: "Zurück",
    next: "Weiter",
    dashboard: "Dashboard",
    progress: "Fortschritt",
    search: "Suche",
    email: "E-Mail-Adresse",
    password: "Passwort",
    signIn: "Anmelden",
    signingIn: "Anmeldung...",
    loginFailedTitle: "Anmeldung fehlgeschlagen",
    loginFailedDesc: "Bitte Zugangsdaten prüfen.",
    loginSuccessTitle: "Anmeldung erfolgreich",
    redirecting: "Weiterleiten...",

    // Statuses
    status_pending: "Ausstehend",
    status_documents_uploaded: "Dokumente hochgeladen",
    status_contract_signed: "In Prüfung",
    status_resubmission_required: "Erneute Einreichung erforderlich",
    status_verified: "Verifiziert",
    status_rejected: "Abgelehnt",
    status_unknown: "Unbekannt",

    // Document Processor
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

    // Login
    loginTitle: "Anmeldung",
    loginSubtitle: "Melden Sie sich mit Ihren Zugangsdaten an",
    placeholderEmail: "ihre.email@beispiel.de",
    placeholderPassword: "Ihr Passwort",

    // Dashboard
    welcome: "Willkommen",
    trainingDashboard: "Ihr Trainings-Dashboard",
    trainingDashboardSub: "Verfolgen Sie den Fortschritt, greifen Sie auf den Kurs zu und schließen Sie die Verifizierung ab.",
    accountStatus: "Kontostatus:",
    overallProgress: "Gesamtfortschritt",
    chapters: "Kapitel",
    completed: "Abgeschlossen",
    account: "Konto",
    verificationStatus: "Verifizierungsstatus",
    accountVerificationRequired: "Kontoverifizierung erforderlich",
    verificationSteps: "Bitte schließen Sie die folgenden Schritte ab, um Dokumente hochzuladen und die Vereinbarung zu unterschreiben.",
    docsUploadedMsg: "Ihre Dokumente wurden hochgeladen. Bitte schließen Sie die Vertragsunterzeichnung ab.",
    underReviewMsg: "Ihre Dokumente und der Vertrag werden geprüft. Dies dauert in der Regel 1–2 Werktage.",
    resubmissionMsg: "Ihre Dokumente müssen aktualisiert werden. Bitte neue Dokumente hochladen. Ihre Unterschrift bleibt gültig.",
    rejectedMsg: "Ihre Einreichung wurde abgelehnt. Bitte wenden Sie sich für weitere Informationen an den Support.",
    defaultVerificationMsg: "Bitte schließen Sie die Verifizierung ab, um Zugriff zu erhalten.",
    uploadId: "Laden Sie ein klares Foto Ihres Ausweises/Passes hoch",
    signAgreement: "Unterschreiben Sie die Dienstleistungsvereinbarung digital",
    reviewTimeline: "Wir prüfen innerhalb von 1–2 Werktagen",
    startVerificationNow: "Jetzt verifizieren",
    uploadNewDocuments: "Neue Dokumente hochladen",
    yourCourse: "Ihr Kurs",
    continueTraining: "Setzen Sie Ihren Lernfortschritt fort",
    courseAccessPending: "Kurszugang wartet auf Verifizierung",
    courseAccessLocked: "Kurszugang gesperrt",
    completeVerificationToAccess: "Schließen Sie die Verifizierung ab, um Zugriff zu erhalten.",
    startVerification: "Verifizierung starten",
    continue: "Weiter",
    watchVideosAndTrack: "Videos ansehen, Fortschritt verfolgen und Training abschließen",
    orSelectVideo: "oder wählen Sie links ein Video aus, um zu beginnen",
    identityDocument: "Ausweisdokument",
    approved: "Genehmigt",
    underReview: "In Prüfung",
    notUploaded: "Nicht hochgeladen",
    serviceAgreement: "Dienstleistungsvertrag",
    signed: "Unterschrieben",
    notSigned: "Nicht unterschrieben",
    accountVerification: "Kontoverifizierung",
    complete: "Abgeschlossen",
    inProgress: "In Bearbeitung",

    // Course page
    loadingYourCourse: "Kurs wird geladen...",
    noCourseTitle: "Kein Kurs verfügbar",
    noCourseDesc: "Derzeit sind keine Kurse verfügbar.",
    videoOf: "Video {current} von {total}",
    contentLockedTitle: "Inhalt gesperrt",
    contentLockedDesc: "Schließen Sie vorherige Kapitel ab, um diesen Inhalt freizuschalten.",
    courseContent: "Kursinhalt",
    current: "Aktuell",
    locked: "Gesperrt",
    videosCount: "{count} Videos",
    resumeCourse: "Kurs fortsetzen",

    // Admin
    nav_dashboard: "Übersicht",
    nav_users: "Benutzerverwaltung",
    nav_leads: "Lead-Verwaltung",
    nav_verification: "Verifizierung",
    nav_chapters: "Kapitel",
    nav_videos: "Videos",
    nav_dashboard_desc: "Überblick und Statistiken",
    nav_users_desc: "Benutzer verwalten und Fortschritt verfolgen",
    nav_leads_desc: "Leads verwalten und konvertieren",
    nav_verification_desc: "Verifizierungsanfragen prüfen",
    nav_chapters_desc: "Kurskapitel verwalten",
    nav_videos_desc: "Kursvideos verwalten",
    adminOverviewTitle: "Dashboard-Übersicht",
    adminOverviewDesc: "Willkommen im Admin-Dashboard. Hier ein kurzer Überblick über das System.",
    totalUsers: "Gesamte Benutzer",
    activeUsers: "Aktive Benutzer",
    registeredUsers: "Registrierte Benutzer",
    recentlyActive: "Kürzlich aktiv",
    manageUsers: "Benutzer verwalten",
    newLeads: "Neue Leads",
  },
};

interface I18nContextValue {
  lang: LanguageCode;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (lang: LanguageCode) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children, initialLang = "de" as LanguageCode }: { children: React.ReactNode; initialLang?: LanguageCode }) {
  const [lang, setLangState] = useState<LanguageCode>(initialLang);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('app_lang') as LanguageCode | null) : null;
    if (stored && (stored === 'de' || stored === 'en')) {
      setLangState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_lang', lang);
    }
  }, [lang]);

  const setLang = (l: LanguageCode) => setLangState(l);

  const t = useMemo(() => {
    const dict = dictionaries[lang] || dictionaries.de;
    return (key: string, vars?: Record<string, string | number>) => {
      let out = dict[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          out = out.replace(new RegExp(`{${k}}`, 'g'), String(v));
        });
      }
      return out;
    };
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
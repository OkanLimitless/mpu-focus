'use client'

import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  Globe2,
  History,
  ImageIcon,
  Loader2,
  Monitor,
  Save,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { landingImages } from '@/lib/landing-content'
import {
  websitePages,
  initialWebsiteState,
  type WebsiteContent,
  type WebsitePageId,
  type WebsiteState,
} from '@/lib/website-content'
import { cn } from '@/lib/utils'

const imageNames = [
  'Persönliche Beratung',
  'Vorbereitung',
  'Online-Akademie',
  'Beratung · Premium',
  'Beratung · Perspektive',
  'MPU Beratung',
  'Analyse',
  'Erfolg',
]
const same = (a: WebsiteContent, b: WebsiteContent) =>
  JSON.stringify(a) === JSON.stringify(b)

export default function LandingEditor({
  demo = false,
  initialPage = 'home',
}: {
  demo?: boolean
  initialPage?: WebsitePageId
}) {
  const [page, setPage] = useState<WebsitePageId>(initialPage)
  const demoStates = useRef<Partial<Record<WebsitePageId, WebsiteState>>>({})
  return (
    <PageEditor
      key={page}
      demo={demo}
      page={page}
      onPageChange={(nextPage) => {
        setPage(nextPage)
        const url = new URL(window.location.href)
        url.searchParams.set('page', nextPage)
        window.history.replaceState(null, '', url)
      }}
      initialDemoState={demoStates.current[page]}
      onDemoSave={(state) => {
        demoStates.current[page] = state
      }}
    />
  )
}

function PageEditor({
  demo,
  page,
  onPageChange,
  initialDemoState,
  onDemoSave,
}: {
  demo: boolean
  page: WebsitePageId
  onPageChange: (page: WebsitePageId) => void
  initialDemoState?: WebsiteState
  onDemoSave: (state: WebsiteState) => void
}) {
  const definition = websitePages[page]
  const landingFields = definition.fields
  const landingSections = definition.sections
  const initialState = initialDemoState ?? initialWebsiteState(page)
  const [state, setState] = useState<WebsiteState>(initialState)
  const [content, setContent] = useState<WebsiteContent>(
    initialState.document.draft
  )
  const [section, setSection] = useState<string>(landingSections[0].id)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [loading, setLoading] = useState(!demo)
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(0)
  const [width, setWidth] = useState(700)
  const [loaded, setLoaded] = useState(demo)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const unsaved = !same(content, state.document.draft)
  const unpublished = !same(content, state.document.published)
  const validation = definition.schema.safeParse(content)
  const invalidKeys = new Set(
    validation.success
      ? []
      : validation.error.issues.map((issue) => String(issue.path[0]))
  )
  const currentSection = landingSections.find((item) => item.id === section)!

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/website?page=${page}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setState(data)
      setContent(data.document.draft)
      setLoaded(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Die Inhalte konnten nicht geladen werden.'
      )
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    if (!demo) void load()
  }, [demo, load])
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (unsaved) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    // Also protect client-side navigation inside the admin shell.
    function navigate(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest('a')
      if (
        unsaved &&
        link &&
        link.target !== '_blank' &&
        !link.getAttribute('href')?.startsWith('#') &&
        !window.confirm(
          'Ungespeicherte Änderungen verwerfen und die Seite verlassen?'
        )
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', navigate, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', navigate, true)
    }
  }, [unsaved])
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'landing-ready'
      )
        setReady((value) => value + 1)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  useEffect(() => {
    if (!viewport.current) return
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width)
    )
    observer.observe(viewport.current)
    return () => observer.disconnect()
  }, [loading])
  useEffect(() => {
    if (ready)
      frame.current?.contentWindow?.postMessage(
        { type: 'landing-content', page, content },
        window.location.origin
      )
  }, [content, ready, page])
  useEffect(() => {
    if (ready)
      frame.current?.contentWindow?.postMessage(
        { type: 'landing-section', page, section },
        window.location.origin
      )
  }, [section, ready, page])

  async function save(action: 'save' | 'publish') {
    if (!validation.success) {
      setError('Bitte prüfen Sie die markierten Felder.')
      return
    }
    setBusy(action)
    setError('')
    setNotice('')
    setConfirmPublish(false)
    try {
      let next: WebsiteState
      if (demo) {
        next = {
          revision: new Date().toISOString(),
          document: {
            ...state.document,
            draft: validation.data,
            ...(action === 'publish'
              ? {
                  published: validation.data,
                  previousPublished: state.document.published,
                  publishedAt: new Date().toISOString(),
                }
              : {}),
          },
        }
      } else {
        const response = await fetch('/api/admin/website', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page,
            action,
            content: validation.data,
            revision: state.revision,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        next = data
      }
      if (demo) onDemoSave(next)
      setState(next)
      setContent(next.document.draft)
      setNotice(
        demo
          ? 'Demo aktualisiert. Die öffentliche Website bleibt unverändert.'
          : action === 'publish'
            ? 'Veröffentlicht. Die Änderungen sind jetzt auf der Website sichtbar.'
            : 'Entwurf gespeichert. Die öffentliche Website bleibt unverändert.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  const virtualWidth = device === 'desktop' ? 1280 : 390
  const scale = Math.max(0.1, Math.min((width - 32) / virtualWidth, 1))
  const virtualHeight = device === 'desktop' ? 1000 : 760
  const changedFields = landingFields.filter(
    (field) => content[field.key] !== state.document.published[field.key]
  )

  return (
    <div className="mx-auto max-w-[1800px] text-slate-900">
      {demo && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            <strong>Interaktive Demo</strong> · Änderungen gelten nur in dieser
            Vorschau und werden beim Neuladen zurückgesetzt.
          </span>
          <a
            href={`/website?page=${page}`}
            className="inline-flex items-center gap-1 font-semibold underline"
          >
            Zum Admin-Editor <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Globe2 className="h-4 w-4" /> WEBSITE{' '}
            <ChevronRight className="h-3 w-3" />{' '}
            {definition.label.toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ihre Website. Ihre Worte.
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Inhalte anpassen, Vorschau prüfen und Änderungen veröffentlichen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={loading || !loaded || !!busy || !unsaved}
            onClick={() => void save('save')}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-40"
          >
            {busy === 'save' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{' '}
            Entwurf speichern
          </button>
          <button
            disabled={
              loading ||
              !loaded ||
              !!busy ||
              !unpublished ||
              !validation.success
            }
            onClick={() => setConfirmPublish(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40"
          >
            {busy === 'publish' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}{' '}
            {demo ? 'Veröffentlichung testen' : 'Veröffentlichen'}
          </button>
        </div>
      </div>
      <div aria-live="polite">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}{' '}
            {!demo && (
              <button
                className="ml-3 font-bold underline"
                onClick={() => {
                  if (
                    !unsaved ||
                    window.confirm(
                      'Aktuellen Stand laden und ungespeicherte Änderungen verwerfen?'
                    )
                  )
                    void load()
                }}
              >
                Aktuellen Stand laden
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <Check className="h-4 w-4" />
            {notice}
          </div>
        )}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Globe2 className="h-5 w-5" />
          </span>
          <div>
            <label htmlFor="website-page" className="sr-only">
              Seite auswählen
            </label>
            <select
              id="website-page"
              value={page}
              disabled={!!busy || loading}
              onChange={(event) => {
                if (
                  !unsaved ||
                  window.confirm(
                    'Ungespeicherte Änderungen verwerfen und die Seite wechseln?'
                  )
                )
                  onPageChange(event.target.value as WebsitePageId)
              }}
              className="max-w-full rounded-md border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {(Object.keys(websitePages) as WebsitePageId[]).map((id) => (
                <option key={id} value={id}>
                  {websitePages[id].label} · {websitePages[id].path}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-xs text-slate-500">MPU Focus · Deutsch</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span
            className={cn(
              'flex items-center gap-2 font-semibold',
              unsaved || unpublished ? 'text-amber-700' : 'text-emerald-700'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                unsaved || unpublished ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
            {unsaved
              ? 'Ungespeicherte Änderungen'
              : unpublished
                ? 'Entwurf gespeichert'
                : 'Alle Änderungen veröffentlicht'}
          </span>
          <a
            href={definition.path}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 border-l border-slate-200 pl-4 text-slate-500 hover:text-blue-600"
          >
            Website öffnen <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      {loading ? (
        <div className="flex h-96 items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Inhalte werden geladen …
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[390px_minmax(0,1fr)] 2xl:grid-cols-[450px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Seitenbereiche
              </p>
              <div className="my-4 flex flex-wrap gap-1.5">
                {landingSections.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                      section === item.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    )}
                  >
                    <span className="mr-1.5 opacity-50">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold">{currentSection.label}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {currentSection.description}
                </p>
              </div>
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Eye className="h-4 w-4" />
              </span>
            </div>
            <fieldset
              disabled={!!busy || !loaded}
              className="max-h-[650px] space-y-5 overflow-y-auto p-5 disabled:opacity-60"
            >
              {landingFields
                .filter((field) => field.section === section)
                .sort(
                  (a, b) =>
                    Number(/\d$/.test(a.key)) - Number(/\d$/.test(b.key))
                )
                .map((field) => (
                  <div key={field.key}>
                    <div className="mb-2 flex justify-between gap-2">
                      <label
                        htmlFor={field.key}
                        className="text-xs font-semibold text-slate-700"
                      >
                        {field.label}
                      </label>
                      {field.kind !== 'image' && (
                        <span
                          className={cn(
                            'text-[10px]',
                            invalidKeys.has(field.key)
                              ? 'text-red-600'
                              : 'text-slate-400'
                          )}
                        >
                          {content[field.key].length}/
                          {field.kind === 'textarea' ? 1200 : 200}
                        </span>
                      )}
                    </div>
                    {field.kind === 'image' ? (
                      <div>
                        <div className="relative mb-2 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                          <Image
                            src={content[field.key]}
                            alt="Ausgewähltes Seitenbild"
                            fill
                            sizes="400px"
                            className="object-cover"
                          />
                        </div>
                        <div className="relative">
                          <ImageIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <select
                            id={field.key}
                            value={content[field.key]}
                            onChange={(e) => {
                              setContent({
                                ...content,
                                [field.key]: e.target.value,
                              })
                              setNotice('')
                            }}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-2 text-sm"
                          >
                            {landingImages.map((path, index) => (
                              <option key={path} value={path}>
                                {imageNames[index]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : field.kind === 'textarea' ? (
                      <textarea
                        id={field.key}
                        value={content[field.key]}
                        rows={4}
                        maxLength={1200}
                        aria-invalid={invalidKeys.has(field.key)}
                        onChange={(e) => {
                          setContent({
                            ...content,
                            [field.key]: e.target.value,
                          })
                          setNotice('')
                        }}
                        className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    ) : (
                      <input
                        id={field.key}
                        value={content[field.key]}
                        maxLength={200}
                        aria-invalid={invalidKeys.has(field.key)}
                        onChange={(e) => {
                          setContent({
                            ...content,
                            [field.key]: e.target.value,
                          })
                          setNotice('')
                        }}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    )}
                    {invalidKeys.has(field.key) && (
                      <p className="mt-1 text-xs text-red-600">
                        Bitte geben Sie einen gültigen Inhalt ein.
                      </p>
                    )}
                  </div>
                ))}
            </fieldset>
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                {page === 'beratung'
                  ? 'Sie bearbeiten die Texte. Antwortmöglichkeiten, Pflichtfelder, Einwilligung und Lead-Erfassung bleiben geschützt.'
                  : 'Das Design bleibt erhalten. Ihre Änderungen betreffen nur die Inhalte.'}
              </p>
            </div>
          </div>
          <div className="min-w-0 xl:sticky xl:top-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />{' '}
                  Live-Vorschau{' '}
                  <span className="ml-1 hidden font-normal text-slate-400 sm:inline">
                    Änderungen sofort sehen
                  </span>
                </div>
                <div className="flex rounded-lg bg-slate-100 p-1">
                  <button
                    title="Desktop-Vorschau"
                    aria-label="Desktop-Vorschau"
                    aria-pressed={device === 'desktop'}
                    onClick={() => setDevice('desktop')}
                    className={cn(
                      'rounded-md p-2',
                      device === 'desktop'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400'
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    title="Mobile Vorschau"
                    aria-label="Mobile Vorschau"
                    aria-pressed={device === 'mobile'}
                    onClick={() => setDevice('mobile')}
                    className={cn(
                      'rounded-md p-2',
                      device === 'mobile'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400'
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                ref={viewport}
                className="flex justify-center overflow-hidden bg-slate-100 py-4"
                style={{ height: virtualHeight * scale + 32 }}
              >
                <div
                  className="relative overflow-hidden rounded-lg bg-white shadow-lg"
                  style={{
                    width: virtualWidth * scale,
                    height: virtualHeight * scale,
                  }}
                >
                  <iframe
                    ref={frame}
                    title="Vorschau der Landingpage"
                    src={`${demo ? '/editor-demo/preview' : '/website-preview'}?page=${page}`}
                    className="origin-top-left border-0 bg-white"
                    style={{
                      width: virtualWidth,
                      height: virtualHeight,
                      transform: `scale(${scale})`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 px-1 text-xs leading-5 text-slate-400">
              <ArrowDownLeft className="mt-0.5 h-4 w-4 shrink-0" />
              Wählen Sie einen Seitenbereich. Die Vorschau springt automatisch
              zur passenden Stelle. In der Vorschau werden keine Anfragen
              gesendet.
            </div>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <button
                disabled={!unpublished || !!busy || !loaded}
                onClick={() => {
                  if (
                    window.confirm(
                      'Den veröffentlichten Stand als Entwurf laden? Ihre aktuellen Änderungen werden ersetzt.'
                    )
                  ) {
                    setContent(state.document.published)
                    setNotice(
                      'Veröffentlichter Stand geladen. Zum Übernehmen den Entwurf speichern.'
                    )
                  }
                }}
                className="flex items-center gap-1.5 hover:text-blue-600 disabled:opacity-40"
              >
                <History className="h-3.5 w-3.5" />
                Veröffentlichten Stand laden
              </button>
              {state.document.previousPublished && (
                <button
                  disabled={!!busy}
                  onClick={() => {
                    if (
                      window.confirm('Die vorherige Version als Entwurf laden?')
                    ) {
                      setContent(state.document.previousPublished!)
                      setNotice(
                        'Vorherige Version als Entwurf geladen. Prüfen und anschließend veröffentlichen.'
                      )
                    }
                  }}
                  className="hover:text-blue-600"
                >
                  Vorherige Version wiederherstellen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-7 shadow-2xl">
          <span className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
            <Globe2 className="h-6 w-6" />
          </span>
          <DialogTitle className="text-xl font-bold">
            {demo
              ? 'Veröffentlichung ausprobieren?'
              : 'Änderungen veröffentlichen?'}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-slate-500">
            {demo
              ? 'Dies ist eine lokale Demo. Es werden keine Inhalte auf der öffentlichen Website geändert.'
              : 'Diese Inhalte werden für alle Besucher sichtbar. Die bisherige Version bleibt zum Wiederherstellen erhalten.'}
          </DialogDescription>
          <div className="my-5 max-h-48 space-y-2 overflow-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            {landingSections
              .filter((item) =>
                changedFields.some((field) => field.section === item.id)
              )
              .map((item) => (
                <p key={item.id} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <strong>
                    {
                      changedFields.filter((field) => field.section === item.id)
                        .length
                    }{' '}
                    Änderungen
                  </strong>
                </p>
              ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              autoFocus
              onClick={() => setConfirmPublish(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Abbrechen
            </button>
            <button
              onClick={() => void save('publish')}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {demo ? 'Demo bestätigen' : 'Jetzt veröffentlichen'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

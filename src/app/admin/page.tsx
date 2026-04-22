'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Clock3,
  FileCheck2,
  GraduationCap,
  Info,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LeadStatus = 'new' | 'contacted' | 'enrolled' | 'closed'

type Stats = {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  enrolledLeads: number
  closedLeads: number
  totalParticipants: number
  academyEnabledParticipants: number
  totalVideos: number
  publishedVideos: number
}

type LeadItem = {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: LeadStatus
  createdAt: string
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const leadStatusConfig: Record<LeadStatus, { label: string; className: string; dotClassName: string }> = {
  new: {
    label: 'Neu',
    className: 'bg-blue-50 text-blue-700 ring-blue-100',
    dotClassName: 'bg-blue-500',
  },
  contacted: {
    label: 'Kontaktiert',
    className: 'bg-amber-50 text-amber-700 ring-amber-100',
    dotClassName: 'bg-amber-500',
  },
  enrolled: {
    label: 'Eingeschrieben',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dotClassName: 'bg-emerald-500',
  },
  closed: {
    label: 'Abgeschlossen',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    dotClassName: 'bg-slate-400',
  },
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] || ''
  const last = lastName?.trim()?.[0] || ''
  return `${first}${last}`.toUpperCase() || 'IN'
}

function MiniSparkline({ color, points }: { color: string; points: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 42" className="h-11 w-24 overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentLeads, setRecentLeads] = useState<LeadItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [statsRes, leadsRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats', { cache: 'no-store' }),
        fetch('/api/leads?limit=6', { cache: 'no-store' }),
      ])

      const statsData = await statsRes.json().catch(() => ({}))
      const leadsData = await leadsRes.json().catch(() => ({}))

      if (statsRes.ok) setStats(statsData.stats)
      if (leadsRes.ok) setRecentLeads(leadsData.leads || [])
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const kpis = [
    {
      label: 'Interessenten',
      value: stats?.totalLeads ?? '-',
      detail: 'gesamt registriert',
      Icon: Users,
      iconClassName: 'bg-blue-50 text-blue-600',
      trendColor: '#2563eb',
      trend: '0,19 18,26 39,26 52,26 66,9 77,31 94,29',
    },
    {
      label: 'Neue Leads',
      value: stats?.newLeads ?? '-',
      detail: 'für den Erstkontakt',
      Icon: UserPlus,
      iconClassName: 'bg-orange-50 text-orange-500',
      trendColor: '#f97316',
      trend: '0,23 16,29 31,27 46,22 57,21 70,7 83,31 95,30',
    },
    {
      label: 'Teilnehmer',
      value: stats?.totalParticipants ?? '-',
      detail: 'aktiv im Programm',
      Icon: GraduationCap,
      iconClassName: 'bg-emerald-50 text-emerald-600',
      trendColor: '#10b981',
      trend: '0,31 12,27 22,28 36,11 48,24 60,18 75,15 88,0',
    },
    {
      label: 'Zugang aktiv',
      value: stats?.academyEnabledParticipants ?? '-',
      detail: 'Akademie freigegeben',
      Icon: ShieldCheck,
      iconClassName: 'bg-violet-50 text-violet-600',
      trendColor: '#7c3aed',
      trend: '0,31 18,28 34,28 48,8 64,22 78,28 92,6',
    },
  ]

  const quickLinks = [
    {
      href: '/admin/leads',
      title: 'Interessenten prüfen',
      description: 'Neue Anfragen sichten und einordnen',
      Icon: Users,
      iconClassName: 'bg-blue-600 text-white',
    },
    {
      href: '/admin/participants',
      title: 'Teilnehmer freigeben',
      description: 'Programme und Akademie-Zugang verwalten',
      Icon: ShieldCheck,
      iconClassName: 'bg-emerald-600 text-white',
    },
    {
      href: '/admin/videos',
      title: 'Videokurse pflegen',
      description: 'Lektionen, Kapitel und Inhalte aktualisieren',
      Icon: Clapperboard,
      iconClassName: 'bg-violet-600 text-white',
    },
  ]

  const operations = [
    {
      label: 'Erstkontakt',
      value: stats?.newLeads ?? '-',
      detail: 'neue Interessenten',
      Icon: Clock3,
      className: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Freigaben',
      value: stats?.academyEnabledParticipants ?? '-',
      detail: 'aktive Zugänge',
      Icon: CheckCircle2,
      className: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Akademie',
      value: stats?.publishedVideos ?? '-',
      detail: `von ${stats?.totalVideos ?? '-'} Videos live`,
      Icon: Clapperboard,
      className: 'text-violet-600 bg-violet-50',
    },
  ]

  return (
    <div className={cn(bodyFont.className, 'min-h-full animate-in fade-in slide-in-from-bottom-4 duration-500')}>
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <div className="grid gap-6 p-6 md:p-7 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)] xl:items-center">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                <Activity className="h-4 w-4 text-blue-300" aria-hidden="true" />
                Admin Übersicht
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                Daten live geladen
              </span>
            </div>
            <h1 className={cn(displayFont.className, 'max-w-3xl text-3xl font-bold tracking-tight md:text-4xl')}>
              Willkommen zurück, Admin.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 md:text-base">
              Steuern Sie Interessenten, Teilnehmer, Akademie-Zugänge und Videokurse aus einem
              klaren Workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {operations.map(({ Icon, ...item }) => (
              <div key={item.label} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', item.className)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className={cn(displayFont.className, 'text-2xl font-bold text-white')}>{item.value}</p>
                    <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-slate-300">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className={cn(displayFont.className, 'text-2xl font-bold tracking-tight text-slate-950')}>
            Dashboard
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Übersicht für Leads, Teilnehmerstatus und Akademie-Freigaben.
          </p>
        </div>
        <Button
          onClick={loadDashboard}
          disabled={loading}
          variant="outline"
          className="h-11 w-fit gap-2 rounded-lg border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className={cn('h-4 w-4 text-slate-500', loading && 'animate-spin')} aria-hidden="true" />
          Aktualisieren
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {kpis.map(({ Icon, ...item }) => (
          <div
            key={item.label}
            className="group overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', item.iconClassName)}>
                  <Icon className="h-6 w-6 stroke-[2.2]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">{item.label}</p>
                  <p className={cn(displayFont.className, 'mt-1 text-3xl font-bold leading-none text-slate-950')}>{item.value}</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-blue-500" aria-hidden="true" />
            </div>
            <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-500">{item.detail}</p>
              <MiniSparkline color={item.trendColor} points={item.trend} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,2.05fr)_minmax(360px,0.95fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                <FileCheck2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className={cn(displayFont.className, 'text-xl font-bold text-slate-950')}>Neueste Interessenten</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Aktuelle Anfragen aus der Landing Page.</p>
              </div>
            </div>
            <Link href="/admin/leads">
              <Button variant="ghost" className="w-fit gap-1 rounded-lg px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                Alle ansehen <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Interessent</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Kontakt</th>
                  <th className="px-6 py-4">Datum</th>
                  <th className="px-6 py-4 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((lead) => {
                  const status = leadStatusConfig[lead.status]
                  return (
                    <tr key={lead._id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
                            <span className="text-sm font-bold text-slate-500">{getInitials(lead.firstName, lead.lastName)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-950">{lead.firstName} {lead.lastName}</p>
                            <p className="mt-1 truncate text-xs font-medium text-slate-500">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1', status.className)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClassName)} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">
                        {lead.phone || 'Keine Telefonnummer'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href="/admin/leads" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" aria-label="Interessenten öffnen">
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {recentLeads.map((lead) => {
              const status = leadStatusConfig[lead.status]
              return (
                <div key={lead._id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
                        <span className="text-sm font-bold text-slate-500">{getInitials(lead.firstName, lead.lastName)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950">{lead.firstName} {lead.lastName}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      </div>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1', status.className)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClassName)} />
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>{lead.phone || 'Keine Telefonnummer'}</span>
                    <span>{formatDate(lead.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {!loading && recentLeads.length === 0 && (
            <div className="m-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <p className="text-sm font-semibold text-slate-500">Keine Leads gefunden.</p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Zap className="h-5 w-5 fill-blue-100 text-blue-600" aria-hidden="true" />
                  <h2 className={cn(displayFont.className, 'text-xl font-bold text-slate-950')}>Schnellzugriff</h2>
                </div>
                <p className="text-sm font-medium text-slate-500">Häufige Aktionen im Admin-Alltag.</p>
              </div>
            </div>

            <div className="space-y-3">
              {quickLinks.map(({ href, title, description, Icon, iconClassName }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconClassName)}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{title}</p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">{description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className={cn(displayFont.className, 'text-lg font-bold text-slate-950')}>Status</h2>
                <p className="text-xs font-semibold text-slate-500">Aktueller Workspace-Fokus</p>
              </div>
            </div>
            <div className="space-y-4">
              {operations.map(({ Icon, ...item }) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', item.className)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-slate-950">{item.label}</p>
                      <p className={cn(displayFont.className, 'text-lg font-bold text-slate-950')}>{item.value}</p>
                    </div>
                    <p className="truncate text-xs font-medium text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative min-h-[150px] overflow-hidden rounded-xl border border-blue-100 bg-[#f7faff] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="relative z-10 max-w-[315px]">
              <div className="mb-3 flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-500" aria-hidden="true" />
                <h2 className={cn(displayFont.className, 'text-lg font-bold text-slate-950')}>Hinweis</h2>
              </div>
              <p className="text-sm font-medium leading-6 text-slate-500">
                Trennen Sie Interessenten klar von freigeschalteten Teilnehmern. So bleiben Beratung,
                Zahlung und Akademie-Zugang nachvollziehbar.
              </p>
            </div>
            <Briefcase className="absolute -bottom-5 right-5 h-28 w-28 rotate-6 text-blue-100" strokeWidth={1.3} aria-hidden="true" />
          </section>
        </aside>
      </div>

      <footer className="pt-8 text-center text-xs font-semibold text-slate-400">
        © 2026 MPU Focus. Alle Rechte vorbehalten.
      </footer>
    </div>
  )
}

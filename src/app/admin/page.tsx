'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  Users,
  Circle,
  UserRound,
  CheckCircle2,
  Clapperboard,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Mail,
  Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type LeadStatus = 'new' | 'contacted' | 'enrolled' | 'closed'

type Stats = {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  enrolledLeads: number
  closedLeads: number
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

const leadStatusConfig: Record<LeadStatus, { label: string; class: string }> = {
  new: { label: 'Neu', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  contacted: { label: 'Kontaktiert', class: 'bg-amber-100 text-amber-800 border-amber-200' },
  enrolled: { label: 'Eingeschrieben', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  closed: { label: 'Abgeschlossen', class: 'bg-slate-100 text-slate-800 border-slate-200' },
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
        fetch('/api/leads?limit=5', { cache: 'no-store' }),
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className={cn(displayFont.className, "text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight")}>
            Willkommen zurück.
          </h1>
          <p className="mt-2 text-slate-500 font-medium">Hier ist Ihre MPU Focus Performance im Überblick.</p>
        </div>
        <Button
          onClick={loadDashboard}
          disabled={loading}
          variant="outline"
          className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-2 shadow-sm rounded-xl"
        >
          <RefreshCw className={cn("h-4 w-4 text-slate-500", loading && "animate-spin")} />
          Aktualisieren
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
        {[
          { label: 'Gesamt Leads', val: stats?.totalLeads ?? '-', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Neue Leads', val: stats?.newLeads ?? '-', icon: Circle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Eingeschrieben', val: stats?.enrolledLeads ?? '-', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Video Kurse', val: stats?.totalVideos ?? '-', icon: Clapperboard, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
        ].map((s, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 rounded-bl-3xl bg-slate-50/50" />
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10 border", s.bg, s.color, s.border)}>
              <s.icon className="h-6 w-6 stroke-[2.5]" />
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-1 relative z-10">{s.label}</p>
            <h3 className={cn(displayFont.className, "text-4xl font-bold text-slate-900 tracking-tight relative z-10")}>{s.val}</h3>
          </div>
        ))}
      </div>

      {/* Recent Activity & Next Steps */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className={cn(displayFont.className, "text-xl font-bold text-slate-900")}>Neueste Leads</h3>
            <Link href="/admin/leads">
              <Button variant="ghost" className="text-blue-600 font-semibold hover:bg-blue-50 rounded-lg pr-2">
                Alle ansehen <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <div key={lead._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                    <UserRound className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs">{lead.firstName} {lead.lastName}</p>
                    <div className="flex items-center text-xs text-slate-500 font-medium mt-1 gap-2">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:ml-auto">
                  <Badge className={cn("rounded-md px-2.5 py-1 text-xs font-bold border", leadStatusConfig[lead.status].class)}>
                    {leadStatusConfig[lead.status].label}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">{formatDate(lead.createdAt)}</span>
                </div>
              </div>
            ))}

            {!loading && recentLeads.length === 0 && (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">Keine Leads gefunden.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Shortcuts */}
        <div className="bg-slate-900 rounded-3xl p-8 shadow-xl relative overflow-hidden text-white flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none" />
          <h3 className={cn(displayFont.className, "text-xl font-bold mb-2 relative z-10")}>Schnellzugriff</h3>
          <p className="text-slate-400 text-sm mb-8 relative z-10">Effiziente Verwaltung mit einem Klick.</p>

          <div className="space-y-4 flex-1 relative z-10">
            <Link href="/admin/leads" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3 font-semibold">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <Users className="h-5 w-5" />
                </div>
                CRM Öffnen
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
            </Link>
            <Link href="/admin/videos" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3 font-semibold">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Clapperboard className="h-5 w-5" />
                </div>
                Video Akademie
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <div className="flex items-center gap-3 text-sm font-semibold text-emerald-400">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              System läuft fehlerfrei
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

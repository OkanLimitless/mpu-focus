'use client'

import { useEffect, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
    Users,
    Search,
    Filter,
    UserRound,
    Mail,
    Phone,
    RefreshCw,
    ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type LeadStatus = 'new' | 'contacted' | 'enrolled' | 'closed'

type LeadItem = {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    goals?: string | null
    status: LeadStatus
    notes?: string | null
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
    return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<LeadItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchInput, setSearchInput] = useState('')
    const [appliedSearch, setAppliedSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all')
    const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})
    const [savingLeadId, setSavingLeadId] = useState<string | null>(null)

    const loadLeads = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                limit: '50',
                page: '1',
                status: statusFilter,
                search: appliedSearch,
            })
            const res = await fetch(`/api/leads?${params.toString()}`, { cache: 'no-store' })
            const payload = await res.json().catch(() => ({}))

            const nextLeads = (payload.leads || []) as LeadItem[]
            setLeads(nextLeads)

            setNotesDrafts((prev) => {
                const next: Record<string, string> = {}
                nextLeads.forEach(l => next[l._id] = prev[l._id] ?? l.notes ?? '')
                return next
            })
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadLeads()
    }, [statusFilter, appliedSearch])

    const updateLead = async (leadId: string, patch: { status?: LeadStatus; notes?: string }) => {
        try {
            setSavingLeadId(leadId)
            await fetch(`/api/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            })
            await loadLeads()
        } catch (error) {
            console.error(error)
        } finally {
            setSavingLeadId(null)
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className={cn(displayFont.className, "text-3xl font-bold text-slate-900 tracking-tight")}>Lead CRM</h1>
                        <p className="font-medium text-slate-500">Interessenten verwalten und bearbeiten</p>
                    </div>
                </div>
                <Button
                    onClick={loadLeads}
                    disabled={loading}
                    variant="outline"
                    className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-2 shadow-sm rounded-xl"
                >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Aktualisieren
                </Button>
            </header>

            {/* Filter Bar */}
            <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Name oder Email suchen..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(searchInput.trim())}
                        className="w-full h-12 pl-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-none font-medium text-slate-800"
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[200px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                            className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
                        >
                            <option value="all">Alle Kategorien</option>
                            {Object.keys(leadStatusConfig).map((s) => (
                                <option key={s} value={s}>{leadStatusConfig[s as LeadStatus].label}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Lead Cards */}
            <div className="space-y-6">
                {leads.map((lead) => (
                    <div key={lead._id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col lg:flex-row lg:items-start gap-8 hover:shadow-md transition-shadow">

                        {/* Left Column: Info */}
                        <div className="flex-1 space-y-6">
                            <div className="flex items-start justify-between sm:justify-start sm:gap-6">
                                <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <UserRound className="h-6 w-6 text-slate-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={cn(displayFont.className, "text-2xl font-bold text-slate-900 truncate")}>{lead.firstName} {lead.lastName}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                        <Badge className={cn("px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-lg border", leadStatusConfig[lead.status].class)}>
                                            {leadStatusConfig[lead.status].label}
                                        </Badge>
                                        <span className="text-xs font-semibold text-slate-500">{formatDate(lead.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-100">
                                        <Mail className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                        <p className="text-sm font-semibold text-slate-700 truncate">{lead.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-100">
                                        <Phone className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefon</p>
                                        <p className="text-sm font-semibold text-slate-700 truncate">{lead.phone}</p>
                                    </div>
                                </div>
                            </div>

                            {lead.goals && (
                                <div className="p-5 rounded-2xl bg-orange-50/50 border border-orange-100/50">
                                    <p className="text-sm font-semibold text-orange-800 leading-relaxed italic">"{lead.goals}"</p>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Actons */}
                        <div className="w-full lg:w-80 flex flex-col gap-5 pt-6 lg:pt-0 lg:pl-8 lg:border-l border-slate-100">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status Ändern</label>
                                <div className="relative">
                                    <select
                                        className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-sm hover:border-blue-300 transition-colors"
                                        value={lead.status}
                                        onChange={(e) => updateLead(lead._id, { status: e.target.value as LeadStatus })}
                                    >
                                        <option value="new">Neu eingetroffen</option>
                                        <option value="contacted">Wurde Kontaktiert</option>
                                        <option value="enrolled">Erfolgreich Eingeschrieben</option>
                                        <option value="closed">Vorgang Abgeschlossen</option>
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Interne Notiz</label>
                                <Textarea
                                    placeholder="Notiz eintippen..."
                                    value={notesDrafts[lead._id] || ''}
                                    onChange={(e) => setNotesDrafts(prev => ({ ...prev, [lead._id]: e.target.value }))}
                                    rows={3}
                                    className="w-full rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 shadow-none focus-visible:ring-blue-500 resize-none transition-colors"
                                />
                                <Button
                                    onClick={() => updateLead(lead._id, { notes: notesDrafts[lead._id] || '' })}
                                    disabled={savingLeadId === lead._id}
                                    className="w-full h-11 mt-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-900 shadow-sm transition-colors"
                                >
                                    {savingLeadId === lead._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Notiz speichern'}
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && leads.length === 0 && (
                    <div className="py-24 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50">
                        <div className="h-16 w-16 mx-auto mb-4 bg-slate-200 rounded-full flex items-center justify-center">
                            <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className={cn(displayFont.className, "text-xl font-bold text-slate-800")}>Keine Leads gefunden</h3>
                        <p className="text-slate-500 font-medium">Es gibt aktuell keine Leads für diese Filterkriterien.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

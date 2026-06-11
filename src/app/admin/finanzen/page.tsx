'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import {
  AlertCircle,
  Banknote,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type PaymentMethod = 'cash' | 'bank_transfer' | 'paypal' | 'other'

type FinanceSummary = {
  totalCollectedCents: number
  collectedThisMonthCents: number
  outstandingCents: number
  clientsWithBalance: number
}

type FinanceClient = {
  profileId: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  packagePriceCents: number | null
  financeNotes: string | null
  paidCents: number
  outstandingCents: number
  paymentsCount: number
  lastPaymentAt: string | null
}

type FinancePayment = {
  id: string
  profileId: string
  profileName: string
  profileEmail: string
  amountCents: number
  method: PaymentMethod
  note: string | null
  paidAt: string
}

type FinancePayload = {
  summary: FinanceSummary
  clients: FinanceClient[]
  recentPayments: FinancePayment[]
}

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] })
const bodyFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Bar',
  bank_transfer: 'Überweisung',
  paypal: 'PayPal',
  other: 'Sonstige',
}

const METHOD_BADGE_VARIANTS: Record<PaymentMethod, 'success' | 'info' | 'purple' | 'muted'> = {
  cash: 'success',
  bank_transfer: 'info',
  paypal: 'purple',
  other: 'muted',
}

function formatEuro(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload?.error || 'Aktion fehlgeschlagen.')
  return payload as T
}

type PaymentForm = {
  profileId: string
  amount: string
  method: PaymentMethod
  paidAt: string
  note: string
}

type ClientEditForm = {
  profileId: string
  name: string
  packagePrice: string
  financeNotes: string
}

export default function FinanzenPage() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [clients, setClients] = useState<FinanceClient[]>([])
  const [recentPayments, setRecentPayments] = useState<FinancePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)

  const [clientForm, setClientForm] = useState<ClientEditForm | null>(null)
  const [savingClient, setSavingClient] = useState(false)

  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await requestJson<FinancePayload>('/api/admin/finance', { cache: 'no-store' })
      setSummary(payload.summary || null)
      setClients(payload.clients || [])
      setRecentPayments(payload.recentPayments || [])
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Finanzdaten konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return clients
    return clients.filter((client) =>
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(term) ||
      client.email.toLowerCase().includes(term)
    )
  }, [clients, search])

  const openPaymentDialog = (profileId?: string) => {
    setPaymentForm({
      profileId: profileId || '',
      amount: '',
      method: 'cash',
      paidAt: todayInputValue(),
      note: '',
    })
  }

  const openClientDialog = (client: FinanceClient) => {
    setClientForm({
      profileId: client.profileId,
      name: `${client.firstName} ${client.lastName}`,
      packagePrice: client.packagePriceCents !== null ? String(client.packagePriceCents / 100) : '',
      financeNotes: client.financeNotes || '',
    })
  }

  const submitPayment = async () => {
    if (!paymentForm) return
    const amount = Number.parseFloat(paymentForm.amount.replace(',', '.'))
    if (!paymentForm.profileId) {
      toast({ title: 'Fehler', description: 'Bitte wählen Sie einen Kunden aus.', variant: 'destructive' })
      return
    }
    if (!Number.isFinite(amount) || amount < 0.01) {
      toast({ title: 'Fehler', description: 'Bitte geben Sie einen gültigen Betrag ein.', variant: 'destructive' })
      return
    }

    setSavingPayment(true)
    try {
      await requestJson('/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify({
          profileId: paymentForm.profileId,
          amountEuros: amount,
          method: paymentForm.method,
          ...(paymentForm.note.trim() ? { note: paymentForm.note.trim() } : {}),
          ...(paymentForm.paidAt ? { paidAt: paymentForm.paidAt } : {}),
        }),
      })
      setPaymentForm(null)
      toast({ title: 'Zahlung erfasst', description: 'Die Zahlung wurde gespeichert.' })
      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Zahlung konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    } finally {
      setSavingPayment(false)
    }
  }

  const submitClientEdit = async () => {
    if (!clientForm) return
    let packagePriceEuros: number | null = null
    const trimmedPrice = clientForm.packagePrice.trim()
    if (trimmedPrice) {
      const parsed = Number.parseFloat(trimmedPrice.replace(',', '.'))
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast({ title: 'Fehler', description: 'Bitte geben Sie einen gültigen Paketpreis ein.', variant: 'destructive' })
        return
      }
      packagePriceEuros = parsed
    }

    setSavingClient(true)
    try {
      await requestJson(`/api/admin/finance/clients/${clientForm.profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          packagePriceEuros,
          financeNotes: clientForm.financeNotes,
        }),
      })
      setClientForm(null)
      toast({ title: 'Gespeichert', description: 'Die Kundendaten wurden aktualisiert.' })
      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Änderungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      })
    } finally {
      setSavingClient(false)
    }
  }

  const deletePayment = async (payment: FinancePayment) => {
    if (!window.confirm('Diese Zahlung wirklich löschen?')) return
    setDeletingPaymentId(payment.id)
    try {
      await requestJson(`/api/admin/finance/payments/${payment.id}`, { method: 'DELETE' })
      toast({ title: 'Zahlung gelöscht', description: 'Die Zahlung wurde entfernt.' })
      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Zahlung konnte nicht gelöscht werden.',
        variant: 'destructive',
      })
    } finally {
      setDeletingPaymentId(null)
    }
  }

  return (
    <div className={cn(bodyFont.className, 'animate-in fade-in slide-in-from-bottom-4 duration-500')}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
            <Wallet className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className={cn(displayFont.className, 'text-3xl font-bold tracking-tight text-slate-900')}>
              Finanzen
            </h1>
            <p className="font-medium text-slate-500">
              Paketpreise, Zahlungen und offene Beträge im Überblick.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={loadData}
            disabled={loading}
            variant="outline"
            className="h-11 gap-2 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
            Aktualisieren
          </Button>
          <Button
            onClick={() => openPaymentDialog()}
            className="h-11 gap-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Zahlung erfassen
          </Button>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Gesamt eingenommen',
            value: summary ? formatEuro(summary.totalCollectedCents) : '-',
            icon: Banknote,
            tone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          },
          {
            label: 'Diesen Monat',
            value: summary ? formatEuro(summary.collectedThisMonthCents) : '-',
            icon: TrendingUp,
            tone: 'text-blue-600 bg-blue-50 border-blue-100',
          },
          {
            label: 'Offene Beträge',
            value: summary ? formatEuro(summary.outstandingCents) : '-',
            icon: AlertCircle,
            tone: 'text-amber-600 bg-amber-50 border-amber-100',
          },
          {
            label: 'Kunden mit offenem Saldo',
            value: summary ? summary.clientsWithBalance : '-',
            icon: Users,
            tone: 'text-red-600 bg-red-50 border-red-100',
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl border', card.tone)}>
              <card.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className={cn(displayFont.className, 'mt-1 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl')}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h2 className={cn(displayFont.className, 'text-xl font-bold tracking-tight text-slate-900')}>
              Kunden
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              Paketpreise und Zahlungsstand Ihrer Kunden.
            </p>
          </div>
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nach Name oder E-Mail suchen"
              className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-semibold">Finanzdaten werden geladen...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Users className="h-8 w-8 text-slate-400" aria-hidden="true" />
            </div>
            <h3 className={cn(displayFont.className, 'text-xl font-bold text-slate-800')}>
              Keine Kunden gefunden
            </h3>
            <p className="mt-2 text-slate-500">
              {search.trim()
                ? 'Für diese Suche gibt es keine passenden Kunden.'
                : 'Es sind aktuell keine Kunden vorhanden.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClients.map((client) => {
              const hasPrice = client.packagePriceCents !== null && client.packagePriceCents > 0
              const fullyPaid = hasPrice && client.outstandingCents <= 0
              const progressPercent = hasPrice
                ? Math.min(100, Math.round((client.paidCents / (client.packagePriceCents as number)) * 100))
                : 0
              return (
                <div key={client.profileId} className="flex flex-col gap-5 p-4 md:p-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 xl:w-72 xl:shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cn(displayFont.className, 'truncate text-lg font-bold tracking-tight text-slate-900')}>
                        {client.firstName} {client.lastName}
                      </h3>
                      {!client.isActive && <Badge variant="muted">Deaktiviert</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-500">{client.email}</p>
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Paketpreis</p>
                      {client.packagePriceCents !== null ? (
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatEuro(client.packagePriceCents)}</p>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-slate-400">Kein Preis hinterlegt</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Bezahlt</p>
                      <p className="mt-1 text-sm font-bold text-emerald-600">{formatEuro(client.paidCents)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Offen</p>
                      {!hasPrice ? (
                        <p className="mt-1 text-sm font-semibold text-slate-400">-</p>
                      ) : fullyPaid ? (
                        <div className="mt-1">
                          <Badge variant="success">Vollständig bezahlt</Badge>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-bold text-amber-600">{formatEuro(client.outstandingCents)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Zahlungen</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {client.paymentsCount} {client.paymentsCount === 1 ? 'Zahlung' : 'Zahlungen'}
                        {client.lastPaymentAt ? ` · zuletzt ${formatDate(client.lastPaymentAt)}` : ''}
                      </p>
                    </div>
                    {hasPrice && (
                      <div className="col-span-2 sm:col-span-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-2 rounded-full transition-all', fullyPaid ? 'bg-emerald-500' : 'bg-blue-600')}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {progressPercent}% des Paketpreises bezahlt
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-2 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
                      onClick={() => openPaymentDialog(client.profileId)}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Zahlung erfassen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => openClientDialog(client)}
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                      Preis festlegen
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 md:p-6">
          <h2 className={cn(displayFont.className, 'text-xl font-bold tracking-tight text-slate-900')}>
            Letzte Zahlungen
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            Die zuletzt erfassten Zahlungen Ihrer Kunden.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-semibold">Zahlungen werden geladen...</span>
          </div>
        ) : recentPayments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Banknote className="h-8 w-8 text-slate-400" aria-hidden="true" />
            </div>
            <h3 className={cn(displayFont.className, 'text-xl font-bold text-slate-800')}>
              Noch keine Zahlungen erfasst
            </h3>
            <p className="mt-2 text-slate-500">
              Erfassen Sie die erste Zahlung über die Schaltfläche &bdquo;Zahlung erfassen&ldquo;.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-24 shrink-0 text-sm font-semibold text-slate-500">
                    {formatDate(payment.paidAt)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{payment.profileName}</p>
                    <p className="truncate text-xs font-semibold text-slate-400">{payment.profileEmail}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {payment.note && (
                    <span className="hidden max-w-[200px] truncate text-xs font-semibold text-slate-400 md:inline" title={payment.note}>
                      {payment.note}
                    </span>
                  )}
                  <Badge variant={METHOD_BADGE_VARIANTS[payment.method] || 'muted'}>
                    {METHOD_LABELS[payment.method] || 'Sonstige'}
                  </Badge>
                  <span className={cn(displayFont.className, 'text-base font-bold text-slate-900')}>
                    {formatEuro(payment.amountCents)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => deletePayment(payment)}
                    disabled={deletingPaymentId === payment.id}
                    title="Zahlung löschen"
                  >
                    {deletingPaymentId === payment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!paymentForm} onOpenChange={(open) => { if (!open && !savingPayment) setPaymentForm(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Zahlung erfassen</DialogTitle>
            <DialogDescription>Erfassen Sie eine Zahlung manuell, z. B. eine Barzahlung.</DialogDescription>
          </DialogHeader>
          {paymentForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kunde</Label>
                <Select
                  value={paymentForm.profileId}
                  onValueChange={(value) => setPaymentForm((current) => current ? { ...current, profileId: value } : current)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunden wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.profileId} value={client.profileId}>
                        {client.firstName} {client.lastName} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Betrag in Euro</Label>
                  <Input
                    type="number"
                    step={0.01}
                    min={0.01}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((current) => current ? { ...current, amount: e.target.value } : current)}
                    placeholder="z. B. 250,00"
                    disabled={savingPayment}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zahlungsart</Label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(value) => setPaymentForm((current) => current ? { ...current, method: value as PaymentMethod } : current)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zahlungsart wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Barzahlung</SelectItem>
                      <SelectItem value="bank_transfer">Überweisung</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="other">Sonstige</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={paymentForm.paidAt}
                  onChange={(e) => setPaymentForm((current) => current ? { ...current, paidAt: e.target.value } : current)}
                  disabled={savingPayment}
                />
              </div>
              <div className="space-y-2">
                <Label>Notiz (optional)</Label>
                <Textarea
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm((current) => current ? { ...current, note: e.target.value } : current)}
                  rows={3}
                  placeholder="Quittung Nr., Anlass..."
                  disabled={savingPayment}
                />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Tipp: Stellen Sie bei Barzahlungen immer eine Quittung aus.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentForm(null)} disabled={savingPayment}>
              Abbrechen
            </Button>
            <Button
              onClick={submitPayment}
              disabled={savingPayment || !paymentForm?.profileId || !paymentForm?.amount}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {savingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Zahlung speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!clientForm} onOpenChange={(open) => { if (!open && !savingClient) setClientForm(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preis festlegen</DialogTitle>
            <DialogDescription>
              {clientForm ? `Paketpreis und Notizen für ${clientForm.name}.` : 'Paketpreis und Notizen bearbeiten.'}
            </DialogDescription>
          </DialogHeader>
          {clientForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Paketpreis in Euro</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  value={clientForm.packagePrice}
                  onChange={(e) => setClientForm((current) => current ? { ...current, packagePrice: e.target.value } : current)}
                  placeholder="z. B. 1500,00"
                  disabled={savingClient}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Leer lassen, um keinen Paketpreis zu hinterlegen.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea
                  value={clientForm.financeNotes}
                  onChange={(e) => setClientForm((current) => current ? { ...current, financeNotes: e.target.value } : current)}
                  rows={3}
                  placeholder="Interne Notizen zu Vereinbarungen, Ratenzahlung..."
                  disabled={savingClient}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientForm(null)} disabled={savingClient}>
              Abbrechen
            </Button>
            <Button
              onClick={submitClientEdit}
              disabled={savingClient}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {savingClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

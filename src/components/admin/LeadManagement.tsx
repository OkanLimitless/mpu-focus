'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit,
  UserPlus,
  Search,
  Filter,
  Send,
  FileCheck
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Lead } from '@/types'
import { useI18n } from '@/components/providers/i18n-provider'

interface LeadStats {
  new: number
  contacted: number
  converted: number
  closed: number
}

export default function LeadManagement() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState<LeadStats>({ new: 0, contacted: 0, converted: 0, closed: 0 })
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  
  // Form states
  const [notes, setNotes] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [hasAutoSentVerification, setHasAutoSentVerification] = useState(false)

  const { t } = useI18n()

  useEffect(() => {
    fetchLeads()
  }, [page, statusFilter, searchTerm])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: statusFilter,
        search: searchTerm
      })

      const response = await fetch(`/api/leads?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads)
        setPagination(data.pagination)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
      toast({
        title: t('error'),
        description: t('noLeadsFound'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      new: { variant: 'destructive' as const, icon: Clock },
      contacted: { variant: 'default' as const, icon: Phone },
      converted: { variant: 'default' as const, icon: CheckCircle },
      closed: { variant: 'secondary' as const, icon: XCircle }
    }
    
    const { variant, icon: Icon } = variants[status as keyof typeof variants] || variants.new
    
    return (
      <Badge variant={variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span className="capitalize">{status}</span>
      </Badge>
    )
  }

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead)
    setNotes(lead.notes || '')
    setHasAutoSentVerification(false)
    setIsDetailDialogOpen(true)
  }

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(leads.map(lead => 
          lead._id === leadId ? data.lead : lead
        ))
        setSelectedLead(data.lead)
        toast({
          title: t('success'),
          description: t('updateStatus'),
        })
        fetchLeads() // Refresh to update stats
      } else {
        throw new Error('Failed to update lead')
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      toast({
        title: t('error'),
        description: t('updateStatus'),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConvertToUser = async () => {
    if (!selectedLead) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/leads/${selectedLead._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'convert-to-user',
          password: newPassword || undefined
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(leads.map(lead => 
          lead._id === selectedLead._id ? data.lead : lead
        ))
        setSelectedLead(data.lead)
        // If password was auto-generated, surface it and keep for email
        if (data.password) {
          setNewPassword(data.password)
        }
        toast({
          title: t('success'),
          description: t('convertToUser'),
        })
        setIsConvertDialogOpen(false)
        // Auto-send verification email immediately after successful conversion
        try {
          setIsSendingEmail(true)
          const res = await fetch(`/api/leads/${data.lead._id}/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: data.password || newPassword || undefined })
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || t('sendVerificationEmail'))
          }
          setHasAutoSentVerification(true)
          toast({ title: t('verificationEmailSent'), description: t('documentVerification') })
        } catch (e) {
          console.error(e)
          toast({ title: t('error'), description: (e as any).message || t('unexpectedError'), variant: 'destructive' })
        } finally {
          setIsSendingEmail(false)
        }
        fetchLeads() // Refresh to update stats
      } else {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || t('convertToUser'))
      }
    } catch (error) {
      console.error('Error converting lead:', error)
      toast({
        title: t('error'),
        description: (error as any).message || t('unexpectedError'),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendVerificationEmail = async (leadId: string) => {
    try {
      setIsSendingEmail(true)
      const response = await fetch(`/api/leads/${leadId}/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('verificationEmailSent'),
        })
        fetchLeads() // Refresh to update any status changes
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || t('sendVerificationEmail'))
      }
    } catch (error: any) {
      console.error('Error sending verification email:', error)
      toast({
        title: t('error'),
        description: error.message || t('unexpectedError'),
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600 text-sm font-medium">{t('newLeads')}</div>
            <div className="text-2xl font-bold text-red-700">{stats.new}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">{t('contacted')}</div>
            <div className="text-2xl font-bold text-blue-700">{stats.contacted}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 text-sm font-medium">{t('converted')}</div>
            <div className="text-2xl font-bold text-green-700">{stats.converted}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600 text-sm font-medium">{t('closed')}</div>
            <div className="text-2xl font-bold text-gray-700">{stats.closed}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('searchLeadsPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="all">{t('allStatus')}</option>
            <option value="new">{t('status_new')}</option>
            <option value="contacted">{t('status_contacted')}</option>
            <option value="converted">{t('status_converted')}</option>
            <option value="closed">{t('status_closed')}</option>
          </select>
        </div>

        {/* Leads Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('contactHeader')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('statusHeader')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('timeframeHeader')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('createdHeader')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('actionsHeader')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {t('loadingLeads')}
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {t('noLeadsFound')}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <Mail className="h-3 w-3" />
                            <span>{lead.email}</span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{lead.timeframe}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {formatDate(lead.createdAt.toString())}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(lead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {lead.status === 'converted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendVerificationEmail(lead._id)}
                              disabled={isSendingEmail}
                              title={t('sendVerificationEmail')}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {t('pageOf', { page: pagination.page, pages: pagination.pages })}
              {' '}{t('totalLeads', { total: pagination.total })}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* Lead Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('leadDetails')}</DialogTitle>
              <DialogDescription>{t('viewAndManageLeadInfo')}</DialogDescription>
            </DialogHeader>
            
            {selectedLead && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">{t('name')}</Label>
                    <p className="text-sm text-gray-600">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t('emailLabel')}</Label>
                    <p className="text-sm text-gray-600">{selectedLead.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t('phoneLabel')}</Label>
                    <p className="text-sm text-gray-600">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t('statusHeader')}</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedLead.status)}
                    </div>
                  </div>
                </div>

                {/* Quiz Responses */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Quiz Responses</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('timeframeHeader')}</Label>
                      <p className="text-sm text-gray-600">{selectedLead.timeframe}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Reason for License Loss</Label>
                      <p className="text-sm text-gray-600">{selectedLead.reason}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Job Loss</Label>
                      <p className="text-sm text-gray-600">{selectedLead.jobLoss ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">MPU Challenges</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedLead.mpuChallenges.map((challenge, index) => (
                        <Badge key={index} variant="secondary">{challenge}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Concerns</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedLead.concerns.map((concern, index) => (
                        <Badge key={index} variant="secondary">{concern}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Availability</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedLead.availability.map((time, index) => (
                        <Badge key={index} variant="secondary">{time}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Management */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">{t('updateStatus')}</h4>
                  
                  <div>
                    <Label htmlFor="status">{t('updateStatus')}</Label>
                    <select
                      id="status"
                      value={selectedLead.status}
                      onChange={(e) => handleUpdateStatus(selectedLead._id, e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                      disabled={isSubmitting}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="notes">{t('notesLabel')}</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('notesLabel')}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={() => handleUpdateStatus(selectedLead._id, selectedLead.status)}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? t('processing') : t('updateNotes')}
                  </Button>
                </div>

                {/* Convert to User */}
                {selectedLead.status !== 'converted' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">{t('convertToUser')}</h4>
                    <Button
                      onClick={() => setIsConvertDialogOpen(true)}
                      className="w-full"
                      variant="default"
                    >
                      <UserPlus className="h-4 w-4 mr-2" /> {t('createUserAccount')}
                    </Button>
                  </div>
                )}

                {/* Send Verification Email */}
                {selectedLead.status === 'converted' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">{t('documentVerification')}</h4>
                    <p className="text-sm text-gray-600">{t('documentVerification')}</p>
                    <Button
                      onClick={async () => {
                        if (!selectedLead) return
                        try {
                          setIsSendingEmail(true)
                          const res = await fetch(`/api/leads/${selectedLead._id}/send-verification`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            // Pass password so email can include it
                            body: JSON.stringify({ password: newPassword || undefined })
                          })
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}))
                            throw new Error(err.error || t('sendVerificationEmail'))
                          }
                          setHasAutoSentVerification(true)
                          toast({ title: t('success'), description: t('verificationEmailSent') })
                        } catch (e) {
                          console.error(e)
                          toast({ title: t('error'), description: (e as any).message || t('unexpectedError'), variant: 'destructive' })
                        } finally {
                          setIsSendingEmail(false)
                        }
                      }}
                      disabled={isSendingEmail || hasAutoSentVerification}
                      className="w-full"
                      variant="outline"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSendingEmail ? t('sending') : hasAutoSentVerification ? t('verificationEmailSent') : t('sendVerificationEmail')}
                    </Button>
                  </div>
                )}

                {/* Conversion Info */}
                {selectedLead.status === 'converted' && selectedLead.convertedToUserId && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-green-800">{t('convertedToUser')}</h4>
                    <p className="text-sm text-green-600">
                      {t('convertedOn')} {selectedLead.convertedAt && formatDate(selectedLead.convertedAt.toString())}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Convert to User Dialog */}
        <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('convertToUser')}</DialogTitle>
              <DialogDescription>
                {t('createUserAccount')} {selectedLead?.firstName} {selectedLead?.lastName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">{t('setPasswordForUser')}</Label>
                <Input
                  id="newPassword"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('leaveEmptyToAutogenerate')}
                  className="mt-1"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsConvertDialogOpen(false)}
                  className="flex-1"
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleConvertToUser}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? t('processing') : t('createUserAccount')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
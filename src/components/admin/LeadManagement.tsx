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
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
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
          title: "Success",
          description: "Lead status updated successfully",
        })
        fetchLeads() // Refresh to update stats
      } else {
        throw new Error('Failed to update lead')
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      toast({
        title: "Error",
        description: "Failed to update lead status",
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
          title: "Success",
          description: "Lead converted to user successfully",
        })
        setIsConvertDialogOpen(false)
        fetchLeads() // Refresh to update stats
      } else {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to convert lead')
      }
    } catch (error) {
      console.error('Error converting lead:', error)
      toast({
        title: "Error",
        description: (error as any).message || "Failed to convert lead to user",
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
          title: "Success",
          description: "Verification email sent successfully",
        })
        fetchLeads() // Refresh to update any status changes
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send verification email')
      }
    } catch (error: any) {
      console.error('Error sending verification email:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
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
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Lead Management</span>
        </CardTitle>
        <CardDescription>
          Manage leads from the enrollment process and convert them to users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600 text-sm font-medium">New Leads</div>
            <div className="text-2xl font-bold text-red-700">{stats.new}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Contacted</div>
            <div className="text-2xl font-bold text-blue-700">{stats.contacted}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 text-sm font-medium">Converted</div>
            <div className="text-2xl font-bold text-green-700">{stats.converted}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600 text-sm font-medium">Closed</div>
            <div className="text-2xl font-bold text-gray-700">{stats.closed}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads by name, email, or phone..."
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
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Leads Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Timeframe</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No leads found
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
                              title="Send verification email"
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
              Page {pagination.page} of {pagination.pages} 
              ({pagination.total} total leads)
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Lead Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
              <DialogDescription>
                View and manage lead information
              </DialogDescription>
            </DialogHeader>
            
            {selectedLead && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-gray-600">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-gray-600">{selectedLead.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-gray-600">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
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
                      <Label className="text-sm font-medium">Timeframe</Label>
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
                  <h4 className="text-lg font-medium">Status Management</h4>
                  
                  <div>
                    <Label htmlFor="status">Update Status</Label>
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
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this lead..."
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={() => handleUpdateStatus(selectedLead._id, selectedLead.status)}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Notes'}
                  </Button>
                </div>

                {/* Convert to User */}
                {selectedLead.status !== 'converted' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Convert to User</h4>
                    <Button
                      onClick={() => setIsConvertDialogOpen(true)}
                      className="w-full"
                      variant="default"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convert to User Account
                    </Button>
                  </div>
                )}

                {/* Send Verification Email */}
                {selectedLead.status === 'converted' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Document Verification</h4>
                    <p className="text-sm text-gray-600">
                      Send an email invitation for document upload and contract signing.
                    </p>
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
                            throw new Error(err.error || 'Failed to send verification email')
                          }
                          toast({ title: 'Success', description: 'Verification email sent with login details' })
                        } catch (e) {
                          console.error(e)
                          toast({ title: 'Error', description: (e as any).message || 'Failed to send email', variant: 'destructive' })
                        } finally {
                          setIsSendingEmail(false)
                        }
                      }}
                      disabled={isSendingEmail}
                      className="w-full"
                      variant="outline"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSendingEmail ? 'Sending...' : 'Send Verification Email'}
                    </Button>
                  </div>
                )}

                {/* Conversion Info */}
                {selectedLead.status === 'converted' && selectedLead.convertedToUserId && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-green-800">Converted to User</h4>
                    <p className="text-sm text-green-600">
                      Converted on: {selectedLead.convertedAt && formatDate(selectedLead.convertedAt.toString())}
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
              <DialogTitle>Convert Lead to User</DialogTitle>
              <DialogDescription>
                Create a user account for {selectedLead?.firstName} {selectedLead?.lastName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">Set Password for User</Label>
                <Input
                  id="newPassword"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="mt-1"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsConvertDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConvertToUser}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Creating...' : 'Create User Account'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
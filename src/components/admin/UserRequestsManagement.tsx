'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { UserRequest } from '@/types'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, User, Clock, Eye } from 'lucide-react'

export default function UserRequestsManagement() {
  const [requests, setRequests] = useState<UserRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/signup-request')
      const data = await response.json()
      if (response.ok) {
        setRequests(data.requests)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch user requests',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (request: UserRequest, actionType: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setAction(actionType)
    setNotes('')
    setPassword('')
    setDialogOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedRequest || !action) return

    if (action === 'approve' && !password) {
      toast({
        title: 'Error',
        description: 'Password is required for approval',
        variant: 'destructive',
      })
      return
    }

    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/user-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          status: action === 'approve' ? 'approved' : 'rejected',
          notes,
          password: action === 'approve' ? password : undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        })
        setDialogOpen(false)
        fetchRequests() // Refresh the list
      } else {
        toast({
          title: 'Error',
          description: data.error || `Failed to ${action} request`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'pending':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      case 'approved':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      case 'rejected':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Access Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          User Access Requests
        </CardTitle>
        <CardDescription>
          Manage pending user access requests and view their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No user requests found
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">
                      {request.firstName} {request.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                {request.reason && (
                  <div className="text-sm">
                    <strong>Reason:</strong> {request.reason}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Submitted: {formatDate(new Date(request.createdAt))}
                  {request.reviewedAt && (
                    <span className="ml-4">
                      Reviewed: {formatDate(new Date(request.reviewedAt))}
                    </span>
                  )}
                </div>

                {request.notes && (
                  <div className="text-sm p-2 bg-muted rounded">
                    <strong>Admin Notes:</strong> {request.notes}
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(request, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(request, 'reject')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {action === 'approve' ? 'Approve' : 'Reject'} Request
              </DialogTitle>
              <DialogDescription>
                {action === 'approve' 
                  ? 'Create an account for this user by setting a temporary password.'
                  : 'Reject this access request with optional notes.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <div className="text-sm">
                  <strong>User:</strong> {selectedRequest.firstName} {selectedRequest.lastName} ({selectedRequest.email})
                </div>
              )}

              {action === 'approve' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a temporary password"
                  />
                  <p className="text-xs text-muted-foreground">
                    The user will be able to log in with this password and should change it after first login.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                disabled={actionLoading || (action === 'approve' && !password)}
                className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={action === 'reject' ? 'destructive' : 'default'}
              >
                {actionLoading ? 'Processing...' : (action === 'approve' ? 'Approve & Create Account' : 'Reject Request')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
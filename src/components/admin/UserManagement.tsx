'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { Users, Search, Eye, Edit, Trash2, BarChart3, Clock, Play, BookOpen, Mail, Shield, Ban } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  progress?: {
    totalVideos: number
    completedVideos: number
    totalChapters: number
    completedChapters: number
    averageProgress: number
    lastActivity?: string
  }
}

interface Chapter {
  _id: string
  title: string
  order: number
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const { toast } = useToast()

  const [userProgress, setUserProgress] = useState<any[]>([])

  useEffect(() => {
    fetchUsers()
    fetchChapters()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
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

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/admin/chapters')
      if (response.ok) {
        const data = await response.json()
        setChapters(data.chapters)
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error)
    }
  }

  const fetchUserProgress = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user-progress/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserProgress(data.progress)
      }
    } catch (error) {
      console.error('Failed to fetch user progress:', error)
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isActive: !isActive,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `User ${!isActive ? 'activated' : 'deactivated'} successfully`,
        })
        fetchUsers()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update user status',
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

  const viewUserProgress = async (user: User) => {
    setSelectedUser(user)
    await fetchUserProgress(user._id)
    setProgressDialogOpen(true)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) || 
      (statusFilter === 'inactive' && !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const getUserStatusBadge = (user: User) => {
    if (!user.isActive) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>
    }
    if (user.role === 'admin') {
      return <Badge variant="default" className="bg-purple-100 text-purple-800">Admin</Badge>
    }
    return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage all users and track their progress through the training program
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.isActive).length}</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Admins</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inactive</p>
                    <p className="text-2xl font-bold">{users.filter(u => !u.isActive).length}</p>
                  </div>
                  <Ban className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user._id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">
                          {user.firstName} {user.lastName}
                        </h3>
                        {getUserStatusBadge(user)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <p>Created: {formatDate(new Date(user.createdAt))}</p>
                        {user.lastLoginAt && (
                          <p>Last Login: {formatDate(new Date(user.lastLoginAt))}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar for Users */}
                    {user.role === 'user' && user.progress && (
                      <div className="w-48 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{user.progress.averageProgress}%</span>
                        </div>
                        <Progress value={user.progress.averageProgress} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {user.progress.completedVideos}/{user.progress.totalVideos} videos
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewUserProgress(user)}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      View Progress
                    </Button>
                    
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant={user.isActive ? "destructive" : "default"}
                        onClick={() => toggleUserStatus(user._id, user.isActive)}
                        disabled={actionLoading}
                      >
                        {user.isActive ? (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Progress Detail Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Progress Details - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Detailed progress tracking for this user
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Overall Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Videos Completed</p>
                        <p className="text-2xl font-bold">
                          {selectedUser.progress?.completedVideos || 0}/{selectedUser.progress?.totalVideos || 0}
                        </p>
                      </div>
                      <Play className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Chapters Completed</p>
                        <p className="text-2xl font-bold">
                          {selectedUser.progress?.completedChapters || 0}/{selectedUser.progress?.totalChapters || 0}
                        </p>
                      </div>
                      <BookOpen className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Overall Progress</p>
                        <p className="text-2xl font-bold">{selectedUser.progress?.averageProgress || 0}%</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Progress */}
              <div>
                <h4 className="font-medium mb-4">Chapter Progress</h4>
                <div className="space-y-3">
                  {userProgress.map((chapter: any) => (
                    <div key={chapter.chapterId} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium">{chapter.chapterTitle}</h5>
                        <span className="text-sm text-muted-foreground">
                          {chapter.completedVideos}/{chapter.totalVideos} videos
                        </span>
                      </div>
                      <Progress value={chapter.progress} className="h-2 mb-2" />
                      <div className="text-xs text-muted-foreground">
                        Progress: {chapter.progress}%
                        {chapter.lastActivity && (
                          <span className="ml-4">
                            Last activity: {formatDate(new Date(chapter.lastActivity))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
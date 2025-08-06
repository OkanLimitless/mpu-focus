'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { Users, BookOpen, Search } from 'lucide-react'

interface UserProgress {
  user: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  totalChapters: number
  completedChapters: number
  currentChapter: number
  overallProgress: number
  lastActivity: Date
}

export default function UserProgressDashboard() {
  const [userProgressData, setUserProgressData] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'incomplete'>('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchUserProgress()
  }, [])

  const fetchUserProgress = async () => {
    try {
      const response = await fetch('/api/admin/user-progress')
      const data = await response.json()
      
      if (response.ok) {
        setUserProgressData(data.userProgress)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch user progress',
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

  const filteredData = userProgressData.filter(userProgress => {
    const matchesSearch = 
      userProgress.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userProgress.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userProgress.user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = 
      filterCompleted === 'all' ||
      (filterCompleted === 'completed' && userProgress.overallProgress === 100) ||
      (filterCompleted === 'incomplete' && userProgress.overallProgress < 100)

    return matchesSearch && matchesFilter
  })

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getProgressText = (percentage: number) => {
    if (percentage >= 90) return 'Excellent'
    if (percentage >= 70) return 'Good'
    if (percentage >= 50) return 'Average'
    return 'Needs Attention'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Chapter Progress</CardTitle>
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
          <Users className="h-5 w-5" />
          User Chapter Progress
        </CardTitle>
        <CardDescription>
          Monitor user progress through course chapters
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterCompleted === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCompleted('all')}
            >
              All
            </Button>
            <Button
              variant={filterCompleted === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCompleted('completed')}
            >
              Completed
            </Button>
            <Button
              variant={filterCompleted === 'incomplete' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCompleted('incomplete')}
            >
              In Progress
            </Button>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || filterCompleted !== 'all' 
              ? 'No users match the current filters'
              : 'No user progress data found'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((userProgress) => (
              <div key={userProgress.user._id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">
                      {userProgress.user.firstName} {userProgress.user.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{userProgress.user.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Last Activity: {userProgress.lastActivity ? formatDate(new Date(userProgress.lastActivity)) : 'No activity'}
                    </div>
                  </div>
                </div>

                {/* Chapter Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Chapter Progress</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userProgress.overallProgress >= 90 ? 'bg-green-100 text-green-800' :
                      userProgress.overallProgress >= 70 ? 'bg-blue-100 text-blue-800' :
                      userProgress.overallProgress >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {getProgressText(userProgress.overallProgress)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(userProgress.overallProgress)}`}
                      style={{ width: `${userProgress.overallProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{userProgress.overallProgress}% Complete</span>
                    <span>
                      {userProgress.completedChapters} / {userProgress.totalChapters} chapters completed
                    </span>
                  </div>
                </div>

                {/* Current Chapter */}
                <div className="flex items-center gap-2 text-sm p-3 bg-blue-50 rounded-lg">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">
                    <strong>Current Chapter:</strong> Chapter {userProgress.currentChapter}
                    {userProgress.totalChapters > 0 && ` of ${userProgress.totalChapters}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Users:</span>
              <span className="ml-2 font-medium">{filteredData.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fully Completed:</span>
              <span className="ml-2 font-medium">
                {filteredData.filter(u => u.overallProgress === 100).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">In Progress:</span>
              <span className="ml-2 font-medium">
                {filteredData.filter(u => u.overallProgress > 0 && u.overallProgress < 100).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Not Started:</span>
              <span className="ml-2 font-medium">
                {filteredData.filter(u => u.overallProgress === 0).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
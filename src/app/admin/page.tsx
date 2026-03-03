'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { Users, Dumbbell, Calendar, CheckCircle2, Clock, MessageSquare, Check, X, Eye, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

type User = Database['public']['Tables']['users']['Row']
type ExerciseRequest = {
  id: string
  user_id: string
  request_text: string
  status: 'pending' | 'resolved'
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  users: { name: string; avatar_color: string } | null
  resolver: { name: string } | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pendingRequests, setPendingRequests] = useState<ExerciseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ExerciseRequest | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
    console.log('Fetching admin data...')
    
    // Fetch users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('name')

    if (usersError) {
      console.error('Users fetch error:', usersError)
      throw usersError
    }

    // Fetch pending requests (simpler query)
    const { data: requestsData, error: requestsError } = await supabase
      .from('exercise_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('Requests fetch error:', requestsError)
      throw requestsError
    }

    console.log('Raw requests data:', requestsData)

    // Enrich requests with user data
    const enrichedRequests = (requestsData || []).map(request => {
      const user = usersData?.find(u => u.id === request.user_id)
      return {
        ...request,
        users: user ? { name: user.name, avatar_color: user.avatar_color } : null,
        resolver: null
      }
    })

    setUsers(usersData || [])
    setPendingRequests(enrichedRequests)
    
    console.log('Data loaded successfully')
    console.log('Pending requests:', enrichedRequests.length)
  } catch (err: any) {
    console.error('Error fetching data:', {
      error: err,
      message: err?.message,
      code: err?.code,
    })
    toast.error('Failed to load data')
  } finally {
    setLoading(false)
  }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewRequest = (request: ExerciseRequest) => {
    setSelectedRequest(request)
    setAdminNotes(request.admin_notes || '')
    setDetailDialogOpen(true)
  }

  const handleResolveRequest = async () => {
    if (!selectedRequest) return

    setResolving(true)
    try {
      const { error } = await supabase
        .from('exercise_requests')
        .update({
          status: 'resolved',
          admin_notes: adminNotes || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id)

      if (error) throw error

      toast.success('Request marked as resolved!')
      setDetailDialogOpen(false)
      fetchData()
    } catch (err) {
      console.error('Error resolving request:', err)
      toast.error('Failed to resolve request')
    } finally {
      setResolving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading...</div>
        </div>
      </AdminLayout>
    )
  }

  const userCount = users.filter(u => u.role === 'user').length
  const ownerCount = users.filter(u => u.role === 'owner').length

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="font-mono text-muted-foreground">
            Manage your gym app
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-primary" />
              <span className="font-mono text-muted-foreground">Total Users</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">{userCount}</p>
          </div>

          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Dumbbell className="w-6 h-6 text-secondary" />
              <span className="font-mono text-muted-foreground">Owners</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">{ownerCount}</p>
          </div>

          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-6 h-6 text-orange-500" />
              <span className="font-mono text-muted-foreground">Pending Requests</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">{pendingRequests.length}</p>
          </div>
        </div>

        {/* Pending Requests Section */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Pending Exercise Requests</h2>
            </div>
            {pendingRequests.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono font-bold">Action Required</span>
              </div>
            )}
          </div>

          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-4 p-4 bg-muted rounded-xl"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: request.users?.avatar_color || '#FF6B6B' }}
                  >
                    {request.users?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-foreground">{request.users?.name || 'Unknown User'}</p>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(request.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono line-clamp-2">
                      {request.request_text}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => handleViewRequest(request)}
                    size="sm"
                    className="neo-button font-mono"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">All caught up!</h3>
              <p className="font-mono text-muted-foreground">
                No pending exercise requests
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/admin/exercises')}
            variant="outline"
            className="neo-button font-mono"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
          <Button
            onClick={() => router.push('/admin/users')}
            variant="outline"
            className="neo-button font-mono"
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Users
          </Button>
        </div>
      </div>

      {/* Request Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="neo-card bg-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bold text-2xl flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Exercise Request
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: selectedRequest.users?.avatar_color || '#FF6B6B' }}
                >
                  {selectedRequest.users?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-bold text-foreground">{selectedRequest.users?.name || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Requested {formatDate(selectedRequest.created_at)}
                  </p>
                </div>
              </div>

              {/* Request Text */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                  Request Details
                </label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-foreground font-mono whitespace-pre-wrap">
                    {selectedRequest.request_text}
                  </p>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                  Admin Notes (Optional)
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about how you handled this request..."
                  className="neo-input min-h-[80px]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setDetailDialogOpen(false)}
                  variant="outline"
                  className="flex-1 neo-button font-mono"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={() => router.push('/admin/exercises')}
                  variant="outline"
                  className="flex-1 neo-button font-mono"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
                </Button>
                <Button
                  onClick={handleResolveRequest}
                  disabled={resolving}
                  className="flex-1 neo-button bg-green-600 hover:bg-green-700 text-white font-mono"
                >
                  {resolving ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Resolve
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
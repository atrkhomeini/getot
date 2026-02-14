'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { Users, Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type User = Database['public']['Tables']['users']['Row']
type Exercise = Database['public']['Tables']['exercises']['Row']

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    avatar_color: '#FF6B6B',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, exercisesRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('exercises').select('*'),
      ])

      if (usersRes.error) throw usersRes.error
      if (exercisesRes.error) throw exercisesRes.error

      setUsers(usersRes.data || [])
      setExercises(exercisesRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setIsEditing(false)
    setFormData({ name: '', password: '', avatar_color: '#FF6B6B' })
    setDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setIsEditing(true)
    setSelectedUser(user)
    setFormData({
      name: user.name,
      password: user.password,
      avatar_color: user.avatar_color,
    })
    setDialogOpen(true)
  }

  const handleSaveUser = async () => {
    try {
      if (isEditing && selectedUser) {
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            password: formData.password,
            avatar_color: formData.avatar_color,
          })
          .eq('id', selectedUser.id)

        if (error) throw error
        toast.success('User updated successfully!')
      } else {
        const { error } = await supabase.from('users').insert({
          name: formData.name,
          password: formData.password,
          role: 'user',
          avatar_color: formData.avatar_color,
        })

        if (error) throw error
        toast.success('User created successfully!')
      }

      setDialogOpen(false)
      fetchData()
    } catch (err) {
      console.error('Error saving user:', err)
      toast.error('Failed to save user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId)
      if (error) throw error
      toast.success('User deleted successfully!')
      fetchData()
    } catch (err) {
      console.error('Error deleting user:', err)
      toast.error('Failed to delete user')
    }
  }

  const handleViewUserSchedule = (user: User) => {
    // For now, redirect to exercises page
    // In a full implementation, this would show the user's specific schedule
    router.push('/admin/exercises')
  }

  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#DDA0DD', '#FF8C42', '#A8E6CF', '#FFD93D']

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading users...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Manage Users
            </h1>
            <p className="font-mono text-muted-foreground">
              Add, edit, and manage gym users
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleAddUser}
                className="neo-button bg-primary text-primary-foreground font-bold font-mono"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="neo-card bg-card">
              <DialogHeader>
                <DialogTitle className="font-bold text-2xl">
                  {isEditing ? 'Edit User' : 'Add New User'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="neo-input"
                    placeholder="Enter user name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="neo-input"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Avatar Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, avatar_color: color })}
                        className={`w-10 h-10 rounded-lg border-3 transition-all ${
                          formData.avatar_color === color ? 'scale-110 border-foreground' : 'border-border'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setDialogOpen(false)}
                    variant="outline"
                    className="flex-1 neo-button font-mono"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveUser}
                    className="flex-1 neo-button bg-primary text-primary-foreground font-mono"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users
            .filter((u) => u.role === 'user')
            .map((user) => (
              <div key={user.id} className="neo-card bg-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: user.avatar_color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{user.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">
                        ID: {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleViewUserSchedule(user)}
                    size="sm"
                    className="flex-1 neo-button bg-secondary text-secondary-foreground font-mono text-sm"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                  <Button
                    onClick={() => handleEditUser(user)}
                    size="sm"
                    variant="outline"
                    className="neo-button font-mono text-sm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteUser(user.id)}
                    size="sm"
                    variant="outline"
                    className="neo-button text-destructive font-mono text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>

        {users.filter((u) => u.role === 'user').length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No users yet</h3>
            <p className="font-mono text-muted-foreground mb-4">
              Add your first gym user to get started
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

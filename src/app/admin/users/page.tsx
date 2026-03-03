'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { Users, Plus, Edit, Trash2, Save, X, Upload, Image as ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type User = Database['public']['Tables']['users']['Row'] & {
  welcome_texts?: string[]
  welcome_image_url?: string | null
  avatar_image_url?: string | null
}

const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#DDA0DD', '#FF8C42', '#A8E6CF', '#FFD93D']

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingWelcome, setUploadingWelcome] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const welcomeInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    avatar_color: '#FF6B6B',
    welcome_texts: ['Welcome!', "Let's get strong!", 'Time to crush it!'],
    welcome_image_url: '',
    avatar_image_url: '',
  })

  const [welcomeInput, setWelcomeInput] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setIsEditing(false)
    setSelectedUser(null)
    setFormData({
      name: '',
      password: '',
      avatar_color: '#FF6B6B',
      welcome_texts: ['Welcome!', "Let's get strong!", 'Time to crush it!'],
      welcome_image_url: '',
      avatar_image_url: '',
    })
    setWelcomeInput('')
    setDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setIsEditing(true)
    setSelectedUser(user)
    setFormData({
      name: user.name,
      password: user.password,
      avatar_color: user.avatar_color,
      welcome_texts: user.welcome_texts || ['Welcome!', "Let's get strong!", 'Time to crush it!'],
      welcome_image_url: user.welcome_image_url || '',
      avatar_image_url: user.avatar_image_url || '',
    })
    setWelcomeInput('')
    setDialogOpen(true)
  }

  const handleAddWelcomeText = () => {
    if (!welcomeInput.trim()) return
    if (formData.welcome_texts.length >= 5) {
      toast.error('Maximum 5 welcome messages allowed')
      return
    }
    setFormData({
      ...formData,
      welcome_texts: [...formData.welcome_texts, welcomeInput.trim()],
    })
    setWelcomeInput('')
  }

  const handleRemoveWelcomeText = (index: number) => {
    setFormData({
      ...formData,
      welcome_texts: formData.welcome_texts.filter((_, i) => i !== index),
    })
  }

  // Upload Avatar Image (shown in user grid)
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatars/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)

      setFormData({ ...formData, avatar_image_url: urlData.publicUrl })
      toast.success('Profile image uploaded!')
    } catch (err: any) {
      console.error('Error uploading avatar:', err)
      toast.error(err?.message || 'Failed to upload')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Upload Welcome Image (shown only in login typewriter)
  const handleWelcomeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setUploadingWelcome(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `welcome/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)

      setFormData({ ...formData, welcome_image_url: urlData.publicUrl })
      toast.success('Welcome image uploaded!')
    } catch (err: any) {
      console.error('Error uploading welcome image:', err)
      toast.error(err?.message || 'Failed to upload')
    } finally {
      setUploadingWelcome(false)
    }
  }

  const handleSaveUser = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formData.password.trim()) {
      toast.error('Password is required')
      return
    }

    setSaving(true)
    try {
      if (isEditing && selectedUser) {
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            password: formData.password,
            avatar_color: formData.avatar_color,
            welcome_texts: formData.welcome_texts,
            welcome_image_url: formData.welcome_image_url || null,
            avatar_image_url: formData.avatar_image_url || null,
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
          welcome_texts: formData.welcome_texts,
          welcome_image_url: formData.welcome_image_url || null,
          avatar_image_url: formData.avatar_image_url || null,
        })

        if (error) throw error
        toast.success('User created successfully!')
      }

      setDialogOpen(false)
      fetchUsers()
    } catch (err: any) {
      console.error('Error saving user:', err)
      toast.error(err?.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId)
      if (error) throw error
      toast.success('User deleted successfully!')
      fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      toast.error('Failed to delete user')
    }
  }

  const handleViewSchedule = (user: User) => {
    router.push(`/admin/sequence?user=${user.id}`)
  }

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
              Add and manage gym users
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
            <DialogContent className="neo-card bg-card max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-bold text-2xl">
                  {isEditing ? 'Edit User' : 'Add New User'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Name */}
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

                {/* Password */}
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

                {/* Avatar Color */}
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

                {/* Profile/Avatar Image (shown in user grid) */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Profile Image (Shown in User Grid)
                  </label>
                  
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  
                  {formData.avatar_image_url ? (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <img 
                        src={formData.avatar_image_url} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-mono text-foreground">Profile image</p>
                        <p className="text-xs text-muted-foreground font-mono">Shown in user cards</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, avatar_image_url: '' })}
                        className="text-destructive hover:text-red-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="w-full p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center gap-2"
                    >
                      {uploadingAvatar ? (
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm font-mono text-muted-foreground">Upload profile image</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Welcome Image (shown only in login typewriter) */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Welcome Image (Private - Login Screen Only)
                  </label>
                  
                  <input
                    ref={welcomeInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWelcomeUpload}
                    className="hidden"
                  />
                  
                  {formData.welcome_image_url ? (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <img 
                        src={formData.welcome_image_url} 
                        alt="Welcome" 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-mono text-foreground">Welcome image</p>
                        <p className="text-xs text-muted-foreground font-mono">Shown only at login</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, welcome_image_url: '' })}
                        className="text-destructive hover:text-red-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => welcomeInputRef.current?.click()}
                      disabled={uploadingWelcome}
                      className="w-full p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center gap-2"
                    >
                      {uploadingWelcome ? (
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm font-mono text-muted-foreground">Upload welcome image (private)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Welcome Messages */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Welcome Messages (Typewriter Effect)
                  </label>
                  <div className="space-y-2 mb-2">
                    {formData.welcome_texts.map((text, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <span className="flex-1 text-sm font-mono text-foreground">{text}</span>
                        <button
                          onClick={() => handleRemoveWelcomeText(index)}
                          className="text-destructive hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={welcomeInput}
                      onChange={(e) => setWelcomeInput(e.target.value)}
                      className="neo-input flex-1"
                      placeholder="Add a welcome message..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddWelcomeText()
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddWelcomeText}
                      variant="outline"
                      size="sm"
                      className="neo-button font-mono"
                      disabled={!welcomeInput.trim() || formData.welcome_texts.length >= 5}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formData.welcome_texts.length}/5 messages
                  </p>
                </div>

                {/* Actions */}
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
                    disabled={saving}
                    className="flex-1 neo-button bg-primary text-primary-foreground font-mono"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
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
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white overflow-hidden"
                      style={{ backgroundColor: user.avatar_color }}
                    >
                      {user.avatar_image_url ? (
                        <img 
                          src={user.avatar_image_url} 
                          alt={user.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{user.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">
                        {user.welcome_texts?.length || 0} welcome messages
                      </p>
                    </div>
                  </div>
                </div>

                {/* Welcome Preview */}
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Welcome messages:</p>
                  <div className="flex flex-wrap gap-1">
                    {(user.welcome_texts || []).slice(0, 3).map((text, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-background rounded text-foreground font-mono">
                        {text}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleViewSchedule(user)}
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
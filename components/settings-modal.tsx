"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, User, Lock, Trash2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  profile: any
}

export function SettingsModal({ isOpen, onClose, user, profile }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'account'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Profile form state
  const [displayName, setDisplayName] = useState(profile?.full_name || '')
  const [email, setEmail] = useState(profile?.email || user?.email || '')
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const router = useRouter()
  const supabase = createClient()

  if (!isOpen) return null

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      setSuccess('Profile updated successfully!')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      setSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Delete user sessions
      const { error: sessionsError } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)

      if (sessionsError) console.warn('Error deleting sessions:', sessionsError)

      // Delete conversations
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id)

      if (conversationsError) console.warn('Error deleting conversations:', conversationsError)

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      if (profileError) throw profileError

      // Sign out and redirect
      await supabase.auth.signOut()
      router.push('/')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const tabButtons = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'password', label: 'Password', icon: Lock },
    { key: 'account', label: 'Account', icon: Trash2 },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl text-gray-900">Account Settings</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
              <nav className="space-y-2">
                {tabButtons.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveTab(key as any)
                      setError(null)
                      setSuccess(null)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeTab === key
                        ? 'bg-purple-100 text-purple-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {activeTab === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="bg-gray-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        minLength={6}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              )}

              {activeTab === 'account' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h3>
                  
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                      <p className="text-sm text-red-700 mb-4">
                        This action cannot be undone. This will permanently delete your account and all associated data including conversation history and training progress.
                      </p>
                      
                      <ConfirmDialog
                        title="Delete Account"
                        description="Are you absolutely sure? This action cannot be undone and will permanently delete your account and all data."
                        onConfirm={handleDeleteAccount}
                        confirmText="Delete Account"
                        cancelText="Cancel"
                        variant="destructive"
                      >
                        <Button variant="destructive" disabled={isLoading}>
                          {isLoading ? 'Deleting...' : 'Delete Account'}
                        </Button>
                      </ConfirmDialog>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

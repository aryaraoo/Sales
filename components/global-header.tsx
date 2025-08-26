"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Settings, User, Bell, HelpCircle } from "lucide-react"
import { SettingsModal } from "@/components/settings-modal"
import { createClient } from "@/lib/supabase/client"

interface GlobalHeaderProps {
  title?: string
  showSettings?: boolean
}

export function GlobalHeader({ title = "Professional Sales Training", showSettings = true }: GlobalHeaderProps) {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      }
    }
    fetchUserData()
  }, [supabase])

  if (!user || !showSettings) return null

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500">
                {profile?.email || user.email}
              </p>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSettingsModal(true)}
              className="text-gray-500 hover:text-gray-700"
              title="Account Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        profile={profile}
      />
    </>
  )
}

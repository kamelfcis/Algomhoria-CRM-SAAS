'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useThemeStore } from '@/store/theme-store'
import { useLanguageStore } from '@/store/language-store'
import { useTranslations } from '@/hooks/use-translations'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import {
  Moon,
  Sun,
  LogOut,
  User,
  Globe,
  Menu,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function Navbar() {
  const router = useRouter()
  const t = useTranslations()
  const { user, profile, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const { language, setLanguage } = useLanguageStore()
  const { toggleSidebar } = useUIStore()

  const handleLogout = async () => {
    try {
      // Log logout activity before signing out
      if (user && profile) {
        await ActivityLogger.logout(user.id, profile.email || user.email || '')
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      logout()
      router.push('/auth/login')
      // Clear any cached data
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      // Still proceed with logout even if logging fails
      const supabase = createClient()
      await supabase.auth.signOut()
      logout()
      router.push('/auth/login')
    }
  }

  return (
    <div className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      {/* Left side - Mobile menu button and controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Language Switcher */}
        <Select value={language} onValueChange={(value: 'en' | 'ar') => setLanguage(value)}>
          <SelectTrigger className="w-[100px] sm:w-[120px]">
            <Globe className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t('settings.english')}</SelectItem>
            <SelectItem value="ar">{t('settings.arabic')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const newTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
            setTheme(newTheme)
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Right side - User info and logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm">
            <div className="font-medium truncate max-w-[150px]">{profile?.name || user?.email}</div>
            <div className="text-xs text-muted-foreground">{profile?.role}</div>
          </div>
        </div>
        {/* Mobile: Show only user icon */}
        <div className="sm:hidden">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}


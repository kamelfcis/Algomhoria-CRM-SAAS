'use client'

import { useEffect, useState, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useThemeStore } from '@/store/theme-store'
import { useLanguageStore } from '@/store/language-store'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import {
  Moon,
  Sun,
  LogOut,
  User,
  Menu,
} from 'lucide-react'

// Flag Icon Components
const EnglishFlag = ({ className = "" }: { className?: string }) => (
  <svg width="16" height="12" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={`rounded-sm ${className}`}>
    <rect width="24" height="18" fill="#012169" rx="1"/>
    <path d="M0 0L24 18M24 0L0 18" stroke="white" strokeWidth="2.4"/>
    <path d="M0 0L24 18M24 0L0 18" stroke="#C8102E" strokeWidth="1.6"/>
    <path d="M12 0V18M0 9H24" stroke="white" strokeWidth="3.2"/>
    <path d="M12 0V18M0 9H24" stroke="#C8102E" strokeWidth="2.4"/>
  </svg>
)

const EgyptianFlag = ({ className = "" }: { className?: string }) => (
  <svg width="16" height="12" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={`rounded-sm ${className}`}>
    {/* Red stripe */}
    <rect width="24" height="6" fill="#CE1126" rx="1"/>
    {/* White stripe */}
    <rect y="6" width="24" height="6" fill="#FFFFFF" rx="0"/>
    {/* Black stripe */}
    <rect y="12" width="24" height="6" fill="#000000" rx="1"/>
    {/* Simplified Eagle of Saladin in center */}
    <circle cx="12" cy="9" r="2.5" fill="#C8102E" opacity="0.8"/>
    <path d="M10.5 8.5L12 7L13.5 8.5L12 10L10.5 8.5Z" fill="#FFD700"/>
  </svg>
)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function NavbarComponent() {
  const router = useRouter()
  const t = useTranslations()
  const { user, profile, logout } = useAuthStore()
  const { theme, setTheme, getResolvedTheme } = useThemeStore()
  const { language, setLanguage } = useLanguageStore()
  const { toggleSidebar } = useUIStore()
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    setIsDark(getResolvedTheme() === 'dark')
    
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [theme, getResolvedTheme])

  const handleLogout = useCallback(async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      logout()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      const supabase = createClient()
      await supabase.auth.signOut()
      logout()
      router.push('/auth/login')
    }
  }, [logout, router, user, profile])

  return (
    <div 
      className="flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur-xl px-4 sm:px-6 relative"
      style={{
        borderColor: 'rgba(250, 199, 8, 0.2)',
        background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        boxShadow: isDark ? '0 2px 10px rgba(250, 199, 8, 0.2)' : '0 2px 10px rgba(250, 199, 8, 0.1)',
      }}
    >
      {/* Gold accent line */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: 'linear-gradient(90deg, #fac708, #d19c15, #af7818)',
        }}
      />
      {/* Left side - Logo and controls */}
      <div className={cn(
        "flex items-center gap-2 sm:gap-4",
        language === 'ar' ? 'flex-row-reverse' : ''
      )}>
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10">
            <Image
              src="/logo.png"
              alt="ALGOMHORIA Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Language Switcher */}
        <Select value={language} onValueChange={(value: 'en' | 'ar') => setLanguage(value)}>
          <SelectTrigger className="w-[100px] sm:w-[120px]">
            <SelectValue style={{ display: 'none' }} />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {language === 'en' ? <EnglishFlag className="h-4 w-auto flex-shrink-0" /> : <EgyptianFlag className="h-4 w-auto flex-shrink-0" />}
              <span className="flex-1 text-left truncate lg:hidden">
                {language === 'en' ? t('settings.english') : t('settings.arabic')}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">
              {t('settings.english')}
            </SelectItem>
            <SelectItem value="ar">
              {t('settings.arabic')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // Toggle directly between light and dark, skipping system
            const currentResolved = getResolvedTheme()
            const newTheme = currentResolved === 'dark' ? 'light' : 'dark'
            setTheme(newTheme)
          }}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Right side - User info, logout, and Mobile Menu Button */}
      <div className={cn(
        "flex items-center gap-2 sm:gap-4",
        language === 'ar' ? 'flex-row-reverse' : ''
      )}>
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

        {/* Mobile Menu Button - Show on right in Arabic (via flex-row-reverse), left in English */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

// Memoize navbar to prevent unnecessary re-renders
export const Navbar = memo(NavbarComponent)


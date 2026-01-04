'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/hooks/use-translations'
import { useLanguageStore } from '@/store/language-store'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { X, ChevronDown, ChevronRight, ChevronLeft, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  FileText,
  Folder,
  Home,
  MessageSquare,
  UserCircle,
  Image as ImageIcon,
  UsersRound,
  Mail,
  FolderKanban,
  Briefcase,
  CalendarCheck,
  Building2,
  MapPin,
  Map,
  Wrench,
  CreditCard,
  Eye,
  Paintbrush,
  Layers,
  Navigation,
  Star,
  History,
  Database,
} from 'lucide-react'

type NavigationItem = {
  name: string
  href?: string
  icon: any
  roles?: string[]
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  {
    name: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'users',
    href: '/dashboard/users',
    icon: Users,
  },
  {
    name: 'news',
    icon: Newspaper,
    children: [
      {
        name: 'posts',
        href: '/dashboard/posts',
        icon: FileText,
      },
      {
        name: 'postGallery',
        href: '/dashboard/post-gallery',
        icon: ImageIcon,
      },
      {
        name: 'categories',
        href: '/dashboard/categories',
        icon: Folder,
      },
    ],
  },
  {
    name: 'projectsData',
    icon: FolderKanban,
    children: [
      {
        name: 'featuredAreas',
        href: '/dashboard/featured-areas',
        icon: Star,
      },
      {
        name: 'projectCategories',
        href: '/dashboard/project-categories',
        icon: FolderKanban,
      },
      {
        name: 'projects',
        href: '/dashboard/projects',
        icon: Briefcase,
      },
    ],
  },
  {
    name: 'masterData',
    icon: Database,
    children: [
      {
        name: 'propertyFacilities',
        href: '/dashboard/property-facilities',
        icon: Wrench,
      },
      {
        name: 'propertyViewTypes',
        href: '/dashboard/property-view-types',
        icon: Eye,
      },
      {
        name: 'propertyServices',
        href: '/dashboard/property-services',
        icon: Wrench,
      },
      {
        name: 'propertyFinishingTypes',
        href: '/dashboard/property-finishing-types',
        icon: Paintbrush,
      },
      {
        name: 'propertyTypes',
        href: '/dashboard/property-types',
        icon: Building2,
      },
      {
        name: 'paymentMethods',
        href: '/dashboard/payment-methods',
        icon: CreditCard,
      },
      {
        name: 'governorates',
        href: '/dashboard/governorates',
        icon: Map,
      },
      {
        name: 'areas',
        href: '/dashboard/areas',
        icon: MapPin,
      },
      {
        name: 'streets',
        href: '/dashboard/streets',
        icon: Navigation,
      },
      {
        name: 'sections',
        href: '/dashboard/sections',
        icon: Layers,
      },
    ],
  },
  {
    name: 'propertyManagement',
    icon: Building2,
    children: [
      {
        name: 'properties',
        href: '/dashboard/properties',
        icon: Home,
      },
      {
        name: 'propertyOwners',
        href: '/dashboard/property-owners',
        icon: UserCircle,
      },
      {
        name: 'propertyImages',
        href: '/dashboard/property-images',
        icon: ImageIcon,
      },
      {
        name: 'propertyComments',
        href: '/dashboard/property-comments',
        icon: MessageSquare,
      },
      {
        name: 'bookings',
        href: '/dashboard/bookings',
        icon: CalendarCheck,
      },
    ],
  },
  {
    name: 'leads',
    icon: MessageSquare,
    children: [
      {
        name: 'leads',
        href: '/dashboard/leads',
        icon: MessageSquare,
      },
      {
        name: 'directLeads',
        href: '/dashboard/direct-leads',
        icon: MessageSquare,
      },
    ],
  },
  {
    name: 'sliders',
    href: '/dashboard/sliders',
    icon: ImageIcon,
  },
  {
    name: 'teamUsers',
    href: '/dashboard/team-users',
    icon: UsersRound,
  },
  {
    name: 'newsletter',
    href: '/dashboard/newsletter',
    icon: Mail,
  },
  {
    name: 'roles',
    href: '/dashboard/roles',
    icon: Shield,
  },
  {
    name: 'settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    name: 'activityLogs',
    href: '/dashboard/activity-logs',
    icon: History,
    roles: ['admin'], // Only admins can see this
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    // Watch for class changes on document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [])

  // Filter navigation based on user role - memoized for performance
  const filteredNavigation = useMemo(() => {
    const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
      return items
        .map((item) => {
          if (item.roles && profile) {
            if (!item.roles.includes(profile.role)) {
              return null
            }
          }
          if (item.children) {
            const filteredChildren = filterNavigation(item.children)
            if (filteredChildren.length === 0) {
              return null
            }
            return { ...item, children: filteredChildren }
          }
          return item
        })
        .filter((item): item is NavigationItem => item !== null)
    }
    return filterNavigation(navigation)
  }, [profile])

  // Auto-expand submenus when navigating to a page within them - optimized
  useEffect(() => {
    const menuItems = ['news', 'masterData', 'projectsData', 'leads', 'propertyManagement']
    
    setExpandedMenus((prev) => {
      const newSet = new Set(prev)
      let hasChanges = false
      
      menuItems.forEach((menuName) => {
        const menu = navigation.find((item) => item.name === menuName)
        if (menu?.children) {
          const childPaths = menu.children
            .map((child) => child.href)
            .filter((href): href is string => href !== undefined)
          
          const isOnMenuPage = childPaths.some((href) => pathname === href)
          
          if (isOnMenuPage && !newSet.has(menuName)) {
            newSet.add(menuName)
            hasChanges = true
          }
        }
      })
      
      return hasChanges ? newSet : prev
    })
  }, [pathname])

  const toggleMenu = useCallback((menuName: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(menuName)) {
        newSet.delete(menuName)
      } else {
        newSet.add(menuName)
      }
      return newSet
    })
  }, [])

  // Handle window resize - close sidebar on mobile when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true) // Always open on desktop
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Check on mount

    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [pathname, setSidebarOpen])

  const handleLinkClick = useCallback(() => {
    // Close sidebar on mobile when link is clicked
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [])

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 z-50 flex h-full w-72 flex-col bg-card/80 backdrop-blur-xl transition-transform duration-300 ease-in-out',
          language === 'ar' ? 'rtl border-l' : 'ltr border-r',
          sidebarOpen
            ? 'translate-x-0'
            : language === 'ar'
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        style={{
          borderColor: 'rgba(250, 199, 8, 0.2)',
          background: isDark 
            ? 'rgba(0, 0, 0, 0.9)' 
            : 'rgba(255, 255, 255, 0.95)',
          boxShadow: isDark
            ? language === 'ar' 
              ? '-2px 0 10px rgba(250, 199, 8, 0.2)'
              : '2px 0 10px rgba(250, 199, 8, 0.2)'
            : language === 'ar'
            ? '-2px 0 10px rgba(250, 199, 8, 0.1)'
            : '2px 0 10px rgba(250, 199, 8, 0.1)',
        }}
      >
        {/* Header */}
        <div 
          className="flex h-16 items-center justify-between border-b px-6 relative"
          style={{
            borderColor: 'rgba(250, 199, 8, 0.2)',
          }}
        >
          <div className={cn(
            "flex items-center gap-2",
            language === 'ar' ? 'order-2' : 'order-1'
          )}>
            <div className="relative w-8 h-8">
              <Image
                src="/logo.png"
                alt="ALGOMHORIA Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h2 
              className="text-lg font-bold"
              style={{
                background: 'linear-gradient(135deg, #fac708, #d19c15, #af7818)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('common.appName')}
            </h2>
          </div>
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "lg:hidden h-8 w-8",
              language === 'ar' ? 'order-1' : 'order-2'
            )}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {filteredNavigation.map((item) => {
            if (item.children) {
              const isExpanded = expandedMenus.has(item.name)
              const hasActiveChild = item.children.some(
                (child) => child.href && pathname === child.href
              )
              
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      hasActiveChild
                        ? 'bg-gradient-to-r from-gold-light/20 to-gold-dark/20 text-gold-dark dark:text-gold-light border border-gold-dark/30 dark:border-gold-light/30'
                        : 'text-muted-foreground hover:bg-gold-light/10 hover:text-gold-dark dark:hover:text-gold-light'
                    )}
                    style={hasActiveChild ? {
                      boxShadow: '0 2px 8px rgba(250, 199, 8, 0.2)',
                    } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                        hasActiveChild 
                          ? "text-gold-dark dark:text-gold-light" 
                          : "text-gold/70 dark:text-gold-light/70 hover:text-gold-dark dark:hover:text-gold-light"
                      )} />
                      <span className="flex-1 min-w-0 break-words">{t(`navigation.${item.name}`)}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      language === 'ar' ? (
                        <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )
                    )}
                  </button>
                  {isExpanded && (
                    <div className={cn(
                      "mt-1 space-y-1",
                      language === 'ar' 
                        ? "mr-4 border-r pr-4" 
                        : "ml-4 border-l pl-4"
                    )}>
                      {item.children.map((child) => {
                        const isActive = pathname === child.href
                        return (
                          <Link
                            key={child.name}
                            href={child.href!}
                            prefetch={true}
                            onClick={handleLinkClick}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-normal',
                              isActive
                                ? 'bg-gradient-to-r from-gold-light to-gold text-white border border-gold-dark/30'
                                : 'text-muted-foreground hover:bg-gold-light/10 hover:text-gold-dark dark:hover:text-gold-light'
                            )}
                            style={isActive ? {
                              boxShadow: '0 2px 8px rgba(250, 199, 8, 0.3)',
                            } : {}}
                          >
                            <child.icon className={cn(
                              "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                              isActive 
                                ? "text-white" 
                                : "text-gold/70 dark:text-gold-light/70 hover:text-gold-dark dark:hover:text-gold-light"
                            )} />
                            <span className="flex-1 min-w-0 break-words">{t(`navigation.${child.name}`)}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href!}
                prefetch={true}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-normal',
                  isActive
                    ? 'bg-gradient-to-r from-gold-light to-gold text-white border border-gold-dark/30'
                    : 'text-muted-foreground hover:bg-gold-light/10 hover:text-gold-dark dark:hover:text-gold-light'
                )}
                style={isActive ? {
                  boxShadow: '0 2px 8px rgba(250, 199, 8, 0.3)',
                } : {}}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                  isActive 
                    ? "text-white" 
                    : "text-gold/70 dark:text-gold-light/70 hover:text-gold-dark dark:hover:text-gold-light"
                )} />
                <span className="flex-1 min-w-0 break-words">{t(`navigation.${item.name}`)}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}


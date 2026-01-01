'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/hooks/use-translations'
import { useLanguageStore } from '@/store/language-store'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { X, ChevronDown, ChevronRight, Newspaper } from 'lucide-react'
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
  Image,
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
        icon: Image,
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
    name: 'properties',
    href: '/dashboard/properties',
    icon: Home,
  },
  {
    name: 'propertyImages',
    href: '/dashboard/property-images',
    icon: Image,
  },
  {
    name: 'leads',
    href: '/dashboard/leads',
    icon: MessageSquare,
  },
  {
    name: 'leadsAssignments',
    href: '/dashboard/leads-assignments',
    icon: MessageSquare,
  },
  {
    name: 'propertyOwners',
    href: '/dashboard/property-owners',
    icon: UserCircle,
  },
  {
    name: 'sliders',
    href: '/dashboard/sliders',
    icon: Image,
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
    name: 'bookings',
    href: '/dashboard/bookings',
    icon: CalendarCheck,
  },
  {
    name: 'propertyComments',
    href: '/dashboard/property-comments',
    icon: MessageSquare,
  },
  {
    name: 'paymentMethods',
    href: '/dashboard/payment-methods',
    icon: CreditCard,
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

  // Auto-expand submenus when navigating to a page within them
  useEffect(() => {
    const menuItems = ['news', 'masterData', 'projectsData']
    
    menuItems.forEach((menuName) => {
      const menu = navigation.find((item) => item.name === menuName)
      if (menu?.children) {
        const childPaths = menu.children
          .map((child) => child.href)
          .filter((href): href is string => href !== undefined)
        
        const isOnMenuPage = childPaths.some((href) => pathname === href)
        
        if (isOnMenuPage) {
          setExpandedMenus((prev) => {
            const newSet = new Set(prev)
            newSet.add(menuName)
            return newSet
          })
        }
      }
    })
  }, [pathname])

  // Filter navigation based on user role
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

  const filteredNavigation = filterNavigation(navigation)

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(menuName)) {
        newSet.delete(menuName)
      } else {
        newSet.add(menuName)
      }
      return newSet
    })
  }

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

  const handleLinkClick = () => {
    // Close sidebar on mobile when link is clicked
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

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
          'fixed lg:static inset-y-0 z-50 flex h-full w-64 flex-col border-r bg-card transition-transform duration-300 ease-in-out',
          language === 'ar' ? 'rtl' : 'ltr',
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold">{t('common.appName')}</h2>
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
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
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      hasActiveChild
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{t(`navigation.${item.name}`)}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-4 space-y-1 border-l pl-4">
                      {item.children.map((child) => {
                        const isActive = pathname === child.href
                        return (
                          <Link
                            key={child.name}
                            href={child.href!}
                            onClick={handleLinkClick}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <child.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{t(`navigation.${child.name}`)}</span>
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
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{t(`navigation.${item.name}`)}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}


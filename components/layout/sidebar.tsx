'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/hooks/use-translations'
import { useLanguageStore } from '@/store/language-store'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { X, ChevronDown, ChevronRight, ChevronLeft, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissionsStore } from '@/store/permissions-store'
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
  permissionResource?: string // Resource name for permission check (e.g., 'categories', 'posts')
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  {
    name: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permissionResource: 'dashboard',
  },
  {
    name: 'news',
    icon: Newspaper,
    children: [
      {
        name: 'posts',
        href: '/dashboard/posts',
        icon: FileText,
        permissionResource: 'posts',
      },
      {
        name: 'postGallery',
        href: '/dashboard/post-gallery',
        icon: ImageIcon,
        permissionResource: 'post_gallery',
      },
      {
        name: 'categories',
        href: '/dashboard/categories',
        icon: Folder,
        permissionResource: 'categories',
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
        permissionResource: 'featured_areas',
      },
      {
        name: 'projectCategories',
        href: '/dashboard/project-categories',
        icon: FolderKanban,
        permissionResource: 'project_categories',
      },
      {
        name: 'projects',
        href: '/dashboard/projects',
        icon: Briefcase,
        permissionResource: 'projects',
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
        permissionResource: 'property_facilities',
      },
      {
        name: 'propertyViewTypes',
        href: '/dashboard/property-view-types',
        icon: Eye,
        permissionResource: 'property_view_types',
      },
      {
        name: 'propertyServices',
        href: '/dashboard/property-services',
        icon: Wrench,
        permissionResource: 'property_services',
      },
      {
        name: 'propertyFinishingTypes',
        href: '/dashboard/property-finishing-types',
        icon: Paintbrush,
        permissionResource: 'property_finishing_types',
      },
      {
        name: 'propertyTypes',
        href: '/dashboard/property-types',
        icon: Building2,
        permissionResource: 'property_types',
      },
      {
        name: 'paymentMethods',
        href: '/dashboard/payment-methods',
        icon: CreditCard,
        permissionResource: 'payment_methods',
      },
      {
        name: 'governorates',
        href: '/dashboard/governorates',
        icon: Map,
        permissionResource: 'governorates',
      },
      {
        name: 'areas',
        href: '/dashboard/areas',
        icon: MapPin,
        permissionResource: 'areas',
      },
      {
        name: 'streets',
        href: '/dashboard/streets',
        icon: Navigation,
        permissionResource: 'streets',
      },
      {
        name: 'sections',
        href: '/dashboard/sections',
        icon: Layers,
        permissionResource: 'sections',
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
        permissionResource: 'properties',
      },
      {
        name: 'propertyOwners',
        href: '/dashboard/property-owners',
        icon: UserCircle,
        permissionResource: 'property_owners',
      },
      {
        name: 'propertyImages',
        href: '/dashboard/property-images',
        icon: ImageIcon,
        permissionResource: 'property_images',
      },
      {
        name: 'propertyComments',
        href: '/dashboard/property-comments',
        icon: MessageSquare,
        permissionResource: 'property_comments',
      },
      {
        name: 'bookings',
        href: '/dashboard/bookings',
        icon: CalendarCheck,
        permissionResource: 'bookings',
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
        permissionResource: 'leads',
      },
      {
        name: 'directLeads',
        href: '/dashboard/direct-leads',
        icon: MessageSquare,
        permissionResource: 'direct_leads',
      },
    ],
  },
  {
    name: 'sliders',
    href: '/dashboard/sliders',
    icon: ImageIcon,
    permissionResource: 'sliders',
  },
  {
    name: 'teamUsers',
    href: '/dashboard/team-users',
    icon: UsersRound,
    permissionResource: 'team_users',
  },
  {
    name: 'newsletter',
    href: '/dashboard/newsletter',
    icon: Mail,
    permissionResource: 'newsletter',
  },
  {
    name: 'settings',
    icon: Settings,
    children: [
      {
        name: 'users',
        href: '/dashboard/users',
        icon: Users,
        permissionResource: 'users',
      },
      {
        name: 'usersPermissions',
        href: '/dashboard/users-permissions',
        icon: Shield,
        roles: ['admin'], // Only admins can see this
        permissionResource: 'users_permissions',
      },
      {
        name: 'roles',
        href: '/dashboard/roles',
        icon: Shield,
        permissionResource: 'roles',
      },
      {
        name: 'generalSettings',
        href: '/dashboard/settings',
        icon: Settings,
        permissionResource: 'settings',
      },
      {
        name: 'activityLogs',
        href: '/dashboard/activity-logs',
        icon: History,
        permissionResource: 'activity_logs',
      },
    ],
  },
]

// Collect all routes for prefetching
const getAllRoutes = (items: NavigationItem[]): string[] => {
  const routes: string[] = []
  items.forEach(item => {
    if (item.href) routes.push(item.href)
    if (item.children) {
      routes.push(...getAllRoutes(item.children))
    }
  })
  return routes
}

const allRoutes = getAllRoutes(navigation)

function SidebarComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  // Use centralized permissions store
  const { 
    fetchPermissions, 
    hasAnyResourcePermission, 
    isLoading: isLoadingPermissions, 
    isAdmin,
    userId: permissionsUserId 
  } = usePermissionsStore()

  // Fetch permissions when profile changes
  useEffect(() => {
    if (profile?.id && profile.id !== permissionsUserId) {
      fetchPermissions(profile.id)
    }
  }, [profile?.id, fetchPermissions, permissionsUserId])

  // Prefetch all dashboard routes on mount for instant navigation
  useEffect(() => {
    // Prefetch routes after a short delay to not block initial render
    const timer = setTimeout(() => {
      allRoutes.forEach(route => {
        router.prefetch(route)
      })
    }, 100)
    
    return () => clearTimeout(timer)
  }, [router])

  // Check if user has any permissions for a resource
  const hasPermissionForResource = useCallback((resource: string | undefined): boolean => {
    if (!resource) return true // If no resource specified, show it (for backward compatibility)
    if (isLoadingPermissions) return false // Don't show while loading
    
    return hasAnyResourcePermission(resource)
  }, [hasAnyResourcePermission, isLoadingPermissions])

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

  // Filter navigation based on user permissions - memoized for performance
  const filteredNavigation = useMemo(() => {
    const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
      return items
        .map((item) => {
          // Check role-based access (for backward compatibility)
          if (item.roles && profile) {
            // If item requires admin role, check if user is admin
            if (item.roles.includes('admin')) {
              if (!isAdmin) {
                return null
              }
              // If user is admin and item is admin-only, always show it (bypass permission check)
              if (isAdmin) {
                // Continue to check children if any
                if (item.children) {
                  const filteredChildren = filterNavigation(item.children)
                  if (filteredChildren.length === 0) {
                    return null
                  }
                  return { ...item, children: filteredChildren }
                }
                return item
              }
            } else if (!item.roles.includes(profile.role)) {
              return null
            }
          }
          
          // Check permission-based access (skip if admin-only item and user is admin)
          if (item.permissionResource && !(item.roles?.includes('admin') && isAdmin)) {
            if (!hasPermissionForResource(item.permissionResource)) {
              return null
            }
          }
          
          if (item.children) {
            const filteredChildren = filterNavigation(item.children)
            // Hide parent if no children are visible
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
  }, [profile, hasPermissionForResource, isAdmin])

  // Auto-expand submenus when navigating to a page within them - optimized
  useEffect(() => {
    const menuItems = ['news', 'masterData', 'projectsData', 'leads', 'propertyManagement', 'settings']
    
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

// Memoize sidebar to prevent unnecessary re-renders
export const Sidebar = memo(SidebarComponent)


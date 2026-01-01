'use client'

import { useTranslations } from '@/hooks/use-translations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_PERMISSIONS, ROLES } from '@/lib/constants'

export default function RolesPage() {
  const t = useTranslations()

  const roles = [
    {
      name: ROLES.ADMIN,
      description: 'Full access to all features and settings',
      permissions: ROLE_PERMISSIONS[ROLES.ADMIN],
    },
    {
      name: ROLES.MODERATOR,
      description: 'Can view users, dashboard and settings',
      permissions: ROLE_PERMISSIONS[ROLES.MODERATOR],
    },
    {
      name: ROLES.SALES,
      description: 'Can view users and dashboard',
      permissions: ROLE_PERMISSIONS[ROLES.SALES],
    },
    {
      name: ROLES.USER,
      description: 'Can only view dashboard',
      permissions: ROLE_PERMISSIONS[ROLES.USER],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('roles.title')}</h1>
        <p className="text-muted-foreground">{t('roles.description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <CardTitle className="capitalize">{role.name}</CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Permissions:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {role.permissions.map((permission) => (
                    <li key={permission} className="capitalize">
                      {permission.replace(':', ' - ')}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


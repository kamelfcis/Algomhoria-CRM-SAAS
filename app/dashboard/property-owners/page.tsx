'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageSkeleton } from '@/components/ui/page-skeleton'

const propertyOwnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended']),
})

type PropertyOwnerForm = z.infer<typeof propertyOwnerSchema>

interface PropertyOwner {
  id: string
  name: string
  phone_number: string
  email: string | null
  status: string
  last_login_at: string | null
  login_count: number
  created_at: string
}

async function getPropertyOwners() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_owners')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PropertyOwner[]
}

async function createPropertyOwner(ownerData: PropertyOwnerForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_owners')
    .insert({
      ...ownerData,
      email: ownerData.email || null,
      login_count: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updatePropertyOwner(id: string, ownerData: Partial<PropertyOwnerForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_owners')
    .update(ownerData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function checkOwnerHasProperties(ownerId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', ownerId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deletePropertyOwner(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_owners')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PropertyOwnersPage() {
  const t = useTranslations()
  const { toast } = useToast()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState<PropertyOwner | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ownerToDelete, setOwnerToDelete] = useState<PropertyOwner | null>(null)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('property_owners')

  const { data: owners, isLoading } = useQuery({
    queryKey: ['property-owners'],
    queryFn: getPropertyOwners,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createPropertyOwner,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['property-owners'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      if (data?.id) {
        await ActivityLogger.create(
          'property_owner',
          data.id,
          data.name || data.email || 'Untitled Property Owner'
        )
      }
      // Show success message
      const ownerName = data.name || data.email || 'Property Owner'
      const message = t('propertyOwners.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', ownerName) : `Property owner "${ownerName}" has been created successfully.`,
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyOwners.createError') || 'Failed to create property owner. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyOwnerForm> }) =>
      updatePropertyOwner(id, data),
    onSuccess: async (data: any) => {
      const previousOwner = editingOwner
      queryClient.invalidateQueries({ queryKey: ['property-owners'] })
      setIsDialogOpen(false)
      setEditingOwner(null)
      reset()
      // Log activity
      if (previousOwner && data?.id) {
        await ActivityLogger.update(
          'property_owner',
          data.id,
          data.name || data.email || 'Untitled Property Owner',
          previousOwner,
          data
        )
      }
      // Show success message
      const ownerName = data.name || data.email || 'Property Owner'
      const message = t('propertyOwners.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', ownerName) : `Property owner "${ownerName}" has been updated successfully.`,
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyOwners.updateError') || 'Failed to update property owner. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePropertyOwner,
    onSuccess: async () => {
      const deletedOwner = ownerToDelete
      const deletedName = deletedOwner?.name || deletedOwner?.email || 'Property Owner'
      queryClient.invalidateQueries({ queryKey: ['property-owners'] })
      setDeleteDialogOpen(false)
      setOwnerToDelete(null)
      // Log activity
      if (deletedOwner) {
        await ActivityLogger.delete(
          'property_owner',
          deletedOwner.id,
          deletedName
        )
      }
      // Show success message
      const message = t('propertyOwners.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Property owner "${deletedName}" has been deleted successfully.`,
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyOwners.deleteError') || 'Failed to delete property owner. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PropertyOwnerForm>({
    resolver: zodResolver(propertyOwnerSchema),
    defaultValues: {
      status: 'active',
    },
  })

  const onSubmit = (data: PropertyOwnerForm) => {
    if (editingOwner) {
      updateMutation.mutate({ id: editingOwner.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (owner: PropertyOwner) => {
    setEditingOwner(owner)
    setValue('name', owner.name)
    setValue('phone_number', owner.phone_number)
    setValue('email', owner.email || '')
    setValue('status', owner.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (owner: PropertyOwner) => {
    setOwnerToDelete(owner)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!ownerToDelete) return

    try {
      // Check if property owner has related properties
      const hasProperties = await checkOwnerHasProperties(ownerToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyOwners.cannotDeleteHasProperties') || `This property owner cannot be deleted because they have one or more properties associated with them. Please remove or reassign all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setOwnerToDelete(null)
        return
      }

      // If no properties, proceed with deletion
      deleteMutation.mutate(ownerToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyOwners.checkError') || 'Failed to verify if property owner has properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading || isCheckingPermissions) {
    return <PageSkeleton showHeader showActions={canCreate} showTable tableRows={8} />
  }
  
  // If user doesn't have view permission, show error message
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('common.error') || 'Access Denied'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('propertyOwners.noPermission') || 'You do not have permission to view property owners.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: t('propertyOwners.name') || 'Name',
    },
    {
      key: 'phone_number',
      header: t('propertyOwners.phone') || 'Phone',
    },
    {
      key: 'email',
      header: t('propertyOwners.email') || 'Email',
      render: (value: string | null) => value || '-',
    },
    {
      key: 'status',
      header: t('propertyOwners.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'login_count',
      header: t('propertyOwners.loginCount') || 'Logins',
    },
    {
      key: 'last_login_at',
      header: t('propertyOwners.lastLogin') || 'Last Login',
      render: (value: string | null) => value ? new Date(value).toLocaleDateString() : 'Never',
    },
    {
      key: 'created_at',
      header: t('propertyOwners.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyOwners.title') || 'Property Owners'}</h1>
          <p className="text-muted-foreground">Manage property owners and their accounts</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingOwner(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('propertyOwners.createOwner') || 'Create Owner'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyOwners.title') || 'Property Owners'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={owners}
            columns={columns}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder={t('common.search')}
            actions={(owner) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(owner)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(owner)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOwner ? t('propertyOwners.editOwner') : t('propertyOwners.createOwner')}
            </DialogTitle>
            <DialogDescription>
              {editingOwner ? 'Update property owner information' : 'Create a new property owner'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('propertyOwners.name') || 'Name'}</Label>
              <Input
                id="name"
                {...register('name')}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">{t('propertyOwners.phone') || 'Phone Number'}</Label>
              <Input
                id="phone_number"
                {...register('phone_number')}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('propertyOwners.email') || 'Email (Optional)'}</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('propertyOwners.status') || 'Status'}</Label>
              <Select
                onValueChange={(value) => setValue('status', value as any)}
                defaultValue={editingOwner?.status || 'active'}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingOwner(null)
                  reset()
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.loading')
                  : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('propertyOwners.deleteOwner') || `Are you sure you want to delete property owner "${ownerToDelete?.name || ownerToDelete?.email}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOwnerToDelete(null)}>
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.loading') || 'Deleting...' : t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


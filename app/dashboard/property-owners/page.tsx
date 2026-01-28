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
import { PhoneInputField } from '@/components/ui/phone-input'

const propertyOwnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.union([z.string().email(), z.literal('')]).nullable().optional(),
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
    .limit(1000) // Limit to prevent memory issues with large datasets

  if (error) throw error
  return data as PropertyOwner[]
}

async function checkPhoneNumberExists(phoneNumber: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let query = supabase
    .from('property_owners')
    .select('id')
    .eq('phone_number', phoneNumber)
    .limit(1)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data && data.length > 0)
}

async function checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
  if (!email || email.trim() === '') return false
  
  const supabase = createClient()
  let query = supabase
    .from('property_owners')
    .select('id')
    .eq('email', email.trim())
    .limit(1)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data && data.length > 0)
}

async function createPropertyOwner(ownerData: PropertyOwnerForm) {
  // Check for duplicate phone number
  const phoneExists = await checkPhoneNumberExists(ownerData.phone_number)
  if (phoneExists) {
    throw new Error('Phone number already exists. Please use a different phone number.')
  }

  // Check for duplicate email if provided
  if (ownerData.email && ownerData.email.trim() !== '') {
    const emailExists = await checkEmailExists(ownerData.email)
    if (emailExists) {
      throw new Error('Email address already exists. Please use a different email address.')
    }
  }

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

  if (error) {
    // Handle database constraint errors
    const errorMessage = error.message || ''
    const errorCode = error.code || ''
    const errorDetails = error.details || ''
    
    // Check for unique constraint violations (PostgreSQL error code 23505)
    // Also check for constraint name in message
    if (errorCode === '23505' || 
        errorMessage.includes('duplicate key') || 
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('property_owners_email_key') ||
        errorMessage.includes('property_owners_phone_number_key') ||
        errorDetails.includes('email') ||
        errorDetails.includes('phone_number')) {
      
      // Check for email constraint
      if (errorMessage.includes('email') || 
          errorMessage.includes('property_owners_email_key') ||
          errorDetails.includes('email')) {
        throw new Error('Email address already exists. Please use a different email address.')
      }
      // Check for phone number constraint
      if (errorMessage.includes('phone_number') || 
          errorMessage.includes('property_owners_phone_number_key') ||
          errorDetails.includes('phone_number')) {
        throw new Error('Phone number already exists. Please use a different phone number.')
      }
      // Generic duplicate error
      throw new Error('A record with this information already exists. Please check your input and try again.')
    }
    throw error
  }
  return data
}

async function updatePropertyOwner(id: string, ownerData: Partial<PropertyOwnerForm>) {
  // Check for duplicate phone number if phone_number is being updated
  if (ownerData.phone_number) {
    const phoneExists = await checkPhoneNumberExists(ownerData.phone_number, id)
    if (phoneExists) {
      throw new Error('Phone number already exists. Please use a different phone number.')
    }
  }

  // Check for duplicate email if email is being updated
  if (ownerData.email !== undefined) {
    if (ownerData.email && ownerData.email.trim() !== '') {
      const emailExists = await checkEmailExists(ownerData.email, id)
      if (emailExists) {
        throw new Error('Email address already exists. Please use a different email address.')
      }
    }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_owners')
    .update(ownerData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // Handle database constraint errors
    const errorMessage = error.message || ''
    const errorCode = error.code || ''
    const errorDetails = error.details || ''
    
    // Check for unique constraint violations (PostgreSQL error code 23505)
    // Also check for constraint name in message
    if (errorCode === '23505' || 
        errorMessage.includes('duplicate key') || 
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('property_owners_email_key') ||
        errorMessage.includes('property_owners_phone_number_key') ||
        errorDetails.includes('email') ||
        errorDetails.includes('phone_number')) {
      
      // Check for email constraint
      if (errorMessage.includes('email') || 
          errorMessage.includes('property_owners_email_key') ||
          errorDetails.includes('email')) {
        throw new Error('Email address already exists. Please use a different email address.')
      }
      // Check for phone number constraint
      if (errorMessage.includes('phone_number') || 
          errorMessage.includes('property_owners_phone_number_key') ||
          errorDetails.includes('phone_number')) {
        throw new Error('Phone number already exists. Please use a different phone number.')
      }
      // Generic duplicate error
      throw new Error('A record with this information already exists. Please check your input and try again.')
    }
    throw error
  }
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
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('property_owners')

  const { data: owners, isLoading } = useQuery({
    queryKey: ['property-owners'],
    queryFn: getPropertyOwners,
    enabled: canView, // Only fetch if user has view permission
    staleTime: 30000, // Cache for 30 seconds - balance between freshness and performance
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
      const errorMsg = String(error?.message || '')
      const errorCode = String(error?.code || '')
      
      // Check if it's a duplicate phone number error
      const isDuplicatePhone = errorMsg.includes('Phone number already exists') || 
                                errorMsg.includes('phone number already exists') ||
                                errorMsg.includes('property_owners_phone_number_key') ||
                                (errorMsg.includes('duplicate key') && errorMsg.includes('phone'))
      
      // Check if it's a duplicate email error
      const isDuplicateEmail = errorMsg.includes('Email address already exists') || 
                                errorMsg.includes('email address already exists') ||
                                errorMsg.includes('property_owners_email_key') ||
                                (errorMsg.includes('duplicate key') && errorMsg.includes('email')) ||
                                (errorCode === '23505' && errorMsg.includes('email'))
      
      let errorMessage = errorMsg || t('propertyOwners.createError') || 'Failed to create property owner. Please try again.'
      
      if (isDuplicatePhone) {
        errorMessage = t('propertyOwners.phoneDuplicateError') || 'Phone number already exists. Please use a different phone number.'
      } else if (isDuplicateEmail) {
        errorMessage = t('propertyOwners.emailDuplicateError') || 'Email address already exists. Please use a different email address.'
      }
      
      toast({
        title: t('common.error') || 'Error',
        description: errorMessage,
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
      const errorMsg = String(error?.message || '')
      const errorCode = String(error?.code || '')
      
      // Check if it's a duplicate phone number error
      const isDuplicatePhone = errorMsg.includes('Phone number already exists') || 
                                errorMsg.includes('phone number already exists') ||
                                errorMsg.includes('property_owners_phone_number_key') ||
                                (errorMsg.includes('duplicate key') && errorMsg.includes('phone'))
      
      // Check if it's a duplicate email error
      const isDuplicateEmail = errorMsg.includes('Email address already exists') || 
                                errorMsg.includes('email address already exists') ||
                                errorMsg.includes('property_owners_email_key') ||
                                (errorMsg.includes('duplicate key') && errorMsg.includes('email')) ||
                                (errorCode === '23505' && errorMsg.includes('email'))
      
      let errorMessage = errorMsg || t('propertyOwners.updateError') || 'Failed to update property owner. Please try again.'
      
      if (isDuplicatePhone) {
        errorMessage = t('propertyOwners.phoneDuplicateError') || 'Phone number already exists. Please use a different phone number.'
      } else if (isDuplicateEmail) {
        errorMessage = t('propertyOwners.emailDuplicateError') || 'Email address already exists. Please use a different email address.'
      }
      
      toast({
        title: t('common.error') || 'Error',
        description: errorMessage,
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
    watch,
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>{t('propertyOwners.title') || 'Property Owners'} ({owners?.length || 0})</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="tableItemsPerPage" className="text-sm text-muted-foreground">Items per page:</Label>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                  }}
                >
                  <SelectTrigger className="w-20 h-8" id="tableItemsPerPage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={owners}
            columns={columns}
            isLoading={isLoading}
            searchKey={['name', 'phone_number', 'email', 'status']}
            searchPlaceholder={t('propertyOwners.searchPlaceholder') || 'Search by name, phone, email, or status...'}
            itemsPerPage={itemsPerPage}
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
              <PhoneInputField
                id="phone_number"
                name="phone_number"
                value={watch('phone_number') || ''}
                onChange={(value) => setValue('phone_number', value, { shouldValidate: true })}
                disabled={createMutation.isPending || updateMutation.isPending}
                placeholder={t('propertyOwners.phonePlaceholder') || 'Enter phone number'}
                error={!!errors.phone_number}
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


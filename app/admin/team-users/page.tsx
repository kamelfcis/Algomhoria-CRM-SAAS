'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { useLanguageStore } from '@/store/language-store'
import { useToast } from '@/hooks/use-toast'
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
import { ImageUpload } from '@/components/ui/image-upload'
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

const teamUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  position: z.string().min(1, 'Position is required'),
  poition_ar: z.string().min(1, 'Arabic position is required'),
  image_url: z.string().optional().nullable(),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type TeamUserForm = z.infer<typeof teamUserSchema>

interface TeamUser {
  id: string
  name: string
  name_ar?: string | null
  position: string
  poition_ar?: string | null
  image_url?: string | null
  order_index: number
  status: string
  created_at: string
  updated_at: string
}

async function getTeamUsers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('team_users')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as TeamUser[]
}

async function createTeamUser(userData: TeamUserForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('team_users')
    .insert(userData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateTeamUser(id: string, userData: Partial<TeamUserForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('team_users')
    .update(userData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteTeamUser(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('team_users')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateTeamUserOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('team_users')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function TeamUsersPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const { language } = useLanguageStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isRTL = language === 'ar'
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<TeamUser | null>(null)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('team_users')

  const { data: teamUsers, isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: getTeamUsers,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createTeamUser,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      setIsDialogOpen(false)
      reset({
        name: '',
        name_ar: '',
        position: '',
        poition_ar: '',
        image_url: null,
        order_index: 0,
        status: 'active',
      })
      // Log activity
      if (data?.id) {
        const memberName = data.name || data.name_ar || 'Team member'
        await ActivityLogger.create('team_user', data.id, `Team member: ${memberName}`)
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('teamUsers.createdSuccessfully') || `Team member "${data.name || data.name_ar}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('teamUsers.createError') || 'Failed to create team member. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TeamUserForm> }) =>
      updateTeamUser(id, data),
    onSuccess: async (data) => {
      const previousUser = editingUser
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      setIsDialogOpen(false)
      setEditingUser(null)
      reset({
        name: '',
        name_ar: '',
        position: '',
        poition_ar: '',
        image_url: null,
        order_index: 0,
        status: 'active',
      })
      // Log activity
      if (previousUser && data?.id) {
        const memberName = data.name || data.name_ar || 'Team member'
        await ActivityLogger.update(
          'team_user',
          data.id,
          `Team member: ${memberName}`,
          previousUser,
          data
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('teamUsers.updatedSuccessfully') || `Team member "${data.name || data.name_ar}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('teamUsers.updateError') || 'Failed to update team member. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTeamUser,
    onSuccess: async () => {
      const deletedUser = userToDelete
      const deletedName = deletedUser?.name || deletedUser?.name_ar || 'Team member'
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      // Log activity
      if (deletedUser) {
        await ActivityLogger.delete('team_user', deletedUser.id, `Team member: ${deletedName}`)
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('teamUsers.deletedSuccessfully') || `Team member "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('teamUsers.deleteError') || 'Failed to delete team member. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateTeamUserOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TeamUserForm>({
    resolver: zodResolver(teamUserSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      position: '',
      poition_ar: '',
      image_url: null,
      order_index: 0,
      status: 'active',
    },
  })

  const onSubmit = (data: TeamUserForm) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = teamUsers?.length ? Math.max(...teamUsers.map(u => u.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (user: TeamUser) => {
    setEditingUser(user)
    setValue('name', user.name)
    setValue('name_ar', user.name_ar || '')
    setValue('position', user.position)
    setValue('poition_ar', user.poition_ar || '')
    setValue('image_url', user.image_url || null)
    setValue('order_index', user.order_index)
    setValue('status', user.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (user: TeamUser) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      const name = userToDelete.name || userToDelete.name_ar || 'Team member'
      deleteMutation.mutate(userToDelete.id)
    }
  }

  const handleMoveUp = (user: TeamUser) => {
    if (user.order_index > 0) {
      const prevUser = teamUsers?.find(u => u.order_index === user.order_index - 1)
      if (prevUser) {
        orderMutation.mutate({ id: user.id, newOrder: user.order_index - 1 })
        orderMutation.mutate({ id: prevUser.id, newOrder: prevUser.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (user: TeamUser) => {
    const maxOrder = teamUsers?.length ? Math.max(...teamUsers.map(u => u.order_index)) : 0
    if (user.order_index < maxOrder) {
      const nextUser = teamUsers?.find(u => u.order_index === user.order_index + 1)
      if (nextUser) {
        orderMutation.mutate({ id: user.id, newOrder: user.order_index + 1 })
        orderMutation.mutate({ id: nextUser.id, newOrder: nextUser.order_index - 1 })
      }
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
              {t('teamUsers.noPermission') || 'You do not have permission to view team users.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'order_index',
      header: t('teamUsers.order') || 'Order',
      render: (_: any, row: TeamUser) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.order_index}</span>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => handleMoveUp(row)}
              disabled={orderMutation.isPending || row.order_index === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => handleMoveDown(row)}
              disabled={orderMutation.isPending || row.order_index === (teamUsers?.length ? Math.max(...teamUsers.map(u => u.order_index)) : 0)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'image_url',
      header: t('teamUsers.image') || 'Image',
      render: (_: any, row: TeamUser) => (
        row.image_url ? (
          <div className="flex items-center">
            <img
              src={row.image_url}
              alt={row.name || row.name_ar || 'Team member'}
              className="h-12 w-12 rounded-full object-cover"
            />
          </div>
        ) : (
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )
      ),
    },
    {
      key: 'name',
      header: t('teamUsers.name') || 'Name',
      render: (value: string, row: TeamUser) => (
        <div className="space-y-1">
          <div className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{value || '-'}</div>
          {row.name_ar && (
            <div className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`} dir="rtl">{row.name_ar}</div>
          )}
        </div>
      ),
    },
    {
      key: 'position',
      header: t('teamUsers.position') || 'Position',
      render: (value: string, row: TeamUser) => (
        <div className="space-y-1">
          <div className={isRTL ? 'text-right' : 'text-left'}>{value || '-'}</div>
          {row.poition_ar && (
            <div className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`} dir="rtl">{row.poition_ar}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('teamUsers.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('teamUsers.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('teamUsers.title') || 'Team Users'}</h1>
          <p className="text-muted-foreground">Manage team members displayed on the website</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingUser(null)
            reset({
              name: '',
              name_ar: '',
              position: '',
              poition_ar: '',
              image_url: null,
              order_index: 0,
              status: 'active',
            })
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('teamUsers.createUser') || 'Create Team Member'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('teamUsers.title') || 'Team Users'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={teamUsers}
            columns={columns}
            isLoading={isLoading}
            searchKey={['name', 'name_ar', 'position', 'poition_ar']}
            searchPlaceholder={t('common.search') || 'Search by name or position...'}
            actions={(user) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(user)}
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
              {editingUser ? t('teamUsers.editUser') : t('teamUsers.createUser')}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update team member information' : 'Create a new team member'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('teamUsers.name') || 'Name'} <span className="text-muted-foreground">(English)</span></Label>
              <Input
                id="name"
                {...register('name')}
                disabled={createMutation.isPending || updateMutation.isPending}
                placeholder="Enter team member name (e.g., John Smith, Sarah Johnson)"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">{t('teamUsers.nameAr') || 'Name (Arabic)'} <span className="text-red-500">*</span></Label>
              <Input
                id="name_ar"
                {...register('name_ar')}
                disabled={createMutation.isPending || updateMutation.isPending}
                placeholder="أدخل اسم عضو الفريق (مثال: محمد أحمد، فاطمة علي)"
                dir="rtl"
              />
              {errors.name_ar && (
                <p className="text-sm text-destructive">{errors.name_ar.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">{t('teamUsers.position') || 'Position'} <span className="text-muted-foreground">(English)</span></Label>
              <Input
                id="position"
                {...register('position')}
                disabled={createMutation.isPending || updateMutation.isPending}
                placeholder="Enter position title (e.g., Chief Executive Officer, Senior Developer, UI/UX Designer)"
              />
              {errors.position && (
                <p className="text-sm text-destructive">{errors.position.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="poition_ar">{t('teamUsers.positionAr') || 'Position (Arabic)'} <span className="text-red-500">*</span></Label>
              <Input
                id="poition_ar"
                {...register('poition_ar')}
                disabled={createMutation.isPending || updateMutation.isPending}
                placeholder="أدخل المسمى الوظيفي (مثال: الرئيس التنفيذي، مطور أول، مصمم واجهات)"
                dir="rtl"
              />
              {errors.poition_ar && (
                <p className="text-sm text-destructive">{errors.poition_ar.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('teamUsers.image') || 'Image'}</Label>
              <ImageUpload
                value={watch('image_url') || undefined}
                onChange={(url) => setValue('image_url', url || null)}
                bucket="team-users"
                folder="profiles"
                maxSize={5}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_index">{t('teamUsers.order') || 'Display Order'}</Label>
                <Input
                  id="order_index"
                  type="number"
                  {...register('order_index', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  placeholder="0"
                  min={0}
                />
                <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                {errors.order_index && (
                  <p className="text-sm text-destructive">{errors.order_index.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('teamUsers.status') || 'Status'}</Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingUser?.status || 'active'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only active members are displayed</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingUser(null)
                  reset({
                    name: '',
                    name_ar: '',
                    position: '',
                    poition_ar: '',
                    image_url: null,
                    order_index: 0,
                    status: 'active',
                  })
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
              {t('teamUsers.deleteConfirm') || `Are you sure you want to delete "${userToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
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


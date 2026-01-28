'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, Trash } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useLanguageStore } from '@/store/language-store'
import { usePermissions } from '@/hooks/use-permissions'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { useToast } from '@/hooks/use-toast'
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

const sectionSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  status: z.enum(['active', 'inactive']),
})

type SectionForm = z.infer<typeof sectionSchema>

interface Section {
  id: string
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

async function getSections() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Section[]
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('sections').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('sections').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createSection(sectionData: SectionForm) {
  const nameExists = await checkNameExists(sectionData.name_en, sectionData.name_ar)
  if (nameExists) {
    throw new Error('A section with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sections')
    .insert(sectionData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateSection(id: string, sectionData: Partial<SectionForm>) {
  const supabase = createClient()
  if (sectionData.name_en || sectionData.name_ar) {
    const { data: currentSection } = await supabase
      .from('sections')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = sectionData.name_en ?? currentSection?.name_en ?? ''
    const nameAr = sectionData.name_ar ?? currentSection?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A section with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('sections')
    .update(sectionData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkSectionHasProperties(sectionId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('section_id', sectionId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteSection(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sections')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function SectionsPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('sections')

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: getSections,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createSection,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      setIsDialogOpen(false)
      setEditingSection(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('section', data.id, data.name_en || data.name_ar)
      // Show success message
      const sectionName = data.name_en || data.name_ar
      const message = t('sections.sectionCreated')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', sectionName) : `Section "${sectionName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sections.createError') || 'Failed to create section',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SectionForm> }) =>
      updateSection(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      setIsDialogOpen(false)
      const previousSection = editingSection
      setEditingSection(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      if (previousSection) {
        await ActivityLogger.update(
          'section',
          data.id,
          data.name_en || data.name_ar,
          previousSection,
          data
        )
      }
      // Show success message
      const sectionName = data.name_en || data.name_ar
      const message = t('sections.sectionUpdated')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', sectionName) : `Section "${sectionName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sections.updateError') || 'Failed to update section',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: async (_, deletedId) => {
      const deletedSection = sectionToDelete || sections?.find(s => s.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      setDeleteDialogOpen(false)
      // Log activity
      if (deletedSection) {
        await ActivityLogger.delete('section', deletedSection.id, deletedSection.name_en || deletedSection.name_ar)
      }
      // Show success message
      const deletedName = deletedSection?.name_en || deletedSection?.name_ar || ''
      const message = t('sections.sectionDeleted')
      toast({
        title: t('common.success') || 'Success',
        description: deletedName && message 
          ? message.replace('{name}', deletedName)
          : deletedName
          ? `Section "${deletedName}" has been deleted successfully.`
          : (message || 'Section has been deleted successfully.'),
        variant: 'success',
        duration: 5000,
      })
      setSectionToDelete(null)
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sections.deleteError') || 'Failed to delete section',
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
  } = useForm<SectionForm>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: SectionForm) => {
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (section: Section) => {
    setEditingSection(section)
    reset({
      name_ar: section.name_ar,
      name_en: section.name_en,
      status: section.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (section: Section) => {
    setSectionToDelete(section)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!sectionToDelete) return

    try {
      const hasProperties = await checkSectionHasProperties(sectionToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('sections.cannotDeleteHasProperties') || `This section cannot be deleted because it has one or more properties associated with it. Please remove or reassign all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setSectionToDelete(null)
        return
      }

      deleteMutation.mutate(sectionToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sections.checkError') || 'Failed to verify if section has properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingSection(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIdsForBulkDelete.length === 0) return
    
    setIsBulkDeleting(true)
    const deletedIds: string[] = []
    const failedIds: string[] = []
    const cannotDeleteIds: string[] = []
    
    try {
      for (const id of selectedIdsForBulkDelete) {
        try {
          const hasProperties = await checkSectionHasProperties(id)
          if (hasProperties) {
            cannotDeleteIds.push(id)
            continue
          }
          await deleteSection(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      
      const total = selectedIdsForBulkDelete.length
      const successCount = deletedIds.length
      const failedCount = failedIds.length
      const cannotDeleteCount = cannotDeleteIds.length
      
      if (successCount > 0) {
        toast({
          title: t('common.success') === 'common.success'
            ? (language === 'ar' ? 'نجاح' : 'Success')
            : t('common.success'),
          description: successCount === total
            ? (t('sections.bulkDeletedSuccess') === 'sections.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'قسم بنجاح' : 'أقسام بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'section has' : 'sections have'} been deleted successfully.`
              : t('sections.bulkDeletedSuccess'))
            : (t('sections.bulkDeletedPartial') === 'sections.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} قسم بنجاح`
                : `${successCount} of ${total} sections deleted successfully.`
              : t('sections.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning'
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('sections.cannotDeleteSome') === 'sections.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'قسم لأنه' : 'أقسام لأنها'} مستخدم ${cannotDeleteCount === 1 ? 'في' : 'في'} عقارات`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'section cannot' : 'sections cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties.`
            : t('sections.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('sections.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'section' : 'sections'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'قسم' : 'أقسام'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sections.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      })
    } finally {
      setIsBulkDeleting(false)
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
              {t('sections.noPermission') || 'You do not have permission to view sections.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'name_ar',
      header: t('sections.nameAr') || 'Name (AR)',
      render: (value: string, row: Section) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('sections.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('sections.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('sections.title') || 'Sections'}</h1>
          <p className="text-muted-foreground">Manage property sections</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingSection(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('sections.createSection') || 'Create Section'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sections.title') || 'Sections'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={sections}
            columns={columns}
            isLoading={isLoading}
            searchKey={['name_ar', 'name_en', 'status']}
            searchPlaceholder={t('common.search')}
            enableSelection={canDelete}
            bulkActions={canDelete ? [
              {
                label: t('common.delete') || 'Delete Selected',
                action: (selectedIds: string[]) => {
                  setSelectedIdsForBulkDelete(selectedIds)
                  setBulkDeleteDialogOpen(true)
                },
                variant: 'destructive',
                icon: <Trash className="h-4 w-4" />,
              },
            ] : []}
            actions={(section) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(section)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('sections.editSection') || 'Edit section'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(section)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('sections.deleteSection') || 'Delete section'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? t('sections.editSection') : t('sections.createSection')}
            </DialogTitle>
            <DialogDescription>
              {editingSection ? 'Update section information' : 'Create a new section'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('sections.nameAr') || 'Name (Arabic)'}</Label>
                <Input
                  id="name_ar"
                  {...register('name_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.name_ar && (
                  <p className="text-sm text-destructive">{errors.name_ar.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">{t('sections.nameEn') || 'Name (English)'}</Label>
                <Input
                  id="name_en"
                  {...register('name_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.name_en && (
                  <p className="text-sm text-destructive">{errors.name_en.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('sections.status') || 'Status'}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('sections.selectStatus') || 'Select status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.loading') || 'Loading...'
                  : editingSection
                  ? t('common.update') || 'Update'
                  : t('common.create') || 'Create'}
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
              {t('sections.deleteSection') || `Are you sure you want to delete section "${sectionToDelete?.name_en || sectionToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSectionToDelete(null)}>
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('common.confirmBulkDelete') === 'common.confirmBulkDelete'
                ? (language === 'ar' ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Delete')
                : t('common.confirmBulkDelete')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('sections.bulkDeleteConfirm') === 'sections.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'قسم' : 'أقسام'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'section' : 'sections'}? This action cannot be undone.`
                : t('sections.bulkDeleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setSelectedIdsForBulkDelete([])
              }}
              disabled={isBulkDeleting}
            >
              {t('common.cancel') || 'Cancel / إلغاء'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (t('common.deleting') || 'Deleting... / جاري الحذف...') : (t('common.delete') || 'Delete / حذف')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


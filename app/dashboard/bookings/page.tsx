'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Pencil, Trash2, Calendar, DollarSign } from 'lucide-react'
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

const bookingUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  total_price: z.number().min(0, 'Price must be positive').optional(),
})

type BookingUpdateForm = z.infer<typeof bookingUpdateSchema>

interface PropertyBooking {
  id: string
  property_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  booking_from_date: string
  booking_to_date: string
  total_price: number
  status: string
  created_at: string
  updated_at: string
  properties?: {
    title_ar: string
    title_en: string
    code: string
  }
}

async function getBookings() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_bookings')
    .select('*, properties(title_ar, title_en, code)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as any[]
}

async function updateBooking(id: string, bookingData: Partial<BookingUpdateForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_bookings')
    .update(bookingData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteBooking(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_bookings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function BookingsPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<PropertyBooking | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<PropertyBooking | null>(null)

  // Check permissions
  const { canView, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('bookings')

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['property-bookings'],
    queryFn: getBookings,
    enabled: canView, // Only fetch if user has view permission
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BookingUpdateForm> }) =>
      updateBooking(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['property-bookings'] })
      setIsDialogOpen(false)
      const previousBooking = editingBooking
      setEditingBooking(null)
      reset()
      // Log activity
      if (previousBooking && data?.id) {
        await ActivityLogger.update(
          'booking',
          data.id,
          data.property_title || data.customer_name || 'Untitled Booking',
          previousBooking,
          data
        )
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: async (_, deletedId) => {
      const deletedBooking = bookingToDelete || bookings?.find(b => b.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['property-bookings'] })
      setDeleteDialogOpen(false)
      setBookingToDelete(null)
      // Log activity
      if (deletedBooking) {
        await ActivityLogger.delete(
          'booking',
          deletedBooking.id,
          deletedBooking.property_title || deletedBooking.customer_name || 'Untitled Booking'
        )
      }
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BookingUpdateForm>({
    resolver: zodResolver(bookingUpdateSchema),
    defaultValues: {
      status: 'pending',
    },
  })

  const onSubmit = (data: BookingUpdateForm) => {
    if (editingBooking) {
      updateMutation.mutate({ id: editingBooking.id, data })
    }
  }

  const handleEdit = (booking: any) => {
    setEditingBooking(booking)
    setValue('status', booking.status as any)
    setValue('total_price', booking.total_price)
    setIsDialogOpen(true)
  }

  const handleDelete = (booking: PropertyBooking) => {
    setBookingToDelete(booking)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (bookingToDelete) {
      deleteMutation.mutate(bookingToDelete.id)
    }
  }

  if (isLoading || isCheckingPermissions) {
    return <PageSkeleton showHeader showActions={false} showTable tableRows={8} />
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
              {t('bookings.noPermission') || 'You do not have permission to view bookings.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter bookings
  const filteredBookings = bookings?.filter((booking) => {
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'confirmed':
        return 'text-blue-600 bg-blue-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      case 'completed':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const calculateNights = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const diffTime = Math.abs(to.getTime() - from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const columns = [
    {
      key: 'property_id',
      header: t('bookings.property') || 'Property',
      render: (_: any, row: any) => {
        const property = row.properties
        return property ? (
          <div>
            <div className="font-medium">{property.title_ar || property.title_en}</div>
            <div className="text-sm text-muted-foreground">Code: {property.code}</div>
          </div>
        ) : '-'
      },
    },
    {
      key: 'customer_name',
      header: t('bookings.customer') || 'Customer',
      render: (value: string, row: PropertyBooking) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.customer_email}</div>
          <div className="text-sm text-muted-foreground">{row.customer_phone}</div>
        </div>
      ),
    },
    {
      key: 'booking_from_date',
      header: t('bookings.dates') || 'Booking Dates',
      render: (_: any, row: PropertyBooking) => {
        const nights = calculateNights(row.booking_from_date, row.booking_to_date)
        return (
          <div>
            <div className="text-sm">
              <Calendar className="inline h-3 w-3 mr-1" />
              {new Date(row.booking_from_date).toLocaleDateString()}
            </div>
            <div className="text-sm">
              <Calendar className="inline h-3 w-3 mr-1" />
              {new Date(row.booking_to_date).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">{nights} night(s)</div>
          </div>
        )
      },
    },
    {
      key: 'total_price',
      header: t('bookings.totalPrice') || 'Total Price',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">{value.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('bookings.status') || 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('bookings.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  const pendingCount = bookings?.filter(b => b.status === 'pending').length || 0
  const confirmedCount = bookings?.filter(b => b.status === 'confirmed').length || 0
  const completedCount = bookings?.filter(b => b.status === 'completed').length || 0
  const totalRevenue = bookings?.filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('bookings.title') || 'Property Bookings'}</h1>
          <p className="text-muted-foreground">Manage property bookings and reservations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('bookings.totalBookings') || 'Total Bookings'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('bookings.pending') || 'Pending'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('bookings.confirmed') || 'Confirmed'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{confirmedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('bookings.totalRevenue') || 'Total Revenue'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('bookings.title') || 'Property Bookings'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredBookings}
            columns={columns}
            isLoading={isLoading}
            searchKey="customer_name"
            searchPlaceholder={t('common.search')}
            actions={(booking) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(booking)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(booking)}
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
            <DialogTitle>{t('bookings.editBooking') || 'Edit Booking'}</DialogTitle>
            <DialogDescription>Update booking status and details</DialogDescription>
          </DialogHeader>
          
          {editingBooking && (
            <div className="space-y-4">
              {/* Booking Info (Read-only) */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Property</Label>
                  <p className="font-medium">
                    {editingBooking.properties?.title_ar || editingBooking.properties?.title_en || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer Name</Label>
                    <p className="text-sm">{editingBooking.customer_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm">{editingBooking.customer_email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="text-sm">{editingBooking.customer_phone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Dates</Label>
                    <p className="text-sm">
                      {new Date(editingBooking.booking_from_date).toLocaleDateString()} - {' '}
                      {new Date(editingBooking.booking_to_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">{t('bookings.status') || 'Status'}</Label>
                    <Select
                      onValueChange={(value) => setValue('status', value as any)}
                      defaultValue={editingBooking.status}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_price">{t('bookings.totalPrice') || 'Total Price'}</Label>
                    <Input
                      id="total_price"
                      type="number"
                      step="0.01"
                      {...register('total_price', { valueAsNumber: true })}
                      disabled={updateMutation.isPending}
                    />
                    {errors.total_price && (
                      <p className="text-sm text-destructive">{errors.total_price.message}</p>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingBooking(null)
                      reset()
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? t('common.loading') : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bookings.deleteBooking') || `Are you sure you want to delete booking for "${bookingToDelete?.properties?.title_en || bookingToDelete?.customer_name || 'Untitled Booking'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToDelete(null)}>
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


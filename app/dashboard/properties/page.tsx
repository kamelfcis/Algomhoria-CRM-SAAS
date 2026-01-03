'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, Image as ImageIcon, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { GoogleMapsLocation } from '@/components/ui/google-maps-location'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { PropertyImageUpload } from '@/components/ui/property-image-upload'
import { cn } from '@/lib/utils'

const propertySchema = z.object({
  code: z.string().optional(),
  old_code: z.string().optional(),
  title_ar: z.string().min(1, 'Title (Arabic) is required'),
  title_en: z.string().min(1, 'Title (English) is required'),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  address_ar: z.string().optional(),
  address_en: z.string().optional(),
  governorate_id: z.string().uuid().optional().nullable(),
  area_id: z.string().uuid().optional().nullable(),
  street_id: z.string().uuid().optional().nullable(),
  location_text: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  section_id: z.string().uuid().optional().nullable(),
  property_type_id: z.string().uuid().optional().nullable(),
  price: z.number().optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
  size: z.number().optional().nullable(),
  baths: z.number().int().optional().nullable(),
  floor_no: z.number().int().optional().nullable(),
  view_type_id: z.string().uuid().optional().nullable(),
  finishing_type_id: z.string().uuid().optional().nullable(),
  phone_number: z.string().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'rejected', 'deleted', 'expired', 'rented', 'sold']),
  is_featured: z.boolean().default(false),
  is_rented: z.boolean().default(false),
  is_sold: z.boolean().default(false),
  expired_at: z.string().optional().nullable(),
})

type PropertyForm = z.infer<typeof propertySchema>

interface Property {
  id: string
  code: string | null
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  price: number | null
  size: number | null
  status: string
  is_featured: boolean
  property_type_id: string | null
  governorate_id: string | null
  area_id: string | null
  created_at: string
}

async function getPropertyImages(propertyId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_images')
    .select('id, image_url, is_primary, order_index')
    .eq('property_id', propertyId)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching property images:', error)
    return []
  }

  return (data || []).map((img: any) => ({
    id: img.id,
    url: img.image_url,
    is_primary: img.is_primary || false,
    order_index: img.order_index || 0,
  }))
}

async function getProperties() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Property[]
}

async function getPropertyFacilities(propertyId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_property_facilities')
    .select('facility_id')
    .eq('property_id', propertyId)

  if (error) throw error
  return data.map((item: any) => item.facility_id)
}

async function getPropertyServices(propertyId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_property_services')
    .select('service_id')
    .eq('property_id', propertyId)

  if (error) throw error
  return data.map((item: any) => item.service_id)
}

async function getMasterData() {
  const supabase = createClient()
  
  const [
    governorates,
    propertyTypes,
    propertyOwners,
    sections,
    paymentMethods,
    viewTypes,
    finishingTypes,
    facilities,
    services,
  ] = await Promise.all([
    supabase.from('governorates').select('id, name_ar, name_en').eq('status', 'active').order('order_index'),
    supabase.from('property_types').select('id, name_ar, name_en').eq('status', 'active'),
    supabase.from('property_owners').select('id, name, email').eq('status', 'active').order('name'),
    supabase.from('sections').select('id, name_ar, name_en').eq('status', 'active').order('name_en'),
    supabase.from('payment_methods').select('id, name_ar, name_en').eq('status', 'active').order('name_en'),
    supabase.from('property_view_types').select('id, name_ar, name_en').eq('status', 'active').order('name_en'),
    supabase.from('property_finishing_types').select('id, name_ar, name_en').eq('status', 'active').order('name_en'),
    supabase.from('property_facilities').select('id, name_ar, name_en').eq('status', 'active').order('name_en'),
    supabase.from('property_services').select('id, name_ar, name_en').eq('status', 'active').order('name_en'),
  ])

  return {
    governorates: governorates.data || [],
    propertyTypes: propertyTypes.data || [],
    propertyOwners: propertyOwners.data || [],
    sections: sections.data || [],
    paymentMethods: paymentMethods.data || [],
    viewTypes: viewTypes.data || [],
    finishingTypes: finishingTypes.data || [],
    facilities: facilities.data || [],
    services: services.data || [],
  }
}

async function getAreas(governorateId: string) {
  if (!governorateId) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('areas')
    .select('id, name_ar, name_en')
    .eq('governorate_id', governorateId)
    .eq('status', 'active')
    .order('order_index')
  return data || []
}

async function getStreets(areaId: string) {
  if (!areaId) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('streets')
    .select('id, name_ar, name_en')
    .eq('area_id', areaId)
    .eq('status', 'active')
    .order('order_index')
  return data || []
}

async function getNextPropertyCode(): Promise<string> {
  const supabase = createClient()
  // Get all properties with codes
  const { data, error } = await supabase
    .from('properties')
    .select('code')
    .not('code', 'is', null)

  if (error) throw error

  if (!data || data.length === 0) {
    // No properties exist, start from 1
    return '1'
  }

  // Find the highest numeric code
  const codes = data
    .map((p) => p.code)
    .filter((code) => code && /^\d+$/.test(code)) // Only numeric codes
    .map((code) => parseInt(code, 10))
    .filter((num) => !isNaN(num))

  if (codes.length === 0) {
    // No numeric codes found, start from 1
    return '1'
  }

  const maxCode = Math.max(...codes)
  return String(maxCode + 1)
}

async function createProperty(propertyData: PropertyForm & { facilityIds?: string[], serviceIds?: string[] }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Always auto-generate code
  const code = await getNextPropertyCode()
  
  // Extract facilityIds and serviceIds (not database columns)
  const { facilityIds, serviceIds, ...dbPropertyData } = propertyData
  
  // Clean up the data - convert empty strings to null and handle undefined
  const cleanData: any = {
    code: code,
    title_ar: dbPropertyData.title_ar,
    title_en: dbPropertyData.title_en,
    description_ar: dbPropertyData.description_ar || null,
    description_en: dbPropertyData.description_en || null,
    address_ar: dbPropertyData.address_ar || null,
    address_en: dbPropertyData.address_en || null,
    location_text: dbPropertyData.location_text || null,
    phone_number: dbPropertyData.phone_number || null,
    governorate_id: dbPropertyData.governorate_id || null,
    area_id: dbPropertyData.area_id || null,
    street_id: dbPropertyData.street_id || null,
    property_type_id: dbPropertyData.property_type_id || null,
    owner_id: dbPropertyData.owner_id || null,
    section_id: dbPropertyData.section_id || null,
    payment_method_id: dbPropertyData.payment_method_id || null,
    view_type_id: dbPropertyData.view_type_id || null,
    finishing_type_id: dbPropertyData.finishing_type_id || null,
    price: dbPropertyData.price ?? null,
    size: dbPropertyData.size ?? null,
    baths: dbPropertyData.baths ?? null,
    floor_no: dbPropertyData.floor_no ?? null,
    latitude: dbPropertyData.latitude ?? null,
    longitude: dbPropertyData.longitude ?? null,
    status: dbPropertyData.status || 'pending',
    is_featured: dbPropertyData.is_featured ?? false,
    is_rented: dbPropertyData.is_rented ?? false,
    is_sold: dbPropertyData.is_sold ?? false,
    expired_at: dbPropertyData.expired_at || null,
    created_by: user?.id || null,
  }
  
  const { data, error } = await supabase
    .from('properties')
    .insert(cleanData)
    .select()
    .single()

  if (error) {
    console.error('Property creation error:', error)
    throw error
  }

  // Insert facilities
  if (facilityIds && facilityIds.length > 0) {
    const facilityInserts = facilityIds.map(facilityId => ({
      property_id: data.id,
      facility_id: facilityId,
    }))
    const { error: facilitiesError } = await supabase
      .from('property_property_facilities')
      .insert(facilityInserts)
    
    if (facilitiesError) {
      console.error('Facilities insert error:', facilitiesError)
      throw facilitiesError
    }
  }

  // Insert services
  if (serviceIds && serviceIds.length > 0) {
    const serviceInserts = serviceIds.map(serviceId => ({
      property_id: data.id,
      service_id: serviceId,
    }))
    const { error: servicesError } = await supabase
      .from('property_property_services')
      .insert(serviceInserts)
    
    if (servicesError) {
      console.error('Services insert error:', servicesError)
      throw servicesError
    }
  }

  return data
}

async function updateProperty(id: string, propertyData: Partial<PropertyForm> & { facilityIds?: string[], serviceIds?: string[] }) {
  const supabase = createClient()
  // Remove code from update data - code should never be changed
  const { code, old_code, facilityIds, serviceIds, ...updateDataWithoutCode } = propertyData
  const updateData = {
    ...updateDataWithoutCode,
    governorate_id: propertyData.governorate_id || null,
    area_id: propertyData.area_id || null,
    street_id: propertyData.street_id || null,
    property_type_id: propertyData.property_type_id || null,
    owner_id: propertyData.owner_id || null,
    section_id: propertyData.section_id || null,
    payment_method_id: propertyData.payment_method_id || null,
    view_type_id: propertyData.view_type_id || null,
    finishing_type_id: propertyData.finishing_type_id || null,
    expired_at: propertyData.expired_at || null,
  }
  const { data, error } = await supabase
    .from('properties')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Update facilities - delete old and insert new
  if (facilityIds !== undefined) {
    // Delete existing facilities
    const { error: deleteFacilitiesError } = await supabase
      .from('property_property_facilities')
      .delete()
      .eq('property_id', id)
    
    if (deleteFacilitiesError) throw deleteFacilitiesError

    // Insert new facilities
    if (facilityIds.length > 0) {
      const facilityInserts = facilityIds.map(facilityId => ({
        property_id: id,
        facility_id: facilityId,
      }))
      const { error: facilitiesError } = await supabase
        .from('property_property_facilities')
        .insert(facilityInserts)
      
      if (facilitiesError) throw facilitiesError
    }
  }

  // Update services - delete old and insert new
  if (serviceIds !== undefined) {
    // Delete existing services
    const { error: deleteServicesError } = await supabase
      .from('property_property_services')
      .delete()
      .eq('property_id', id)
    
    if (deleteServicesError) throw deleteServicesError

    // Insert new services
    if (serviceIds.length > 0) {
      const serviceInserts = serviceIds.map(serviceId => ({
        property_id: id,
        service_id: serviceId,
      }))
      const { error: servicesError } = await supabase
        .from('property_property_services')
        .insert(serviceInserts)
      
      if (servicesError) throw servicesError
    }
  }

  return data
}

async function deleteProperty(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Component to show images count in table
function PropertyImagesCell({ propertyId }: { propertyId: string }) {
  const { data: images } = useQuery({
    queryKey: ['property-images', propertyId],
    queryFn: () => getPropertyImages(propertyId),
  })

  return (
    <div className="flex items-center gap-2">
      <ImageIcon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{images?.length || 0}</span>
    </div>
  )
}

// Property Card Component with Image Swipe
interface PropertyCardProps {
  property: Property
  imageIndex: number
  onImageIndexChange: (index: number) => void
  imageCount: number
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  canDelete: boolean
}

function PropertyCard({ property, imageIndex, onImageIndexChange, imageCount, onEdit, onDelete, canEdit, canDelete }: PropertyCardProps) {
  const [images, setImages] = React.useState<Array<{ id: string; url: string }>>([])
  const [touchStart, setTouchStart] = React.useState<number | null>(null)
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null)
  const [isLoadingImages, setIsLoadingImages] = React.useState(false)

  React.useEffect(() => {
    const loadImages = async () => {
      if (!property.id || imageCount === 0) {
        setImages([])
        return
      }
      
      setIsLoadingImages(true)
      try {
        const imgs = await getPropertyImages(property.id)
        setImages(imgs.map(img => ({ id: img.id, url: img.url })))
        if (imgs.length > 0 && imageIndex >= imgs.length) {
          onImageIndexChange(0)
        }
      } catch (error) {
        console.error('Error loading images:', error)
        setImages([])
      } finally {
        setIsLoadingImages(false)
      }
    }
    
    loadImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id, imageCount])

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && images.length > 0) {
      onImageIndexChange((imageIndex + 1) % images.length)
    }
    if (isRightSwipe && images.length > 0) {
      onImageIndexChange((imageIndex - 1 + images.length) % images.length)
    }
  }

  const goToPrevious = () => {
    if (images.length > 0) {
      onImageIndexChange((imageIndex - 1 + images.length) % images.length)
    }
  }

  const goToNext = () => {
    if (images.length > 0) {
      onImageIndexChange((imageIndex + 1) % images.length)
    }
  }

  const currentImage = images[imageIndex] || images[0] || null

  return (
    <Card className="relative backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
      {/* Image Section with Swipe */}
      <div 
        className="relative aspect-video w-full overflow-hidden bg-muted rounded-t-lg cursor-pointer"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {isLoadingImages ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : currentImage ? (
          <>
            <img
              src={currentImage.url}
              alt={property.title_en || property.title_ar || 'Property'}
              className="w-full h-full object-cover transition-transform duration-300"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    goToPrevious()
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 hover:scale-110 z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    goToNext()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 hover:scale-110 z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation()
                        onImageIndexChange(idx)
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all duration-200",
                        idx === imageIndex ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                      )}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">
                  {imageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Property Info */}
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{property.title_en || property.title_ar}</CardTitle>
            {property.title_ar && property.title_en && (
              <p className="text-sm text-muted-foreground truncate mt-1">{property.title_ar}</p>
            )}
            {property.code && (
              <p className="text-xs text-muted-foreground mt-1">Code: {property.code}</p>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {property.price && (
          <div className="text-lg font-semibold text-primary">
            ${property.price.toLocaleString()}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary capitalize">
            {property.status}
          </span>
          {property.is_featured && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-gold/20 text-gold">
              Featured
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Created: {new Date(property.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}

export default function PropertiesPage() {
  const t = useTranslations()
  const { toast } = useToast()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('none')
  const [selectedArea, setSelectedArea] = useState<string>('none')
  const [selectedStreet, setSelectedStreet] = useState<string>('none')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null)
  const [nextCode, setNextCode] = useState<string>('')
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [propertyImages, setPropertyImages] = useState<Array<{ id: string; url: string; is_primary?: boolean; order_index?: number }>>([])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [propertyImageIndices, setPropertyImageIndices] = useState<{ [key: string]: number }>({})

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  })

  const { data: masterData } = useQuery({
    queryKey: ['properties-master-data'],
    queryFn: getMasterData,
  })

  const { data: areas } = useQuery({
    queryKey: ['areas', selectedGovernorate],
    queryFn: () => getAreas(selectedGovernorate === 'none' ? '' : selectedGovernorate),
    enabled: selectedGovernorate !== 'none',
  })

  const { data: streets } = useQuery({
    queryKey: ['streets', selectedArea],
    queryFn: () => getStreets(selectedArea === 'none' ? '' : selectedArea),
    enabled: selectedArea !== 'none',
  })

  // Fetch next code when dialog opens for new property
  const { data: nextCodeData, refetch: refetchNextCode } = useQuery({
    queryKey: ['next-property-code'],
    queryFn: getNextPropertyCode,
    enabled: isDialogOpen && !editingProperty,
  })

  // Update nextCode state when data is fetched
  useEffect(() => {
    if (nextCodeData && !editingProperty) {
      setNextCode(nextCodeData)
    } else if (editingProperty) {
      setNextCode('')
    }
  }, [nextCodeData, editingProperty])

  // Refetch next code when dialog opens for new property
  useEffect(() => {
    if (isDialogOpen && !editingProperty) {
      refetchNextCode()
    }
  }, [isDialogOpen, editingProperty, refetchNextCode])

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      // Log activity
      if (data?.id) {
        await ActivityLogger.create('property', data.id, data.title_en || data.title_ar || data.code || 'Untitled Property')
        // Set editing property to enable image upload
        setEditingProperty({ ...data, title_ar: data.title_ar || '', title_en: data.title_en || '' } as Property)
        // Load images (will be empty for new property)
        const images = await getPropertyImages(data.id)
        setPropertyImages(images)
      }
      // Don't close dialog - allow user to upload images
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyForm> & { facilityIds?: string[], serviceIds?: string[] } }) =>
      updateProperty(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['all-property-images'] })
      // Log activity
      const previousProperty = editingProperty
      if (previousProperty && data?.id) {
        await ActivityLogger.update(
          'property',
          data.id,
          data.title_en || data.title_ar || data.code || 'Untitled Property',
          previousProperty,
          data
        )
      }
      // Close dialog and reset form
      setIsDialogOpen(false)
      setEditingProperty(null)
      reset()
      setPropertyImages([])
      // Show success toast
      toast({
        title: t('common.success') || 'Success',
        description: t('properties.updatedSuccessfully') || 'Property has been updated successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('properties.updateError') || 'Failed to update property. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: async (_, deletedId) => {
      const deletedProperty = propertyToDelete || properties?.find(p => p.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setDeleteDialogOpen(false)
      setPropertyToDelete(null)
      // Log activity
      if (deletedProperty) {
        await ActivityLogger.delete(
          'property',
          deletedProperty.id,
          deletedProperty.title_en || deletedProperty.title_ar || deletedProperty.code || 'Untitled Property'
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
    watch,
  } = useForm<PropertyForm>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      status: 'pending',
      is_featured: false,
      is_rented: false,
      is_sold: false,
    },
  })

  const isFeatured = watch('is_featured')
  const isRented = watch('is_rented')
  const isSold = watch('is_sold')

  const onSubmit = (data: PropertyForm) => {
    const submitData = {
      ...data,
      governorate_id: selectedGovernorate === 'none' ? null : selectedGovernorate,
      area_id: selectedArea === 'none' ? null : selectedArea,
      street_id: selectedStreet === 'none' ? null : selectedStreet,
      owner_id: data.owner_id || null,
      section_id: data.section_id || null,
      payment_method_id: data.payment_method_id || null,
      view_type_id: data.view_type_id || null,
      finishing_type_id: data.finishing_type_id || null,
      property_type_id: data.property_type_id || null,
      expired_at: data.expired_at || null,
      facilityIds: selectedFacilities,
      serviceIds: selectedServices,
    }
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleEdit = async (property: any) => {
    setEditingProperty(property)
    // Code is read-only, so we don't set it in the form
    setValue('title_ar', property.title_ar)
    
    // Load existing facilities and services
    try {
      const [facilityIds, serviceIds] = await Promise.all([
        getPropertyFacilities(property.id),
        getPropertyServices(property.id),
      ])
      setSelectedFacilities(facilityIds)
      setSelectedServices(serviceIds)
    } catch (error) {
      console.error('Error loading property facilities/services:', error)
      setSelectedFacilities([])
      setSelectedServices([])
    }
    setValue('title_en', property.title_en)
    setValue('description_ar', property.description_ar || '')
    setValue('description_en', property.description_en || '')
    setValue('address_ar', property.address_ar || '')
    setValue('address_en', property.address_en || '')
    setValue('location_text', property.location_text || '')
    setValue('latitude', property.latitude || undefined)
    setValue('longitude', property.longitude || undefined)
    setValue('price', property.price || undefined)
    setValue('size', property.size || undefined)
    setValue('baths', property.baths || undefined)
    setValue('floor_no', property.floor_no || undefined)
    setValue('phone_number', property.phone_number || '')
    setValue('status', property.status as any)
    setValue('is_featured', property.is_featured || false)
    setValue('is_rented', property.is_rented || false)
    setValue('is_sold', property.is_sold || false)
    setValue('property_type_id', property.property_type_id || undefined)
    setValue('owner_id', property.owner_id || undefined)
    setValue('section_id', property.section_id || undefined)
    setValue('payment_method_id', property.payment_method_id || undefined)
    setValue('view_type_id', property.view_type_id || undefined)
    setValue('finishing_type_id', property.finishing_type_id || undefined)
    setValue('expired_at', property.expired_at ? new Date(property.expired_at).toISOString().split('T')[0] : undefined)
    setValue('governorate_id', property.governorate_id || undefined)
    setSelectedGovernorate(property.governorate_id || 'none')
    setSelectedArea(property.area_id || 'none')
    setSelectedStreet(property.street_id || 'none')
    setIsDialogOpen(true)
    // Load property images
    const images = await getPropertyImages(property.id)
    setPropertyImages(images)
  }

  const handleDelete = (property: Property) => {
    setPropertyToDelete(property)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (propertyToDelete) {
      deleteMutation.mutate(propertyToDelete.id)
    }
  }

  const canCreate = profile?.role === 'admin' || profile?.role === 'sales'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

  // Query to get images count for all properties
  const { data: allPropertyImages } = useQuery({
    queryKey: ['all-property-images'],
    queryFn: async () => {
      if (!properties) return {}
      const supabase = createClient()
      const { data } = await supabase
        .from('property_images')
        .select('property_id')
      
      if (!data) return {}
      
      const counts: { [key: string]: number } = {}
      data.forEach((img: any) => {
        counts[img.property_id] = (counts[img.property_id] || 0) + 1
      })
      return counts
    },
    enabled: !!properties && !isLoading,
  })

  if (isLoading || !masterData) {
    return <PageSkeleton showHeader showActions={canCreate} showTable tableRows={8} />
  }

  const columns = [
    {
      key: 'code',
      header: t('properties.code'),
      render: (value: string | null) => value || '-',
    },
    {
      key: 'images',
      header: 'Images',
      render: (value: any, row: Property) => {
        const imageCount = allPropertyImages?.[row.id] || 0
        return (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{imageCount}</span>
          </div>
        )
      },
    },
    {
      key: 'title_en',
      header: t('properties.title_en'),
      render: (value: string, row: Property) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.title_ar}</div>
        </div>
      ),
    },
    {
      key: 'price',
      header: t('properties.price'),
      render: (value: number | null) => value ? `$${value.toLocaleString()}` : '-',
    },
    {
      key: 'status',
      header: t('properties.status'),
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'is_featured',
      header: t('properties.isFeatured'),
      render: (value: boolean) => (value ? '⭐' : '-'),
    },
    {
      key: 'created_at',
      header: 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('properties.title')}</h1>
          <p className="text-muted-foreground">Manage real estate properties</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingProperty(null)
            reset()
            setSelectedGovernorate('none')
            setSelectedArea('none')
            setSelectedStreet('none')
            setSelectedFacilities([])
            setSelectedServices([])
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('properties.createProperty')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{t('properties.title')}</CardTitle>
            <div className="flex items-center gap-1 border rounded-md transition-all duration-300 hover:shadow-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3 transition-all duration-200 hover:scale-110"
                title={t('common.tableView') || 'Table View'}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-8 px-3 transition-all duration-200 hover:scale-110"
                title={t('common.cardView') || 'Card View'}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
          <DataTable
            data={properties}
            columns={columns}
            isLoading={isLoading}
            searchKey="title_en"
            searchPlaceholder={t('common.search')}
            actions={(property) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(property)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(property)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4 space-y-3">
                        <div className="h-48 bg-muted rounded" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : properties && properties.length > 0 ? (
                properties.map((property: Property, index: number) => {
                  const propertyImagesData = allPropertyImages?.[property.id] || {}
                  const imagesForProperty: Array<{ id: string; url: string }> = []
                  // We'll need to fetch images for each property - for now, use placeholder
                  const currentImageIndex = propertyImageIndices[property.id] || 0
                  
                  return (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      imageIndex={currentImageIndex}
                      onImageIndexChange={(newIndex) => {
                        setPropertyImageIndices(prev => ({ ...prev, [property.id]: newIndex }))
                      }}
                      imageCount={allPropertyImages?.[property.id] || 0}
                      onEdit={() => handleEdit(property)}
                      onDelete={() => handleDelete(property)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  {t('common.noData') || 'No properties found'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProperty ? t('properties.editProperty') : t('properties.createProperty')}
            </DialogTitle>
            <DialogDescription>
              {editingProperty ? 'Update property information' : 'Create a new property'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  {t('properties.code')} <span className="text-xs text-muted-foreground">(Auto-generated)</span>
                </Label>
                <Input
                  id="code"
                  value={editingProperty?.code || (nextCode || 'Calculating...')}
                  disabled={true}
                  className="bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-semibold cursor-not-allowed"
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  {editingProperty 
                    ? 'Code cannot be changed after creation' 
                    : `Next code that will be assigned: ${nextCode || 'Calculating...'}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('properties.status')}</Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingProperty?.status || 'pending'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('properties.title_ar')}</Label>
                <Input
                  id="title_ar"
                  {...register('title_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.title_ar && (
                  <p className="text-sm text-destructive">{errors.title_ar.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title_en">{t('properties.title_en')}</Label>
                <Input
                  id="title_en"
                  {...register('title_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.title_en && (
                  <p className="text-sm text-destructive">{errors.title_en.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description_ar">{t('properties.description_ar') || 'Description (Arabic)'}</Label>
                <textarea
                  id="description_ar"
                  {...register('description_ar')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_en">{t('properties.description_en') || 'Description (English)'}</Label>
                <textarea
                  id="description_en"
                  {...register('description_en')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_ar">Address (Arabic)</Label>
                <Input
                  id="address_ar"
                  {...register('address_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_en">Address (English)</Label>
                <Input
                  id="address_en"
                  {...register('address_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="governorate_id">{t('properties.governorate')}</Label>
                <SearchableSelect
                  value={selectedGovernorate}
                  onValueChange={(value) => {
                    setSelectedGovernorate(value)
                    setSelectedArea('none')
                    setSelectedStreet('none')
                    setValue('governorate_id', value === 'none' ? null : value)
                    setValue('area_id', null)
                    setValue('street_id', null)
                  }}
                  placeholder="Select governorate"
                  searchPlaceholder="Search governorates..."
                  disabled={createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Governorate' },
                    ...(masterData?.governorates.map((gov: any) => ({
                      value: gov.id,
                      label: `${gov.name_en} / ${gov.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_id">{t('properties.area')}</Label>
                <SearchableSelect
                  value={selectedArea}
                  onValueChange={(value) => {
                    setSelectedArea(value)
                    setSelectedStreet('none')
                    setValue('area_id', value === 'none' ? null : value)
                    setValue('street_id', null)
                  }}
                  placeholder="Select area"
                  searchPlaceholder="Search areas..."
                  disabled={selectedGovernorate === 'none' || createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Area' },
                    ...(areas?.map((area: any) => ({
                      value: area.id,
                      label: `${area.name_en} / ${area.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street_id">Street</Label>
                <SearchableSelect
                  value={selectedStreet}
                  onValueChange={(value) => {
                    setSelectedStreet(value)
                    setValue('street_id', value === 'none' ? null : value)
                  }}
                  placeholder="Select street"
                  searchPlaceholder="Search streets..."
                  disabled={selectedArea === 'none' || createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Street' },
                    ...(streets?.map((street: any) => ({
                      value: street.id,
                      label: `${street.name_en} / ${street.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_type_id">{t('properties.propertyType')}</Label>
                <SearchableSelect
                  value={watch('property_type_id') || 'none'}
                  onValueChange={(value) => setValue('property_type_id', value === 'none' ? null : value)}
                  placeholder="Select type"
                  searchPlaceholder="Search property types..."
                  disabled={createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Type' },
                    ...(masterData?.propertyTypes.map((type: any) => ({
                      value: type.id,
                      label: `${type.name_en} / ${type.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_id">Property Owner</Label>
                <SearchableSelect
                  value={watch('owner_id') || 'none'}
                  onValueChange={(value) => setValue('owner_id', value === 'none' ? null : value)}
                  placeholder="Select owner"
                  searchPlaceholder="Search owners..."
                  disabled={createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Owner' },
                    ...(masterData?.propertyOwners.map((owner: any) => ({
                      value: owner.id,
                      label: `${owner.name}${owner.email ? ` (${owner.email})` : ''}`,
                    })) || []),
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="section_id">Section</Label>
                <SearchableSelect
                  value={watch('section_id') || 'none'}
                  onValueChange={(value) => setValue('section_id', value === 'none' ? null : value)}
                  placeholder="Select section"
                  searchPlaceholder="Search sections..."
                  disabled={createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Section' },
                    ...(masterData?.sections.map((section: any) => ({
                      value: section.id,
                      label: `${section.name_en} / ${section.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method_id">Payment Method</Label>
                <SearchableSelect
                  value={watch('payment_method_id') || 'none'}
                  onValueChange={(value) => setValue('payment_method_id', value === 'none' ? null : value)}
                  placeholder="Select payment method"
                  searchPlaceholder="Search payment methods..."
                  disabled={createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Payment Method' },
                    ...(masterData?.paymentMethods.map((method: any) => ({
                      value: method.id,
                      label: `${method.name_en} / ${method.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="view_type_id">View Type</Label>
                <SearchableSelect
                  value={watch('view_type_id') || 'none'}
                  onValueChange={(value) => setValue('view_type_id', value === 'none' ? null : value)}
                  placeholder="Select view type"
                  searchPlaceholder="Search view types..."
                  disabled={createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No View Type' },
                    ...(masterData?.viewTypes.map((type: any) => ({
                      value: type.id,
                      label: `${type.name_en} / ${type.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finishing_type_id">Finishing Type</Label>
                <SearchableSelect
                  value={watch('finishing_type_id') || 'none'}
                  onValueChange={(value) => setValue('finishing_type_id', value === 'none' ? null : value)}
                  placeholder="Select finishing type"
                  searchPlaceholder="Search finishing types..."
                  disabled={createMutation.isPending || updateMutation.isPending}
                  options={[
                    { value: 'none', label: 'No Finishing Type' },
                    ...(masterData?.finishingTypes.map((type: any) => ({
                      value: type.id,
                      label: `${type.name_en} / ${type.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>
            </div>

            <div className="space-y-4">
              <GoogleMapsLocation
                locationText={watch('location_text') || ''}
                latitude={watch('latitude')}
                longitude={watch('longitude')}
                onLocationChange={(locationText, lat, lng) => {
                  setValue('location_text', locationText)
                  setValue('latitude', lat)
                  setValue('longitude', lng)
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  {...register('phone_number')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">{t('properties.price')}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">{t('properties.size') || 'Size (m²)'}</Label>
                <Input
                  id="size"
                  type="number"
                  step="0.01"
                  {...register('size', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baths">{t('properties.baths') || 'Baths'}</Label>
                <Input
                  id="baths"
                  type="number"
                  {...register('baths', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor_no">{t('properties.floorNo') || 'Floor No'}</Label>
                <Input
                  id="floor_no"
                  type="number"
                  {...register('floor_no', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expired_at">Expired At</Label>
                <Input
                  id="expired_at"
                  type="date"
                  {...register('expired_at')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={isFeatured}
                  onChange={(e) => setValue('is_featured', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_featured">{t('properties.isFeatured')}</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_rented"
                  checked={isRented}
                  onChange={(e) => setValue('is_rented', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_rented">Is Rented</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_sold"
                  checked={isSold}
                  onChange={(e) => setValue('is_sold', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_sold">Is Sold</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Property Facilities</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-4">
                  {masterData?.facilities && masterData.facilities.length > 0 ? (
                    masterData.facilities.map((facility: any) => (
                      <div key={facility.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`facility-${facility.id}`}
                          checked={selectedFacilities.includes(facility.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFacilities([...selectedFacilities, facility.id])
                            } else {
                              setSelectedFacilities(selectedFacilities.filter(id => id !== facility.id))
                            }
                          }}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={`facility-${facility.id}`} className="font-normal cursor-pointer">
                          {facility.name_en} / {facility.name_ar}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No facilities available</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Property Services</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-4">
                  {masterData?.services && masterData.services.length > 0 ? (
                    masterData.services.map((service: any) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices([...selectedServices, service.id])
                            } else {
                              setSelectedServices(selectedServices.filter(id => id !== service.id))
                            }
                          }}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={`service-${service.id}`} className="font-normal cursor-pointer">
                          {service.name_en} / {service.name_ar}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No services available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Property Images Upload */}
            {editingProperty?.id && (
              <div className="space-y-4">
                <PropertyImageUpload
                  propertyId={editingProperty.id}
                  images={propertyImages}
                  onImagesChange={setPropertyImages}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingProperty(null)
                  reset()
                  setSelectedGovernorate('none')
                  setSelectedArea('none')
                  setSelectedStreet('none')
                  setSelectedFacilities([])
                  setSelectedServices([])
                  setPropertyImages([])
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
              {t('properties.deleteProperty') || `Are you sure you want to delete property "${propertyToDelete?.title_en || propertyToDelete?.title_ar || propertyToDelete?.code || 'Untitled Property'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>
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


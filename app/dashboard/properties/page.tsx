'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, Image as ImageIcon, Grid3x3, List, ChevronLeft, ChevronRight, Building2, MapPin, DollarSign, Settings, Star, Calendar, Phone, Home, Users, CreditCard, Eye, Paintbrush, Layers, Filter, ChevronDown, ChevronUp, X, Youtube, FileText } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
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
import { PhoneInputField } from '@/components/ui/phone-input'
import { GoogleMapsLocation } from '@/components/ui/google-maps-location'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { PropertyImageUpload } from '@/components/ui/property-image-upload'
import { DailyRentPricing, type DailyRentPricingItem } from '@/components/ui/daily-rent-pricing'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'

const dailyRentPricingItemSchema = z.object({
  from_date: z.string().min(1, 'From date is required'),
  to_date: z.string().min(1, 'To date is required'),
  monday: z.number().min(0).default(0),
  tuesday: z.number().min(0).default(0),
  wednesday: z.number().min(0).default(0),
  thursday: z.number().min(0).default(0),
  friday: z.number().min(0).default(0),
  saturday: z.number().min(0).default(0),
  sunday: z.number().min(0).default(0),
})

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
  daily_rent_pricing: z.array(dailyRentPricingItemSchema).optional().nullable(),
  sale_price: z.number().optional().nullable(),
  rent_price: z.number().optional().nullable(),
  rental_period: z.enum(['monthly', 'weekly', 'yearly']).optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
  size: z.number().optional().nullable(),
  baths: z.number().int().optional().nullable(),
  floor_no: z.number().int().optional().nullable(),
  no_of_receptions: z.number().int().optional().nullable(),
  no_of_rooms: z.number().int().optional().nullable(),
  building_no: z.string().optional().nullable(),
  apartment_no: z.string().optional().nullable(),
  youtube_url: z.string().url('Invalid YouTube URL').optional().nullable().or(z.literal('')),
  property_note: z.string().optional().nullable(),
  view_type_id: z.string().uuid().optional().nullable(),
  finishing_type_id: z.string().uuid().optional().nullable(),
  phone_number: z.string().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'rejected', 'deleted', 'expired', 'rented', 'sold']),
  is_featured: z.boolean().default(false),
  is_rented: z.boolean().default(false),
  is_sold: z.boolean().default(false),
  rental_end_date: z.string().optional().nullable(),
})

type PropertyForm = z.infer<typeof propertySchema>

interface Property {
  id: string
  code: string | null
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  address_ar: string | null
  address_en: string | null
  price: number | null
  sale_price: number | null
  rent_price: number | null
  rental_period: string | null
  daily_rent_pricing: any | null
  section_id: string | null
  size: number | null
  baths: number | null
  floor_no: number | null
  no_of_receptions: number | null
  no_of_rooms: number | null
  building_no: string | null
  apartment_no: string | null
  youtube_url: string | null
  property_note: string | null
  status: string
  is_featured: boolean
  is_rented: boolean
  is_sold: boolean
  rental_end_date: string | null
  property_type_id: string | null
  governorate_id: string | null
  area_id: string | null
  street_id: string | null
  owner_id: string | null
  view_type_id: string | null
  finishing_type_id: string | null
  payment_method_id: string | null
  location_text: string | null
  latitude: number | null
  longitude: number | null
  phone_number: string | null
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
    .limit(1000) // Limit to prevent memory issues with large datasets

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
    daily_rent_pricing: dbPropertyData.daily_rent_pricing || null,
    sale_price: dbPropertyData.sale_price ?? null,
    rent_price: dbPropertyData.rent_price ?? null,
    rental_period: dbPropertyData.rental_period ?? null,
    size: dbPropertyData.size ?? null,
    baths: dbPropertyData.baths ?? null,
    floor_no: dbPropertyData.floor_no ?? null,
    no_of_receptions: dbPropertyData.no_of_receptions ?? null,
    no_of_rooms: dbPropertyData.no_of_rooms ?? null,
    building_no: dbPropertyData.building_no ?? null,
    apartment_no: dbPropertyData.apartment_no ?? null,
    youtube_url: dbPropertyData.youtube_url ?? null,
    property_note: dbPropertyData.property_note ?? null,
    latitude: dbPropertyData.latitude ?? null,
    longitude: dbPropertyData.longitude ?? null,
    status: dbPropertyData.status || 'pending',
    is_featured: dbPropertyData.is_featured ?? false,
    is_rented: dbPropertyData.is_rented ?? false,
    is_sold: dbPropertyData.is_sold ?? false,
    rental_end_date: dbPropertyData.rental_end_date || null,
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
  const updateData: any = {
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
  }
  
  // Handle pricing fields
  if (propertyData.daily_rent_pricing !== undefined) {
    updateData.daily_rent_pricing = propertyData.daily_rent_pricing || null
  }
  if (propertyData.sale_price !== undefined) {
    updateData.sale_price = propertyData.sale_price ?? null
  }
  if (propertyData.rent_price !== undefined) {
    updateData.rent_price = propertyData.rent_price ?? null
  }
  if (propertyData.rental_period !== undefined) {
    updateData.rental_period = propertyData.rental_period ?? null
  }
  if (propertyData.rental_end_date !== undefined) {
    updateData.rental_end_date = propertyData.rental_end_date || null
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

// Component to format price with currency
function PriceCell({ value }: { value: number }) {
  const { formatPrice } = useCurrency()
  return <span>{formatPrice(value)}</span>
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
  sections?: Array<{ id: string; name_ar: string; name_en: string }>
}

function PropertyCard({ property, imageIndex, onImageIndexChange, imageCount, onEdit, onDelete, canEdit, canDelete, sections = [] }: PropertyCardProps) {
  const { formatPrice } = useCurrency()
  
  // Helper function to get the display price based on section
  const getDisplayPrice = () => {
    if (!property.section_id) {
      // No section selected, show default price
      return property.price ? { value: property.price, label: 'Price' } : null
    }

    const section = sections.find((s: any) => s.id === property.section_id)
    if (!section) {
      return property.price ? { value: property.price, label: 'Price' } : null
    }

    const sectionNameEn = section.name_en?.toLowerCase() || ''
    const sectionNameAr = section.name_ar?.toLowerCase() || ''
    
    // Check for daily rent
    const isDailyRent = (sectionNameEn.includes('daily') && sectionNameEn.includes('rent')) || 
                        sectionNameAr.includes('يومي') || sectionNameAr.includes('يومية')
    
    if (isDailyRent && property.daily_rent_pricing) {
      try {
        const pricing = Array.isArray(property.daily_rent_pricing) 
          ? property.daily_rent_pricing 
          : (typeof property.daily_rent_pricing === 'string' ? JSON.parse(property.daily_rent_pricing) : [])
        
        if (pricing.length > 0) {
          // Get the minimum and maximum prices from all date ranges
          const allPrices = pricing.flatMap((range: any) => [
            range.monday, range.tuesday, range.wednesday, range.thursday,
            range.friday, range.saturday, range.sunday
          ]).filter((p: number) => p > 0)
          
          if (allPrices.length > 0) {
            const minPrice = Math.min(...allPrices)
            const maxPrice = Math.max(...allPrices)
            if (minPrice === maxPrice) {
              return { value: minPrice, label: 'Daily Rent' }
            }
            return { value: { min: minPrice, max: maxPrice }, label: 'Daily Rent', isRange: true }
          }
        }
      } catch (e) {
        console.error('Error parsing daily rent pricing:', e)
      }
    }

    // Check for sale or rent
    const isSaleOrRent = (sectionNameEn.includes('sale') && sectionNameEn.includes('rent')) ||
                         (sectionNameAr.includes('بيع') && sectionNameAr.includes('إيجار'))
    
    if (isSaleOrRent) {
      const prices: Array<{ label: string; value: number }> = []
      if (property.sale_price) prices.push({ label: 'Sale', value: property.sale_price })
      if (property.rent_price) prices.push({ label: 'Rent', value: property.rent_price })
      if (prices.length > 0) {
        return { value: prices, label: 'Price', isMultiple: true }
      }
    }

    // Check for sale
    const isSale = sectionNameEn.includes('sale') || sectionNameAr.includes('بيع')
    if (isSale && property.sale_price) {
      return { value: property.sale_price, label: 'Sale Price' }
    }

    // Check for rent
    const isRent = sectionNameEn.includes('rent') || sectionNameAr.includes('إيجار')
    if (isRent && property.rent_price) {
      return { value: property.rent_price, label: 'Rent Price' }
    }

    // Fallback to default price
    return property.price ? { value: property.price, label: 'Price' } : null
  }

  const displayPrice = getDisplayPrice()
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
            <Image
              src={currentImage.url}
              alt={property.title_en || property.title_ar || 'Property'}
              fill
              className="object-cover transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
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
        {displayPrice && (
          <div className="space-y-1">
            {displayPrice.isMultiple ? (
              <div className="space-y-1">
                {(displayPrice.value as Array<{ label: string; value: number }>).map((price, idx) => (
                  <div key={idx} className="text-lg font-semibold text-primary">
                    {price.label}: {formatPrice(price.value)}
                  </div>
                ))}
              </div>
            ) : displayPrice.isRange ? (
              <div className="text-lg font-semibold text-primary">
                {typeof displayPrice.value === 'object' && 'min' in displayPrice.value && 'max' in displayPrice.value
                  ? `${formatPrice(displayPrice.value.min)} - ${formatPrice(displayPrice.value.max)}`
                  : formatPrice(displayPrice.value as number)}
              </div>
            ) : (
              <div className="text-lg font-semibold text-primary">
                {typeof displayPrice.value === 'number' ? formatPrice(displayPrice.value) : String(displayPrice.value || '')}
              </div>
            )}
            {displayPrice.label !== 'Price' && !displayPrice.isMultiple && (
              <p className="text-xs text-muted-foreground">{displayPrice.label}</p>
            )}
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
  const { currency, dollarRate, formatPrice: formatPriceValue } = useCurrency()
  const queryClient = useQueryClient()
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const expandedRowRef = React.useRef<HTMLDivElement>(null)
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('none')
  const [selectedArea, setSelectedArea] = useState<string>('none')
  const [selectedStreet, setSelectedStreet] = useState<string>('none')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null)
  const [nextCode, setNextCode] = useState<string>('')
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [propertyImages, setPropertyImages] = useState<Array<{ id: string; url: string; is_primary?: boolean; order_index?: number }>>([])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [propertyImageIndices, setPropertyImageIndices] = useState<{ [key: string]: number }>({})
  const [dailyRentPricing, setDailyRentPricing] = useState<DailyRentPricingItem[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [cardViewPage, setCardViewPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Helper function to convert EGP to USD for storage
  const convertEGPToUSD = (egpValue: number | null | undefined): number | null => {
    if (egpValue === null || egpValue === undefined || isNaN(egpValue)) return null
    if (currency === 'EGP' && dollarRate > 0) {
      return egpValue / dollarRate
    }
    return egpValue
  }
  
  // Helper function to convert USD to EGP for display
  const convertUSDToEGP = (usdValue: number | null | undefined): number | null => {
    if (usdValue === null || usdValue === undefined || isNaN(usdValue)) return null
    if (currency === 'EGP' && dollarRate > 0) {
      return usdValue * dollarRate
    }
    return usdValue
  }
  
  // Get currency symbol for labels
  const currencySymbol = currency === 'EGP' ? 'EGP' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'SAR' ? 'SAR' : currency === 'AED' ? 'AED' : '$'
  
  // Advanced filter states
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSection, setFilterSection] = useState<string>('all')
  const [filterPropertyType, setFilterPropertyType] = useState<string>('all')
  const [filterGovernorate, setFilterGovernorate] = useState<string>('all')
  const [filterArea, setFilterArea] = useState<string>('all')
  const [filterOwner, setFilterOwner] = useState<string>('all')
  const [filterViewType, setFilterViewType] = useState<string>('all')
  const [filterFinishingType, setFilterFinishingType] = useState<string>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all')
  const [filterIsFeatured, setFilterIsFeatured] = useState<string>('all')
  const [filterIsRented, setFilterIsRented] = useState<string>('all')
  const [filterIsSold, setFilterIsSold] = useState<string>('all')
  const [filterPriceMin, setFilterPriceMin] = useState<string>('')
  const [filterPriceMax, setFilterPriceMax] = useState<string>('')
  const [filterSizeMin, setFilterSizeMin] = useState<string>('')
  const [filterSizeMax, setFilterSizeMax] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  
  // Get filtered areas and streets based on selected governorate/area
  const { data: filterAreas } = useQuery({
    queryKey: ['filter-areas', filterGovernorate],
    queryFn: () => getAreas(filterGovernorate === 'all' ? '' : filterGovernorate),
    enabled: filterGovernorate !== 'all',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - areas don't change frequently
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  })

  const { data: filterStreets } = useQuery({
    queryKey: ['filter-streets', filterArea],
    queryFn: () => getStreets(filterArea === 'all' ? '' : filterArea),
    enabled: filterArea !== 'all',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - streets don't change frequently
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  })
  
  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('properties')

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
    enabled: canView, // Only fetch if user has view permission
    staleTime: 30000, // Cache for 30 seconds - balance between freshness and performance
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  const { data: masterData, refetch: refetchMasterData } = useQuery({
    queryKey: ['properties-master-data'],
    queryFn: getMasterData,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes - master data changes infrequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })

  const { data: areas } = useQuery({
    queryKey: ['areas', selectedGovernorate],
    queryFn: () => getAreas(selectedGovernorate === 'none' ? '' : selectedGovernorate),
    enabled: selectedGovernorate !== 'none',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - areas don't change frequently
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  })

  const { data: streets } = useQuery({
    queryKey: ['streets', selectedArea],
    queryFn: () => getStreets(selectedArea === 'none' ? '' : selectedArea),
    enabled: selectedArea !== 'none',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - streets don't change frequently
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  })

  // Fetch next code when creating new property
  const { data: nextCodeData, refetch: refetchNextCode } = useQuery({
    queryKey: ['next-property-code'],
    queryFn: getNextPropertyCode,
    enabled: isCreating,
    staleTime: 60000, // Cache for 1 minute - code generation can be cached briefly
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  // Update nextCode state when data is fetched
  useEffect(() => {
    if (nextCodeData && isCreating) {
      setNextCode(nextCodeData)
    } else if (expandedRowId) {
      setNextCode('')
    }
  }, [nextCodeData, isCreating, expandedRowId])

  // Refetch next code when creating new property
  useEffect(() => {
    if (isCreating) {
      refetchNextCode()
    }
  }, [isCreating, refetchNextCode])

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setIsCreating(false)
      setExpandedRowId(null)
      // Log activity
      if (data?.id) {
        await ActivityLogger.create('property', data.id, data.title_en || data.title_ar || data.code || 'Untitled Property')
        // Set expanded row to enable image upload
        setExpandedRowId(data.id)
        setIsCreating(false)
        // Load images (will be empty for new property)
        const images = await getPropertyImages(data.id)
        setPropertyImages(images)
      }
      // Keep form open to allow user to upload images
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyForm> & { facilityIds?: string[], serviceIds?: string[] } }) =>
      updateProperty(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['all-property-images'] })
      // Log activity
      const previousProperty = expandedRowId ? properties?.find(p => p.id === expandedRowId) : null
      if (previousProperty && data?.id) {
        await ActivityLogger.update(
          'property',
          data.id,
          data.title_en || data.title_ar || data.code || 'Untitled Property',
          previousProperty,
          data
        )
      }
      // Close form and reset
      setExpandedRowId(null)
      setIsCreating(false)
      reset()
      setFormErrors({})
      setPropertyImages([])
      setDailyRentPricing([])
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
    formState: { errors, touchedFields },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<PropertyForm>({
    resolver: zodResolver(propertySchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
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
  const selectedStatus = watch('status')
  const selectedSectionId = watch('section_id')
  
  // Get selected section to determine pricing fields
  const selectedSection = masterData?.sections.find((s: any) => s.id === selectedSectionId)
  const sectionNameEn = selectedSection?.name_en?.toLowerCase() || ''
  const sectionNameAr = selectedSection?.name_ar?.toLowerCase() || ''
  
  // Determine which pricing fields to show
  const isDailyRent = sectionNameEn.includes('daily') && sectionNameEn.includes('rent') || 
                      sectionNameAr.includes('يومي') || sectionNameAr.includes('يومية')
  const isSaleOrRent = sectionNameEn.includes('sale') && sectionNameEn.includes('rent') ||
                       sectionNameAr.includes('بيع') && sectionNameAr.includes('إيجار')
  const isSale = !isDailyRent && !isSaleOrRent && (sectionNameEn.includes('sale') || sectionNameAr.includes('بيع'))
  const isRent = !isDailyRent && !isSaleOrRent && (sectionNameEn.includes('rent') || sectionNameAr.includes('إيجار'))

  const onSubmit = (data: PropertyForm) => {
    // Convert prices from EGP to USD for storage if currency is EGP
    const convertedDailyRentPricing = isDailyRent && currency === 'EGP' && dollarRate > 0
      ? dailyRentPricing.map(range => ({
          ...range,
          monday: range.monday / dollarRate,
          tuesday: range.tuesday / dollarRate,
          wednesday: range.wednesday / dollarRate,
          thursday: range.thursday / dollarRate,
          friday: range.friday / dollarRate,
          saturday: range.saturday / dollarRate,
          sunday: range.sunday / dollarRate,
        }))
      : (isDailyRent ? dailyRentPricing : null)
    
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
      daily_rent_pricing: convertedDailyRentPricing,
      price: convertEGPToUSD(data.price),
      sale_price: (isSale || isSaleOrRent) ? convertEGPToUSD(data.sale_price) : null,
      rent_price: (isRent || isSaleOrRent) ? convertEGPToUSD(data.rent_price) : null,
      facilityIds: selectedFacilities,
      serviceIds: selectedServices,
    }
    if (expandedRowId && !isCreating) {
      updateMutation.mutate({ id: expandedRowId, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleToggleExpand = React.useCallback(async (property: Property | null, scrollTo = false) => {
    if (expandedRowId === property?.id) {
      // Collapse
      setExpandedRowId(null)
      setIsCreating(false)
      reset()
      setFormErrors({})
      setSelectedGovernorate('none')
      setSelectedArea('none')
      setSelectedStreet('none')
      setSelectedFacilities([])
      setSelectedServices([])
      setPropertyImages([])
      setDailyRentPricing([])
    } else {
      // Expand - fetch fresh data if editing
      let propertyToEdit = property
      if (property) {
        try {
          const supabase = createClient()
          const { data: freshProperty, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', property.id)
            .single()

          if (error) {
            console.error('Error fetching fresh property data:', error)
          } else {
            propertyToEdit = freshProperty as Property
          }
        } catch (error) {
          console.error('Error fetching property:', error)
        }
        setExpandedRowId(property.id)
        setIsCreating(false)
      } else {
        // Creating new property
        setExpandedRowId(null)
        setIsCreating(true)
        refetchMasterData()
        // Reset form for new property
        reset()
        setFormErrors({})
        setSelectedGovernorate('none')
        setSelectedArea('none')
        setSelectedStreet('none')
        setSelectedFacilities([])
        setSelectedServices([])
        setPropertyImages([])
        setDailyRentPricing([])
        setValue('status', 'pending')
        setValue('is_featured', false)
        setValue('is_rented', false)
        setValue('is_sold', false)
        return // Exit early for new property creation
      }
      
      // Only execute the following code when editing (propertyToEdit exists)
      if (!propertyToEdit) return
      
      // Refresh all dropdown lists
      refetchMasterData()
      // Code is read-only, so we don't set it in the form
      setValue('title_ar', propertyToEdit.title_ar)
      
      // Load existing facilities and services
      try {
        const [facilityIds, serviceIds] = await Promise.all([
          getPropertyFacilities(propertyToEdit.id),
          getPropertyServices(propertyToEdit.id),
        ])
        setSelectedFacilities(facilityIds)
        setSelectedServices(serviceIds)
      } catch (error) {
        console.error('Error loading property facilities/services:', error)
        setSelectedFacilities([])
        setSelectedServices([])
      }
      setValue('title_en', propertyToEdit.title_en)
      setValue('description_ar', propertyToEdit.description_ar || '')
      setValue('description_en', propertyToEdit.description_en || '')
      setValue('address_ar', propertyToEdit.address_ar || '')
      setValue('address_en', propertyToEdit.address_en || '')
      setValue('location_text', propertyToEdit.location_text || '')
      setValue('latitude', propertyToEdit.latitude || undefined)
      setValue('longitude', propertyToEdit.longitude || undefined)
      // Convert USD prices to EGP for display if currency is EGP
      setValue('price', convertUSDToEGP(propertyToEdit.price) || undefined)
      setValue('sale_price', convertUSDToEGP(propertyToEdit.sale_price) || undefined)
      setValue('rent_price', convertUSDToEGP(propertyToEdit.rent_price) || undefined)
      const rentalPeriod = propertyToEdit.rental_period
      if (rentalPeriod === 'monthly' || rentalPeriod === 'weekly' || rentalPeriod === 'yearly') {
        setValue('rental_period', rentalPeriod)
      } else {
        setValue('rental_period', undefined)
      }
      
      // Convert daily rent pricing from USD to EGP if currency is EGP
      if (propertyToEdit.daily_rent_pricing && currency === 'EGP' && dollarRate > 0) {
        try {
          const pricing = Array.isArray(propertyToEdit.daily_rent_pricing)
            ? propertyToEdit.daily_rent_pricing
            : (typeof propertyToEdit.daily_rent_pricing === 'string' 
                ? JSON.parse(propertyToEdit.daily_rent_pricing) 
                : [])
          
          const convertedPricing = pricing.map((range: any) => ({
            ...range,
            monday: range.monday * dollarRate,
            tuesday: range.tuesday * dollarRate,
            wednesday: range.wednesday * dollarRate,
            thursday: range.thursday * dollarRate,
            friday: range.friday * dollarRate,
            saturday: range.saturday * dollarRate,
            sunday: range.sunday * dollarRate,
          }))
          setDailyRentPricing(convertedPricing)
        } catch (e) {
          console.error('Error loading daily_rent_pricing:', e)
          setDailyRentPricing([])
        }
      } else {
        // Load daily rent pricing (no conversion needed)
        if (propertyToEdit.daily_rent_pricing) {
          try {
            const pricing = propertyToEdit.daily_rent_pricing
            setDailyRentPricing(Array.isArray(pricing) ? pricing : [])
          } catch (e) {
            console.error('Error loading daily_rent_pricing:', e)
            setDailyRentPricing([])
          }
        } else {
          setDailyRentPricing([])
        }
      }
      setValue('size', propertyToEdit.size || undefined)
      setValue('baths', propertyToEdit.baths || undefined)
      setValue('floor_no', propertyToEdit.floor_no || undefined)
      setValue('no_of_receptions', propertyToEdit.no_of_receptions || undefined)
      setValue('no_of_rooms', propertyToEdit.no_of_rooms || undefined)
      setValue('building_no', propertyToEdit.building_no || '')
      setValue('apartment_no', propertyToEdit.apartment_no || '')
      setValue('youtube_url', propertyToEdit.youtube_url || '')
      setValue('property_note', propertyToEdit.property_note || '')
      setValue('phone_number', propertyToEdit.phone_number || '')
      setValue('status', propertyToEdit.status as any)
      setValue('is_featured', propertyToEdit.is_featured || false)
      setValue('is_rented', propertyToEdit.is_rented || false)
      setValue('is_sold', propertyToEdit.is_sold || false)
      setValue('rental_end_date', propertyToEdit.rental_end_date ? new Date(propertyToEdit.rental_end_date).toISOString().split('T')[0] : undefined)
      setValue('property_type_id', propertyToEdit.property_type_id || undefined)
      setValue('owner_id', propertyToEdit.owner_id || undefined)
      setValue('section_id', propertyToEdit.section_id || undefined)
      setValue('payment_method_id', propertyToEdit.payment_method_id || undefined)
      setValue('view_type_id', propertyToEdit.view_type_id || undefined)
      setValue('finishing_type_id', propertyToEdit.finishing_type_id || undefined)
      setValue('governorate_id', propertyToEdit.governorate_id || undefined)
      
      setSelectedGovernorate(propertyToEdit.governorate_id || 'none')
      setSelectedArea(propertyToEdit.area_id || 'none')
      setSelectedStreet(propertyToEdit.street_id || 'none')
      // Load property images
      const images = await getPropertyImages(propertyToEdit.id)
      setPropertyImages(images)
      
      if (scrollTo) {
        setTimeout(() => {
          expandedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Also scroll window to top for better UX
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
      } else if (!property) {
        // When creating new, always scroll to top
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
      }
    }
  }, [expandedRowId, reset, setValue, currency, dollarRate, refetchMasterData])
  
  const handleEdit = (property: Property) => {
    handleToggleExpand(property, true)
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

  // Reset pagination when filters change - MUST be before any conditional returns
  useEffect(() => {
    setCardViewPage(1)
  }, [
    filterStatus,
    filterSection,
    filterPropertyType,
    filterGovernorate,
    filterArea,
    filterOwner,
    filterViewType,
    filterFinishingType,
    filterPaymentMethod,
    filterIsFeatured,
    filterIsRented,
    filterIsSold,
    filterPriceMin,
    filterPriceMax,
    filterSizeMin,
    filterSizeMax,
    filterDateFrom,
    filterDateTo,
    viewMode, // Reset when switching between table and card view
  ])

  // Filter properties based on advanced filters - MUST be before any conditional returns
  const filteredProperties = React.useMemo(() => {
    if (!properties) return []
    
    return properties.filter((property: Property) => {
      // Status filter
      if (filterStatus !== 'all' && property.status !== filterStatus) return false
      
      // Section filter
      if (filterSection !== 'all' && property.section_id !== filterSection) return false
      
      // Property type filter
      if (filterPropertyType !== 'all' && property.property_type_id !== filterPropertyType) return false
      
      // Governorate filter
      if (filterGovernorate !== 'all' && property.governorate_id !== filterGovernorate) return false
      
      // Area filter
      if (filterArea !== 'all' && property.area_id !== filterArea) return false
      
      // Owner filter
      if (filterOwner !== 'all' && property.owner_id !== filterOwner) return false
      
      // View type filter
      if (filterViewType !== 'all' && property.view_type_id !== filterViewType) return false
      
      // Finishing type filter
      if (filterFinishingType !== 'all' && property.finishing_type_id !== filterFinishingType) return false
      
      // Payment method filter
      if (filterPaymentMethod !== 'all' && property.payment_method_id !== filterPaymentMethod) return false
      
      // Featured filter
      if (filterIsFeatured !== 'all') {
        const isFeatured = filterIsFeatured === 'yes'
        if (property.is_featured !== isFeatured) return false
      }
      
      // Rented filter
      if (filterIsRented !== 'all') {
        const isRented = filterIsRented === 'yes'
        if (property.is_rented !== isRented) return false
      }
      
      // Sold filter
      if (filterIsSold !== 'all') {
        const isSold = filterIsSold === 'yes'
        if (property.is_sold !== isSold) return false
      }
      
      // Price range filter
      if (filterPriceMin) {
        const minPrice = parseFloat(filterPriceMin)
        if (!isNaN(minPrice)) {
          const propertyPrice = property.price || property.sale_price || property.rent_price || 0
          if (propertyPrice < minPrice) return false
        }
      }
      if (filterPriceMax) {
        const maxPrice = parseFloat(filterPriceMax)
        if (!isNaN(maxPrice)) {
          const propertyPrice = property.price || property.sale_price || property.rent_price || 0
          if (propertyPrice > maxPrice) return false
        }
      }
      
      // Size range filter
      if (filterSizeMin && property.size) {
        const minSize = parseFloat(filterSizeMin)
        if (!isNaN(minSize) && property.size < minSize) return false
      }
      if (filterSizeMax && property.size) {
        const maxSize = parseFloat(filterSizeMax)
        if (!isNaN(maxSize) && property.size > maxSize) return false
      }
      
      // Date range filter
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom)
        const createdDate = new Date(property.created_at)
        if (createdDate < fromDate) return false
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999) // Include entire day
        const createdDate = new Date(property.created_at)
        if (createdDate > toDate) return false
      }
      
      return true
    })
  }, [
    properties,
    filterStatus,
    filterSection,
    filterPropertyType,
    filterGovernorate,
    filterArea,
    filterOwner,
    filterViewType,
    filterFinishingType,
    filterPaymentMethod,
    filterIsFeatured,
    filterIsRented,
    filterIsSold,
    filterPriceMin,
    filterPriceMax,
    filterSizeMin,
    filterSizeMax,
    filterDateFrom,
    filterDateTo,
  ])

  // Ensure cardViewPage doesn't exceed total pages when itemsPerPage or filteredProperties changes
  useEffect(() => {
    if (filteredProperties && filteredProperties.length > 0) {
      const totalPages = Math.max(1, Math.ceil(filteredProperties.length / itemsPerPage))
      if (cardViewPage > totalPages && totalPages > 0) {
        setCardViewPage(totalPages)
      }
    }
  }, [itemsPerPage, filteredProperties, cardViewPage])

  // Query to get images count for all properties - MUST be before any conditional returns
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
    enabled: !!properties && !isLoading && canView,
  })

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
              {t('properties.noPermission') || 'You do not have permission to view properties.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
      render: (value: number | null) => {
        if (!value) return '-'
        // We'll create a component that uses the currency hook
        return <PriceCell value={value} />
      },
    },
    {
      key: 'no_of_rooms',
      header: t('properties.noOfRooms') || 'Rooms',
      render: (value: number | null) => {
        if (!value) return '-'
        if (value > 100) return t('properties.moreThan100') || 'More than 100'
        return value.toString()
      },
    },
    {
      key: 'no_of_receptions',
      header: t('properties.noOfReceptions') || 'Receptions',
      render: (value: number | null) => {
        if (!value) return '-'
        if (value > 100) return t('properties.moreThan100') || 'More than 100'
        return value.toString()
      },
    },
    {
      key: 'building_no',
      header: t('properties.buildingNo') || 'Building No',
      render: (value: string | null) => value || '-',
    },
    {
      key: 'apartment_no',
      header: t('properties.apartmentNo') || 'Apartment No',
      render: (value: string | null) => value || '-',
    },
    {
      key: 'youtube_url',
      header: t('properties.youtubeUrl') || 'YouTube URL',
      render: (value: string | null, row: Property) => {
        if (!value) return '-'
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            <Youtube className="h-4 w-4" />
            <span className="truncate max-w-[200px]">View Video</span>
          </a>
        )
      },
    },
    {
      key: 'property_note',
      header: t('properties.propertyNote') || 'Property Note',
      render: (value: string | null) => {
        if (!value) return '-'
        return (
          <div className="max-w-[300px] truncate" title={value}>
            {value}
          </div>
        )
      },
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
          <Button 
            onClick={() => {
              handleToggleExpand(null)
            }}
            className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('properties.createProperty')}
          </Button>
        )}
      </div>

      {/* Expandable Form Section - At the Top */}
      {(expandedRowId || isCreating) && (
        <div 
          ref={expandedRowRef}
          className="animate-in slide-in-from-top-4 fade-in-0 duration-300 ease-out"
        >
          <Card className="border border-border/50 shadow-lg mb-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardHeader className="border-b border-border/50 bg-muted/30 px-8 py-6   z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground tracking-tight">
                      {expandedRowId ? t('properties.editProperty') : t('properties.createProperty')}
                    </CardTitle>
                    <p className="text-sm mt-1 text-muted-foreground font-normal">
                      {expandedRowId ? 'Update property information and settings' : 'Fill in the details to create a new property listing'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleExpand(null)}
                  className="h-8 w-8 rounded-md transition-all duration-200 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 overflow-x-hidden" style={{
              scrollBehavior: 'smooth',
            }}>
              <form
                onSubmit={handleSubmit(
                  (data) => {
                    setFormErrors({})
                    onSubmit(data)
                  },
                  (errors) => {
                    // Map errors to user-friendly field names
                    const fieldLabels: Record<string, string> = {
                      title_ar: 'Title (Arabic)',
                      title_en: 'Title (English)',
                      description_ar: 'Description (Arabic)',
                      description_en: 'Description (English)',
                      address_ar: 'Address (Arabic)',
                      address_en: 'Address (English)',
                      governorate_id: 'Governorate',
                      area_id: 'Area',
                      street_id: 'Street',
                      property_type_id: 'Property Type',
                      section_id: 'Section',
                      price: 'Price',
                      sale_price: 'Sale Price',
                      rent_price: 'Rent Price',
                      rental_period: 'Rental Period',
                      owner_id: 'Property Owner',
                      payment_method_id: 'Payment Method',
                      view_type_id: 'View Type',
                      finishing_type_id: 'Finishing Type',
                      phone_number: 'Phone Number',
                      status: 'Status',
                      youtube_url: 'YouTube URL',
                    }
                    
                    const errorMessages: Record<string, string> = {}
                    Object.keys(errors).forEach((key) => {
                      const error = errors[key as keyof typeof errors]
                      if (error?.message) {
                        errorMessages[key] = error.message
                      } else {
                        errorMessages[key] = `${fieldLabels[key] || key} is required`
                      }
                    })
                    
                    setFormErrors(errorMessages)
                    
                    // Scroll to first error field
                    const firstErrorField = Object.keys(errors)[0]
                    if (firstErrorField) {
                      setTimeout(() => {
                        const element = document.getElementById(firstErrorField)
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          element.focus()
                        }
                      }, 100)
                    }
                    
                    // Show toast with error summary
                    const missingFields = Object.keys(errorMessages).map(key => fieldLabels[key] || key).join(', ')
                    toast({
                      title: t('common.error') || 'Validation Error',
                      description: `Please fill in the following required fields: ${missingFields}`,
                      variant: 'destructive',
                      duration: 5000,
                    })
                  }
                )} 
                className="space-y-6"
              >
                {/* Validation Errors Alert */}
                {Object.keys(formErrors).length > 0 && (
                  <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <X className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-destructive mb-2">
                          {t('common.validationError') || 'Please fix the following errors before saving:'}
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {Object.entries(formErrors).map(([field, message]) => {
                            const fieldLabels: Record<string, string> = {
                              title_ar: 'Title (Arabic)',
                              title_en: 'Title (English)',
                              description_ar: 'Description (Arabic)',
                              description_en: 'Description (English)',
                              address_ar: 'Address (Arabic)',
                              address_en: 'Address (English)',
                              governorate_id: 'Governorate',
                              area_id: 'Area',
                              street_id: 'Street',
                              property_type_id: 'Property Type',
                              section_id: 'Section',
                              price: 'Price',
                              sale_price: 'Sale Price',
                              rent_price: 'Rent Price',
                              rental_period: 'Rental Period',
                              owner_id: 'Property Owner',
                              payment_method_id: 'Payment Method',
                              view_type_id: 'View Type',
                              finishing_type_id: 'Finishing Type',
                              phone_number: 'Phone Number',
                              status: 'Status',
                              youtube_url: 'YouTube URL',
                            }
                            return (
                              <li key={field} className="text-sm text-destructive">
                                <strong>{fieldLabels[field] || field}:</strong> {message}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormErrors({})}
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {/* Basic Information */}
                <Card className="border border-border/50 bg-card shadow-sm">
                  <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <Label htmlFor="code" className="text-sm font-medium text-foreground">
                          {t('properties.code')} <span className="text-xs font-normal text-muted-foreground">(Auto-generated)</span>
                        </Label>
                        <Input
                          id="code"
                          value={expandedRowId ? (properties?.find(p => p.id === expandedRowId)?.code || '-') : (nextCode || 'Calculating...')}
                          disabled={true}
                          className="bg-muted/50 border-border/50 text-foreground font-medium cursor-not-allowed"
                          readOnly
                        />
                        <p className="text-xs text-muted-foreground font-normal">
                          {expandedRowId 
                            ? 'Code cannot be changed after creation' 
                            : `Next code that will be assigned: ${nextCode || 'Calculating...'}`}
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="status" className="text-sm font-medium text-foreground">{t('properties.status')}</Label>
                        <Select
                          onValueChange={(value) => setValue('status', value as any)}
                          value={selectedStatus || 'pending'}
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">{t('common.pending') || 'Pending'}</SelectItem>
                            <SelectItem value="active">{t('common.active') || 'Active'}</SelectItem>
                            <SelectItem value="inactive">{t('common.inactive') || 'Inactive'}</SelectItem>
                            <SelectItem value="rejected">{t('common.rejected') || 'Rejected'}</SelectItem>
                            <SelectItem value="deleted">{t('common.deleted') || 'Deleted'}</SelectItem>
                            <SelectItem value="expired">{t('common.expired') || 'Expired'}</SelectItem>
                            <SelectItem value="rented">{t('common.rented') || 'Rented'}</SelectItem>
                            <SelectItem value="sold">{t('common.sold') || 'Sold'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

            {/* Property Details */}
            <Card className="border border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="title_ar" className="text-sm font-medium text-foreground">
                      {t('properties.title_ar')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title_ar"
                      {...register('title_ar')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className={cn(
                        "transition-all duration-200",
                        errors.title_ar && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {errors.title_ar && (
                      <p className="text-sm text-destructive font-normal">{errors.title_ar.message}</p>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="title_en" className="text-sm font-medium text-foreground">
                      {t('properties.title_en')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title_en"
                      {...register('title_en')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className={cn(
                        "transition-all duration-200",
                        errors.title_en && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {errors.title_en && (
                      <p className="text-sm text-destructive font-normal">{errors.title_en.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="description_ar" className="text-sm font-medium text-foreground">{t('properties.description_ar') || 'Description (Arabic)'}</Label>
                    <textarea
                      id="description_ar"
                      {...register('description_ar')}
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                        errors.description_ar && "border-destructive focus-visible:ring-destructive"
                      )}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                    {errors.description_ar && (
                      <p className="text-sm text-destructive font-normal">{errors.description_ar.message}</p>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="description_en" className="text-sm font-medium text-foreground">{t('properties.description_en') || 'Description (English)'}</Label>
                    <textarea
                      id="description_en"
                      {...register('description_en')}
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                        errors.description_en && "border-destructive focus-visible:ring-destructive"
                      )}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                    {errors.description_en && (
                      <p className="text-sm text-destructive font-normal">{errors.description_en.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="address_ar" className="text-sm font-medium text-foreground">Address (Arabic)</Label>
                    <Input
                      id="address_ar"
                      {...register('address_ar')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="address_en" className="text-sm font-medium text-foreground">Address (English)</Label>
                    <Input
                      id="address_en"
                      {...register('address_en')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="transition-all duration-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="border border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-4 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="governorate_id" className="text-sm font-medium text-foreground">{t('properties.governorate')}</Label>
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

                  <div className="space-y-2.5">
                    <Label htmlFor="area_id" className="text-sm font-medium text-foreground">{t('properties.area')}</Label>
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

                  <div className="space-y-2.5">
                    <Label htmlFor="street_id" className="text-sm font-medium text-foreground">Street</Label>
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

                  <div className="space-y-2.5">
                    <Label htmlFor="property_type_id" className="text-sm font-medium text-foreground">{t('properties.propertyType')}</Label>
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
              </CardContent>
            </Card>

            {/* Section & Pricing */}
            <Card className="border border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Section & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                    <div className="space-y-2.5">
                  <Label htmlFor="section_id" className="text-sm font-medium text-foreground">Section *</Label>
                  <SearchableSelect
                    value={watch('section_id') || 'none'}
                    onValueChange={(value) => {
                      setValue('section_id', value === 'none' ? null : value)
                      // Reset daily rent pricing when section changes away from daily rent
                      const newSection = masterData?.sections.find((s: any) => s.id === value)
                      const newSectionNameEn = newSection?.name_en?.toLowerCase() || ''
                      const newSectionNameAr = newSection?.name_ar?.toLowerCase() || ''
                      const isNewDailyRent = (newSectionNameEn.includes('daily') && newSectionNameEn.includes('rent')) || 
                                            newSectionNameAr.includes('يومي') || newSectionNameAr.includes('يومية')
                      if (!isNewDailyRent) {
                        setDailyRentPricing([])
                      }
                    }}
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
                  <p className="text-xs text-muted-foreground">Select a section to configure pricing options</p>
                </div>

                {/* Conditional Pricing Fields Based on Section */}
                {isDailyRent && (
                  <div className="mt-4 p-6 bg-muted/30 rounded-lg border border-border/50">
                    <DailyRentPricing
                      value={dailyRentPricing}
                      onChange={setDailyRentPricing}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      currencySymbol={currencySymbol}
                    />
                  </div>
                )}

                {(isSaleOrRent || isSale || isRent) && (
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    {(isSale || isSaleOrRent) && (
                      <div className="space-y-2.5">
                        <Label htmlFor="sale_price" className="text-sm font-medium text-foreground flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Sale Price ({currencySymbol})
                        </Label>
                        <Input
                          id="sale_price"
                          type="number"
                          step="0.01"
                          {...register('sale_price', { valueAsNumber: true })}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="transition-all duration-200"
                          placeholder={`Enter price in ${currencySymbol}`}
                        />
                      </div>
                    )}
                    {(isRent || isSaleOrRent) && (
                      <div className="space-y-2.5">
                        <Label htmlFor="rent_price" className="text-sm font-medium text-foreground flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Rent Price ({currencySymbol})
                        </Label>
                        <Input
                          id="rent_price"
                          type="number"
                          step="0.01"
                          {...register('rent_price', { valueAsNumber: true })}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="transition-all duration-200"
                          placeholder={`Enter price in ${currencySymbol}`}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Rental Period - shown only for rent sections */}
                {(isRent || isSaleOrRent) && (
                  <div className="mt-4">
                    <div className="space-y-2.5">
                      <Label htmlFor="rental_period" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {t('properties.rentalPeriod') || 'Rental Period'}
                      </Label>
                      <Select
                        value={watch('rental_period') || ''}
                        onValueChange={(value) => setValue('rental_period', value === '' ? null : value as any)}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('properties.selectRentalPeriod') || 'Select rental period'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">{t('properties.monthly') || 'Monthly'}</SelectItem>
                          <SelectItem value="weekly">{t('properties.weekly') || 'Weekly'}</SelectItem>
                          <SelectItem value="yearly">{t('properties.yearly') || 'Yearly'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Default price field (shown when no specific pricing is needed) */}
                {!isDailyRent && !isSaleOrRent && !isSale && !isRent && (
                  <div className="mt-4">
                    <Label htmlFor="price" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {t('properties.price')} ({currencySymbol})
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      {...register('price', { valueAsNumber: true })}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="transition-all duration-200 mt-2"
                      placeholder={`Enter price in ${currencySymbol}`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Specifications */}
            <Card className="border border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Property Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="owner_id" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Property Owner
                    </Label>
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

                  <div className="space-y-2.5">
                    <Label htmlFor="payment_method_id" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Payment Method
                    </Label>
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

                  <div className="space-y-2.5">
                    <Label htmlFor="phone_number" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <PhoneInputField
                      id="phone_number"
                      name="phone_number"
                      value={watch('phone_number') || ''}
                      onChange={(value) => setValue('phone_number', value, { shouldValidate: true })}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      placeholder={t('properties.phonePlaceholder') || 'Enter phone number'}
                      error={!!errors.phone_number}
                    />
                    {errors.phone_number && (
                      <p className="text-sm text-destructive font-normal">{errors.phone_number.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="view_type_id" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      View Type
                    </Label>
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

                  <div className="space-y-2.5">
                    <Label htmlFor="finishing_type_id" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Paintbrush className="h-4 w-4 text-muted-foreground" />
                      Finishing Type
                    </Label>
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

                {/* Group 1: Size, Baths, Number of Rooms, Number of Receptions */}
                <div className="grid grid-cols-4 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="size" className="text-sm font-medium text-foreground">{t('properties.size') || 'Size (m²)'}</Label>
                    <Input
                      id="size"
                      type="number"
                      step="0.01"
                      {...register('size', { valueAsNumber: true })}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="baths" className="text-sm font-medium text-foreground">{t('properties.baths') || 'Baths'}</Label>
                    <Select
                      value={watch('baths') !== undefined && watch('baths') !== null 
                        ? (watch('baths')! > 100 ? 'more_than_100' : watch('baths')!.toString())
                        : ''}
                      onValueChange={(value) => {
                        if (value === 'more_than_100') {
                          setValue('baths', 101, { shouldValidate: true })
                        } else if (value === '') {
                          setValue('baths', undefined, { shouldValidate: true })
                        } else {
                          setValue('baths', parseInt(value), { shouldValidate: true })
                        }
                      }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('properties.baths') || 'Select baths'} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                        <SelectItem value="more_than_100">
                          {t('properties.moreThan100') || 'More than 100'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="no_of_rooms" className="text-sm font-medium text-foreground">{t('properties.noOfRooms') || 'Number of Rooms'}</Label>
                    <Select
                      value={watch('no_of_rooms') !== undefined && watch('no_of_rooms') !== null 
                        ? (watch('no_of_rooms')! > 100 ? 'more_than_100' : watch('no_of_rooms')!.toString())
                        : ''}
                      onValueChange={(value) => {
                        if (value === 'more_than_100') {
                          setValue('no_of_rooms', 101, { shouldValidate: true })
                        } else if (value === '') {
                          setValue('no_of_rooms', undefined, { shouldValidate: true })
                        } else {
                          setValue('no_of_rooms', parseInt(value), { shouldValidate: true })
                        }
                      }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('properties.noOfRooms') || 'Select rooms'} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                        <SelectItem value="more_than_100">
                          {t('properties.moreThan100') || 'More than 100'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="no_of_receptions" className="text-sm font-medium text-foreground">{t('properties.noOfReceptions') || 'Number of Receptions'}</Label>
                    <Select
                      value={watch('no_of_receptions') !== undefined && watch('no_of_receptions') !== null 
                        ? (watch('no_of_receptions')! > 100 ? 'more_than_100' : watch('no_of_receptions')!.toString())
                        : ''}
                      onValueChange={(value) => {
                        if (value === 'more_than_100') {
                          setValue('no_of_receptions', 101, { shouldValidate: true })
                        } else if (value === '') {
                          setValue('no_of_receptions', undefined, { shouldValidate: true })
                        } else {
                          setValue('no_of_receptions', parseInt(value), { shouldValidate: true })
                        }
                      }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('properties.noOfReceptions') || 'Select receptions'} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                        <SelectItem value="more_than_100">
                          {t('properties.moreThan100') || 'More than 100'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Group 2: Building No, Apartment No, Floor No */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="building_no" className="text-sm font-medium text-foreground">{t('properties.buildingNo') || 'Building Number'}</Label>
                    <Input
                      id="building_no"
                      type="text"
                      {...register('building_no')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      placeholder="e.g., 15"
                      className="transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="apartment_no" className="text-sm font-medium text-foreground">{t('properties.apartmentNo') || 'Apartment Number'}</Label>
                    <Input
                      id="apartment_no"
                      type="text"
                      {...register('apartment_no')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      placeholder="e.g., 3A"
                      className="transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="floor_no" className="text-sm font-medium text-foreground">{t('properties.floorNo') || 'Floor No'}</Label>
                    <Input
                      id="floor_no"
                      type="number"
                      {...register('floor_no', { valueAsNumber: true })}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="transition-all duration-200"
                    />
                  </div>
                </div>

                {/* YouTube URL and Property Note */}
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="youtube_url" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-muted-foreground" />
                      {t('properties.youtubeUrl') || 'YouTube URL'}
                    </Label>
                    <Input
                      id="youtube_url"
                      type="url"
                      {...register('youtube_url')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="transition-all duration-200"
                    />
                    {errors.youtube_url && (
                      <p className="text-sm text-destructive">{errors.youtube_url.message}</p>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="property_note" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {t('properties.propertyNote') || 'Property Note'}
                    </Label>
                    <textarea
                      id="property_note"
                      {...register('property_note')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      placeholder={t('properties.propertyNotePlaceholder') || 'Enter any additional notes about this property...'}
                      rows={4}
                      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${
                        errors.property_note ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-border/50">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={isFeatured}
                      onChange={(e) => setValue('is_featured', e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <Label htmlFor="is_featured" className="text-sm font-medium text-foreground flex items-center gap-2 cursor-pointer">
                      <Star className="h-4 w-4 text-yellow-500" />
                      {t('properties.isFeatured')}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_rented"
                      checked={isRented}
                      onChange={(e) => {
                        setValue('is_rented', e.target.checked)
                        // Clear rental_end_date if unchecking is_rented
                        if (!e.target.checked) {
                          setValue('rental_end_date', undefined)
                        }
                      }}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <Label htmlFor="is_rented" className="text-sm font-medium text-foreground cursor-pointer">{t('properties.isRented') || 'Is Rented'}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_sold"
                      checked={isSold}
                      onChange={(e) => setValue('is_sold', e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <Label htmlFor="is_sold" className="text-sm font-medium text-foreground cursor-pointer">Is Sold</Label>
                  </div>
                </div>

                {/* Rental End Date - shown when is_rented is checked */}
                {isRented && (
                  <div className="mt-4">
                    <div className="space-y-2.5">
                      <Label htmlFor="rental_end_date" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {t('properties.rentalEndDate') || 'Rental End Date'}
                      </Label>
                      <Input
                        id="rental_end_date"
                        type="date"
                        {...register('rental_end_date')}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        min={new Date().toISOString().split('T')[0]}
                        className="transition-all duration-200"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('properties.rentalEndDateHint') || 'The property will automatically be marked as not rented after this date'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Facilities & Services */}
            <Card className="border border-border/50 bg-card shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Facilities & Services
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Property Facilities</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-4 bg-muted/30">
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
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-4 bg-muted/30">
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
              </CardContent>
            </Card>

            {/* Property Images Upload */}
            {expandedRowId && (
              <Card className="border border-border/50 bg-card shadow-sm">
                <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    Property Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <PropertyImageUpload
                    propertyId={expandedRowId}
                    images={propertyImages}
                    onImagesChange={setPropertyImages}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-border/50 mt-8 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-2 -mb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleToggleExpand(null)
                }}
                className="min-w-[100px] transition-all duration-200 hover:bg-muted"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="min-w-[100px] transition-all duration-200 hover:opacity-90"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      {t('common.loading')}
                    </span>
                  )
                  : t('common.save')}
              </Button>
            </div>
          </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advanced Filters - Always Visible */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
              {(filterStatus !== 'all' || filterSection !== 'all' || filterPropertyType !== 'all' || 
                filterGovernorate !== 'all' || filterArea !== 'all' || filterOwner !== 'all' ||
                filterViewType !== 'all' || filterFinishingType !== 'all' || filterPaymentMethod !== 'all' ||
                filterIsFeatured !== 'all' || filterIsRented !== 'all' || filterIsSold !== 'all' ||
                filterPriceMin || filterPriceMax || filterSizeMin || filterSizeMax || filterDateFrom || filterDateTo) && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(filterStatus !== 'all' || filterSection !== 'all' || filterPropertyType !== 'all' || 
                filterGovernorate !== 'all' || filterArea !== 'all' || filterOwner !== 'all' ||
                filterViewType !== 'all' || filterFinishingType !== 'all' || filterPaymentMethod !== 'all' ||
                filterIsFeatured !== 'all' || filterIsRented !== 'all' || filterIsSold !== 'all' ||
                filterPriceMin || filterPriceMax || filterSizeMin || filterSizeMax || filterDateFrom || filterDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterStatus('all')
                    setFilterSection('all')
                    setFilterPropertyType('all')
                    setFilterGovernorate('all')
                    setFilterArea('all')
                    setFilterOwner('all')
                    setFilterViewType('all')
                    setFilterFinishingType('all')
                    setFilterPaymentMethod('all')
                    setFilterIsFeatured('all')
                    setFilterIsRented('all')
                    setFilterIsSold('all')
                    setFilterPriceMin('')
                    setFilterPriceMax('')
                    setFilterSizeMin('')
                    setFilterSizeMax('')
                    setFilterDateFrom('')
                    setFilterDateTo('')
                  }}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Filters
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Filters
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showAdvancedFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Status Filter */}
                    <div className="space-y-2.5">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
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

              {/* Section Filter */}
                    <div className="space-y-2.5">
                <Label>Section</Label>
                <SearchableSelect
                  value={filterSection}
                  onValueChange={setFilterSection}
                  placeholder="All Sections"
                  searchPlaceholder="Search sections..."
                  options={[
                    { value: 'all', label: 'All Sections' },
                    ...(masterData?.sections.map((section: any) => ({
                      value: section.id,
                      label: `${section.name_en} / ${section.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* Property Type Filter */}
                    <div className="space-y-2.5">
                <Label>Property Type</Label>
                <SearchableSelect
                  value={filterPropertyType}
                  onValueChange={setFilterPropertyType}
                  placeholder="All Types"
                  searchPlaceholder="Search types..."
                  options={[
                    { value: 'all', label: 'All Types' },
                    ...(masterData?.propertyTypes.map((type: any) => ({
                      value: type.id,
                      label: `${type.name_en} / ${type.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* Governorate Filter */}
                    <div className="space-y-2.5">
                <Label>Governorate</Label>
                <SearchableSelect
                  value={filterGovernorate}
                  onValueChange={(value) => {
                    setFilterGovernorate(value)
                    setFilterArea('all')
                  }}
                  placeholder="All Governorates"
                  searchPlaceholder="Search governorates..."
                  options={[
                    { value: 'all', label: 'All Governorates' },
                    ...(masterData?.governorates.map((gov: any) => ({
                      value: gov.id,
                      label: `${gov.name_en} / ${gov.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* Area Filter */}
                    <div className="space-y-2.5">
                <Label>Area</Label>
                <SearchableSelect
                  value={filterArea}
                  onValueChange={setFilterArea}
                  placeholder="All Areas"
                  searchPlaceholder="Search areas..."
                  disabled={filterGovernorate === 'all'}
                  options={[
                    { value: 'all', label: 'All Areas' },
                    ...(filterAreas?.map((area: any) => ({
                      value: area.id,
                      label: `${area.name_en} / ${area.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* Owner Filter */}
                    <div className="space-y-2.5">
                <Label>Owner</Label>
                <SearchableSelect
                  value={filterOwner}
                  onValueChange={setFilterOwner}
                  placeholder="All Owners"
                  searchPlaceholder="Search owners..."
                  options={[
                    { value: 'all', label: 'All Owners' },
                    ...(masterData?.propertyOwners.map((owner: any) => ({
                      value: owner.id,
                      label: `${owner.name}${owner.email ? ` (${owner.email})` : ''}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* View Type Filter */}
                    <div className="space-y-2.5">
                <Label>View Type</Label>
                <SearchableSelect
                  value={filterViewType}
                  onValueChange={setFilterViewType}
                  placeholder="All View Types"
                  searchPlaceholder="Search view types..."
                  options={[
                    { value: 'all', label: 'All View Types' },
                    ...(masterData?.viewTypes.map((type: any) => ({
                      value: type.id,
                      label: `${type.name_en} / ${type.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* Finishing Type Filter */}
                    <div className="space-y-2.5">
                <Label>Finishing Type</Label>
                <SearchableSelect
                  value={filterFinishingType}
                  onValueChange={setFilterFinishingType}
                  placeholder="All Finishing Types"
                  searchPlaceholder="Search finishing types..."
                  options={[
                    { value: 'all', label: 'All Finishing Types' },
                    ...(masterData?.finishingTypes.map((type: any) => ({
                      value: type.id,
                      label: `${type.name_en} / ${type.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* Payment Method Filter */}
                    <div className="space-y-2.5">
                <Label>Payment Method</Label>
                <SearchableSelect
                  value={filterPaymentMethod}
                  onValueChange={setFilterPaymentMethod}
                  placeholder="All Payment Methods"
                  searchPlaceholder="Search payment methods..."
                  options={[
                    { value: 'all', label: 'All Payment Methods' },
                    ...(masterData?.paymentMethods.map((method: any) => ({
                      value: method.id,
                      label: `${method.name_en} / ${method.name_ar}`,
                    })) || []),
                  ]}
                />
              </div>

              {/* Featured Filter */}
                    <div className="space-y-2.5">
                <Label>Featured</Label>
                <Select value={filterIsFeatured} onValueChange={setFilterIsFeatured}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rented Filter */}
                    <div className="space-y-2.5">
                <Label>Rented</Label>
                <Select value={filterIsRented} onValueChange={setFilterIsRented}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sold Filter */}
                    <div className="space-y-2.5">
                <Label>Sold</Label>
                <Select value={filterIsSold} onValueChange={setFilterIsSold}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
                    <div className="space-y-2.5">
                <Label>Min Price</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                />
              </div>

                    <div className="space-y-2.5">
                <Label>Max Price</Label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                />
              </div>

              {/* Size Range */}
                    <div className="space-y-2.5">
                <Label>Min Size (m²)</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={filterSizeMin}
                  onChange={(e) => setFilterSizeMin(e.target.value)}
                />
              </div>

                    <div className="space-y-2.5">
                <Label>Max Size (m²)</Label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filterSizeMax}
                  onChange={(e) => setFilterSizeMax(e.target.value)}
                />
              </div>

              {/* Date Range */}
                    <div className="space-y-2.5">
                <Label>Created From</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

                    <div className="space-y-2.5">
                <Label>Created To</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Properties List - Always Visible */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>{t('properties.title')} ({filteredProperties?.length || 0})</CardTitle>
              {viewMode === 'table' && (
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
              )}
            </div>
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
            data={filteredProperties}
            columns={columns}
            isLoading={isLoading}
            searchKey="title_en"
            searchPlaceholder={t('common.search')}
            itemsPerPage={itemsPerPage}
            actions={(property) => {
              const isExpanded = expandedRowId === property.id
              return (
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant={isExpanded ? "default" : "ghost"}
                      size="icon"
                      onClick={() => handleToggleExpand(property, true)}
                      title={isExpanded ? "Collapse" : "Edit"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
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
              )
            }}
          />
          ) : (
            <>
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
                ) : filteredProperties && filteredProperties.length > 0 ? (
                  (() => {
                    // Calculate pagination for card view
                    const totalPages = Math.max(1, Math.ceil(filteredProperties.length / itemsPerPage))
                    const currentPage = Math.min(Math.max(1, cardViewPage), totalPages)
                    const startIndex = (currentPage - 1) * itemsPerPage
                    const endIndex = Math.min(startIndex + itemsPerPage, filteredProperties.length)
                    const paginatedProperties = filteredProperties.slice(startIndex, endIndex)
                    
                    // Sync page if out of bounds
                    if (currentPage !== cardViewPage) {
                      setTimeout(() => setCardViewPage(currentPage), 0)
                    }
                    
                    return (
                      <>
                        {paginatedProperties.map((property: Property, index: number) => {
                          const propertyImagesData = allPropertyImages?.[property.id] || {}
                          const imagesForProperty: Array<{ id: string; url: string }> = []
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
                              sections={masterData?.sections}
                            />
                          )
                        })}
                      </>
                    )
                  })()
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    {properties && properties.length > 0 
                      ? (t('common.noFilteredData') || 'No properties match the current filters')
                      : (t('common.noData') || 'No properties found')}
                  </div>
                )}
              </div>
              
              {/* Pagination for Card View */}
              {filteredProperties && filteredProperties.length > 0 && (() => {
                const totalPages = Math.max(1, Math.ceil(filteredProperties.length / itemsPerPage))
                const currentPage = Math.min(Math.max(1, cardViewPage), totalPages)
                const startIndex = (currentPage - 1) * itemsPerPage
                const endIndex = Math.min(startIndex + itemsPerPage, filteredProperties.length)
                
                // Sync page if out of bounds
                if (currentPage !== cardViewPage && totalPages > 0) {
                  setTimeout(() => setCardViewPage(currentPage), 0)
                }
                
                return (
                  <div className="flex items-center justify-between px-4 pb-4 border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} - {endIndex} of {filteredProperties.length} properties
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="cardItemsPerPage" className="text-sm">Items per page:</Label>
                        <Select
                          value={String(itemsPerPage)}
                          onValueChange={(value) => {
                            const newItemsPerPage = Number(value)
                            setItemsPerPage(newItemsPerPage)
                            // Recalculate and set appropriate page
                            const newTotalPages = Math.max(1, Math.ceil(filteredProperties.length / newItemsPerPage))
                            setCardViewPage(Math.min(cardViewPage, newTotalPages))
                          }}
                        >
                          <SelectTrigger className="w-20 h-8" id="cardItemsPerPage">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                            <SelectItem value="48">48</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {totalPages > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPage = Math.max(1, currentPage - 1)
                              setCardViewPage(newPage)
                            }}
                            disabled={currentPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="text-sm font-medium">
                            Page {currentPage} of {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPage = Math.min(totalPages, currentPage + 1)
                              setCardViewPage(newPage)
                            }}
                            disabled={currentPage >= totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </CardContent>
      </Card>

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


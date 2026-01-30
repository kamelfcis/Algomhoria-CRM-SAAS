'use client'

import React, { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { GoogleMapsLocation } from '@/components/ui/google-maps-location'
import { MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface StepLocationProps {
  disabled?: boolean
}

async function getGovernorates() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('governorates')
    .select('id, name_ar, name_en')
    .eq('status', 'active')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data || []
}

async function getAreas(governorateId: string) {
  if (!governorateId) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('areas')
    .select('id, name_ar, name_en')
    .eq('governorate_id', governorateId)
    .eq('status', 'active')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data || []
}

export function StepLocation({ disabled = false }: StepLocationProps) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext()

  const governorateId = watch('governorate_id')
  const areaId = watch('area_id')
  const locationText = watch('location_text')
  const latitude = watch('latitude')
  const longitude = watch('longitude')
  const address = watch('address')

  // Initialize selectedGovernorate from form value
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>(
    governorateId || 'none'
  )

  // Sync form value with local state when it changes
  React.useEffect(() => {
    if (governorateId) {
      setSelectedGovernorate(governorateId)
    } else if (!governorateId && selectedGovernorate !== 'none') {
      setSelectedGovernorate('none')
    }
  }, [governorateId, selectedGovernorate])

  const { data: governorates } = useQuery({
    queryKey: ['governorates'],
    queryFn: getGovernorates,
    staleTime: 10 * 60 * 1000,
  })

  const { data: areas } = useQuery({
    queryKey: ['areas', selectedGovernorate],
    queryFn: () => getAreas(selectedGovernorate === 'none' ? '' : selectedGovernorate),
    enabled: selectedGovernorate !== 'none' && !!selectedGovernorate,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Location Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="governorate_id" className="text-sm font-medium text-foreground">
                Governorate
              </Label>
              <SearchableSelect
                value={selectedGovernorate || 'none'}
                onValueChange={(value) => {
                  setSelectedGovernorate(value)
                  setValue('governorate_id', value === 'none' ? null : value)
                  setValue('area_id', null) // Reset area when governorate changes
                }}
                placeholder="Select governorate"
                searchPlaceholder="Search governorates..."
                disabled={disabled}
                options={[
                  { value: 'none', label: 'No Governorate' },
                  ...(governorates?.map((gov: any) => ({
                    value: gov.id,
                    label: `${gov.name_en} / ${gov.name_ar}`,
                  })) || []),
                ]}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="area_id" className="text-sm font-medium text-foreground">
                Area
              </Label>
              <SearchableSelect
                value={areaId || 'none'}
                onValueChange={(value) => {
                  setValue('area_id', value === 'none' ? null : value)
                }}
                placeholder="Select area"
                searchPlaceholder="Search areas..."
                disabled={selectedGovernorate === 'none' || !selectedGovernorate || disabled}
                options={[
                  { value: 'none', label: 'No Area' },
                  ...(areas?.map((area: any) => ({
                    value: area.id,
                    label: `${area.name_en} / ${area.name_ar}`,
                  })) || []),
                ]}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="address" className="text-sm font-medium text-foreground">
              Address
            </Label>
            <Input
              id="address"
              value={address || ''}
              onChange={(e) => setValue('address', e.target.value)}
              disabled={disabled}
              placeholder="Enter project address"
              className="transition-all duration-200"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium text-foreground">Map Location</Label>
            <GoogleMapsLocation
              locationText={locationText || ''}
              latitude={latitude}
              longitude={longitude}
              onLocationChange={(text, lat, lng) => {
                setValue('location_text', text)
                setValue('latitude', lat)
                setValue('longitude', lng)
              }}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


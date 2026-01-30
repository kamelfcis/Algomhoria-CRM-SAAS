'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderKanban, Building2, ShoppingBag, Home } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { cn } from '@/lib/utils'

interface Facility {
  id: string
  name_ar: string
  name_en: string
}

interface Service {
  id: string
  name_ar: string
  name_en: string
}

interface Unit {
  id: string
  name_ar: string
  name_en: string
}

interface StepBasicInfoProps {
  facilities?: Facility[]
  services?: Service[]
  units?: Unit[]
  disabled?: boolean
}

export function StepBasicInfo({ facilities = [], services = [], units = [], disabled = false }: StepBasicInfoProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext()

  const projectType = watch('project_type')
  const selectedFacilities = watch('facilities') || []
  const selectedServices = watch('services') || []
  const selectedUnits = watch('units') || []

  const handleFacilityToggle = (facilityId: string) => {
    const current = selectedFacilities as string[]
    if (current.includes(facilityId)) {
      setValue('facilities', current.filter((id) => id !== facilityId))
    } else {
      setValue('facilities', [...current, facilityId])
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    const current = selectedServices as string[]
    if (current.includes(serviceId)) {
      setValue('services', current.filter((id) => id !== serviceId))
    } else {
      setValue('services', [...current, serviceId])
    }
  }

  const handleUnitToggle = (unitId: string) => {
    const current = selectedUnits as string[]
    if (current.includes(unitId)) {
      setValue('units', current.filter((id) => id !== unitId))
    } else {
      setValue('units', [...current, unitId])
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      {/* Basic Information */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="title_ar" className="text-sm font-medium text-foreground">
                Title (Arabic) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title_ar"
                {...register('title_ar')}
                disabled={disabled}
                className={cn(
                  'transition-all duration-200',
                  errors.title_ar && 'border-destructive focus-visible:ring-destructive'
                )}
                placeholder="Enter Arabic title"
              />
              {errors.title_ar && (
                <p className="text-sm text-destructive font-normal">{errors.title_ar.message as string}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="title_en" className="text-sm font-medium text-foreground">
                Title (English) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title_en"
                {...register('title_en')}
                disabled={disabled}
                className={cn(
                  'transition-all duration-200',
                  errors.title_en && 'border-destructive focus-visible:ring-destructive'
                )}
                placeholder="Enter English title"
              />
              {errors.title_en && (
                <p className="text-sm text-destructive font-normal">{errors.title_en.message as string}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="description_ar" className="text-sm font-medium text-foreground">
                Description (Arabic)
              </Label>
              <RichTextEditor
                value={watch('description_ar') || ''}
                onChange={(value) => setValue('description_ar', value || null)}
                disabled={disabled}
                placeholder="Enter Arabic description"
                height={300}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="description_en" className="text-sm font-medium text-foreground">
                Description (English)
              </Label>
              <RichTextEditor
                value={watch('description_en') || ''}
                onChange={(value) => setValue('description_en', value || null)}
                disabled={disabled}
                placeholder="Enter English description"
                height={300}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Type */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Project Type <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setValue('project_type', 'administrative')}
              disabled={disabled}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                projectType === 'administrative'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Building2 className="h-6 w-6 mb-2 text-primary" />
              <div className="font-semibold">Administrative</div>
              <div className="text-sm text-muted-foreground">Office buildings and administrative spaces</div>
            </button>

            <button
              type="button"
              onClick={() => setValue('project_type', 'commercial')}
              disabled={disabled}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                projectType === 'commercial'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <ShoppingBag className="h-6 w-6 mb-2 text-primary" />
              <div className="font-semibold">Commercial</div>
              <div className="text-sm text-muted-foreground">Shops, malls, and commercial spaces</div>
            </button>

            <button
              type="button"
              onClick={() => setValue('project_type', 'residential')}
              disabled={disabled}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                projectType === 'residential'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Home className="h-6 w-6 mb-2 text-primary" />
              <div className="font-semibold">Residential</div>
              <div className="text-sm text-muted-foreground">Housing and residential buildings</div>
            </button>
          </div>
          {errors.project_type && (
            <p className="text-sm text-destructive font-normal mt-2">{errors.project_type.message as string}</p>
          )}
        </CardContent>
      </Card>

      {/* Facilities */}
      {facilities.length > 0 && (
        <Card className="border border-border/50 bg-card shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
            <CardTitle className="text-base font-semibold text-foreground">Facilities</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {facilities.map((facility) => (
                <label
                  key={facility.id}
                  className={cn(
                    'flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-all duration-200',
                    (selectedFacilities as string[]).includes(facility.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={(selectedFacilities as string[]).includes(facility.id)}
                    onChange={() => handleFacilityToggle(facility.id)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">
                    {facility.name_en} / {facility.name_ar}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {services.length > 0 && (
        <Card className="border border-border/50 bg-card shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
            <CardTitle className="text-base font-semibold text-foreground">Services</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {services.map((service) => (
                <label
                  key={service.id}
                  className={cn(
                    'flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-all duration-200',
                    (selectedServices as string[]).includes(service.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={(selectedServices as string[]).includes(service.id)}
                    onChange={() => handleServiceToggle(service.id)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">
                    {service.name_en} / {service.name_ar}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Units */}
      {units.length > 0 && (
        <Card className="border border-border/50 bg-card shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
            <CardTitle className="text-base font-semibold text-foreground">Units</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {units.map((unit) => (
                <label
                  key={unit.id}
                  className={cn(
                    'flex items-center space-x-2 p-3 rounded-md border cursor-pointer transition-all duration-200',
                    (selectedUnits as string[]).includes(unit.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={(selectedUnits as string[]).includes(unit.id)}
                    onChange={() => handleUnitToggle(unit.id)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">
                    {unit.name_en} / {unit.name_ar}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


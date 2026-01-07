'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Skeleton placeholders
const DialogSkeleton = () => <div className="fixed inset-0 bg-black/50 z-50" />
const TableSkeleton = () => <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />

// Dynamic imports for heavy components - these won't be included in initial bundle

// Dialog components - only loaded when modals are opened
export const DynamicDialog = dynamic(
  () => import('@/components/ui/dialog').then(mod => mod.Dialog),
  { ssr: false }
)

export const DynamicDialogContent = dynamic(
  () => import('@/components/ui/dialog').then(mod => mod.DialogContent),
  { ssr: false }
)

export const DynamicDialogHeader = dynamic(
  () => import('@/components/ui/dialog').then(mod => mod.DialogHeader),
  { ssr: false }
)

export const DynamicDialogTitle = dynamic(
  () => import('@/components/ui/dialog').then(mod => mod.DialogTitle),
  { ssr: false }
)

export const DynamicDialogDescription = dynamic(
  () => import('@/components/ui/dialog').then(mod => mod.DialogDescription),
  { ssr: false }
)

export const DynamicDialogFooter = dynamic(
  () => import('@/components/ui/dialog').then(mod => mod.DialogFooter),
  { ssr: false }
)

// Alert Dialog - only loaded when confirmations are needed
export const DynamicAlertDialog = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialog),
  { ssr: false }
)

export const DynamicAlertDialogContent = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogContent),
  { ssr: false }
)

export const DynamicAlertDialogHeader = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogHeader),
  { ssr: false }
)

export const DynamicAlertDialogTitle = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogTitle),
  { ssr: false }
)

export const DynamicAlertDialogDescription = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogDescription),
  { ssr: false }
)

export const DynamicAlertDialogFooter = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogFooter),
  { ssr: false }
)

export const DynamicAlertDialogAction = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogAction),
  { ssr: false }
)

export const DynamicAlertDialogCancel = dynamic(
  () => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogCancel),
  { ssr: false }
)

// DataTable - heavy component with sorting, filtering
export const DynamicDataTable = dynamic(
  () => import('@/components/tables/data-table').then(mod => mod.DataTable),
  { 
    ssr: false,
    loading: () => <TableSkeleton />
  }
)

// Google Maps - very heavy, only load when needed
export const DynamicGoogleMapsLocation = dynamic(
  () => import('@/components/ui/google-maps-location').then(mod => mod.GoogleMapsLocation),
  { ssr: false }
)

// Property Image Upload - heavy with image processing
export const DynamicPropertyImageUpload = dynamic(
  () => import('@/components/ui/property-image-upload').then(mod => mod.PropertyImageUpload),
  { ssr: false }
)

// Image Upload - heavy
export const DynamicImageUpload = dynamic(
  () => import('@/components/ui/image-upload').then(mod => mod.ImageUpload),
  { ssr: false }
)

// Searchable Select - medium weight
export const DynamicSearchableSelect = dynamic(
  () => import('@/components/ui/searchable-select').then(mod => mod.SearchableSelect),
  { ssr: false }
)


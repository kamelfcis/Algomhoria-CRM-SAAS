'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DailyRentPricingItem {
  from_date: string
  to_date: string
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
}

interface DailyRentPricingProps {
  value: DailyRentPricingItem[]
  onChange: (value: DailyRentPricingItem[]) => void
  disabled?: boolean
  currencySymbol?: string
}

// Color palette for date ranges
const RANGE_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', darkBg: 'dark:bg-blue-900/30', darkBorder: 'dark:border-blue-500', darkText: 'dark:text-blue-200' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', darkBg: 'dark:bg-purple-900/30', darkBorder: 'dark:border-purple-500', darkText: 'dark:text-purple-200' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', darkBg: 'dark:bg-pink-900/30', darkBorder: 'dark:border-pink-500', darkText: 'dark:text-pink-200' },
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', darkBg: 'dark:bg-green-900/30', darkBorder: 'dark:border-green-500', darkText: 'dark:text-green-200' },
  { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', darkBg: 'dark:bg-yellow-900/30', darkBorder: 'dark:border-yellow-500', darkText: 'dark:text-yellow-200' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800', darkBg: 'dark:bg-indigo-900/30', darkBorder: 'dark:border-indigo-500', darkText: 'dark:text-indigo-200' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', darkBg: 'dark:bg-orange-900/30', darkBorder: 'dark:border-orange-500', darkText: 'dark:text-orange-200' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800', darkBg: 'dark:bg-teal-900/30', darkBorder: 'dark:border-teal-500', darkText: 'dark:text-teal-200' },
]


export function DailyRentPricing({ value = [], onChange, disabled = false, currencySymbol = '$' }: DailyRentPricingProps) {
  const addRow = () => {
    const newRow: DailyRentPricingItem = {
      from_date: '',
      to_date: '',
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
    }
    onChange([...value, newRow])
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof DailyRentPricingItem, fieldValue: string | number) => {
    const updated = [...value]
    updated[index] = {
      ...updated[index],
      [field]: fieldValue,
    }
    onChange(updated)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 p-4 rounded-lg border-2 border-primary/20">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold text-foreground">
            You Can Use This Section To Set Specific Dates With Special Prices
          </Label>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={addRow}
          disabled={disabled}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Date Range
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No date ranges added</p>
          <p className="text-xs mt-1">Click "Add Date Range" to add one</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Date Range Cards */}
          {value.map((row, index) => {
            const color = RANGE_COLORS[index % RANGE_COLORS.length]
            return (
              <div
                key={index}
                className={cn(
                  "rounded-xl p-5 space-y-4 border-2 transition-all hover:shadow-lg",
                  `${color.bg} ${color.border} ${color.darkBg} ${color.darkBorder}`,
                  "backdrop-blur-sm"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 rounded-full border-2", color.bg, color.border)} />
                    <h4 className={cn("font-semibold text-lg", color.text, color.darkText)}>
                      Date Range {index + 1}
                    </h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    disabled={disabled}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`from_date_${index}`} className="font-medium">From Date</Label>
                    <Input
                      id={`from_date_${index}`}
                      type="date"
                      value={row.from_date}
                      onChange={(e) => updateRow(index, 'from_date', e.target.value)}
                      disabled={disabled}
                      className={cn(
                        "border-2 font-medium",
                        color.border,
                        "focus:ring-2 focus:ring-offset-2",
                        color.text
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`to_date_${index}`} className="font-medium">To Date</Label>
                    <Input
                      id={`to_date_${index}`}
                      type="date"
                      value={row.to_date}
                      onChange={(e) => updateRow(index, 'to_date', e.target.value)}
                      disabled={disabled}
                      className={cn(
                        "border-2 font-medium",
                        color.border,
                        "focus:ring-2 focus:ring-offset-2",
                        color.text
                      )}
                    />
                  </div>
                </div>

                <div className="bg-background/50 dark:bg-background/30 rounded-lg p-4 border border-border/50">
                  <Label className="text-sm font-semibold mb-3 block">Daily Prices ({currencySymbol})</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      { key: 'monday', label: 'Mon' },
                      { key: 'tuesday', label: 'Tue' },
                      { key: 'wednesday', label: 'Wed' },
                      { key: 'thursday', label: 'Thu' },
                      { key: 'friday', label: 'Fri' },
                      { key: 'saturday', label: 'Sat' },
                      { key: 'sunday', label: 'Sun' },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={`${key}_${index}`} className="text-xs font-medium text-muted-foreground">
                          {label}
                        </Label>
                        <Input
                          id={`${key}_${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={row[key as keyof DailyRentPricingItem] as number}
                          onChange={(e) => updateRow(index, key as keyof DailyRentPricingItem, parseFloat(e.target.value) || 0)}
                          disabled={disabled}
                          className={cn(
                            "text-sm font-medium text-center",
                            "border-2 focus:ring-2 focus:ring-offset-1",
                            color.border,
                            "hover:bg-background/80 transition-colors"
                          )}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


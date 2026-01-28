'use client'

import React from 'react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
  name?: string
  error?: boolean
}

export function PhoneInputField({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = 'Enter phone number',
  id,
  name,
  error = false,
}: PhoneInputProps) {
  return (
    <div className={cn('phone-input-wrapper', className)}>
      <PhoneInput
        country={'eg'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        inputProps={{
          id,
          name,
          required: false,
        }}
        containerClass={cn(
          'phone-input-container',
          error && 'phone-input-error'
        )}
        inputClass={cn(
          'phone-input-field',
          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive border-2 focus-visible:ring-destructive'
        )}
        buttonClass="phone-input-button"
        dropdownClass="phone-input-dropdown"
      />
    </div>
  )
}


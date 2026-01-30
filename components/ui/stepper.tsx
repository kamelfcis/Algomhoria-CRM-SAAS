'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  id: string
  label: string
  description?: string
  color?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  completedSteps?: number[]
  className?: string
}

const stepColors = [
  'bg-blue-500 border-blue-500 text-white ring-blue-500/20',
  'bg-emerald-500 border-emerald-500 text-white ring-emerald-500/20',
  'bg-purple-500 border-purple-500 text-white ring-purple-500/20',
]

const stepProgressColors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
]

export function Stepper({ steps, currentStep, completedSteps = [], className }: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div className="relative mb-10">
        <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full" />
        <div
          className={cn(
            'absolute top-6 left-0 h-1 transition-all duration-700 ease-out rounded-full shadow-lg',
            stepProgressColors[currentStep] || 'bg-primary'
          )}
          style={{
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
          }}
        />
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index) || index < currentStep
            const isCurrent = index === currentStep
            const isPast = index < currentStep
            const stepColor = stepColors[index] || 'bg-primary border-primary text-white ring-primary/20'

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-3 transition-all duration-500 shadow-lg',
                    isCompleted
                      ? `${stepColor} scale-110 shadow-xl`
                      : isCurrent
                      ? `${stepColor} scale-125 ring-8 animate-pulse`
                      : 'bg-gradient-to-br from-muted to-muted/50 border-2 border-muted-foreground/30 text-muted-foreground shadow-sm'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-6 w-6 font-bold" strokeWidth={3} />
                  ) : (
                    <span className={cn(
                      'text-base font-bold',
                      isCurrent ? 'text-white' : 'text-muted-foreground'
                    )}>
                      {index + 1}
                    </span>
                  )}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
                  )}
                </div>
                <div className="mt-4 text-center max-w-[120px]">
                  <p
                    className={cn(
                      'text-sm font-semibold transition-all duration-300',
                      isCurrent
                        ? 'text-foreground scale-105'
                        : isPast
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p
                      className={cn(
                        'text-xs mt-1.5 transition-all duration-300',
                        isCurrent
                          ? 'text-muted-foreground font-medium'
                          : 'text-muted-foreground/70'
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


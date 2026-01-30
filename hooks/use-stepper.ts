import { useState, useCallback } from 'react'

export interface UseStepperOptions {
  initialStep?: number
  totalSteps: number
  onStepChange?: (step: number) => void
  onComplete?: () => void
}

export function useStepper({
  initialStep = 0,
  totalSteps,
  onStepChange,
  onComplete,
}: UseStepperOptions) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const nextStep = useCallback((skipCompletion = false) => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      setCompletedSteps((prev) => {
        if (!prev.includes(currentStep)) {
          return [...prev, currentStep]
        }
        return prev
      })
      onStepChange?.(newStep)
    } else if (!skipCompletion) {
      // Last step - trigger completion only if not skipping
      setCompletedSteps((prev) => {
        if (!prev.includes(currentStep)) {
          return [...prev, currentStep]
        }
        return prev
      })
      onComplete?.()
    }
  }, [currentStep, totalSteps, onStepChange, onComplete])

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      onStepChange?.(newStep)
    }
  }, [currentStep, onStepChange])

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step)
        onStepChange?.(step)
      }
    },
    [totalSteps, onStepChange]
  )

  const reset = useCallback(() => {
    setCurrentStep(initialStep)
    setCompletedSteps([])
  }, [initialStep])

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const canGoNext = currentStep < totalSteps - 1
  const canGoPrevious = currentStep > 0

  return {
    currentStep,
    completedSteps,
    nextStep,
    previousStep,
    goToStep,
    reset,
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoPrevious,
  }
}


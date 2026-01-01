'use client'

import { useLanguageStore } from '@/store/language-store'
import { getTranslations, type Locale } from '@/lib/i18n'
import { useMemo } from 'react'

export function useTranslations() {
  const { language } = useLanguageStore()
  
  return useMemo(() => {
    return getTranslations(language as Locale)
  }, [language])
}


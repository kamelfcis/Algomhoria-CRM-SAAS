import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'en' | 'ar'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        set({ language })
        // Apply language to document
        if (typeof document !== 'undefined') {
          document.documentElement.lang = language
          document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
        }
      },
    }),
    {
      name: 'language-storage',
    }
  )
)


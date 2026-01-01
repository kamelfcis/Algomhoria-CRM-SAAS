import en from '@/messages/en.json'
import ar from '@/messages/ar.json'

export const messages = {
  en,
  ar,
} as const

export type Locale = keyof typeof messages

export function getTranslations(locale: Locale) {
  return function t(key: string): string {
    const keys = key.split('.')
    let value: any = messages[locale]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    return value || key
  }
}


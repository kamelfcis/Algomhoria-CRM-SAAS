import { createClient } from '@/lib/supabase/client'

interface CurrencySettings {
  currency: string | null
  dollar_rate: string | null
}

let cachedSettings: CurrencySettings | null = null
let settingsPromise: Promise<CurrencySettings> | null = null

/**
 * Get currency settings from the database
 */
export async function getCurrencySettings(): Promise<CurrencySettings> {
  // Return cached settings if available
  if (cachedSettings) {
    return cachedSettings
  }

  // If a request is already in progress, return that promise
  if (settingsPromise) {
    return settingsPromise
  }

  // Fetch settings from database
  settingsPromise = (async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['currency', 'dollar_rate'])

      if (error) {
        console.error('Error fetching currency settings:', error)
        return { currency: 'USD', dollar_rate: '30.00' } // Default fallback
      }

      const settingsMap = (data || []).reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string | null>)

      const result = {
        currency: settingsMap.currency || 'USD',
        dollar_rate: settingsMap.dollar_rate || '30.00',
      }

      // Cache the result
      cachedSettings = result
      return result
    } catch (error) {
      console.error('Error fetching currency settings:', error)
      return { currency: 'USD', dollar_rate: '30.00' } // Default fallback
    } finally {
      // Clear the promise after completion
      settingsPromise = null
    }
  })()

  return settingsPromise
}

/**
 * Format a price value with the appropriate currency symbol
 * @param price - The price value (assumed to be in USD if conversion is needed)
 * @param convertToEGP - Whether to convert USD to EGP if currency is EGP
 * @returns Formatted price string with currency symbol
 */
export async function formatPrice(
  price: number | null | undefined,
  convertToEGP: boolean = true
): Promise<string> {
  if (price === null || price === undefined || isNaN(price)) {
    return '-'
  }

  const settings = await getCurrencySettings()
  const currency = settings.currency || 'USD'
  const dollarRate = parseFloat(settings.dollar_rate || '30.00') || 30.00

  let displayPrice = price
  let currencySymbol = '$'

  // Convert to EGP if currency is EGP and conversion is enabled
  if (currency === 'EGP' && convertToEGP) {
    displayPrice = price * dollarRate
    currencySymbol = 'EGP'
  } else {
    // Map currency to symbol
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EGP: 'EGP',
      EUR: '€',
      GBP: '£',
      SAR: 'SAR',
      AED: 'AED',
    }
    currencySymbol = currencySymbols[currency] || '$'
  }

  // Format the number with locale-specific formatting
  const formattedNumber = displayPrice.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  // Return formatted price with currency symbol
  if (currencySymbol === 'EGP' || currencySymbol === 'SAR' || currencySymbol === 'AED') {
    return `${formattedNumber} ${currencySymbol}`
  }

  return `${currencySymbol}${formattedNumber}`
}

/**
 * Get currency symbol
 */
export async function getCurrencySymbol(): Promise<string> {
  const settings = await getCurrencySettings()
  const currency = settings.currency || 'USD'

  const currencySymbols: Record<string, string> = {
    USD: '$',
    EGP: 'EGP',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR',
    AED: 'AED',
  }

  return currencySymbols[currency] || '$'
}

/**
 * Clear cached currency settings (useful after settings update)
 */
export function clearCurrencyCache() {
  cachedSettings = null
  settingsPromise = null
}


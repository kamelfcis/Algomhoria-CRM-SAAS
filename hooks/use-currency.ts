import { useState, useEffect } from 'react'
import { formatPrice, getCurrencySymbol, getCurrencySettings, clearCurrencyCache } from '@/lib/utils/currency'

interface CurrencyState {
  currency: string
  symbol: string
  dollarRate: number
  isLoading: boolean
}

/**
 * Hook to get currency settings and format prices
 */
export function useCurrency() {
  const [state, setState] = useState<CurrencyState>({
    currency: 'USD',
    symbol: '$',
    dollarRate: 30.00,
    isLoading: true,
  })

  useEffect(() => {
    async function loadCurrency() {
      try {
        const settings = await getCurrencySettings()
        const symbol = await getCurrencySymbol()
        const dollarRate = parseFloat(settings.dollar_rate || '30.00') || 30.00

        setState({
          currency: settings.currency || 'USD',
          symbol,
          dollarRate,
          isLoading: false,
        })
      } catch (error) {
        console.error('Error loading currency:', error)
        setState({
          currency: 'USD',
          symbol: '$',
          dollarRate: 30.00,
          isLoading: false,
        })
      }
    }

    loadCurrency()
  }, [])

  const formatPriceValue = (price: number | null | undefined, convertToEGP: boolean = true): string => {
    if (price === null || price === undefined || isNaN(price)) {
      return '-'
    }

    let displayPrice = price
    let currencySymbol = state.symbol

    // Convert to EGP if currency is EGP and conversion is enabled
    if (state.currency === 'EGP' && convertToEGP) {
      displayPrice = price * state.dollarRate
      currencySymbol = 'EGP'
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

  const refreshCurrency = async () => {
    clearCurrencyCache()
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const settings = await getCurrencySettings()
      const symbol = await getCurrencySymbol()
      const dollarRate = parseFloat(settings.dollar_rate || '30.00') || 30.00

      setState({
        currency: settings.currency || 'USD',
        symbol,
        dollarRate,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error refreshing currency:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  return {
    ...state,
    formatPrice: formatPriceValue,
    refreshCurrency,
  }
}


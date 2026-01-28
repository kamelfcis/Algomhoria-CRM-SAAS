'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { useThemeStore } from '@/store/theme-store'
import { useLanguageStore } from '@/store/language-store'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { clearCurrencyCache } from '@/lib/utils/currency'

const siteSettingsSchema = z.object({
  site_name_ar: z.string().min(1, 'Site name (Arabic) is required'),
  site_name_en: z.string().min(1, 'Site name (English) is required'),
  site_description_ar: z.string().optional().nullable(),
  site_description_en: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  favicon_url: z.string().optional().nullable(),
  contact_email: z.string().email('Invalid email').optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  facebook_url: z.string().url('Invalid URL').optional().nullable(),
  twitter_url: z.string().url('Invalid URL').optional().nullable(),
  instagram_url: z.string().url('Invalid URL').optional().nullable(),
  youtube_url: z.string().url('Invalid URL').optional().nullable(),
  linkedin_url: z.string().url('Invalid URL').optional().nullable(),
  currency: z.enum(['USD', 'EGP', 'EUR', 'GBP', 'SAR', 'AED']).optional().nullable(),
  dollar_rate: z.string().optional().nullable(),
})

type SiteSettingsForm = z.infer<typeof siteSettingsSchema>

interface Setting {
  id: string
  key: string
  value: string | null
  value_json: any
  description: string | null
  logo_url: string | null
}

async function getSettings() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .order('key', { ascending: true })

  if (error) throw error
  return data as Setting[]
}

async function updateSettings(settings: Partial<SiteSettingsForm>) {
  const supabase = createClient()
  
  const updates = Object.entries(settings).map(([key, value]) => ({
    key,
    value: value || null,
  }))

  // Update each setting
  const promises = updates.map(({ key, value }) =>
    supabase
      .from('settings')
      .update({ value })
      .eq('key', key)
  )

  await Promise.all(promises)
  
  // Handle logo_url separately if it exists
  if (settings.logo_url !== undefined) {
    await supabase
      .from('settings')
      .update({ logo_url: settings.logo_url })
      .eq('key', 'logo_url')
  }

  // Handle currency and dollar_rate - store in value_json if needed or as separate settings
  if (settings.currency !== undefined) {
    await supabase
      .from('settings')
      .upsert({ 
        key: 'currency', 
        value: settings.currency || null,
        description: 'Selected currency for the website'
      }, { onConflict: 'key' })
  }

  if (settings.dollar_rate !== undefined) {
    await supabase
      .from('settings')
      .upsert({ 
        key: 'dollar_rate', 
        value: settings.dollar_rate || null,
        description: 'USD to EGP exchange rate'
      }, { onConflict: 'key' })
  }
}

export default function SettingsPage() {
  const t = useTranslations()
  const { theme, setTheme } = useThemeStore()
  const { language, setLanguage } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')

  // Check permissions
  const { canView, canEdit } = usePermissions('settings')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: canView, // Only fetch if user has view permission
  })

  const { toast } = useToast()

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      // Clear currency cache so new settings are reflected immediately
      clearCurrencyCache()
      toast({
        title: t('common.success') || 'Success',
        description: t('settings.updatedSuccessfully') || 'Settings updated successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      })
    },
  })

  // Check expired rentals mutation
  const [checkRentalsLoading, setCheckRentalsLoading] = useState(false)
  const [checkRentalsResult, setCheckRentalsResult] = useState<{
    success: boolean
    updatedCount: number
    message: string
  } | null>(null)

  const handleCheckExpiredRentals = async () => {
    setCheckRentalsLoading(true)
    setCheckRentalsResult(null)
    
    try {
      const response = await fetch('/api/properties/check-expired-rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setCheckRentalsResult({
          success: true,
          updatedCount: data.updatedCount || 0,
          message: data.message || 'Check completed successfully',
        })
        toast({
          title: t('common.success') || 'Success',
          description: data.message || `Successfully updated ${data.updatedCount || 0} expired rental(s)`,
          variant: 'success',
        })
        // Refresh properties query to show updated data
        // Invalidate all property-related queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['properties'] })
        queryClient.invalidateQueries({ queryKey: ['all-properties'] })
        // Force refetch to ensure UI updates immediately
        queryClient.refetchQueries({ queryKey: ['properties'] })
      } else {
        setCheckRentalsResult({
          success: false,
          updatedCount: 0,
          message: data.error || 'Failed to check expired rentals',
        })
        toast({
          title: t('common.error') || 'Error',
          description: data.error || 'Failed to check expired rentals',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      setCheckRentalsResult({
        success: false,
        updatedCount: 0,
        message: error.message || 'An error occurred',
      })
      toast({
        title: t('common.error') || 'Error',
        description: error.message || 'An error occurred while checking expired rentals',
        variant: 'destructive',
      })
    } finally {
      setCheckRentalsLoading(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SiteSettingsForm>({
    resolver: zodResolver(siteSettingsSchema),
  })

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string | null>)

      // Get logo_url from the settings table (it's stored in logo_url column)
      const logoSetting = settings.find(s => s.key === 'logo_url')
      
      reset({
        site_name_ar: settingsMap.site_name_ar || '',
        site_name_en: settingsMap.site_name_en || '',
        site_description_ar: settingsMap.site_description_ar || '',
        site_description_en: settingsMap.site_description_en || '',
        logo_url: logoSetting?.logo_url || settingsMap.logo_url || '',
        favicon_url: settingsMap.favicon_url || '',
        contact_email: settingsMap.contact_email || '',
        contact_phone: settingsMap.contact_phone || '',
        facebook_url: settingsMap.facebook_url || '',
        twitter_url: settingsMap.twitter_url || '',
        instagram_url: settingsMap.instagram_url || '',
        youtube_url: settingsMap.youtube_url || '',
        linkedin_url: settingsMap.linkedin_url || '',
        currency: (settingsMap.currency as 'USD' | 'EGP' | 'EUR' | 'GBP' | 'SAR' | 'AED') || 'USD',
        dollar_rate: settingsMap.dollar_rate || '',
      })
    }
  }, [settings, reset])

  const onSubmit = (data: SiteSettingsForm) => {
    updateMutation.mutate(data)
  }

  const canManageSettings = canEdit
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  // If user doesn't have view permission, show error message
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('common.error') || 'Access Denied'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('settings.noPermission') || 'You do not have permission to view settings.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">Manage your account and site settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">{t('settings.profile')}</TabsTrigger>
          <TabsTrigger value="preferences">{t('settings.preferences')}</TabsTrigger>
          {canManageSettings && (
            <TabsTrigger value="site">{t('settings.siteSettings')}</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.profile')}</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('users.name')}</Label>
                <p className="text-sm">{profile?.name}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('users.email')}</Label>
                <p className="text-sm">{profile?.email}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <p className="text-sm capitalize">{profile?.role}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.theme')}</CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>{t('settings.theme')}</Label>
                  <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.light')}</SelectItem>
                      <SelectItem value="dark">{t('settings.dark')}</SelectItem>
                      <SelectItem value="system">{t('settings.system')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.language')}</CardTitle>
                <CardDescription>Choose your preferred language</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>{t('settings.language')}</Label>
                  <Select value={language} onValueChange={(value: 'en' | 'ar') => setLanguage(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.english')}</SelectItem>
                      <SelectItem value="ar">{t('settings.arabic')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Site Settings Tab */}
        {canManageSettings && (
          <TabsContent value="site">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.siteSettings')}</CardTitle>
                <CardDescription>Manage site-wide settings</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>{t('common.loading')}</p>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Site Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('settings.siteInformation') || 'Site Information'}</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="site_name_ar">{t('settings.siteNameAr') || 'Site Name (Arabic)'} *</Label>
                          <Input
                            id="site_name_ar"
                            {...register('site_name_ar')}
                            disabled={updateMutation.isPending}
                          />
                          {errors.site_name_ar && (
                            <p className="text-sm text-destructive">{errors.site_name_ar.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="site_name_en">{t('settings.siteNameEn') || 'Site Name (English)'} *</Label>
                          <Input
                            id="site_name_en"
                            {...register('site_name_en')}
                            disabled={updateMutation.isPending}
                          />
                          {errors.site_name_en && (
                            <p className="text-sm text-destructive">{errors.site_name_en.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="site_description_ar">{t('settings.siteDescriptionAr') || 'Site Description (Arabic)'}</Label>
                          <Input
                            id="site_description_ar"
                            {...register('site_description_ar')}
                            disabled={updateMutation.isPending}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="site_description_en">{t('settings.siteDescriptionEn') || 'Site Description (English)'}</Label>
                          <Input
                            id="site_description_en"
                            {...register('site_description_en')}
                            disabled={updateMutation.isPending}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logo & Favicon */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('settings.logoAndFavicon') || 'Logo & Favicon'}</h3>
                      
                      <ImageUpload
                        value={watch('logo_url') || undefined}
                        onChange={(url) => setValue('logo_url', url || '')}
                        bucket="site-assets"
                        maxSize={5}
                        disabled={updateMutation.isPending}
                      />

                      <div className="space-y-2">
                        <Label htmlFor="favicon_url">{t('settings.faviconUrl') || 'Favicon URL'}</Label>
                        <Input
                          id="favicon_url"
                          {...register('favicon_url')}
                          placeholder="https://example.com/favicon.ico"
                          disabled={updateMutation.isPending}
                        />
                        {errors.favicon_url && (
                          <p className="text-sm text-destructive">{errors.favicon_url.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('settings.contactInformation') || 'Contact Information'}</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact_email">{t('settings.contactEmail') || 'Contact Email'}</Label>
                          <Input
                            id="contact_email"
                            type="email"
                            {...register('contact_email')}
                            disabled={updateMutation.isPending}
                          />
                          {errors.contact_email && (
                            <p className="text-sm text-destructive">{errors.contact_email.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contact_phone">{t('settings.contactPhone') || 'Contact Phone'}</Label>
                          <Input
                            id="contact_phone"
                            {...register('contact_phone')}
                            disabled={updateMutation.isPending}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Currency Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('settings.currencySettings') || 'Currency Settings'}</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currency">{t('settings.currency') || 'Currency'} *</Label>
                          <Select
                            value={watch('currency') || 'USD'}
                            onValueChange={(value) => setValue('currency', value as 'USD' | 'EGP' | 'EUR' | 'GBP' | 'SAR' | 'AED')}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('settings.selectCurrency') || 'Select currency'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                              <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                              <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.currency && (
                            <p className="text-sm text-destructive">{errors.currency.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dollar_rate">{t('settings.dollarRate') || 'USD to EGP Exchange Rate'}</Label>
                          <Input
                            id="dollar_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('dollar_rate')}
                            placeholder="e.g., 30.50"
                            disabled={updateMutation.isPending}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('settings.dollarRateDescription') || 'Enter the current exchange rate from USD to EGP'}
                          </p>
                          {errors.dollar_rate && (
                            <p className="text-sm text-destructive">{errors.dollar_rate.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* System Maintenance */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('settings.systemMaintenance') || 'System Maintenance'}</h3>
                      
                      <Card className="border-2">
                        <CardHeader>
                          <CardTitle className="text-base">{t('settings.checkExpiredRentals') || 'Check Expired Rentals'}</CardTitle>
                          <CardDescription>
                            {t('settings.checkExpiredRentalsDescription') || 'Manually check and update properties where the rental period has expired'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Button
                            type="button"
                            onClick={handleCheckExpiredRentals}
                            disabled={checkRentalsLoading}
                            variant="outline"
                            className="w-full sm:w-auto"
                          >
                            {checkRentalsLoading ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                {t('settings.checking') || 'Checking...'}
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t('settings.checkNow') || 'Check Now'}
                              </>
                            )}
                          </Button>

                          {checkRentalsResult && (
                            <div className={`p-4 rounded-lg border ${
                              checkRentalsResult.success 
                                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                                : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                            }`}>
                              <div className="flex items-start gap-3">
                                {checkRentalsResult.success ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className={`font-medium ${
                                    checkRentalsResult.success 
                                      ? 'text-green-900 dark:text-green-100' 
                                      : 'text-red-900 dark:text-red-100'
                                  }`}>
                                    {checkRentalsResult.message}
                                  </p>
                                  {checkRentalsResult.success && checkRentalsResult.updatedCount > 0 && (
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                      {checkRentalsResult.updatedCount === 1 
                                        ? (t('settings.propertyUpdated') || '1 property updated')
                                        : `${checkRentalsResult.updatedCount} ${t('settings.propertiesUpdated') || 'properties updated'}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            {t('settings.checkExpiredRentalsHint') || 'This will check all properties marked as rented and automatically set is_rented to false if the rental_end_date has passed.'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Social Media */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">{t('settings.socialMedia') || 'Social Media'}</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="facebook_url">{t('settings.facebookUrl') || 'Facebook URL'}</Label>
                          <Input
                            id="facebook_url"
                            type="url"
                            {...register('facebook_url')}
                            placeholder="https://facebook.com/yourpage"
                            disabled={updateMutation.isPending}
                          />
                          {errors.facebook_url && (
                            <p className="text-sm text-destructive">{errors.facebook_url.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="twitter_url">{t('settings.twitterUrl') || 'Twitter URL'}</Label>
                          <Input
                            id="twitter_url"
                            type="url"
                            {...register('twitter_url')}
                            placeholder="https://twitter.com/yourhandle"
                            disabled={updateMutation.isPending}
                          />
                          {errors.twitter_url && (
                            <p className="text-sm text-destructive">{errors.twitter_url.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="instagram_url">{t('settings.instagramUrl') || 'Instagram URL'}</Label>
                          <Input
                            id="instagram_url"
                            type="url"
                            {...register('instagram_url')}
                            placeholder="https://instagram.com/yourhandle"
                            disabled={updateMutation.isPending}
                          />
                          {errors.instagram_url && (
                            <p className="text-sm text-destructive">{errors.instagram_url.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="youtube_url">{t('settings.youtubeUrl') || 'YouTube URL'}</Label>
                          <Input
                            id="youtube_url"
                            type="url"
                            {...register('youtube_url')}
                            placeholder="https://youtube.com/channel/yourchannel"
                            disabled={updateMutation.isPending}
                          />
                          {errors.youtube_url && (
                            <p className="text-sm text-destructive">{errors.youtube_url.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="linkedin_url">{t('settings.linkedinUrl') || 'LinkedIn URL'}</Label>
                          <Input
                            id="linkedin_url"
                            type="url"
                            {...register('linkedin_url')}
                            placeholder="https://linkedin.com/company/yourcompany"
                            disabled={updateMutation.isPending}
                          />
                          {errors.linkedin_url && (
                            <p className="text-sm text-destructive">{errors.linkedin_url.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateMutation.isPending ? t('common.loading') : t('common.save')}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'

type Locale = 'ar' | 'en'

function pickLocalized(
  locale: Locale,
  arValue: string | null | undefined,
  enValue: string | null | undefined
) {
  if (locale === 'ar') {
    return arValue || enValue || ''
  }
  return enValue || arValue || ''
}

function stripHtml(input: string | null | undefined) {
  if (!input) return ''
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanText(input: string | null | undefined) {
  return stripHtml(input).replace(/[\u0000-\u001F\u007F]/g, '').trim()
}

function parseJsonValue(input: any) {
  if (!input) return null
  if (typeof input === 'string') {
    try {
      return JSON.parse(input)
    } catch {
      return null
    }
  }
  return input
}

function normalizeRichText(input: string | null | undefined) {
  if (!input) return ''
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

function extractSpecLabel(item: any, locale: Locale): string {
  if (item == null) return ''
  if (typeof item === 'string' || typeof item === 'number') return cleanText(String(item))
  if (typeof item !== 'object') return ''

  const candidate =
    (locale === 'ar' ? item.name_ar : item.name_en) ||
    (locale === 'ar' ? item.title_ar : item.title_en) ||
    (locale === 'ar' ? item.label_ar : item.label_en) ||
    item.name_ar ||
    item.name_en ||
    item.name ||
    item.title ||
    item.label ||
    item.value

  if (candidate) return cleanText(String(candidate))

  const compact = Object.values(item)
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .map((v) => cleanText(String(v)))
    .filter(Boolean)
    .slice(0, 2)
    .join(' - ')

  return compact
}

function normalizeCategoryLabel(locale: Locale, value: string) {
  if (!value) return locale === 'ar' ? 'غير مصنف' : 'Uncategorized'
  // Some records contain numeric placeholders like "111"/"222" instead of real names.
  if (/^\d+$/.test(value)) return locale === 'ar' ? 'مشروع' : 'Project'
  return value
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function bilingualLabel(arValue?: string | null, enValue?: string | null) {
  const ar = cleanText(arValue || '')
  const en = cleanText(enValue || '')
  if (ar && en) return `${en} / ${ar}`
  return en || ar
}

const UNIT_BILINGUAL_MAP: Record<string, string> = {
  chalets: 'Chalets / شاليهات',
  lands: 'Lands / أراضي',
  'business-building': 'Business Building / مبنى تجاري',
  '2-level': '2 Level / دورين',
  garage: 'Garage / جراج',
  pharmacy: 'Pharmacy / صيدلية',
  'twin-house': 'Twin House / بيت توأم',
  cabin: 'Cabin / كابينة',
  'furnished-apartments': 'Furnished Apartments / شقق مفروشة',
  'warehouse-stores': 'Warehouse / Stores / مستودع / محلات',
  apartments: 'Apartments / شقق',
  'ground-floor': 'Ground Floor / دور أرضي',
  project: 'Project / مشروع',
  'commercial-space': 'Commercial Space / مساحة تجارية',
  penthouse: 'Penthouse / بنتهاوس',
  hotels: 'Hotels / فنادق',
  'offices-companies': 'Offices / Companies / مكاتب / شركات',
  'town-houses': 'Town Houses / بيوت مدينة',
  land: 'Land / أرض',
  basement: 'Basement / قبو',
  factory: 'Factory / مصنع',
  roof: 'Roof / سطح',
  shops: 'Shops / محلات',
  'residential-building': 'Residential Building / مبنى سكني',
  building: 'Building / مبنى',
  studio: 'Studio / استوديو',
  'shopping-mall': 'Shopping Mall / مول تجاري',
  villa: 'Villa / فيلا',
  kabana: 'Kabana / كابانا',
}

export interface LandingHomeData {
  sliders: Array<{
    id: string
    title: string
    description: string
    image_url: string
    link_url: string | null
  }>
  projects: Array<{
    id: string
    title: string
    description: string
    image_url: string | null
    category: string
    location: string
    project_type: string
    facilities_count: number
    services_count: number
    units_count: number
  }>
  properties: Array<{
    id: string
    code: string
    title: string
    location: string
    price: number | null
    sale_price: number | null
    rent_price: number | null
    section: string
    image_url: string | null
    images: string[]
    property_type: string
    beds: number
    baths: number
    parking: number
    area: number
    is_featured: boolean
  }>
  posts: Array<{
    id: string
    title: string
    category: string
    image_url: string | null
    published_at: string | null
  }>
  settings: Record<string, string | null>
}

export interface LandingPropertyCard {
  id: string
  code: string
  title: string
  location: string
  price: number
  sale_price?: number | null
  rent_price?: number | null
  section?: string
  image_url: string | null
  images?: string[]
  property_type: string
  beds: number
  baths: number
  parking: number
  area: number
  is_featured: boolean
}

export interface LandingPropertyDetails {
  id: string
  code: string
  title: string
  location: string
  property_type: string
  section: string
  view_type: string
  price: number
  size: number
  baths: number
  beds: number
  description: string
  is_featured: boolean
  images: string[]
  services: string[]
  facilities: string[]
}

export interface LandingProjectDetails {
  id: string
  title: string
  description: string
  category: string
  project_type: string
  status: string
  location: string
  address: string
  latitude: number | null
  longitude: number | null
  images: string[]
  youtube_videos: string[]
  facilities: string[]
  services: string[]
  units: string[]
}

export interface LandingSearchFilters {
  governorates: Array<{ id: string; name: string }>
  areas: Array<{ id: string; governorate_id: string | null; name: string }>
  propertyTypes: Array<{ id: string; name: string }>
  sections: Array<{ id: string; name: string }>
  priceMin: number
  priceMax: number
  priceStep: number
}

export async function getLandingSections(locale: Locale): Promise<Array<{ id: string; name: string }>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sections')
    .select('id, name_ar, name_en')
    .eq('status', 'active')
    .order('name_en', { ascending: true })

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: String(item.id || ''),
    name: cleanText(pickLocalized(locale, item.name_ar, item.name_en)),
  }))
}

export interface LandingFeaturedAreaCard {
  governorateId: string | null
  areaId: string | null
  governorateName: string
  areaName: string
  locationLabel: string
  image_url: string | null
  projectCount: number
  propertyCount: number
  categoryNames: string[]
}

export interface LandingFeaturedAreasResult {
  items: LandingFeaturedAreaCard[]
  filters: {
    governorates: Array<{ id: string; name: string }>
    areas: Array<{ id: string; governorate_id: string | null; name: string }>
    categories: Array<{ id: string; name: string }>
  }
}

export interface LandingProjectCard {
  id: string
  title: string
  description: string
  image_url: string | null
  category: string
  location: string
  project_type: string
  facilities_count: number
  services_count: number
  units_count: number
  governorate_id: string | null
  area_id: string | null
  category_id: string | null
}

export interface LandingProjectsResult {
  items: LandingProjectCard[]
  filters: {
    governorates: Array<{ id: string; name: string }>
    areas: Array<{ id: string; governorate_id: string | null; name: string }>
    categories: Array<{ id: string; name: string }>
  }
}

export interface LandingPublicSettings {
  facebook_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  linkedin_url: string | null
}

export async function getLandingHomeData(locale: Locale): Promise<LandingHomeData> {
  const supabase = createAdminClient()

  const [slidersRes, projectsRes, propertiesRes, postsRes, settingsRes] = await Promise.all([
    supabase
      .from('sliders')
      .select('id, title_ar, title_en, description_ar, description_en, image_url, link_url, order_index')
      .eq('status', 'active')
      .order('order_index', { ascending: true })
      .limit(5),
    supabase
      .from('projects')
      .select(
        'id, title_ar, title_en, description_ar, description_en, image_url, images, metadata, project_type, project_categories(title_ar, title_en), governorates(name_ar, name_en), areas(name_ar, name_en)'
      )
      .eq('status', 'active')
      .order('order_index', { ascending: true })
      .limit(8),
    supabase
      .from('properties')
      .select(
        'id, code, title_ar, title_en, price, sale_price, rent_price, location_text, is_featured, updated_at, size, baths, no_of_rooms, no_of_receptions, property_types(name_ar, name_en), governorates(name_ar, name_en), areas(name_ar, name_en), sections(name_ar, name_en), property_images(image_url, is_primary, order_index)'
      )
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('posts')
      .select(
        'id, title_ar, title_en, thumbnail_url, cover_url, published_at, created_at, categories(title_ar, title_en)'
      )
      .eq('status', 'active')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['site_name_en', 'site_name_ar', 'contact_email', 'contact_phone'])
  ])

  if (slidersRes.error) throw slidersRes.error
  if (projectsRes.error) throw projectsRes.error
  if (propertiesRes.error) throw propertiesRes.error
  if (postsRes.error) throw postsRes.error
  if (settingsRes.error) throw settingsRes.error

  const sliders = (slidersRes.data || []).map((item: any) => ({
    id: item.id,
    title: cleanText(pickLocalized(locale, item.title_ar, item.title_en)),
    description: cleanText(pickLocalized(locale, item.description_ar, item.description_en)),
    image_url: item.image_url,
    link_url: item.link_url,
  }))

  const projects = (projectsRes.data || []).map((item: any) => {
    const metadata = parseJsonValue(item.metadata) || {}
    let fallbackImage: string | null = null
    if (Array.isArray(item.images) && item.images.length > 0) {
      const primary = item.images.find((img: any) => img?.is_primary)
      fallbackImage = primary?.url || item.images[0]?.url || null
    }

    const categoryObj = Array.isArray(item.project_categories)
      ? item.project_categories[0]
      : item.project_categories
    const governorateObj = Array.isArray(item.governorates) ? item.governorates[0] : item.governorates
    const areaObj = Array.isArray(item.areas) ? item.areas[0] : item.areas

    const category = normalizeCategoryLabel(
      locale,
      cleanText(pickLocalized(locale, categoryObj?.title_ar, categoryObj?.title_en))
    )
    const governorate = cleanText(pickLocalized(locale, governorateObj?.name_ar, governorateObj?.name_en))
    const area = cleanText(pickLocalized(locale, areaObj?.name_ar, areaObj?.name_en))

    return {
      id: item.id,
      title: cleanText(pickLocalized(locale, item.title_ar, item.title_en)),
      description: cleanText(pickLocalized(locale, item.description_ar, item.description_en)),
      image_url: item.image_url || fallbackImage,
      category,
      location: [governorate, area].filter(Boolean).join(' - '),
      project_type: cleanText(item.project_type || ''),
      facilities_count: Array.isArray(metadata.facilities) ? metadata.facilities.length : 0,
      services_count: Array.isArray(metadata.services) ? metadata.services.length : 0,
      units_count: Array.isArray(metadata.units) ? metadata.units.length : 0,
    }
  })

  const properties = (propertiesRes.data || []).map((item: any) => {
    const governorateObj = Array.isArray(item.governorates) ? item.governorates[0] : item.governorates
    const areaObj = Array.isArray(item.areas) ? item.areas[0] : item.areas
    const typeObj = Array.isArray(item.property_types) ? item.property_types[0] : item.property_types
    const sectionObj = Array.isArray(item.sections) ? item.sections[0] : item.sections
    const images = Array.isArray(item.property_images) ? item.property_images : []
    const sortedImages = [...images].sort((a: any, b: any) => (a?.order_index || 0) - (b?.order_index || 0))
    const primaryImage =
      images.find((img: any) => img?.is_primary)?.image_url ||
      sortedImages[0]?.image_url ||
      null

    const price = item.sale_price ?? item.rent_price ?? item.price ?? null
    const salePrice = item.sale_price ?? null
    const rentPrice = item.rent_price ?? null
    const governorate = cleanText(pickLocalized(locale, governorateObj?.name_ar, governorateObj?.name_en))
    const area = cleanText(pickLocalized(locale, areaObj?.name_ar, areaObj?.name_en))
    const propertyType = cleanText(pickLocalized(locale, typeObj?.name_ar, typeObj?.name_en)) || 'Property'
    const section = cleanText(pickLocalized(locale, sectionObj?.name_ar, sectionObj?.name_en))

    return {
      id: item.id,
      code: item.code || item.id,
      title: cleanText(pickLocalized(locale, item.title_ar, item.title_en)),
      location: cleanText(item.location_text) || [governorate, area].filter(Boolean).join(' - '),
      price,
      sale_price: salePrice,
      rent_price: rentPrice,
      section,
      image_url: primaryImage,
      images: sortedImages.map((img: any) => img?.image_url).filter(Boolean),
      property_type: propertyType,
      beds: Number(item.no_of_rooms || 0),
      baths: Number(item.baths || 0),
      parking: Number(item.no_of_receptions || 0),
      area: Number(item.size || 0),
      is_featured: Boolean(item.is_featured),
    }
  })

  const posts = (postsRes.data || []).map((item: any) => {
    const categoryObj = Array.isArray(item.categories) ? item.categories[0] : item.categories
    const categoryLabel = cleanText(pickLocalized(locale, categoryObj?.title_ar, categoryObj?.title_en))
    return {
      id: item.id,
      title: cleanText(pickLocalized(locale, item.title_ar, item.title_en)),
      category: normalizeCategoryLabel(
        locale,
        categoryLabel || (locale === 'ar' ? 'مقالات' : 'Articles')
      ),
      image_url: item.thumbnail_url || item.cover_url || null,
      published_at: item.published_at || null,
    }
  })

  const settings = Object.fromEntries((settingsRes.data || []).map((row: any) => [row.key, row.value]))

  return {
    sliders,
    projects,
    properties,
    posts,
    settings,
  }
}

export async function getLandingSearchFilters(
  locale: Locale,
  options?: { section?: string }
): Promise<LandingSearchFilters> {
  const supabase = createAdminClient()

  const [governoratesRes, areasRes, propertyTypesRes, sectionsRes, pricesRes] = await Promise.all([
    supabase
      .from('governorates')
      .select('id, name_ar, name_en')
      .eq('status', 'active')
      .order('name_en', { ascending: true }),
    supabase
      .from('areas')
      .select('id, governorate_id, name_ar, name_en')
      .eq('status', 'active')
      .order('name_en', { ascending: true }),
    supabase
      .from('property_types')
      .select('id, name_ar, name_en')
      .eq('status', 'active')
      .order('name_en', { ascending: true }),
    supabase
      .from('sections')
      .select('id, name_ar, name_en')
      .eq('status', 'active')
      .order('name_en', { ascending: true }),
    supabase
      .from('properties')
      .select('price, sale_price, rent_price, sections(name_ar, name_en)')
      .eq('status', 'active')
      .limit(2000),
  ])

  if (governoratesRes.error) throw governoratesRes.error
  if (areasRes.error) throw areasRes.error
  if (propertyTypesRes.error) throw propertyTypesRes.error
  if (sectionsRes.error) throw sectionsRes.error
  if (pricesRes.error) throw pricesRes.error

  const requestedSection = String(options?.section || '').toLowerCase().trim()
  const sectionAwarePrices = (pricesRes.data || [])
    .filter((item: any) => {
      if (!requestedSection || requestedSection === 'all') return true
      const sectionObj = Array.isArray(item.sections) ? item.sections[0] : item.sections
      const sectionLabel = cleanText(
        pickLocalized(locale, sectionObj?.name_ar, sectionObj?.name_en)
      ).toLowerCase()
      if (requestedSection === 'sale') {
        return sectionLabel.includes('sale') || sectionLabel.includes('بيع')
      }
      if (requestedSection === 'rent') {
        return sectionLabel.includes('rent') || sectionLabel.includes('ايجار')
      }
      return true
    })
    .map((item: any) => Number(item.sale_price ?? item.rent_price ?? item.price ?? 0))
    .filter((value: number) => Number.isFinite(value) && value > 0)

  const fallbackPrices = (pricesRes.data || [])
    .map((item: any) => Number(item.sale_price ?? item.rent_price ?? item.price ?? 0))
    .filter((value: number) => Number.isFinite(value) && value > 0)

  const values = sectionAwarePrices.length > 0 ? sectionAwarePrices : fallbackPrices
  const rawMin = values.length > 0 ? Math.min(...values) : 0
  const rawMax = values.length > 0 ? Math.max(...values) : 1000000
  const roundedMin = Math.max(0, Math.floor(rawMin / 1000) * 1000)
  const roundedMax = Math.max(roundedMin + 1000, Math.ceil(rawMax / 1000) * 1000)
  const span = roundedMax - roundedMin
  const priceStep = span > 1000000 ? 10000 : span > 200000 ? 5000 : 1000

  return {
    governorates: (governoratesRes.data || []).map((item: any) => ({
      id: item.id,
      name: cleanText(pickLocalized(locale, item.name_ar, item.name_en)),
    })),
    areas: (areasRes.data || []).map((item: any) => ({
      id: item.id,
      governorate_id: item.governorate_id || null,
      name: cleanText(pickLocalized(locale, item.name_ar, item.name_en)),
    })),
    propertyTypes: (propertyTypesRes.data || []).map((item: any) => ({
      id: item.id,
      name: cleanText(pickLocalized(locale, item.name_ar, item.name_en)),
    })),
    sections: (sectionsRes.data || []).map((item: any) => ({
      id: item.id,
      name: cleanText(pickLocalized(locale, item.name_ar, item.name_en)),
    })),
    priceMin: roundedMin,
    priceMax: roundedMax,
    priceStep,
  }
}

function mapPropertyCard(locale: Locale, item: any): LandingPropertyCard {
  const governorateObj = Array.isArray(item.governorates) ? item.governorates[0] : item.governorates
  const areaObj = Array.isArray(item.areas) ? item.areas[0] : item.areas
  const typeObj = Array.isArray(item.property_types) ? item.property_types[0] : item.property_types
  const images = Array.isArray(item.property_images) ? item.property_images : []
  const sortedImages = [...images].sort((a: any, b: any) => (a?.order_index || 0) - (b?.order_index || 0))
  const imageUrls = sortedImages
    .map((img: any) => cleanText(img?.image_url))
    .filter((url: string) => Boolean(url))
  const sectionObj = Array.isArray(item.sections) ? item.sections[0] : item.sections
  const sectionLabel = cleanText(pickLocalized(locale, sectionObj?.name_ar, sectionObj?.name_en))
  const primaryImage =
    images.find((img: any) => img?.is_primary)?.image_url ||
    sortedImages[0]?.image_url ||
    null

  const price = Number(item.sale_price ?? item.rent_price ?? item.price ?? 0)
  const governorate = cleanText(pickLocalized(locale, governorateObj?.name_ar, governorateObj?.name_en))
  const area = cleanText(pickLocalized(locale, areaObj?.name_ar, areaObj?.name_en))
  const propertyType = cleanText(pickLocalized(locale, typeObj?.name_ar, typeObj?.name_en)) || 'Property'
  const location = cleanText(item.location_text) || [governorate, area].filter(Boolean).join(',')

  return {
    id: item.id,
    code: item.code || item.id,
    title: cleanText(pickLocalized(locale, item.title_ar, item.title_en)),
    location,
    price,
    sale_price: typeof item.sale_price === 'number' ? item.sale_price : null,
    rent_price: typeof item.rent_price === 'number' ? item.rent_price : null,
    section: sectionLabel || undefined,
    image_url: primaryImage,
    images: imageUrls,
    property_type: propertyType,
    beds: Number(item.no_of_rooms || 0),
    baths: Number(item.baths || 0),
    parking: Number(item.no_of_receptions || 0),
    area: Number(item.size || 0),
    is_featured: Boolean(item.is_featured),
  }
}

export async function getLandingProperties(
  locale: Locale,
  filters?: {
    city?: string
    area?: string
    propertyType?: string
    section?: string
    q?: string
    priceFrom?: number
    priceTo?: number
    areaFrom?: number
    areaTo?: number
    governorateId?: string
    areaId?: string
    propertyTypeId?: string
    sectionId?: string
    bookingFromDate?: string
    bookingToDate?: string
  }
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('properties')
    .select(
      'id, code, title_ar, title_en, location_text, governorate_id, area_id, property_type_id, section_id, price, sale_price, rent_price, size, baths, no_of_rooms, no_of_receptions, is_featured, property_types(name_ar, name_en), governorates(name_ar, name_en), areas(name_ar, name_en), sections(name_ar, name_en), property_images(image_url, is_primary, order_index)'
    )
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(2000)

  if (error) throw error

  const cards = (data || []).map((row: any) => {
    const sectionObj = Array.isArray(row.sections) ? row.sections[0] : row.sections
    const sectionLabel = cleanText(pickLocalized(locale, sectionObj?.name_ar, sectionObj?.name_en)).toLowerCase()
    const effectivePrice = Number(row.sale_price ?? row.rent_price ?? row.price ?? 0)
    const effectiveArea = Number(row.size || 0)
    return {
      card: mapPropertyCard(locale, row),
      propertyId: row.id,
      sectionLabel,
      effectivePrice,
      effectiveArea,
      governorateId: row.governorate_id || null,
      areaId: row.area_id || null,
      propertyTypeId: row.property_type_id || null,
      sectionId: row.section_id || null,
    }
  })

  let availableCards = cards
  const hasBookingDateFilter = Boolean(filters?.bookingFromDate && filters?.bookingToDate)
  if (hasBookingDateFilter) {
    const bookingFromDate = String(filters?.bookingFromDate || '').trim()
    const bookingToDate = String(filters?.bookingToDate || '').trim()
    const isValidFromDate = /^\d{4}-\d{2}-\d{2}$/.test(bookingFromDate)
    const isValidToDate = /^\d{4}-\d{2}-\d{2}$/.test(bookingToDate)
    if (!isValidFromDate || !isValidToDate || bookingFromDate > bookingToDate) {
      throw new Error('INVALID_DATE_RANGE')
    }

    const propertyIds = cards.map((item) => item.propertyId).filter(Boolean)
    if (propertyIds.length > 0) {
      const { data: conflictingBookings, error: conflictingBookingsError } = await supabase
        .from('property_bookings')
        .select('property_id')
        .in('property_id', propertyIds)
        .in('status', ['pending', 'confirmed'])
        .lte('booking_from_date', bookingToDate)
        .gte('booking_to_date', bookingFromDate)

      if (conflictingBookingsError) throw conflictingBookingsError

      const unavailablePropertyIds = new Set(
        (conflictingBookings || [])
          .map((booking: any) => String(booking.property_id || '').trim())
          .filter(Boolean)
      )

      availableCards = cards.filter((item) => !unavailablePropertyIds.has(String(item.propertyId)))
    }
  }

  const filtered = availableCards.filter(
    ({
      card,
      sectionLabel,
      effectivePrice,
      effectiveArea,
      governorateId,
      areaId,
      propertyTypeId,
      sectionId,
    }) => {
    if (filters?.q) {
      const q = filters.q.toLowerCase().trim()
      if (!card.title.toLowerCase().includes(q) && !card.location.toLowerCase().includes(q)) return false
    }

    if (filters?.city && !card.location.toLowerCase().includes(filters.city.toLowerCase())) return false
    if (filters?.area && !card.location.toLowerCase().includes(filters.area.toLowerCase())) return false
    if (
      filters?.propertyType &&
      !card.property_type.toLowerCase().includes(filters.propertyType.toLowerCase())
    ) {
      return false
    }

    if (filters?.section) {
      const mode = filters.section.toLowerCase()
      if (mode === 'rent' && !(sectionLabel.includes('rent') || sectionLabel.includes('ايجار'))) return false
      if (mode === 'sale' && !(sectionLabel.includes('sale') || sectionLabel.includes('بيع'))) return false
    }

    if (filters?.governorateId && governorateId !== filters.governorateId) return false
    if (filters?.areaId && areaId !== filters.areaId) return false
    if (filters?.propertyTypeId && propertyTypeId !== filters.propertyTypeId) return false
    // When section mode (sale/rent) is selected, it should show all matching section
    // properties, not be narrowed by a stale sectionId.
    if (!filters?.section && filters?.sectionId && sectionId !== filters.sectionId) return false
    if (typeof filters?.priceFrom === 'number' && effectivePrice < filters.priceFrom) return false
    if (typeof filters?.priceTo === 'number' && effectivePrice > filters.priceTo) return false
    if (typeof filters?.areaFrom === 'number' && effectiveArea < filters.areaFrom) return false
    if (typeof filters?.areaTo === 'number' && effectiveArea > filters.areaTo) return false

    return true
    }
  )

  return filtered.map((x) => x.card)
}

export async function getLandingProjects(
  locale: Locale,
  filters?: { governorateId?: string; areaId?: string; categoryId?: string }
): Promise<LandingProjectsResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, title_ar, title_en, description_ar, description_en, image_url, images, metadata, project_type, governorate_id, area_id, category_id, project_categories(title_ar, title_en), governorates(name_ar, name_en), areas(name_ar, name_en)'
    )
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(300)

  if (error) throw error

  const governoratesMap = new Map<string, string>()
  const areasMap = new Map<string, { id: string; governorate_id: string | null; name: string }>()
  const categoriesMap = new Map<string, string>()

  const cards: LandingProjectCard[] = (data || []).map((item: any) => {
    const metadata = parseJsonValue(item.metadata) || {}
    const categoryObj = Array.isArray(item.project_categories) ? item.project_categories[0] : item.project_categories
    const governorateObj = Array.isArray(item.governorates) ? item.governorates[0] : item.governorates
    const areaObj = Array.isArray(item.areas) ? item.areas[0] : item.areas

    const governorateName = cleanText(pickLocalized(locale, governorateObj?.name_ar, governorateObj?.name_en))
    const areaName = cleanText(pickLocalized(locale, areaObj?.name_ar, areaObj?.name_en))
    const categoryName = cleanText(pickLocalized(locale, categoryObj?.title_ar, categoryObj?.title_en))
    if (item.governorate_id && governorateName) governoratesMap.set(item.governorate_id, governorateName)
    if (item.area_id && areaName) {
      areasMap.set(item.area_id, {
        id: item.area_id,
        governorate_id: item.governorate_id || null,
        name: areaName,
      })
    }
    if (item.category_id && categoryName) categoriesMap.set(item.category_id, categoryName)

    let fallbackImage: string | null = null
    if (Array.isArray(item.images) && item.images.length > 0) {
      const primary = item.images.find((img: any) => img?.is_primary)
      fallbackImage = primary?.url || item.images[0]?.url || null
    }

    return {
      id: item.id,
      title: cleanText(pickLocalized(locale, item.title_ar, item.title_en)),
      description: cleanText(pickLocalized(locale, item.description_ar, item.description_en)),
      image_url: item.image_url || fallbackImage,
      category: categoryName || normalizeCategoryLabel(locale, ''),
      location: [governorateName, areaName].filter(Boolean).join(' - '),
      project_type: cleanText(item.project_type || ''),
      facilities_count: Array.isArray(metadata.facilities) ? metadata.facilities.length : 0,
      services_count: Array.isArray(metadata.services) ? metadata.services.length : 0,
      units_count: Array.isArray(metadata.units) ? metadata.units.length : 0,
      governorate_id: item.governorate_id || null,
      area_id: item.area_id || null,
      category_id: item.category_id || null,
    }
  })

  const items = cards.filter((item) => {
    if (filters?.governorateId && item.governorate_id !== filters.governorateId) return false
    if (filters?.areaId && item.area_id !== filters.areaId) return false
    if (filters?.categoryId && item.category_id !== filters.categoryId) return false
    return true
  })

  return {
    items,
    filters: {
      governorates: [...governoratesMap.entries()].map(([id, name]) => ({ id, name })),
      areas: [...areasMap.values()],
      categories: [...categoriesMap.entries()].map(([id, name]) => ({ id, name })),
    },
  }
}

export async function getLandingFeaturedAreas(
  locale: Locale,
  filters?: { governorateId?: string; areaId?: string; categoryId?: string }
): Promise<LandingFeaturedAreasResult> {
  const projects = await getLandingProjects(locale, filters)
  const grouped = new Map<string, LandingFeaturedAreaCard>()

  for (const project of projects.items) {
    const key = `${project.governorate_id || ''}:${project.area_id || ''}`
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, {
        governorateId: project.governorate_id,
        areaId: project.area_id,
        governorateName: project.location.split(' - ')[0] || '',
        areaName: project.location.split(' - ')[1] || '',
        locationLabel: project.location || (locale === 'ar' ? 'منطقة' : 'Area'),
        image_url: project.image_url,
        projectCount: 1,
        propertyCount: 0,
        categoryNames: project.category ? [project.category] : [],
      })
      continue
    }
    existing.projectCount += 1
    if (!existing.image_url && project.image_url) existing.image_url = project.image_url
    if (project.category && !existing.categoryNames.includes(project.category) && existing.categoryNames.length < 4) {
      existing.categoryNames.push(project.category)
    }
  }

  return {
    items: [...grouped.values()],
    filters: projects.filters,
  }
}

export async function getLandingPublicSettings(): Promise<LandingPublicSettings> {
  const supabase = createAdminClient()
  const keys = ['facebook_url', 'twitter_url', 'instagram_url', 'linkedin_url']
  const { data, error } = await supabase.from('settings').select('key, value').in('key', keys)
  if (error) throw error
  const map = new Map<string, string | null>()
  for (const row of data || []) {
    map.set(String(row.key || ''), row.value == null ? null : String(row.value))
  }
  return {
    facebook_url: map.get('facebook_url') || null,
    twitter_url: map.get('twitter_url') || null,
    instagram_url: map.get('instagram_url') || null,
    linkedin_url: map.get('linkedin_url') || null,
  }
}

export async function getLandingPropertyDetails(locale: Locale, codeOrId: string): Promise<LandingPropertyDetails | null> {
  const supabase = createAdminClient()

  let query = supabase
    .from('properties')
    .select(
      'id, code, title_ar, title_en, description_ar, description_en, location_text, price, sale_price, rent_price, size, baths, no_of_rooms, is_featured, property_types(name_ar, name_en), governorates(name_ar, name_en), areas(name_ar, name_en), sections(name_ar, name_en), property_view_types(name_ar, name_en), property_images(image_url, is_primary, order_index)'
    )
    .eq('status', 'active')

  // Prefer code lookup like /listing/24953, fallback to id.
  if (/^[0-9]+$/.test(codeOrId)) {
    query = query.eq('code', codeOrId)
  } else {
    query = query.or(`code.eq.${codeOrId},id.eq.${codeOrId}`)
  }

  const { data, error } = await query.limit(1).maybeSingle()
  if (error) throw error
  if (!data) return null

  const propertyType = Array.isArray(data.property_types) ? data.property_types[0] : data.property_types
  const governorate = Array.isArray(data.governorates) ? data.governorates[0] : data.governorates
  const area = Array.isArray(data.areas) ? data.areas[0] : data.areas
  const section = Array.isArray(data.sections) ? data.sections[0] : data.sections
  const viewType = Array.isArray(data.property_view_types) ? data.property_view_types[0] : data.property_view_types
  const images = (Array.isArray(data.property_images) ? data.property_images : [])
    .sort((a: any, b: any) => (a?.order_index || 0) - (b?.order_index || 0))
    .map((x: any) => x.image_url)
    .filter(Boolean)

  const [servicesRes, facilitiesRes] = await Promise.all([
    supabase
      .from('property_property_services')
      .select('property_services(name_ar, name_en)')
      .eq('property_id', data.id),
    supabase
      .from('property_property_facilities')
      .select('property_facilities(name_ar, name_en)')
      .eq('property_id', data.id),
  ])

  if (servicesRes.error) throw servicesRes.error
  if (facilitiesRes.error) throw facilitiesRes.error

  const services = (servicesRes.data || [])
    .map((row: any) => {
      const obj = Array.isArray(row.property_services) ? row.property_services[0] : row.property_services
      return cleanText(pickLocalized(locale, obj?.name_ar, obj?.name_en))
    })
    .filter(Boolean)

  const facilities = (facilitiesRes.data || [])
    .map((row: any) => {
      const obj = Array.isArray(row.property_facilities) ? row.property_facilities[0] : row.property_facilities
      return cleanText(pickLocalized(locale, obj?.name_ar, obj?.name_en))
    })
    .filter(Boolean)

  const location =
    cleanText(data.location_text) ||
    [
      cleanText(pickLocalized(locale, governorate?.name_ar, governorate?.name_en)),
      cleanText(pickLocalized(locale, area?.name_ar, area?.name_en)),
    ]
      .filter(Boolean)
      .join(',')

  return {
    id: data.id,
    code: data.code || data.id,
    title: cleanText(pickLocalized(locale, data.title_ar, data.title_en)),
    location,
    property_type: cleanText(pickLocalized(locale, propertyType?.name_ar, propertyType?.name_en)),
    section: cleanText(pickLocalized(locale, section?.name_ar, section?.name_en)),
    view_type: cleanText(pickLocalized(locale, viewType?.name_ar, viewType?.name_en)),
    price: Number(data.sale_price ?? data.rent_price ?? data.price ?? 0),
    size: Number(data.size || 0),
    baths: Number(data.baths || 0),
    beds: Number(data.no_of_rooms || 0),
    description: normalizeRichText(pickLocalized(locale, data.description_ar, data.description_en)),
    is_featured: Boolean(data.is_featured),
    images,
    services,
    facilities,
  }
}

export async function getLandingProjectDetails(
  locale: Locale,
  id: string
): Promise<LandingProjectDetails | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, title_ar, title_en, description_ar, description_en, image_url, images, youtube_videos, metadata, project_type, status, address, location_text, latitude, longitude, project_categories(title_ar, title_en), governorates(name_ar, name_en), areas(name_ar, name_en)'
    )
    .eq('status', 'active')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const categoryObj = Array.isArray(data.project_categories)
    ? data.project_categories[0]
    : data.project_categories
  const governorateObj = Array.isArray(data.governorates) ? data.governorates[0] : data.governorates
  const areaObj = Array.isArray(data.areas) ? data.areas[0] : data.areas

  const parsedImages = parseJsonValue(data.images)
  const parsedYoutube = parseJsonValue(data.youtube_videos)
  const parsedMetadata = parseJsonValue(data.metadata) || {}

  const resolveMetadataLabels = async (
    values: any[],
    table: 'property_facilities' | 'property_services'
  ) => {
    if (!Array.isArray(values) || values.length === 0) return []

    const uuidIds = values
      .filter((item) => typeof item === 'string')
      .map((item) => String(item).trim())
      .filter((item) => isUuidLike(item))

    let idMap = new Map<string, string>()
    if (uuidIds.length > 0) {
      const uniqueIds = [...new Set(uuidIds)]
      const { data: optionsData, error: optionsError } = await supabase
        .from(table)
        .select('id, name_ar, name_en')
        .in('id', uniqueIds)

      if (optionsError) throw optionsError

      idMap = new Map(
        (optionsData || []).map((item: any) => [
          item.id,
          bilingualLabel(item.name_ar, item.name_en),
        ])
      )
    }

    return values
      .map((item) => {
        if (typeof item === 'string') {
          const raw = item.trim()
          if (!raw) return ''
          if (isUuidLike(raw)) return idMap.get(raw) || ''
          return cleanText(raw)
        }
        return extractSpecLabel(item, locale)
      })
      .filter(Boolean)
  }

  const images = Array.isArray(parsedImages)
    ? parsedImages
        .map((img: any) => {
          if (typeof img === 'string') return cleanText(img)
          return img?.url || img?.image_url || null
        })
        .filter(Boolean)
    : []

  const youtube_videos = Array.isArray(parsedYoutube)
    ? parsedYoutube.map((x: any) => String(x || '')).filter(Boolean)
    : []

  const [facilities, services] = await Promise.all([
    resolveMetadataLabels(
      Array.isArray(parsedMetadata.facilities) ? parsedMetadata.facilities : [],
      'property_facilities'
    ),
    resolveMetadataLabels(
      Array.isArray(parsedMetadata.services) ? parsedMetadata.services : [],
      'property_services'
    ),
  ])

  const units = Array.isArray(parsedMetadata.units)
    ? parsedMetadata.units
        .map((item: any) => {
          if (typeof item === 'string') {
            const raw = cleanText(item).toLowerCase()
            if (!raw) return ''
            return UNIT_BILINGUAL_MAP[raw] || cleanText(item)
          }
          if (item && typeof item === 'object') {
            const ar = item.name_ar || item.title_ar || item.label_ar
            const en = item.name_en || item.title_en || item.label_en
            const bilingual = bilingualLabel(ar, en)
            if (bilingual) return bilingual
          }
          return extractSpecLabel(item, locale)
        })
        .filter(Boolean)
    : []

  return {
    id: data.id,
    title: cleanText(pickLocalized(locale, data.title_ar, data.title_en)),
    description: normalizeRichText(pickLocalized(locale, data.description_ar, data.description_en)),
    category: cleanText(pickLocalized(locale, categoryObj?.title_ar, categoryObj?.title_en)),
    project_type: cleanText(data.project_type || ''),
    status: cleanText(data.status || ''),
    location:
      cleanText(data.location_text) ||
      [
        cleanText(pickLocalized(locale, governorateObj?.name_ar, governorateObj?.name_en)),
        cleanText(pickLocalized(locale, areaObj?.name_ar, areaObj?.name_en)),
      ]
        .filter(Boolean)
        .join(' - '),
    address: cleanText(data.address),
    latitude: typeof data.latitude === 'number' ? data.latitude : null,
    longitude: typeof data.longitude === 'number' ? data.longitude : null,
    images,
    youtube_videos,
    facilities,
    services,
    units,
  }
}

export async function createPropertyBooking(input: {
  propertyId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  bookingFromDate: string
  bookingToDate: string
}) {
  const supabase = createAdminClient()

  const { property } = await checkPropertyBookingAvailability({
    propertyId: input.propertyId,
    bookingFromDate: input.bookingFromDate,
    bookingToDate: input.bookingToDate,
  })

  const totalPrice = Number(property.rent_price ?? property.sale_price ?? property.price ?? 0)

  const { data, error } = await supabase
    .from('property_bookings')
    .insert({
      property_id: input.propertyId,
      customer_name: input.customerName.trim(),
      customer_email: input.customerEmail.trim(),
      customer_phone: input.customerPhone.trim(),
      booking_from_date: input.bookingFromDate,
      booking_to_date: input.bookingToDate,
      status: 'pending',
      total_price: totalPrice,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function checkPropertyBookingAvailability(input: {
  propertyId: string
  bookingFromDate: string
  bookingToDate: string
}) {
  const supabase = createAdminClient()
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, status, price, sale_price, rent_price')
    .eq('id', input.propertyId)
    .eq('status', 'active')
    .single()

  if (propertyError || !property) {
    throw new Error('PROPERTY_NOT_FOUND')
  }

  const fromDate = new Date(input.bookingFromDate)
  const toDate = new Date(input.bookingToDate)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
    throw new Error('INVALID_DATE_RANGE')
  }

  const { data: existingBookings, error: existingBookingsError } = await supabase
    .from('property_bookings')
    .select('id')
    .eq('property_id', input.propertyId)
    .in('status', ['pending', 'confirmed'])
    .lte('booking_from_date', input.bookingToDate)
    .gte('booking_to_date', input.bookingFromDate)
    .limit(1)

  if (existingBookingsError) throw existingBookingsError
  const hasConflict = (existingBookings || []).length > 0
  if (hasConflict) {
    throw new Error('BOOKING_CONFLICT')
  }

  return {
    available: true,
    property,
  }
}

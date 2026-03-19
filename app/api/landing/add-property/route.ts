import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGES = 10
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const payloadSchema = z.object({
  title_ar: z.string().trim().min(2).max(250),
  title_en: z.string().trim().min(2).max(250),
  description_ar: z.string().trim().max(5000).optional(),
  description_en: z.string().trim().max(5000).optional(),
  location_text: z.string().trim().max(250).optional(),
  governorate_id: z.string().uuid().optional(),
  area_id: z.string().uuid().optional(),
  section_id: z.string().uuid().optional(),
  property_type_id: z.string().uuid().optional(),
  phone_number: z.string().trim().max(30).optional(),
  owner_name: z.string().trim().max(120).optional(),
  owner_email: z.string().trim().email().max(180).optional(),
  size: z.number().min(0).max(100000).optional(),
  baths: z.number().int().min(0).max(100).optional(),
  no_of_rooms: z.number().int().min(0).max(100).optional(),
  no_of_receptions: z.number().int().min(0).max(100).optional(),
  sale_price: z.number().min(0).max(1_000_000_000).optional(),
  rent_price: z.number().min(0).max(1_000_000_000).optional(),
  price: z.number().min(0).max(1_000_000_000).optional(),
})

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (value == null) return undefined
  const raw = String(value).trim()
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

async function getNextPropertyCode(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data, error } = await admin
    .from('properties')
    .select('code')
    .not('code', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) throw error
  if (!data || data.length === 0) return '1'

  const numericCodes = data
    .map((item: any) => String(item.code || '').trim())
    .filter((code) => /^\d+$/.test(code))
    .map((code) => Number(code))
    .filter((num) => Number.isFinite(num))

  if (numericCodes.length === 0) return '1'
  return String(Math.max(...numericCodes) + 1)
}

function safeFileExt(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext && /^[a-z0-9]+$/.test(ext) ? ext : 'jpg'
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, rateLimitPresets.strict)
  if (limited) return limited

  try {
    const form = await request.formData()
    const images = form
      .getAll('images')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images are allowed` },
        { status: 400 }
      )
    }

    for (const file of images) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: 'Only JPG, PNG, and WEBP images are allowed' },
          { status: 400 }
        )
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'Each image must be smaller than 5MB' },
          { status: 400 }
        )
      }
    }

    const rawPayload = {
      title_ar: form.get('title_ar'),
      title_en: form.get('title_en'),
      description_ar: form.get('description_ar') || undefined,
      description_en: form.get('description_en') || undefined,
      location_text: form.get('location_text') || undefined,
      governorate_id: form.get('governorate_id') || undefined,
      area_id: form.get('area_id') || undefined,
      section_id: form.get('section_id') || undefined,
      property_type_id: form.get('property_type_id') || undefined,
      phone_number: form.get('phone_number') || undefined,
      owner_name: form.get('owner_name') || undefined,
      owner_email: form.get('owner_email') || undefined,
      size: parseOptionalNumber(form.get('size')),
      baths: parseOptionalNumber(form.get('baths')),
      no_of_rooms: parseOptionalNumber(form.get('no_of_rooms')),
      no_of_receptions: parseOptionalNumber(form.get('no_of_receptions')),
      sale_price: parseOptionalNumber(form.get('sale_price')),
      rent_price: parseOptionalNumber(form.get('rent_price')),
      price: parseOptionalNumber(form.get('price')),
    }

    const parsed = payloadSchema.safeParse(rawPayload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid property submission data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const sessionClient = await createClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    const nextCode = await getNextPropertyCode(admin)

    const submitterMeta = [
      parsed.data.owner_name ? `Owner: ${parsed.data.owner_name}` : '',
      parsed.data.owner_email ? `Email: ${parsed.data.owner_email}` : '',
      'Source: Add Property Free',
    ]
      .filter(Boolean)
      .join(' | ')

    const propertyInsertPayload: any = {
      code: nextCode,
      title_ar: parsed.data.title_ar,
      title_en: parsed.data.title_en,
      description_ar: parsed.data.description_ar || null,
      description_en: parsed.data.description_en || null,
      location_text: parsed.data.location_text || null,
      governorate_id: parsed.data.governorate_id || null,
      area_id: parsed.data.area_id || null,
      section_id: parsed.data.section_id || null,
      property_type_id: parsed.data.property_type_id || null,
      phone_number: parsed.data.phone_number || null,
      size: parsed.data.size ?? null,
      baths: parsed.data.baths ?? null,
      no_of_rooms: parsed.data.no_of_rooms ?? null,
      no_of_receptions: parsed.data.no_of_receptions ?? null,
      sale_price: parsed.data.sale_price ?? null,
      rent_price: parsed.data.rent_price ?? null,
      price:
        parsed.data.price ??
        parsed.data.sale_price ??
        parsed.data.rent_price ??
        null,
      property_note: submitterMeta || null,
      status: 'pending',
      is_featured: false,
      is_rented: false,
      is_sold: false,
      created_by: user?.id || null,
    }

    const { data: insertedProperty, error: insertError } = await admin
      .from('properties')
      .insert(propertyInsertPayload)
      .select('id, code')
      .single()

    if (insertError || !insertedProperty) {
      return NextResponse.json(
        { error: 'Failed to submit property', details: insertError?.message || 'Unknown error' },
        { status: 500 }
      )
    }

    const uploadedPaths: string[] = []
    const uploadedImageRows: Array<{ property_id: string; image_url: string; is_primary: boolean; order_index: number }> =
      []

    for (let idx = 0; idx < images.length; idx++) {
      const file = images[idx]
      const fileExt = safeFileExt(file.name)
      const filePath = `public-submissions/${insertedProperty.id}/${Date.now()}-${idx}.${fileExt}`
      const { error: uploadError } = await admin.storage
        .from('property-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        // Roll back created row if uploads fail to keep consistency.
        await admin.from('properties').delete().eq('id', insertedProperty.id)
        if (uploadedPaths.length > 0) {
          await admin.storage.from('property-images').remove(uploadedPaths)
        }
        return NextResponse.json(
          { error: 'Failed to upload images', details: uploadError.message || 'Unknown error' },
          { status: 500 }
        )
      }

      uploadedPaths.push(filePath)
      const {
        data: { publicUrl },
      } = admin.storage.from('property-images').getPublicUrl(filePath)

      uploadedImageRows.push({
        property_id: insertedProperty.id,
        image_url: publicUrl,
        is_primary: idx === 0,
        order_index: idx,
      })
    }

    if (uploadedImageRows.length > 0) {
      const { error: imageInsertError } = await admin
        .from('property_images')
        .insert(uploadedImageRows)

      if (imageInsertError) {
        await admin.from('properties').delete().eq('id', insertedProperty.id)
        if (uploadedPaths.length > 0) {
          await admin.storage.from('property-images').remove(uploadedPaths)
        }
        return NextResponse.json(
          {
            error: 'Failed to save property images',
            details: imageInsertError.message || 'Unknown error',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Property submitted successfully and is pending review',
      data: {
        id: insertedProperty.id,
        code: insertedProperty.code,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to submit property', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

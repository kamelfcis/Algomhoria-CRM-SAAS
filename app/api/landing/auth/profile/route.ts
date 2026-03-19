import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone_number: z.string().trim().max(30).optional(),
  author_image_url: z.string().trim().url().max(1200).nullable().optional(),
})

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { user: user || null, supabase }
}

function buildProfileFallback(user: any, partial?: Record<string, any>) {
  const fallbackName =
    String(user.user_metadata?.name || '').trim() ||
    String(user.email || '').split('@')[0] ||
    'User'
  return {
    id: user.id,
    email: String(user.email || '').trim().toLowerCase(),
    name: String(partial?.name || fallbackName),
    phone_number: partial?.phone_number || null,
    author_image_url: partial?.author_image_url || null,
    status: String(partial?.status || 'active'),
  }
}

function getPatchPayload(parsed: z.infer<typeof profileUpdateSchema>) {
  const patchData: Record<string, any> = {}
  if (typeof parsed.name === 'string') patchData.name = parsed.name
  if (Object.prototype.hasOwnProperty.call(parsed, 'phone_number')) patchData.phone_number = parsed.phone_number || null
  if (Object.prototype.hasOwnProperty.call(parsed, 'author_image_url')) patchData.author_image_url = parsed.author_image_url || null
  return patchData
}

function getAdminClientSafe() {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit(request, rateLimitPresets.moderate)
    if (limited) return limited

    const { user } = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdminClientSafe()
    if (!admin) {
      return NextResponse.json({ data: buildProfileFallback(user), warning: 'PROFILE_ADMIN_CLIENT_UNAVAILABLE' })
    }

    const { data, error } = await admin
      .from('users')
      .select('id, email, name, phone_number, author_image_url, status')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ data: buildProfileFallback(user), warning: 'PROFILE_READ_FALLBACK' })
    }

    if (!data) {
      return NextResponse.json({ data: buildProfileFallback(user), warning: 'PROFILE_ROW_MISSING' })
    }

    return NextResponse.json({ data: buildProfileFallback(user, data) })
  } catch (error: any) {
    return NextResponse.json({ data: null, warning: error?.message || 'PROFILE_GET_FAILED' })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const limited = rateLimit(request, rateLimitPresets.default)
    if (limited) return limited

    const { user, supabase } = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawBody = await request.json().catch(() => ({}))
    const parsed = profileUpdateSchema.safeParse(rawBody || {})
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const patchData = getPatchPayload(parsed.data)
    const fallback = buildProfileFallback(user, patchData)
    const admin = getAdminClientSafe()

    let existingRow: { id: string } | null = null
    let checkError: { message?: string } | null = null

    if (admin) {
      const checkResult = await admin.from('users').select('id').eq('id', user.id).maybeSingle()
      existingRow = (checkResult.data as { id: string } | null) || null
      checkError = checkResult.error || null
    } else {
      checkError = { message: 'PROFILE_ADMIN_CLIENT_UNAVAILABLE' }
    }

    const checkFailed = Boolean(checkError)
    let dbErrorMessage: string | null = null

    if (admin && !checkFailed && existingRow) {
      const { error: updateError } = await admin.from('users').update(patchData).eq('id', user.id)
      if (updateError) dbErrorMessage = updateError.message || 'UPDATE_FAILED'
    } else if (admin && !checkFailed && !existingRow) {
      const { error: insertError } = await admin.from('users').insert({
        id: user.id,
        email: fallback.email,
        name: fallback.name,
        phone_number: fallback.phone_number,
        author_image_url: fallback.author_image_url,
        status: 'active',
      })
      if (insertError) dbErrorMessage = insertError.message || 'INSERT_FAILED'
    } else {
      dbErrorMessage = checkError?.message || 'PROFILE_LOOKUP_FAILED'
    }

    if (typeof parsed.data.name === 'string' || Object.prototype.hasOwnProperty.call(parsed.data, 'phone_number')) {
      await supabase.auth.updateUser({
        data: {
          ...(typeof parsed.data.name === 'string' ? { name: parsed.data.name } : {}),
          ...(Object.prototype.hasOwnProperty.call(parsed.data, 'phone_number')
            ? { phone_number: parsed.data.phone_number || null }
            : {}),
        },
      })
    }

    if (dbErrorMessage) {
      return NextResponse.json({
        success: true,
        data: fallback,
        warning: `PROFILE_DB_WRITE_FALLBACK:${dbErrorMessage}`,
      })
    }

    return NextResponse.json({ success: true, data: fallback })
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      data: null,
      warning: `PROFILE_PATCH_FALLBACK:${error?.message || 'UNKNOWN_ERROR'}`,
    })
  }
}

export async function POST(request: NextRequest) {
  return PATCH(request)
}

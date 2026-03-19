import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone_number: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(180).optional().or(z.literal('')),
  subject: z.string().trim().max(180).optional().or(z.literal('')),
  message: z.string().trim().min(4).max(4000),
})

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, rateLimitPresets.moderate)
  if (limited) return limited

  try {
    const payload = await request.json()
    const parsed = contactSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid contact payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const subject = parsed.data.subject?.trim() || ''
    const messageText = parsed.data.message.trim()
    const insertPayload = {
      name: parsed.data.name,
      phone_number: parsed.data.phone_number,
      email: parsed.data.email?.trim() || null,
      message: subject ? `Subject: ${subject}\n\n${messageText}` : messageText,
      source: 'landing_contact',
      status: 'new',
      priority: 'normal',
      notes: null,
      assigned_to: null,
    }

    const { data, error } = await admin
      .from('direct_leads')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error || !data?.id) {
      return NextResponse.json(
        { error: 'Failed to save contact request', details: error?.message || 'Unknown error' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save contact request', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

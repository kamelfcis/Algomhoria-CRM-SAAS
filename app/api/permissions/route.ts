import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

const createPermissionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  resource: z.string().min(1),
  action: z.string().min(1),
})

// Check if user is admin
async function checkAdmin(userId: string) {
  const adminClient = createAdminClient()
  
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select(`
      role_id,
      roles!inner(name)
    `)
    .eq('user_id', userId)

  return userRoles?.some((ur: any) => ur.roles?.name === 'admin') ?? false
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: permissions })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await checkAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createPermissionSchema.parse(body)

    const adminClient = createAdminClient()
    // Use type assertion to work around strict Supabase typing
    const { data: permission, error } = await (adminClient as any)
      .from('permissions')
      .insert({
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        description_ar: validatedData.description_ar?.trim() || null,
        resource: validatedData.resource.trim(),
        action: validatedData.action.trim(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: permission }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


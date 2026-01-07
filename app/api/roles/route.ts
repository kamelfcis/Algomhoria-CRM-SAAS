import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

const createRoleSchema = z.object({
  name: z.string().min(1),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})

const updateRoleSchema = createRoleSchema.partial()

// Check if user is admin
async function checkAdmin(userId: string) {
  const adminClient = createAdminClient()
  
  // Check if user has admin role in user_roles table
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

    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, name, name_ar, description, description_ar, status, is_system_role, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: roles })
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
    const validatedData = createRoleSchema.parse(body)

    const adminClient = createAdminClient() as any
    const { data: role, error } = await adminClient
      .from('roles')
      .insert({
        name: validatedData.name.trim(),
        name_ar: validatedData.name_ar?.trim() || null,
        description: validatedData.description?.trim() || null,
        description_ar: validatedData.description_ar?.trim() || null,
        status: validatedData.status || 'active',
        is_system_role: false,
      })
      .select('id, name, name_ar, description, description_ar, status, is_system_role, created_at, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: role }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


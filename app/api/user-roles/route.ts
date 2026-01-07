import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
})

const bulkAssignSchema = z.object({
  user_id: z.string().uuid(),
  role_ids: z.array(z.string().uuid()),
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (userId) {
      // Get roles for a specific user
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          roles(*)
        `)
        .eq('user_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ data: userRoles })
    }

    // Get all user roles
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        users(id, email, name),
        roles(*)
      `)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: userRoles })
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
    
    // Check if it's bulk assignment
    if (body.role_ids && Array.isArray(body.role_ids)) {
      const validatedData = bulkAssignSchema.parse(body)
      const adminClient = createAdminClient() as any

      // Remove existing roles for this user first
      await adminClient
        .from('user_roles')
        .delete()
        .eq('user_id', validatedData.user_id)

      // Insert new roles
      const inserts = validatedData.role_ids.map(role_id => ({
        user_id: validatedData.user_id,
        role_id,
        assigned_by: user.id,
      }))

      const { data, error } = await adminClient
        .from('user_roles')
        .insert(inserts)
        .select(`
          *,
          roles(*)
        `)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ data }, { status: 201 })
    } else {
      // Single assignment
      const validatedData = assignRoleSchema.parse(body)
      const adminClient = createAdminClient() as any

      const { data, error } = await adminClient
        .from('user_roles')
        .insert({
          user_id: validatedData.user_id,
          role_id: validatedData.role_id,
          assigned_by: user.id,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ data }, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const roleId = searchParams.get('role_id')

    if (!userId || !roleId) {
      return NextResponse.json({ 
        error: 'user_id and role_id are required' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Role removed from user successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


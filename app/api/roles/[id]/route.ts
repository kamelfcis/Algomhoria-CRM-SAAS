import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: role })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updateRoleSchema.parse(body)

    const adminClient = createAdminClient()
    
    // Check if role is system role and prevent deletion
    const { data: existingRole } = await adminClient
      .from('roles')
      .select('is_system_role')
      .eq('id', params.id)
      .single()

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name.trim()
    if (validatedData.name_ar !== undefined) updateData.name_ar = validatedData.name_ar?.trim() || null
    if (validatedData.description !== undefined) updateData.description = validatedData.description?.trim() || null
    if (validatedData.description_ar !== undefined) updateData.description_ar = validatedData.description_ar?.trim() || null
    if (validatedData.status !== undefined) updateData.status = validatedData.status

    const { data: role, error } = await (adminClient as any)
      .from('roles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: role })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const adminClient = createAdminClient() as any
    
    // Check if role is system role
    const { data: existingRole } = await adminClient
      .from('roles')
      .select('is_system_role')
      .eq('id', params.id)
      .single()

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (existingRole.is_system_role) {
      return NextResponse.json({ 
        error: 'Cannot delete system role' 
      }, { status: 400 })
    }

    // Check if role is assigned to any users
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('role_id', params.id)
      .limit(1)

    if (userRoles && userRoles.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role that is assigned to users. Please remove all role assignments first.' 
      }, { status: 400 })
    }

    const { error } = await adminClient
      .from('roles')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


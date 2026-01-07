import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

const updatePermissionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  resource: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
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
    const validatedData = updatePermissionSchema.parse(body)

    const adminClient = createAdminClient()
    
    // Build update object - use any to avoid strict type issues with partial updates
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name.trim()
    if (validatedData.description !== undefined) updateData.description = validatedData.description?.trim() || null
    if (validatedData.description_ar !== undefined) updateData.description_ar = validatedData.description_ar?.trim() || null
    if (validatedData.resource !== undefined) updateData.resource = validatedData.resource.trim()
    if (validatedData.action !== undefined) updateData.action = validatedData.action.trim()

    // Use type assertion to avoid Supabase strict type checking
    const { data: permission, error } = await (adminClient as any)
      .from('permissions')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: permission })
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

    const adminClient = createAdminClient()
    
    // Check if permission is used in any role
    const { data: rolePermissions } = await adminClient
      .from('role_permissions')
      .select('id')
      .eq('permission_id', params.id)
      .limit(1)

    if (rolePermissions && rolePermissions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete permission that is assigned to roles. Please remove all role assignments first.' 
      }, { status: 400 })
    }

    const { error } = await adminClient
      .from('permissions')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Permission deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


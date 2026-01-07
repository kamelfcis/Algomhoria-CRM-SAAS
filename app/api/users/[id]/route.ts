import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { isAdmin } from '@/lib/utils/permission-helpers'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone_number: z.string().optional().nullable(),
  role_ids: z.array(z.string().uuid()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin using user_roles
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Use admin client to update user
    const adminClient = createAdminClient() as any

    // Build update object (excluding role_ids which is handled separately)
    const updateData: Record<string, any> = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.phone_number !== undefined) updateData.phone_number = validatedData.phone_number ?? null
    if (validatedData.status !== undefined) updateData.status = validatedData.status

    // Update user in database
    const { data: updatedUser, error: dbError } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select('id, email, name, phone_number, status, author_image_url, created_at, updated_at')
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    // Handle role assignments if provided
    if (validatedData.role_ids !== undefined) {
      // Remove existing roles
      await adminClient
        .from('user_roles')
        .delete()
        .eq('user_id', params.id)

      // Assign new roles
      if (validatedData.role_ids.length > 0) {
        const roleAssignments = validatedData.role_ids.map(roleId => ({
          user_id: params.id,
          role_id: roleId,
          assigned_by: user.id,
        }))

        const { error: roleError } = await adminClient
          .from('user_roles')
          .insert(roleAssignments)

        if (roleError) {
          console.error('Failed to assign roles:', roleError)
          return NextResponse.json({ 
            error: `Failed to assign roles: ${roleError.message}` 
          }, { status: 400 })
        }
      }
    }

    return NextResponse.json({ data: updatedUser }, { status: 200 })
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
    
    // Check if user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin using user_roles
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent self-deletion
    if (user.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Use admin client to delete user
    const adminClient = createAdminClient()

    // Delete from database first
    const { error: dbError } = await adminClient
      .from('users')
      .delete()
      .eq('id', params.id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    // Delete from auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(params.id)

    if (authError) {
      // Log error but don't fail - user is already deleted from database
      console.error('Failed to delete user from auth:', authError)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


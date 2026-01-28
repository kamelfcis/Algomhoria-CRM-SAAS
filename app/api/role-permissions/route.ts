import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

const assignPermissionSchema = z.object({
  role_id: z.string().uuid(),
  permission_id: z.string().uuid(),
})

const bulkAssignSchema = z.object({
  role_id: z.string().uuid(),
  permission_ids: z.array(z.string().uuid()),
})

// Check if user is admin
async function checkAdmin(userId: string) {
  try {
    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      // Fallback: use regular client (may be blocked by RLS)
      const supabase = await createClient()
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles!inner(name, status)
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('Error checking admin status (fallback):', error)
        return false
      }

      return userRoles?.some((ur: any) => 
        ur.roles?.name === 'admin' && ur.roles?.status === 'active'
      ) ?? false
    }

    const adminClient = createAdminClient()
    
    const { data: userRoles, error } = await adminClient
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(name, status)
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return userRoles?.some((ur: any) => 
      ur.roles?.name === 'admin' && ur.roles?.status === 'active'
    ) ?? false
  } catch (error: any) {
    console.error('Error in checkAdmin:', error)
    // If it's a service role key error, try fallback
    if (error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log('Falling back to regular client for admin check')
      try {
        const supabase = await createClient()
        const { data: userRoles, error: fallbackError } = await supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner(name, status)
          `)
          .eq('user_id', userId)

        if (fallbackError) {
          console.error('Fallback admin check failed:', fallbackError)
          return false
        }

        return userRoles?.some((ur: any) => 
          ur.roles?.name === 'admin' && ur.roles?.status === 'active'
        ) ?? false
      } catch (fallbackErr) {
        console.error('Fallback check also failed:', fallbackErr)
        return false
      }
    }
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting (100 requests per minute for read operations)
    const rateLimitResponse = rateLimit(request, rateLimitPresets.moderate)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = await checkAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('role_id')

    if (roleId) {
      // Get permissions for a specific role using admin client to bypass RLS
      let adminClient
      try {
        adminClient = createAdminClient()
      } catch (error: any) {
        console.error('Failed to create admin client:', error)
        // Fallback to regular client
        const { data: rolePermissions, error: fallbackError } = await supabase
          .from('role_permissions')
          .select(`
            role_id,
            permission_id,
            created_at,
            permissions(id, name, description, description_ar, resource, action)
          `)
          .eq('role_id', roleId)

        if (fallbackError) {
          console.error('Error fetching role permissions (fallback):', fallbackError)
          return NextResponse.json({ 
            error: fallbackError.message,
            code: fallbackError.code,
            details: fallbackError.details 
          }, { status: 400 })
        }

        return NextResponse.json({ data: rolePermissions || [] })
      }
      
      console.log('Fetching permissions for role:', roleId)
      
      const { data: rolePermissions, error } = await adminClient
        .from('role_permissions')
        .select(`
          role_id,
          permission_id,
          created_at,
          permissions(id, name, description, description_ar, resource, action)
        `)
        .eq('role_id', roleId)

      if (error) {
        console.error('Error fetching role permissions:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        
        // Try simpler query without joins
        console.log('Trying simpler query...')
        const { data: simpleData, error: simpleError } = await (adminClient as any)
          .from('role_permissions')
          .select('role_id, permission_id, created_at')
          .eq('role_id', roleId)
        
        if (simpleError) {
          return NextResponse.json({ 
            error: simpleError.message || error.message,
            code: simpleError.code || error.code,
            details: simpleError.details || error.details,
            hint: simpleError.hint || error.hint
          }, { status: 400 })
        }
        
        // If simple query works, fetch permissions separately
        if (simpleData && simpleData.length > 0) {
          const permissionIds = simpleData.map((rp: any) => rp.permission_id)
          const { data: permissionsData, error: permError } = await (adminClient as any)
            .from('permissions')
            .select('id, name, description, description_ar, resource, action')
            .in('id', permissionIds)
          
          if (permError) {
            return NextResponse.json({ 
              error: permError.message,
              code: permError.code
            }, { status: 400 })
          }
          
          // Combine the data
          const combined = simpleData.map((rp: any) => ({
            ...rp,
            permissions: permissionsData?.find((p: any) => p.id === rp.permission_id) || null
          }))
          
          return NextResponse.json({ data: combined })
        }
        
        return NextResponse.json({ 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }, { status: 400 })
      }

      console.log('Successfully fetched role permissions:', rolePermissions?.length || 0)
      return NextResponse.json({ data: rolePermissions || [] })
    }

    // Get all role permissions (limit to avoid huge responses) using admin client
    const adminClient = createAdminClient()
    
    const { data: rolePermissions, error } = await adminClient
      .from('role_permissions')
      .select(`
        role_id,
        permission_id,
        created_at,
        roles(id, name, name_ar),
        permissions(id, name, description, description_ar, resource, action)
      `)
      .limit(1000)

    if (error) {
      console.error('Error fetching all role permissions:', error)
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details 
      }, { status: 400 })
    }

    return NextResponse.json({ data: rolePermissions || [] })
  } catch (error: any) {
    console.error('Unexpected error in role-permissions GET:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (60 requests per minute for write operations)
    const rateLimitResponse = rateLimit(request, rateLimitPresets.default)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

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
    if (body.permission_ids && Array.isArray(body.permission_ids)) {
      const validatedData = bulkAssignSchema.parse(body)
      const adminClient = createAdminClient() as any

      // Remove duplicates from permission_ids array
      const uniquePermissionIds = [...new Set(validatedData.permission_ids)]

      // Get existing permissions for this role (only IDs for comparison)
      const { data: existingPermissions, error: fetchError } = await adminClient
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', validatedData.role_id)

      if (fetchError) {
        console.error('Error fetching existing permissions:', fetchError)
        return NextResponse.json({ 
          error: fetchError.message || 'Failed to fetch existing permissions' 
        }, { status: 400 })
      }

      const existingPermissionIds = new Set(
        (existingPermissions || []).map((rp: any) => rp.permission_id)
      )
      const newPermissionIds = new Set(uniquePermissionIds)

      // Find permissions to add (in new but not in existing)
      const toAdd = uniquePermissionIds.filter(id => !existingPermissionIds.has(id))
      
      // Find permissions to remove (in existing but not in new)
      const toRemove = (Array.from(existingPermissionIds) as string[]).filter(
        (id: string) => !newPermissionIds.has(id)
      )

      // If no changes, return early
      if (toAdd.length === 0 && toRemove.length === 0) {
        // Fetch and return current permissions
        const { data: currentPermissions } = await adminClient
          .from('role_permissions')
          .select('*')
          .eq('role_id', validatedData.role_id)
        
        return NextResponse.json({ 
          data: currentPermissions || [],
          message: 'No changes detected' 
        }, { status: 200 })
      }

      // Perform deletions and insertions in parallel for better performance
      const operations: Promise<any>[] = []

      // Delete permissions that need to be removed
      if (toRemove.length > 0) {
        const deleteOp = adminClient
          .from('role_permissions')
          .delete()
          .eq('role_id', validatedData.role_id)
          .in('permission_id', toRemove)
        
        operations.push(deleteOp)
      }

      // Insert new permissions
      if (toAdd.length > 0) {
        const inserts = toAdd.map(permission_id => ({
          role_id: validatedData.role_id,
          permission_id,
        }))
        
        const insertOp = adminClient
          .from('role_permissions')
          .insert(inserts)
          .select()
        
        operations.push(insertOp)
      }

      // Execute all operations in parallel (if both exist) or sequentially (if only one)
      if (operations.length > 0) {
        const results = await Promise.all(operations)
        
        // Check for errors
        for (const result of results) {
          if (result && result.error) {
            console.error('Error in permission operation:', result.error)
            return NextResponse.json({ 
              error: result.error.message || 'Failed to update permissions' 
            }, { status: 400 })
          }
        }
      }

      // Fetch and return updated permissions
      const { data: updatedPermissions, error: finalError } = await adminClient
        .from('role_permissions')
        .select('*')
        .eq('role_id', validatedData.role_id)

      if (finalError) {
        console.error('Error fetching updated permissions:', finalError)
        return NextResponse.json({ 
          error: finalError.message || 'Failed to fetch updated permissions' 
        }, { status: 400 })
      }

      return NextResponse.json({ 
        data: updatedPermissions || [],
        message: `Updated ${toAdd.length} added, ${toRemove.length} removed` 
      }, { status: 200 })
    } else {
      // Single assignment
      const validatedData = assignPermissionSchema.parse(body)
      const adminClient = createAdminClient() as any

      // Check if this permission is already assigned to avoid duplicates
      const { data: existing, error: checkError } = await adminClient
        .from('role_permissions')
        .select('id')
        .eq('role_id', validatedData.role_id)
        .eq('permission_id', validatedData.permission_id)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing permission:', checkError)
        return NextResponse.json({ 
          error: checkError.message || 'Failed to check existing permission' 
        }, { status: 400 })
      }

      // If already exists, return the existing record
      if (existing) {
        return NextResponse.json({ 
          data: existing,
          message: 'Permission already assigned to role' 
        }, { status: 200 })
      }

      // Insert new permission
      const { data, error } = await adminClient
        .from('role_permissions')
        .insert({
          role_id: validatedData.role_id,
          permission_id: validatedData.permission_id,
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting permission:', error)
        return NextResponse.json({ 
          error: error.message || 'Failed to assign permission' 
        }, { status: 400 })
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
    // Apply rate limiting (strict: 10 requests per minute for delete operations)
    const rateLimitResponse = rateLimit(request, rateLimitPresets.strict)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

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
    const roleId = searchParams.get('role_id')
    const permissionId = searchParams.get('permission_id')

    if (!roleId || !permissionId) {
      return NextResponse.json({ 
        error: 'role_id and permission_id are required' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Permission removed from role successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


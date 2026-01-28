import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { isAdmin } from '@/lib/utils/permission-helpers'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional().nullable(),
  role_ids: z.array(z.string().uuid()).optional(), // Make roles optional
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (60 requests per minute)
    const rateLimitResponse = rateLimit(request, rateLimitPresets.default)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

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
    
    // Log the request for debugging
    console.log('Create user request:', {
      email: body.email,
      name: body.name,
      role_ids: body.role_ids,
      role_ids_type: typeof body.role_ids,
      role_ids_length: Array.isArray(body.role_ids) ? body.role_ids.length : 'not array'
    })
    
    let validatedData
    try {
      validatedData = createUserSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors)
        return NextResponse.json({ 
          error: 'Validation failed',
          details: error.errors 
        }, { status: 400 })
      }
      throw error
    }

    // Normalize email to lowercase
    const normalizedEmail = validatedData.email.toLowerCase().trim()
    const normalizedName = validatedData.name.trim()
    const normalizedPhone = validatedData.phone_number?.trim() || null

    // role_ids is optional - can be assigned later

    // Use admin client to create user in Supabase Auth
    const adminClient = createAdminClient()
    
    // Check if user already exists in users table (by email) - check this first
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ 
        error: `User with email ${normalizedEmail} already exists in the system` 
      }, { status: 400 })
    }
    
    // Create user in Supabase Auth with user metadata
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: validatedData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: normalizedName, // Ensure name is in metadata
      },
    })

    if (authError) {
      // Check if it's a duplicate email error
      if (authError.message?.toLowerCase().includes('already registered') || 
          authError.message?.toLowerCase().includes('already exists') ||
          authError.message?.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ 
          error: `User with email ${normalizedEmail} already exists` 
        }, { status: 400 })
      }
      return NextResponse.json({ 
        error: authError.message || 'Failed to create user in authentication system' 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Use database function to create user record (bypasses RLS)
    // Wait a bit for trigger to execute if it exists
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if user was already created by trigger
    let { data: newUser, error: fetchError } = await adminClient
      .from('users')
      .select('id, email, name, phone_number, status, author_image_url, created_at, updated_at')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (!newUser) {
      // User not created by trigger, use database function
      console.log('User not created by trigger, using create_user_record function')
      
      const { data: functionResult, error: functionError } = await (adminClient
        .rpc as any)('create_user_record', {
          p_user_id: authData.user.id,
          p_email: normalizedEmail,
          p_name: normalizedName,
          p_phone_number: normalizedPhone || null,
          p_status: 'active'
        })

      if (functionError) {
        console.error('=== FUNCTION ERROR DETAILS ===')
        console.error('Function error:', functionError)
        console.error('Error code:', functionError.code)
        console.error('Error message:', functionError.message)
        console.error('Error details:', functionError.details)
        console.error('Error hint:', functionError.hint)
        console.error('=============================')
        
        // Try to delete auth user if function failed
        try {
          await adminClient.auth.admin.deleteUser(authData.user.id)
          console.log('Auth user deleted after function failure')
        } catch (deleteError) {
          console.error('Failed to delete auth user:', deleteError)
        }
        
        const errorMessage = functionError.message || 'Failed to create user record'
        const errorCode = functionError.code || 'UNKNOWN'
        
        return NextResponse.json({ 
          error: 'Database error creating new user',
          message: errorMessage,
          code: errorCode,
          details: functionError.details,
          hint: functionError.hint || 'Make sure create_user_record function exists and has proper permissions'
        }, { status: 400 })
      }

      if (!functionResult || (Array.isArray(functionResult) && functionResult.length === 0)) {
        // Try to delete auth user if function returned no result
        try {
          await adminClient.auth.admin.deleteUser(authData.user.id)
          console.log('Auth user deleted - function returned no result')
        } catch (deleteError) {
          console.error('Failed to delete auth user:', deleteError)
        }
        
        return NextResponse.json({ 
          error: 'Failed to create user record - function returned no data'
        }, { status: 500 })
      }

      // Convert function result to user object
      newUser = Array.isArray(functionResult) ? functionResult[0] : functionResult
    } else {
      // User exists, update it with our data (especially name and phone)
      const newUserAny = newUser as any
      if (newUserAny.name !== normalizedName || newUserAny.phone_number !== (normalizedPhone || null)) {
        console.log('Updating existing user with correct name and phone')
        const updateData: any = {
          name: normalizedName,
          phone_number: normalizedPhone || null,
          status: 'active',
        }
        
        const { data: updatedUser, error: updateError } = await (adminClient
          .from('users') as any)
          .update(updateData)
          .eq('id', authData.user.id)
          .select('id, email, name, phone_number, status, author_image_url, created_at, updated_at')
          .single()

        if (!updateError && updatedUser) {
          newUser = updatedUser
        }
      }
    }

    // Verify the name was saved correctly
    if ((newUser as any)?.name && (newUser as any).name !== normalizedEmail) {
      // Name is correctly set, continue
    } else {
      // If name is missing or equals email, update it
      const updateNameData: any = { name: normalizedName }
      const { data: fixedUser } = await (adminClient
        .from('users') as any)
        .update(updateNameData)
        .eq('id', authData.user.id)
        .select('id, email, name, phone_number, status, author_image_url, created_at, updated_at')
        .single()
      
      if (fixedUser) {
        newUser = fixedUser
      }
    }

    // Assign roles to the new user
    if (validatedData.role_ids && validatedData.role_ids.length > 0) {
      // Validate that all role_ids exist
      console.log('Validating role_ids:', validatedData.role_ids)
      const { data: existingRoles, error: rolesCheckError } = await adminClient
        .from('roles')
        .select('id, name')
        .in('id', validatedData.role_ids)

      if (rolesCheckError) {
        console.error('Error checking roles:', rolesCheckError)
        return NextResponse.json({ 
          error: `Failed to validate roles: ${rolesCheckError.message}` 
        }, { status: 400 })
      }

      console.log('Found roles:', existingRoles)

      if (!existingRoles || existingRoles.length === 0) {
        return NextResponse.json({ 
          error: 'No valid roles found. Please make sure roles exist in the database.' 
        }, { status: 400 })
      }

      if (existingRoles.length !== validatedData.role_ids.length) {
        const foundIds = (existingRoles as any[]).map((r: any) => r.id)
        const missingIds = validatedData.role_ids.filter(id => !foundIds.includes(id))
        return NextResponse.json({ 
          error: `Invalid role IDs: ${missingIds.join(', ')}` 
        }, { status: 400 })
      }

      const roleAssignments = validatedData.role_ids.map(roleId => ({
        user_id: authData.user.id,
        role_id: roleId,
        assigned_by: user.id,
      }))

      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert(roleAssignments as any)

      if (roleError) {
        console.error('Failed to assign roles:', roleError)
        console.error('Role error code:', roleError.code)
        console.error('Role error message:', roleError.message)
        console.error('Role error details:', roleError.details)
        
        // Check for RLS policy errors
        if (roleError.code === '42501' || roleError.message?.includes('permission denied') || roleError.message?.includes('policy')) {
          return NextResponse.json({ 
            error: `Permission denied assigning roles: ${roleError.message}. Please check RLS policies on user_roles table.` 
          }, { status: 403 })
        }
        
        return NextResponse.json({ 
          error: `Failed to assign roles: ${roleError.message}`,
          code: roleError.code,
          details: roleError.details
        }, { status: 400 })
      }
    }

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/users:', error)
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors)
      return NextResponse.json({ 
        error: 'Validation failed',
        details: error.errors 
      }, { status: 400 })
    }
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      return NextResponse.json({ 
        error: error.message || 'Internal server error' 
      }, { status: 500 })
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
}


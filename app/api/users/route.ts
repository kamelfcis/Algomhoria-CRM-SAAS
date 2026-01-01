import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone_number: z.string().optional(),
  role: z.enum(['admin', 'moderator', 'sales', 'user']),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Normalize email to lowercase
    const normalizedEmail = validatedData.email.toLowerCase().trim()
    const normalizedName = validatedData.name.trim()

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
        role: validatedData.role,
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

    // Check if user was already created by trigger (if trigger exists)
    // Wait a bit for trigger to execute if it exists
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { data: existingUserByTrigger } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    let newUser

    if (existingUserByTrigger) {
      // User was created by trigger, update it with our data (especially name)
      const { data: updatedUser, error: updateError } = await adminClient
        .from('users')
        .update({
          name: normalizedName, // Ensure name is set correctly
          phone_number: validatedData.phone_number || null,
          role: validatedData.role,
          status: 'active',
        })
        .eq('id', authData.user.id)
        .select()
        .single()

      if (updateError) {
        // If update fails, try to delete the auth user
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ 
          error: `Failed to update user: ${updateError.message}` 
        }, { status: 400 })
      }

      newUser = updatedUser
    } else {
      // Create user profile in database (no trigger, manual insert)
      const { data: insertedUser, error: dbError } = await adminClient
        .from('users')
        .insert({
          id: authData.user.id,
          email: normalizedEmail,
          name: normalizedName, // Ensure name is set correctly
          phone_number: validatedData.phone_number || null,
          role: validatedData.role,
          password_hash: '', // Supabase Auth handles password hashing - password is NOT stored in table
          status: 'active',
        })
        .select()
        .single()

      if (dbError) {
        // If database insert fails, try to delete the auth user
        await adminClient.auth.admin.deleteUser(authData.user.id)
        
        // Check if it's a duplicate key error
        if (dbError.message?.includes('duplicate key') || dbError.message?.includes('unique constraint')) {
          return NextResponse.json({ 
            error: `User with this email or ID already exists: ${dbError.message}` 
          }, { status: 400 })
        }
        
        return NextResponse.json({ 
          error: `Failed to create user profile: ${dbError.message}` 
        }, { status: 400 })
      }

      newUser = insertedUser
    }

    // Verify the name was saved correctly
    if (!newUser.name || newUser.name === normalizedEmail) {
      // If name is missing or equals email, update it
      const { data: fixedUser } = await adminClient
        .from('users')
        .update({ name: normalizedName })
        .eq('id', authData.user.id)
        .select()
        .single()
      
      if (fixedUser) {
        newUser = fixedUser
      }
    }

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


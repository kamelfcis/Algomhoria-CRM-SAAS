import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { isAdmin } from '@/lib/utils/permission-helpers'

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or changing their own password
    const userIsAdmin = await isAdmin(user.id)
    const isOwnPassword = user.id === params.id

    if (!userIsAdmin && !isOwnPassword) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = userIsAdmin && !isOwnPassword 
      ? resetPasswordSchema.parse(body)
      : changePasswordSchema.parse(body)

    // Use admin client to update password
    const adminClient = createAdminClient()

    // Update password in Supabase Auth
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      params.id,
      {
        password: validatedData.newPassword,
      }
    )

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


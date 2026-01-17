import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET: Get all members of a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this project
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_user')
      .select('is_owner')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (accessError || !projectAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    // Get all project members
    const { data: projectMembers, error: membersError } = await supabase
      .from('project_user')
      .select('id, is_owner, created_at, user_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching project members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Get profile info for each member using a function (bypasses RLS)
    const userIds = projectMembers?.map(m => m.user_id) || []
    let profiles = []
    
    if (userIds.length > 0) {
      const { data: profileResult, error: profilesError } = await supabase.rpc('get_member_profiles', {
        p_user_ids: userIds
      })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        // Fallback: try direct query (might fail due to RLS, but worth trying)
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .in('id', userIds)
        profiles = fallbackProfiles || []
      } else {
        profiles = profileResult || []
      }
    }

    // Combine project members with their profiles
    const members = (projectMembers || []).map(member => ({
      ...member,
      profiles: profiles?.find(p => p.id === member.user_id) || null
    }))

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Invite a user to the project by email
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is project owner
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_user')
      .select('is_owner')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (accessError || !projectAccess || !projectAccess.is_owner) {
      return NextResponse.json({ error: 'Only project owners can invite users' }, { status: 403 })
    }

    // Find user by email using a database function (bypasses RLS)
    // RLS on profiles only allows users to see their own profile, so we need a function
    const { data: profileResult, error: profileError } = await supabase.rpc('get_user_by_email', {
      p_email: email
    })

    if (profileError) {
      console.error('Error looking up user:', profileError)
      return NextResponse.json({ 
        error: `Error looking up user. Please make sure the get_user_by_email function exists in your database. Run get_user_by_email_function.sql in Supabase SQL editor.` 
      }, { status: 500 })
    }

    if (!profileResult || profileResult.length === 0) {
      return NextResponse.json({ 
        error: `User with email "${email}" not found. Please make sure the user has signed up.` 
      }, { status: 404 })
    }

    const profile = profileResult[0]
    const invitedUserId = profile.id

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('project_user')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', invitedUserId)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 })
    }

    // Add user to project using the database function
    const { error: addError } = await supabase.rpc('add_user_to_project', {
      p_project_id: projectId,
      p_user_id: invitedUserId,
      p_is_owner: false
    })

    if (addError) {
      console.error('Error adding user to project:', addError)
      return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
    }

    // Fetch the newly added member with profile info
    const { data: projectMember } = await supabase
      .from('project_user')
      .select('id, is_owner, created_at, user_id')
      .eq('project_id', projectId)
      .eq('user_id', invitedUserId)
      .single()

    const { data: invitedUserProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', invitedUserId)
      .single()

    const newMember = projectMember ? {
      ...projectMember,
      profiles: invitedUserProfile || null
    } : null

    return NextResponse.json({ 
      message: 'User invited successfully',
      member: newMember 
    })
  } catch (error) {
    console.error('Error in POST /api/projects/[projectId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove a user from the project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is project owner
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_user')
      .select('is_owner')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (accessError || !projectAccess || !projectAccess.is_owner) {
      return NextResponse.json({ error: 'Only project owners can remove users' }, { status: 403 })
    }

    // Prevent removing the owner
    const { data: targetMember } = await supabase
      .from('project_user')
      .select('is_owner')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (targetMember?.is_owner) {
      return NextResponse.json({ error: 'Cannot remove project owner' }, { status: 400 })
    }

    // Remove user from project
    const { error: deleteError } = await supabase
      .from('project_user')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error removing user from project:', deleteError)
      return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 })
    }

    return NextResponse.json({ message: 'User removed successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/projects/[projectId]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

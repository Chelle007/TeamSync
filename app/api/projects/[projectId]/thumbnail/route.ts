import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    // Verify user has access to this project and is owner
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_user')
      .select('is_owner')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (accessError) {
      console.error('Access check error:', accessError)
      return NextResponse.json({ error: 'Failed to verify project access' }, { status: 500 })
    }

    if (!projectAccess) {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 })
    }

    if (!projectAccess.is_owner) {
      return NextResponse.json({ error: 'Only project owners can upload thumbnails' }, { status: 403 })
    }

    const formData = await request.formData()
    const imageFile = formData.get('file') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (images only)
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validImageTypes.includes(imageFile.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed' 
      }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image file size must be less than 5MB' }, { status: 400 })
    }

    // Get old thumbnail URL to delete it later
    const { data: project } = await supabase
      .from('projects')
      .select('thumbnail_url')
      .eq('id', projectId)
      .single()

    // Upload image to Supabase Storage
    const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `thumbnail_${Date.now()}.${fileExt}`
    const filePath = `${projectId}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-thumbnails')
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: true, // Allow overwriting
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      
      // Provide more specific error messages
      if (uploadError.message?.includes('new row violates row-level security')) {
        return NextResponse.json({ 
          error: 'Storage access denied. Please ensure the project-thumbnails bucket exists and RLS policies are configured.',
          details: 'Run the storage_policies.sql file in Supabase SQL Editor'
        }, { status: 403 })
      }
      
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({ 
          error: 'Storage bucket not found. Please create the "project-thumbnails" bucket in Supabase Storage.',
          details: 'Go to Storage → Create bucket → Name: project-thumbnails'
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: uploadError.message || 'Failed to upload image',
        details: uploadError.message
      }, { status: 500 })
    }

    // Get public URL (bucket should be public for thumbnails)
    const { data: urlData } = supabase.storage
      .from('project-thumbnails')
      .getPublicUrl(filePath)

    const thumbnailUrl = urlData.publicUrl

    // Update project with new thumbnail URL
    const { error: updateError } = await supabase
      .from('projects')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', projectId)

    if (updateError) {
      console.error('Update error:', updateError)
      // Delete the uploaded file if database update fails
      await supabase.storage
        .from('project-thumbnails')
        .remove([filePath])
      
      return NextResponse.json({ error: 'Failed to update project with thumbnail URL' }, { status: 500 })
    }

    // Delete old thumbnail if it exists and is different
    if (project?.thumbnail_url && project.thumbnail_url !== thumbnailUrl) {
      try {
        // Extract path from URL
        const oldPathMatch = project.thumbnail_url.match(/project-thumbnails\/(.+)$/)
        if (oldPathMatch) {
          const oldPath = oldPathMatch[1]
          await supabase.storage
            .from('project-thumbnails')
            .remove([oldPath])
        }
      } catch (deleteError) {
        // Non-critical error, just log it
        console.warn('Failed to delete old thumbnail:', deleteError)
      }
    }

    return NextResponse.json({
      success: true,
      thumbnail_url: thumbnailUrl,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload thumbnail' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    // Verify user has access to this project and is owner
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_user')
      .select('is_owner')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (accessError || !projectAccess || !projectAccess.is_owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get current thumbnail URL
    const { data: project } = await supabase
      .from('projects')
      .select('thumbnail_url')
      .eq('id', projectId)
      .single()

    if (!project?.thumbnail_url) {
      return NextResponse.json({ error: 'No thumbnail to delete' }, { status: 404 })
    }

    // Extract path from URL
    const pathMatch = project.thumbnail_url.match(/project-thumbnails\/(.+)$/)
    if (pathMatch) {
      const filePath = pathMatch[1]
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('project-thumbnails')
        .remove([filePath])

      if (deleteError) {
        console.error('Delete error:', deleteError)
        // Continue anyway to clear the database reference
      }
    }

    // Update project to remove thumbnail URL
    const { error: updateError } = await supabase
      .from('projects')
      .update({ thumbnail_url: null })
      .eq('id', projectId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to remove thumbnail' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete thumbnail' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
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

    // Verify user has access to this project
    const { data: projectAccess } = await supabase
      .from('project_user')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!projectAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // List files in project-documents bucket for this project
    const { data: files, error } = await supabase.storage
      .from('project-documents')
      .list(`${projectId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      console.error('Error listing files:', error)
      return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
    }

    // Get signed URLs for each file (bucket is private)
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        const { data: urlData } = await supabase.storage
          .from('project-documents')
          .createSignedUrl(`${projectId}/${file.name}`, 3600) // 1 hour expiry

        return {
          name: file.name,
          size: file.metadata?.size || 0,
          created_at: file.created_at,
          updated_at: file.updated_at,
          url: urlData?.signedUrl || '',
        }
      })
    )

    return NextResponse.json({ documents: filesWithUrls })
  } catch (error) {
    console.error('Documents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

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

    // Verify user has access to this project
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_user')
      .select('*')
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

    const formData = await request.formData()
    const pdfFile = formData.get('file') as File | null

    if (!pdfFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (pdfFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF file size must be less than 10MB' }, { status: 400 })
    }

    // Upload PDF to Supabase Storage
    const fileName = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `${projectId}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(filePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      
      // Provide more specific error messages
      if (uploadError.message?.includes('new row violates row-level security')) {
        return NextResponse.json({ 
          error: 'Storage access denied. Please ensure the project-documents bucket exists and RLS policies are configured.',
          details: 'Run the storage_policies.sql file in Supabase SQL Editor'
        }, { status: 403 })
      }
      
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({ 
          error: 'Storage bucket not found. Please create the "project-documents" bucket in Supabase Storage.',
          details: 'Go to Storage → Create bucket → Name: project-documents'
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: uploadError.message || 'Failed to upload PDF',
        details: uploadError.message
      }, { status: 500 })
    }

    // Get signed URL (bucket is private)
    const { data: urlData } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    return NextResponse.json({
      success: true,
      file: {
        name: fileName,
        size: pdfFile.size,
        url: urlData?.signedUrl || '',
        path: filePath,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
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
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('fileName')

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 })
    }

    // Verify user has access to this project
    const { data: projectAccess } = await supabase
      .from('project_user')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!projectAccess) {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 })
    }

    // Only owners can delete files
    if (!projectAccess.is_owner) {
      return NextResponse.json({ error: 'Only project owners can delete files' }, { status: 403 })
    }

    const filePath = `${projectId}/${fileName}`

    // Delete file from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('project-documents')
      .remove([filePath])

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ 
        error: deleteError.message || 'Failed to delete file'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const body = await request.json()
    const { oldFileName, newFileName } = body

    if (!oldFileName || !newFileName) {
      return NextResponse.json({ error: 'Old and new file names are required' }, { status: 400 })
    }

    // Validate new file name
    if (!newFileName.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File name must end with .pdf' }, { status: 400 })
    }

    // Verify user has access to this project
    const { data: projectAccess } = await supabase
      .from('project_user')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!projectAccess) {
      return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 })
    }

    // Only owners can rename files
    if (!projectAccess.is_owner) {
      return NextResponse.json({ error: 'Only project owners can rename files' }, { status: 403 })
    }

    const oldFilePath = `${projectId}/${oldFileName}`
    const newFilePath = `${projectId}/${newFileName}`

    // Check if new file name already exists
    const { data: existingFiles } = await supabase.storage
      .from('project-documents')
      .list(`${projectId}`, {
        search: newFileName
      })

    if (existingFiles && existingFiles.length > 0) {
      return NextResponse.json({ error: 'A file with this name already exists' }, { status: 400 })
    }

    // Get the file to copy
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('project-documents')
      .download(oldFilePath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Upload with new name
    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(newFilePath, fileData, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ 
        error: uploadError.message || 'Failed to rename file'
      }, { status: 500 })
    }

    // Delete old file
    const { error: deleteError } = await supabase.storage
      .from('project-documents')
      .remove([oldFilePath])

    if (deleteError) {
      // Try to clean up the new file if deletion fails
      await supabase.storage.from('project-documents').remove([newFilePath])
      return NextResponse.json({ 
        error: 'Failed to delete old file'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, newFileName })
  } catch (error) {
    console.error('Rename error:', error)
    return NextResponse.json(
      { error: 'Failed to rename document' },
      { status: 500 }
    )
  }
}

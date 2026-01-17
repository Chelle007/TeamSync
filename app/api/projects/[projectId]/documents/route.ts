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

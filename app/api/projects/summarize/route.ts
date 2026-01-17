import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Dynamic import for pdfjs-dist to avoid ESM issues in Next.js
const getPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Disable worker for server-side use (Next.js API routes)
  pdfjs.GlobalWorkerOptions.workerSrc = ''
  return pdfjs
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const projectScopeInput = formData.get('projectScope') as string | null
    const pdfFile = formData.get('pdfFile') as File | null
    const projectId = formData.get('projectId') as string | null // Optional: if project already exists

    if (!projectScopeInput && !pdfFile) {
      return NextResponse.json({ error: 'Project scope or PDF file is required' }, { status: 400 })
    }

    let textToSummarize = ''
    let pdfPath: string | null = null

    // Handle PDF upload
    if (pdfFile) {
      // Validate file type
      if (pdfFile.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
      }

      // Validate file size (max 10MB)
      if (pdfFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'PDF file size must be less than 10MB' }, { status: 400 })
      }

      // Upload PDF to project-documents bucket
      const fileExt = pdfFile.name.split('.').pop()
      const timestamp = Date.now()
      const sanitizedName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      
      // If projectId is provided, upload directly to project folder
      // Otherwise, upload to temp folder (will be moved after project creation)
      const filePath = projectId 
        ? `${projectId}/${timestamp}-${sanitizedName}`
        : `temp/${user.id}/${timestamp}-${sanitizedName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, pdfFile, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        
        // Provide helpful error messages
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

      pdfPath = filePath

      // Extract text from PDF using pdfjs-dist (fast, local processing)
      try {
        const arrayBuffer = await pdfFile.arrayBuffer()
        // Convert to Uint8Array as required by pdfjs-dist
        const pdfData = new Uint8Array(arrayBuffer)
        
        // Dynamically import pdfjs-dist
        const pdfjs = await getPdfJs()
        
        // Disable worker for server-side use (Next.js API routes don't support workers)
        pdfjs.GlobalWorkerOptions.workerSrc = ''
        
        // Load PDF document using pdfjs-dist (disable worker for server-side)
        const loadingTask = pdfjs.getDocument({ 
          data: pdfData,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        })
        const pdfDocument = await loadingTask.promise
        
        // Extract text from all pages
        let fullText = ''
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
          fullText += pageText + '\n\n'
        }
        
        textToSummarize = fullText.trim()

        if (!textToSummarize || textToSummarize.length === 0) {
          return NextResponse.json({ 
            error: 'PDF appears to be empty or contains only images/scanned content. Please ensure the PDF contains selectable text.',
            pdfPath,
            suggestion: 'If your PDF contains only images, try copying the text and pasting it into the text input field instead.'
          }, { status: 400 })
        }
      } catch (error: any) {
        console.error('PDF processing error:', error)
        
        // Provide more specific error messages
        if (error.message?.includes('password') || error.message?.includes('encrypted')) {
          return NextResponse.json({ 
            error: 'PDF is password-protected or encrypted. Please remove the password and try again, or provide the project scope as text.',
            pdfPath
          }, { status: 400 })
        }
        
        if (error.message?.includes('corrupt') || error.message?.includes('invalid')) {
          return NextResponse.json({ 
            error: 'PDF file appears to be corrupted or invalid. Please try a different PDF file or provide the project scope as text.',
            pdfPath
          }, { status: 400 })
        }
        
        return NextResponse.json({ 
          error: 'Failed to process PDF. The PDF may be corrupted, password-protected, or contain only images. Please try providing the project scope as text instead.',
          pdfPath,
          suggestion: 'You can copy the text from your PDF and paste it into the text input field.',
          details: error.message
        }, { status: 500 })
      }
    }

    // Use text input
    if (projectScopeInput) {
      textToSummarize = projectScopeInput.trim()
    }

    if (!textToSummarize) {
      return NextResponse.json({ error: 'No text to summarize' }, { status: 400 })
    }

    // Generate both summary and project scope using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that processes project scopes. Generate two outputs:
1) A concise summary (2-3 sentences) focusing on key features, goals, and technical requirements.
2) A well-formatted project scope document with clear structure. Format the project scope with:
   - Clear section headers (use ## for main sections like Overview, Key Features, Technical Requirements, Goals, Timeline)
   - Bold sub-section headers using **Sub-section Name:** format for nested categories
   - Bullet points (using - or *) for features and requirements under sub-sections
   - Organized sections - start directly with content sections, do NOT include a "# Project Scope Document" header
   - Use markdown formatting for better readability
   - Preserve all important details from the original scope
   - Make it professional and easy to read
   - Each main section should start with ## followed by the section name

Return your response as JSON with "summary" and "project_scope" fields. The project_scope should be formatted in markdown starting with section headers (##), not a document title.`,
        },
        {
          role: 'user',
          content: `Please process the following project scope and generate both a summary and a well-formatted project scope document:\n\n${textToSummarize}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    })

    let summary = ''
    let formattedProjectScope = textToSummarize // Default to original text

    try {
      const responseContent = completion.choices[0]?.message?.content || ''
      const parsed = JSON.parse(responseContent)
      summary = parsed.summary || ''
      formattedProjectScope = parsed.project_scope || textToSummarize
    } catch (parseError) {
      // Fallback: try to extract summary from response
      const responseText = completion.choices[0]?.message?.content || ''
      // If JSON parsing fails, try to get just summary
      const summaryCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes project scopes into concise, clear summaries. Focus on key features, goals, and technical requirements. Keep the summary to 2-3 sentences.',
          },
          {
            role: 'user',
            content: `Please summarize the following project scope:\n\n${textToSummarize}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      })
      summary = summaryCompletion.choices[0]?.message?.content || ''
      formattedProjectScope = textToSummarize
    }

    return NextResponse.json({
      summary,
      project_scope: formattedProjectScope,
      pdfPath,
    })
  } catch (error) {
    console.error('Summarize error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

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
    const projectScope = formData.get('projectScope') as string | null
    const pdfFile = formData.get('pdfFile') as File | null

    if (!projectScope && !pdfFile) {
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

      // Upload PDF to Supabase Storage
      const fileExt = pdfFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = `project-scopes/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-scopes')
        .upload(filePath, pdfFile, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
      }

      pdfPath = filePath

      // Extract text from PDF using pdf-parse
      try {
        // Use require for CommonJS module (works in Node.js API routes)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>
        const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
        const pdfData = await pdfParse(pdfBuffer)
        textToSummarize = pdfData.text

        if (!textToSummarize || textToSummarize.trim().length === 0) {
          return NextResponse.json({ 
            error: 'PDF appears to be empty or could not extract text',
            pdfPath 
          }, { status: 400 })
        }
      } catch (parseError) {
        console.error('PDF parse error:', parseError)
        return NextResponse.json({ 
          error: 'Failed to extract text from PDF. Please ensure the PDF contains readable text.',
          pdfPath 
        }, { status: 500 })
      }
    }

    // Use text input
    if (projectScope) {
      textToSummarize = projectScope.trim()
    }

    if (!textToSummarize) {
      return NextResponse.json({ error: 'No text to summarize' }, { status: 400 })
    }

    // Summarize using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' for faster/cheaper
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

    const summary = completion.choices[0]?.message?.content || ''

    return NextResponse.json({
      summary,
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

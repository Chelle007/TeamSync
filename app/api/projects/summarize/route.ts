import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { projectId, webhookPayload, commits, documents } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    console.log(`🤖 AI Summarizer processing project: ${projectId}`)

    // Get project context from database
    const supabase = await createClient()
    let projectSummary = ''
    
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('summary')
        .eq('id', projectId)
        .single()
      
      projectSummary = project?.summary || 'No project summary available'
    } catch (err) {
      console.warn('Could not fetch project summary:', err.message)
      projectSummary = 'No project summary available'
    }

    // Extract data from webhook payload or fallback to commits
    let analysisData = ''
    
    if (webhookPayload) {
      // Use webhook data (preferred)
      const { high_level, raw_commits, raw_diff } = webhookPayload
      
      analysisData = `
PROJECT CONTEXT: ${projectSummary}

PULL REQUEST INFO:
- Title: ${high_level?.title || 'No title'}
- Description: ${high_level?.body || 'No description'}

COMMITS:
${raw_commits?.join('\n- ') || 'No commits'}

CODE CHANGES:
${raw_diff || 'No diff available'}
      `.trim()
    } else if (commits && commits.length > 0) {
      // Fallback to commits data
      analysisData = `
PROJECT CONTEXT: ${projectSummary}

COMMITS:
${commits.map(c => `- ${c.message} (${c.files?.join(', ') || 'files unknown'})`).join('\n')}

DOCUMENTS:
${documents?.map(d => `- ${d.name}: ${d.content}`).join('\n') || 'No documents'}
      `.trim()
    } else {
      return NextResponse.json({ error: 'Either webhookPayload or commits are required' }, { status: 400 })
    }

    console.log('📊 Analyzing changes with AI...')

    // AI Analysis with structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI that analyzes code changes and creates video scripts. 

Your job is to:
1. Understand what changed in the code
2. Write a natural narration script (2-3 sentences)
3. Identify specific visual changes to show in a video
4. Estimate timing for each visual change

IMPORTANT RULES:
- Focus on USER-VISIBLE changes (UI, styling, content, features)
- Ignore internal/technical changes that users can't see
- Each visual change needs a CSS selector to target the element
- Duration should be 4-8 seconds per change
- Script should sound natural when spoken aloud
- If no visual changes are detected, create a generic overview

RESPONSE FORMAT: You must respond with valid JSON in this exact structure:
{
  "script": "Natural narration text here...",
  "changes": [
    {
      "title": "Short change title",
      "description": "What changed specifically", 
      "page_url": "/path/to/page",
      "selector": "CSS selector for element",
      "duration_seconds": 6
    }
  ]
}`
        },
        {
          role: 'user',
          content: analysisData
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('AI returned invalid JSON')
    }

    // Validate response structure
    if (!parsedResponse.script || !Array.isArray(parsedResponse.changes)) {
      throw new Error('AI response missing required fields')
    }

    // Add report_key for file naming
    const reportKey = `${projectId}_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}`
    
    const result = {
      ...parsedResponse,
      report_key: reportKey,
      generated_at: new Date().toISOString(),
      project_id: projectId
    }

    console.log('✅ AI analysis complete')
    console.log(`📝 Script: ${result.script.substring(0, 100)}...`)
    console.log(`🎬 Changes detected: ${result.changes.length}`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ AI Summarizer error:', error)
    
    // Return fallback response to keep pipeline working
    const fallbackReportKey = `${request.json().projectId || 'UNKNOWN'}_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}`
    
    return NextResponse.json({
      script: "This update includes several changes to improve the application. The modifications enhance user experience and update various components throughout the system.",
      changes: [
        {
          title: "General Updates",
          description: "Various improvements and changes",
          page_url: "/",
          selector: "body",
          duration_seconds: 8
        }
      ],
      report_key: fallbackReportKey,
      generated_at: new Date().toISOString(),
      fallback: true,
      error: error.message
    })
  }
}

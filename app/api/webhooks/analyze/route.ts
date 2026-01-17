import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Analyze GitHub webhook payload and generate video script + visual changes
 * This is an internal API endpoint called by the video generation orchestrator
 */
export async function POST(request: Request) {
  try {
    const { webhookPayload, liveUrl } = await request.json()

    if (!webhookPayload) {
      return NextResponse.json({ error: 'Webhook payload is required' }, { status: 400 })
    }

    console.log('🤖 Analyzing webhook payload for video generation')

    // Extract information from webhook
    const { event_info, high_level, raw_commits, raw_diff } = webhookPayload

    // Build context for AI
    const textToAnalyze = `
GitHub Pull Request Analysis:

Repository: ${event_info.repository}
PR #${event_info.pr_number}: ${high_level.title}
Merged by: ${event_info.merged_by}
Merged at: ${event_info.timestamp}

PR Description:
${high_level.body || 'No description provided'}

Commits:
${raw_commits.map((msg: string, i: number) => `${i + 1}. ${msg}`).join('\n')}

Code Changes (Diff):
${raw_diff}
`.trim()

    console.log(`📝 Context prepared (${textToAnalyze.length} chars)`)

    // Generate video script and visual changes using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that analyzes GitHub pull requests and generates video scripts.

Analyze the PR and generate:
1) A concise summary (2-3 sentences) of what changed
2) A detailed narration script for a video walkthrough (conversational, engaging, 30-60 seconds when spoken)
3) A list of visual changes to show in the video with specific CSS selectors

Return your response as JSON with these fields:
- "summary": Brief 2-3 sentence summary
- "script": Detailed narration script (what the AI voice will say in the video)
- "changes": Array of visual changes, each with:
  - "title": Short title of the change
  - "description": What changed
  - "page_url": Relative URL path (e.g., "/", "/about", "/contact")
  - "selector": CSS selector to highlight (e.g., ".hero-section", "#footer", "body", ".navbar")
  - "duration_seconds": How long to show this change (4-8 seconds)

Example script tone: "In this update, the homepage messaging was refined. The main title was removed for a cleaner look, and the tagline was updated to better target founders and entrepreneurs."

Focus on user-visible changes. Ignore internal code refactoring unless it affects the UI.
If no visual changes are detected, create a generic overview showing the homepage.`,
        },
        {
          role: 'user',
          content: `Analyze this GitHub pull request and generate a video script with visual changes:\n\n${textToAnalyze}\n\nLive site URL: ${liveUrl || 'Not provided'}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    let summary = ''
    let script = ''
    let changes = []

    try {
      const responseContent = completion.choices[0]?.message?.content || ''
      const parsed = JSON.parse(responseContent)
      
      summary = parsed.summary || ''
      script = parsed.script || ''
      changes = parsed.changes || []

      console.log(`✅ AI Analysis complete:`)
      console.log(`   - Summary: ${summary.substring(0, 50)}...`)
      console.log(`   - Script length: ${script.length} chars`)
      console.log(`   - Visual changes: ${changes.length}`)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      
      // Fallback: generate basic summary
      const fallbackCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this GitHub PR in 2-3 sentences.',
          },
          {
            role: 'user',
            content: textToAnalyze,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      })
      
      summary = fallbackCompletion.choices[0]?.message?.content || 'PR merged successfully'
      script = summary
      
      // Default change: show homepage
      changes = [
        {
          title: 'Homepage Overview',
          description: 'Overview of the updated website',
          page_url: '/',
          selector: 'body',
          duration_seconds: 8,
        },
      ]
    }

    return NextResponse.json({
      summary,
      script,
      changes,
    })
  } catch (error) {
    console.error('❌ Webhook analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze webhook' },
      { status: 500 }
    )
  }
}

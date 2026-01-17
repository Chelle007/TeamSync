import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    console.log('📊 Analyzing progress for project:', projectId)

    const supabase = createServiceClient()

    // Get project with scope
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, project_scope, progress')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.project_scope) {
      console.log('⚠️ No project scope defined')
      return NextResponse.json({ progress: project.progress || 0 })
    }

    // Get all completed updates
    const { data: updates } = await supabase
      .from('updates')
      .select('title, summary')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })

    const completedWork = updates?.map((u, i) => 
      `${i + 1}. ${u.title}: ${u.summary}`
    ).join('\n') || 'No updates yet.'

    // AI analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You analyze project progress. Return ONLY a JSON object with a single "progress" field (0-100). Be conservative.' 
        },
        { 
          role: 'user', 
          content: `Project Scope:\n${project.project_scope}\n\nCompleted Work:\n${completedWork}\n\nReturn {"progress": <0-100>}` 
        },
      ],
      max_tokens: 50,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const response = JSON.parse(completion.choices[0]?.message?.content || '{"progress":0}')
    const newProgress = Math.min(100, Math.max(0, Math.round(response.progress || 0)))

    // Update database
    const { error: updateError } = await supabase
      .from('projects')
      .update({ progress: newProgress })
      .eq('id', projectId)

    if (updateError) {
      console.error('Failed to update progress:', updateError)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    console.log(`✅ Progress updated: ${project.progress}% → ${newProgress}%`)

    return NextResponse.json({ progress: newProgress })

  } catch (error) {
    console.error('❌ Progress analysis failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}

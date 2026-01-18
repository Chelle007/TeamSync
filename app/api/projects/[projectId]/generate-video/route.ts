import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'
import { updateWebhookEventStatus } from '@/lib/webhook-processor'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const startTime = Date.now()
  const { projectId } = await params
  console.log('🎬 Video generation started for project:', projectId)

  try {
    const supabase = createServiceClient()
    const { webhookEventId } = await request.json()

    if (!webhookEventId) {
      return NextResponse.json({ error: 'webhookEventId is required' }, { status: 400 })
    }

    // Update status to processing
    await updateWebhookEventStatus(webhookEventId, 'processing')

    // Get webhook event data
    const { data: webhookEvent, error: eventError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', webhookEventId)
      .single()

    if (eventError || !webhookEvent) {
      throw new Error('Webhook event not found')
    }

    console.log(`📦 Processing PR #${webhookEvent.pr_number}: ${webhookEvent.pr_title}`)

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, live_url')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    if (!project.live_url) {
      throw new Error('Project must have a live_url configured for video recording')
    }

    console.log(`🌐 Project: ${project.name}, Live URL: ${project.live_url}`)

    // Generate unique report key
    const reportKey = `PR_${webhookEvent.pr_number}_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}`

    // Step 1: Analyze webhook payload with AI
    console.log('🤖 Step 1: Analyzing webhook data with AI...')
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    const analysisResponse = await fetch(`${baseUrl}/api/webhooks/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookPayload: webhookEvent.raw_payload,
        liveUrl: project.live_url,
      }),
    })

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text()
      throw new Error(`Webhook analysis failed: ${analysisResponse.statusText} - ${errorText}`)
    }

    const analysisData = await analysisResponse.json()
    console.log('✅ AI Analysis complete')
    console.log(`📝 Script length: ${analysisData.script?.length || 0} chars`)
    console.log(`🎬 Changes detected: ${analysisData.changes?.length || 0}`)

    // Step 2: Generate TTS Audio
    console.log('🎵 Step 2: Generating TTS audio...')
    const ttsResponse = await fetch(`${baseUrl}/api/generate-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: analysisData.script,
        reportKey: reportKey,
      }),
    })

    if (!ttsResponse.ok) {
      throw new Error(`TTS generation failed: ${ttsResponse.statusText}`)
    }

    const ttsData = await ttsResponse.json()
    console.log('✅ TTS audio generated:', ttsData.audioPath)

    // Step 3: Record Screen with Puppeteer
    console.log('📹 Step 3: Recording screen...')
    const recordResponse = await fetch(`${baseUrl}/api/record-screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes: analysisData.changes,
        reportKey: reportKey,
        liveUrl: project.live_url,
      }),
    })

    if (!recordResponse.ok) {
      throw new Error(`Screen recording failed: ${recordResponse.statusText}`)
    }

    const recordData = await recordResponse.json()
    console.log('✅ Screen recording completed:', recordData.videoPath)

    // Step 4: Combine Video + Audio
    console.log('🎬 Step 4: Combining video and audio...')
    const combineResponse = await fetch(`${baseUrl}/api/combine-video-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoPath: recordData.videoPath,
        audioPath: ttsData.audioPath,
        reportKey: reportKey,
      }),
    })

    if (!combineResponse.ok) {
      throw new Error(`Video combination failed: ${combineResponse.statusText}`)
    }

    const combineData = await combineResponse.json()
    console.log('✅ Final video created:', combineData.finalVideoPath)

    // Step 5: Generate screenshots for Google Doc
    console.log('📸 Step 5: Generating screenshots...')
    let screenshots: any[] = []
    try {
      const screenshotResponse = await fetch(`${baseUrl}/api/generate-screenshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: analysisData.changes,
          reportKey: reportKey,
          liveUrl: project.live_url,
        }),
      })

      if (screenshotResponse.ok) {
        const screenshotData = await screenshotResponse.json()
        screenshots = screenshotData.screenshots || []
        console.log(`✅ Screenshots generated: ${screenshots.length}`)
      } else {
        console.warn('⚠️ Screenshot generation failed (non-critical)')
      }
    } catch (screenshotError) {
      console.warn('⚠️ Screenshot generation failed (non-critical):', screenshotError instanceof Error ? screenshotError.message : screenshotError)
    }

    // Step 6: Generate PDF document with screenshots and captions
    console.log('📄 Step 6: Generating PDF document...')
    let docUrl: string | null = null
    try {
      const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportKey: reportKey,
          projectName: project.name,
          script: analysisData.script,
          changes: analysisData.changes,
          screenshots: screenshots,
        }),
      })

      if (pdfResponse.ok) {
        const pdfData = await pdfResponse.json()
        docUrl = pdfData.documentUrl
        console.log('✅ PDF document generated:', docUrl)
      } else {
        const errorText = await pdfResponse.text()
        console.warn('⚠️ PDF generation failed (non-critical):', errorText)
      }
    } catch (docError) {
      console.warn('⚠️ PDF generation failed (non-critical):', docError instanceof Error ? docError.message : docError)
    }

    // Step 7: Store update in database
    // Use Supabase URLs if available, otherwise fallback to local paths
    const finalVideoUrl = combineData.videoUrl || combineData.finalVideoPath
    console.log('💾 Step 7: Storing update in database...')
    console.log(`   Video URL: ${finalVideoUrl}`)
    console.log(`   Doc URL: ${docUrl}`)
    
    const { data: update, error: updateError } = await supabase
      .from('updates')
      .insert({
        project_id: projectId,
        webhook_event_id: webhookEventId,
        title: webhookEvent.pr_title,
        video_url: finalVideoUrl,
        doc_url: docUrl,
        summary: analysisData.script,
        status: 'completed',
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error storing update:', updateError)
      throw new Error('Failed to store update in database')
    }

    console.log('✅ Update stored:', update.id)

    // Step 8: Update project progress
    console.log('📊 Step 8: Updating project progress...')
    let newProgress = null
    try {
      const progressResponse = await fetch(`${baseUrl}/api/projects/${projectId}/analyze-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        newProgress = progressData.progress
        console.log(`✅ Progress updated: ${newProgress}%`)
      } else {
        console.warn('⚠️ Progress update failed (non-critical)')
      }
    } catch (progressError) {
      console.warn('⚠️ Progress update failed (non-critical):', progressError instanceof Error ? progressError.message : progressError)
    }

    // Update webhook event status to completed
    await updateWebhookEventStatus(webhookEventId, 'completed')

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`🎉 Video + Doc + Progress update completed in ${duration}s`)

    return NextResponse.json({
      success: true,
      message: 'Video generated successfully',
      update: {
        id: update.id,
        title: update.title,
        video_url: update.video_url,
        doc_url: update.doc_url,
        summary: update.summary,
      },
      progress: newProgress,
      assets: {
        audioPath: ttsData.audioPath,
        videoPath: recordData.videoPath,
        finalVideoPath: combineData.finalVideoPath,
        pdfDocUrl: docUrl,
      },
      timing: {
        totalDuration: `${duration}s`,
        videoDuration: combineData.videoDuration,
        audioDuration: combineData.audioDuration,
      },
    })
  } catch (error) {
    console.error('❌ Video generation failed:', error)

    // Update webhook event status to failed
    const { webhookEventId } = await request.json().catch(() => ({}))
    if (webhookEventId) {
      await updateWebhookEventStatus(
        webhookEventId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`❌ Failed after ${duration}s`)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Video generation failed',
        duration: `${duration}s`,
      },
      { status: 500 }
    )
  }
}

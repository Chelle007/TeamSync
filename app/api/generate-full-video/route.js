export async function POST(request) {
  try {
    const { projectId, commits, documents } = await request.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required (e.g., "PR_5", "TEST_123", or any identifier)' }),
        { status: 400 }
      );
    }

    console.log(`🚀 Starting full video generation for project: ${projectId}`);
    
    // Generate a unique report key for file naming
    // Format: {projectId}_{YYYY_MM_DD}
    const reportKey = `${projectId}_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}`;

    // Step 1: Call AI Summarizer
    console.log('📝 Step 1: Generating AI summary...');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const summaryResponse = await fetch(`${baseUrl}/api/projects/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        webhookPayload: null, // Will be populated in Phase 6 with real webhook data
        commits: commits || [],
        documents: documents || []
      }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      throw new Error(`AI Summarizer failed: ${summaryResponse.statusText} - ${errorText}`);
    }

    const summaryData = await summaryResponse.json();
    
    // Override report_key with our generated one for consistency
    summaryData.report_key = reportKey;
    
    console.log('✅ AI Summary generated');
    console.log(`📝 Script: ${summaryData.script.substring(0, 100)}...`);
    console.log(`🎬 Changes: ${summaryData.changes.length}`);

    // Step 2: Generate TTS Audio
    console.log('🎵 Step 2: Generating TTS audio...');
    const ttsResponse = await fetch(`${baseUrl}/api/generate-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: summaryData.script,
        reportKey: reportKey,
      }),
    });

    if (!ttsResponse.ok) {
      throw new Error(`TTS generation failed: ${ttsResponse.statusText}`);
    }

    const ttsData = await ttsResponse.json();
    console.log('✅ TTS audio generated:', ttsData.audioPath);

    // Step 3: Record Screen with Puppeteer
    console.log('📹 Step 3: Recording screen...');
    const recordResponse = await fetch(`${baseUrl}/api/record-screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes: summaryData.changes,
        reportKey: reportKey,
      }),
    });

    if (!recordResponse.ok) {
      throw new Error(`Screen recording failed: ${recordResponse.statusText}`);
    }

    const recordData = await recordResponse.json();
    console.log('✅ Screen recording completed:', recordData.videoPath);

    // Step 4: Combine Video + Audio
    console.log('🎬 Step 4: Combining video and audio...');
    const combineResponse = await fetch(`${baseUrl}/api/combine-video-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoPath: recordData.videoPath,
        audioPath: ttsData.audioPath,
        reportKey: reportKey,
      }),
    });

    if (!combineResponse.ok) {
      throw new Error(`Video combination failed: ${combineResponse.statusText}`);
    }

    const combineData = await combineResponse.json();
    console.log('✅ Final video created:', combineData.finalVideoPath);

    // Step 5: Generate PDF/HTML document with screenshots and captions
    console.log('📄 Step 5: Generating document...');
    let docData = null;
    try {
      const docResponse = await fetch(`${baseUrl}/api/generate-pdf-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportKey: reportKey,
          projectName: projectId,
          script: summaryData.script,
          changes: summaryData.changes,
        }),
      });

      if (docResponse.ok) {
        docData = await docResponse.json();
        console.log('✅ Document generated:', docData.documentUrl);
      } else {
        const errorText = await docResponse.text();
        console.warn('⚠️ Document generation failed (non-critical):', errorText);
      }
    } catch (docError) {
      console.warn('⚠️ Document generation failed (non-critical):', docError.message);
    }

    // Step 6: Return complete result
    const result = {
      success: true,
      projectId,
      reportKey,
      finalVideoUrl: combineData.finalVideoPath,
      docUrl: docData?.documentUrl || null,
      summary: {
        script: summaryData.script,
        changes: summaryData.changes,
      },
      assets: {
        audioPath: ttsData.audioPath,
        videoPath: recordData.videoPath,
        finalVideoPath: combineData.finalVideoPath,
        docPath: docData?.documentPath || null,
      },
      durations: {
        videoDuration: combineData.videoDuration,
        audioDuration: combineData.audioDuration,
      },
      generatedAt: new Date().toISOString(),
    };

    console.log('🎉 Full video + document generation completed successfully!');
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (error) {
    console.error('❌ Full video generation failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        step: error.step || 'unknown',
        timestamp: new Date().toISOString()
      }),
      { status: 500 }
    );
  }
}
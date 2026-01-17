// Test the complete pipeline: AI Summary -> TTS -> Screen Recording -> Video Combination
async function testFullPipeline() {
  console.log('🚀 Testing Full Video Generation Pipeline');
  console.log('==========================================\n');

  const testPayload = {
    projectId: 'PR_FULL_TEST', // Can be any identifier: "PR_5", "TEST_123", "my-project", etc.
    commits: [
      // These will be used in Phase 6 when we integrate real AI
      // For now, we use mock data regardless of what's passed here
      {
        sha: 'abc123',
        message: 'Update footer color to neon green',
        author: 'Desmond',
        date: '2026-01-17',
        files: ['styles/footer.css']
      },
      {
        sha: 'def456', 
        message: 'Change font family to Montserrat',
        author: 'Desmond',
        date: '2026-01-17',
        files: ['styles/globals.css']
      }
    ],
    documents: [
      // These will also be used in Phase 6
      {
        name: 'README.md',
        content: 'Event website with modern styling'
      }
    ]
  };

  try {
    console.log('📤 Sending request to full pipeline...');
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/generate-full-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Pipeline failed:', errorData);
      return;
    }

    const result = await response.json();
    
    console.log('\n🎉 PIPELINE COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`⏱️  Total Duration: ${duration} seconds`);
    console.log(`📁 Project ID: ${result.projectId}`);
    console.log(`🔑 Report Key: ${result.reportKey}`);
    console.log(`🎬 Final Video: ${result.finalVideoUrl}`);
    console.log(`📝 Script Length: ${result.summary.script.length} characters`);
    console.log(`🎞️  Changes Count: ${result.summary.changes.length}`);
    
    console.log('\n📊 Asset Details:');
    console.log(`   Audio: ${result.assets.audioPath}`);
    console.log(`   Video: ${result.assets.videoPath}`);
    console.log(`   Final: ${result.assets.finalVideoPath}`);
    
    console.log('\n⏰ Duration Details:');
    console.log(`   Video: ${result.durations.videoDuration}s`);
    console.log(`   Audio: ${result.durations.audioDuration}s`);
    
    console.log('\n📋 Generated Script:');
    console.log(`   "${result.summary.script}"`);
    
    console.log('\n🎯 Changes Detected:');
    result.summary.changes.forEach((change, i) => {
      console.log(`   ${i + 1}. ${change.title} (${change.duration_seconds}s)`);
      console.log(`      ${change.description}`);
    });

    console.log(`\n✨ Video available at: http://localhost:3000${result.finalVideoUrl}`);

  } catch (error) {
    console.error('💥 Pipeline test failed:', error.message);
  }
}

// Run the test
testFullPipeline();
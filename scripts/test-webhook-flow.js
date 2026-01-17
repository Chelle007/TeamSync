// Test the complete webhook-to-video flow
async function testWebhookFlow() {
  console.log('🎣 Testing Complete Webhook-to-Video Flow');
  console.log('==========================================\n');

  try {
    console.log('📤 Sending webhook data to video generation...');
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/test-webhook-to-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Endpoint uses built-in test data
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Webhook flow failed:', errorData);
      return;
    }

    const result = await response.json();
    
    console.log('\n🎉 WEBHOOK FLOW COMPLETED!');
    console.log('===========================');
    console.log(`⏱️  Total Duration: ${duration} seconds`);
    
    console.log('\n📋 Processing Steps:');
    result.processing_flow.forEach((step, i) => {
      console.log(`   ${step}`);
    });

    console.log('\n📊 Webhook Data Processed:');
    const webhook = result.webhook_data.payload;
    console.log(`   Repository: ${webhook.event_info.repository}`);
    console.log(`   PR Number: ${webhook.event_info.pr_number}`);
    console.log(`   Merged by: ${webhook.event_info.merged_by}`);
    console.log(`   Title: ${webhook.high_level.title}`);

    console.log('\n🤖 AI Analysis Results:');
    const video = result.video_result;
    console.log(`   Script: "${video.summary.script}"`);
    console.log(`   Changes Detected: ${video.summary.changes.length}`);
    
    video.summary.changes.forEach((change, i) => {
      console.log(`   ${i + 1}. ${change.title} (${change.duration_seconds}s)`);
      console.log(`      📍 ${change.page_url} → ${change.selector}`);
    });

    console.log('\n🎬 Generated Assets:');
    console.log(`   Audio: ${video.assets.audioPath}`);
    console.log(`   Video: ${video.assets.videoPath}`);
    console.log(`   Final: ${video.assets.finalVideoPath}`);

    console.log(`\n✨ Final video: http://localhost:3000${video.finalVideoUrl}`);

    console.log('\n🎯 What Just Happened:');
    console.log('1. 📦 Simulated GitHub webhook with real PR data');
    console.log('2. 🤖 AI analyzed the code diff and generated script');
    console.log('3. 🎵 OpenAI TTS converted script to speech');
    console.log('4. 📹 Puppeteer recorded website showing changes');
    console.log('5. 🎬 FFmpeg combined video + audio with perfect sync');
    console.log('6. 🎉 Ready-to-share video created automatically!');

  } catch (error) {
    console.error('💥 Webhook flow test failed:', error.message);
  }
}

// Run the test
testWebhookFlow();
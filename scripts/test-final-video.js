// Test full pipeline: TTS + Screen Recording + Combine
const mockResponse = require('../lib/mock-ai-response.json');

async function testFinalVideo() {
  console.log('=== STEP 1: Generate TTS ===');
  const ttsResponse = await fetch('http://localhost:3000/api/generate-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script: mockResponse.script,
      reportKey: mockResponse.report_key,
    }),
  });
  const ttsResult = await ttsResponse.json();
  console.log('TTS Result:', ttsResult);

  console.log('\n=== STEP 2: Record Screen ===');
  const recordResponse = await fetch('http://localhost:3000/api/record-screen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changes: mockResponse.changes,
      reportKey: mockResponse.report_key,
    }),
  });
  const recordResult = await recordResponse.json();
  console.log('Recording Result:', recordResult);

  console.log('\n=== STEP 3: Combine Video + Audio ===');
  const combineResponse = await fetch('http://localhost:3000/api/combine-video-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoPath: recordResult.videoPath,
      audioPath: ttsResult.audioPath,
      reportKey: mockResponse.report_key,
    }),
  });
  const combineResult = await combineResponse.json();
  console.log('Final Video Result:', combineResult);

  console.log('\n🎉 DONE! Final video:', combineResult.finalVideoPath);
}

testFinalVideo();
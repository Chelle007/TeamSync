// Test full video generation with recording + audio
const mockResponse = require('../lib/mock-ai-response.json');

async function testFullVideo() {
  // Generate TTS
  console.log('Generating TTS...');
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

  // Record screen
  console.log('\nRecording screen...');
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

  console.log('\nNow you need to combine the video with audio using ffmpeg manually or create a new API endpoint');
  console.log('Video:', recordResult.videoPath);
  console.log('Audio:', ttsResult.audioPath);
}

testFullVideo();

// Test video generation
const mockResponse = require('../lib/mock-ai-response.json');

async function testVideo() {
  // First generate TTS
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

  // Then generate screenshots
  console.log('\nGenerating screenshots...');
  const screenshotsResponse = await fetch('http://localhost:3000/api/generate-screenshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changes: mockResponse.changes,
      reportKey: mockResponse.report_key,
    }),
  });
  const screenshotsResult = await screenshotsResponse.json();
  console.log('Screenshots Result:', screenshotsResult);

  // Finally generate video
  console.log('\nGenerating video...');
  const videoResponse = await fetch('http://localhost:3000/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioPath: ttsResult.audioPath,
      screenshots: screenshotsResult.screenshots,
      reportKey: mockResponse.report_key,
    }),
  });
  const videoResult = await videoResponse.json();
  console.log('Video Result:', videoResult);
}

testVideo();

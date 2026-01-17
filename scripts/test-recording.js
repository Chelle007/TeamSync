// Test screen recording
const mockResponse = require('../lib/mock-ai-response.json');

async function testRecording() {
  console.log('Recording screen...');
  const response = await fetch('http://localhost:3000/api/record-screen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changes: mockResponse.changes,
      reportKey: mockResponse.report_key,
    }),
  });

  const result = await response.json();
  console.log('Recording Result:', result);
}

testRecording();

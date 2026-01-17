// Test screenshot generation
const mockResponse = require('../lib/mock-ai-response.json');

async function testScreenshots() {
  const response = await fetch('http://localhost:3000/api/generate-screenshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changes: mockResponse.changes,
      reportKey: mockResponse.report_key,
    }),
  });

  const result = await response.json();
  console.log('Screenshots Result:', result);
}

testScreenshots();

// Test TTS generation
const mockResponse = require('../lib/mock-ai-response.json');

async function testTTS() {
    const response = await fetch('http://localhost:3000/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            script: mockResponse.script,
            reportKey: mockResponse.report_key,
        }),
    });

    const result = await response.json();
    console.log('TTS Result:', result);
}

testTTS();

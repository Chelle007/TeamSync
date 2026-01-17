// Simple test to check if webhook endpoint exists
async function testEndpoint() {
  console.log('🧪 Testing if webhook endpoint exists...\n');
  
  const url = 'http://localhost:3000/api/webhooks/github';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=test',
      },
      body: JSON.stringify({ test: true }),
    });
    
    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', result);
    console.log('');
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists! (Got 401 = signature verification working)');
      console.log('');
      console.log('Next step: Configure GitHub webhook with proper secret');
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found');
      console.log('Make sure server is running: npm run dev');
    } else {
      console.log('📝 Got response:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('Is your server running?');
    console.log('Run: npm run dev');
  }
}

testEndpoint();

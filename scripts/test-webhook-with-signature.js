// Test webhook with proper signature
// This helps verify if your webhook endpoint works correctly

const crypto = require('crypto');

// CONFIGURATION - Update these values
const WEBHOOK_SECRET = 'd4ad2b8b4b501b1f636b9f9f8286120f'; // Get from database
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/github'; // Or your deployed URL
const REPO_FULL_NAME = 'desraymondz/hnr-example-project'; // Your GitHub repo

// Test webhook payload
const webhookPayload = {
  action: 'closed',
  pull_request: {
    number: 999,
    title: 'Test PR: Update homepage',
    body: 'Testing webhook integration',
    merged: true,
    merged_at: new Date().toISOString(),
    merged_by: {
      login: 'testuser'
    },
    commits_url: 'https://api.github.com/repos/test/repo/pulls/999/commits'
  },
  repository: {
    full_name: REPO_FULL_NAME,
    name: REPO_FULL_NAME.split('/')[1],
    owner: {
      login: REPO_FULL_NAME.split('/')[0]
    }
  }
};

// Generate signature
function generateSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
  return `sha256=${hash}`;
}

async function testWebhook() {
  console.log('🧪 Testing Webhook with Proper Signature');
  console.log('=' .repeat(60));
  console.log('');
  
  if (WEBHOOK_SECRET === 'd4ad2b8b4b501b1f636b9f9f8286120f') {
    console.log('❌ ERROR: Please update WEBHOOK_SECRET in this script');
    console.log('');
    console.log('📝 To get your webhook secret:');
    console.log('   1. Go to Supabase SQL Editor');
    console.log('   2. Run: SELECT webhook_secret FROM projects;');
    console.log('   3. Copy the secret and paste it in this script');
    console.log('');
    return;
  }
  
  const payloadString = JSON.stringify(webhookPayload);
  const signature = generateSignature(webhookPayload, WEBHOOK_SECRET);
  
  console.log('📤 Sending webhook to:', WEBHOOK_URL);
  console.log('🔐 Signature:', signature);
  console.log('📦 Repository:', REPO_FULL_NAME);
  console.log('🔢 PR Number:', webhookPayload.pull_request.number);
  console.log('');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
        'X-GitHub-Event': 'pull_request',
      },
      body: payloadString,
    });
    
    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response:', JSON.stringify(result, null, 2));
    console.log('');
    
    if (response.ok) {
      console.log('✅ SUCCESS! Webhook received');
      console.log('');
      console.log('📋 Next steps:');
      console.log('   1. Check webhook_events table in Supabase');
      console.log('   2. Wait 30-120 seconds for video generation');
      console.log('   3. Check updates table for the new video');
      console.log('');
      console.log('🔍 SQL to check status:');
      console.log('   SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 1;');
    } else {
      console.log('❌ FAILED!');
      console.log('');
      console.log('🔍 Common issues:');
      if (response.status === 401) {
        console.log('   - Invalid signature (check webhook_secret)');
      } else if (response.status === 404) {
        console.log('   - No project found with matching github_url');
        console.log('   - Check: SELECT * FROM projects WHERE github_url LIKE \'%' + REPO_FULL_NAME.split('/')[1] + '%\';');
      } else if (response.status === 500) {
        console.log('   - Server error (check logs)');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('🔍 Possible issues:');
    console.log('   - Server not running (start with: npm run dev)');
    console.log('   - Wrong WEBHOOK_URL');
    console.log('   - Network/firewall issue');
  }
}

// Run the test
testWebhook();

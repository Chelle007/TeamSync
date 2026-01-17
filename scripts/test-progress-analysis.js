// Test script for progress analysis
// Run with: node scripts/test-progress-analysis.js <projectId>

require('dotenv').config({ path: '.env.local' });

const projectId = process.argv[2] || 'ec19bfb7-9551-4d3d-8e0b-e5752d00bf14';
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testProgressAnalysis() {
  console.log('📊 Testing Progress Analysis');
  console.log('Project ID:', projectId);

  try {
    const response = await fetch(`${baseUrl}/api/projects/${projectId}/analyze-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Error:', data.error);
      return;
    }

    console.log('✅ Progress:', data.progress + '%');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.log('💡 Make sure dev server is running: npm run dev');
  }
}

testProgressAnalysis();


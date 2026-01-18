/**
 * Test script to create a Google Doc from mock AI response
 * 
 * Usage: node scripts/test-google-docs.js
 * 
 * Make sure you have:
 * 1. Installed googleapis: npm install googleapis
 * 2. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_PROJECT_ID in .env.local
 */

const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function testGoogleDocs() {
  try {
    // Read the mock AI response
    const mockDataPath = path.join(__dirname, '..', 'lib', 'mock-ai-response.json')
    const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'))

    console.log('📄 Mock data loaded:', mockData.report_key)
    console.log('📝 Script:', mockData.script.substring(0, 50) + '...')
    console.log('🔧 Changes:', mockData.changes.length)

    // Import the Google Docs utility
    const { createGoogleDoc, getDocumentLink } = require('../lib/google-docs')

    console.log('\n🚀 Creating Google Doc...')
    const documentId = await createGoogleDoc(mockData)
    console.log('✅ Document created! ID:', documentId)

    console.log('\n🔗 Getting shareable link...')
    const documentLink = await getDocumentLink(documentId)
    console.log('✅ Document link:', documentLink)

    console.log('\n✨ Success! Your Google Doc is ready:')
    console.log(documentLink)
  } catch (error) {
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('Missing Google service account')) {
      console.error('\n💡 Make sure you have set these environment variables in .env.local:')
      console.error('   - GOOGLE_CLIENT_EMAIL')
      console.error('   - GOOGLE_PRIVATE_KEY')
      console.error('   - GOOGLE_PROJECT_ID')
    } else if (error.message.includes('Cannot find module')) {
      console.error('\n💡 Make sure you have installed googleapis:')
      console.error('   npm install googleapis')
    } else {
      console.error('\n💡 Full error:', error)
    }
    process.exit(1)
  }
}

// Check if dotenv is available
try {
  require.resolve('dotenv')
  testGoogleDocs()
} catch (e) {
  console.error('❌ dotenv package not found. Installing...')
  console.error('   Please run: npm install dotenv')
  console.error('   Then run this script again.')
  process.exit(1)
}

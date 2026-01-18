// Test Google Service Account Authentication
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testGoogleAuth() {
  console.log('🔍 Testing Google Service Account...\n');

  // Check env vars
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  console.log('📧 Service Account Email:', email ? email : '❌ NOT SET');
  console.log('🔑 Private Key:', privateKey ? `✅ Set (${privateKey.length} chars)` : '❌ NOT SET');

  if (!email || !privateKey) {
    console.log('\n❌ Missing credentials. Please check your .env.local file.');
    return;
  }

  try {
    // Initialize auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    console.log('\n🔐 Authenticating...');
    const authClient = await auth.getClient();
    console.log('✅ Authentication successful!\n');

    // Try to create a test document
    const docs = google.docs({ version: 'v1', auth });
    console.log('📄 Creating test document...');
    
    const createResponse = await docs.documents.create({
      requestBody: {
        title: 'Test Document - Can Delete',
      },
    });

    const docId = createResponse.data.documentId;
    console.log('✅ Document created successfully!');
    console.log(`📝 Document ID: ${docId}`);
    console.log(`🔗 URL: https://docs.google.com/document/d/${docId}/edit`);

    // Clean up - delete the test document
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId: docId });
    console.log('🗑️ Test document deleted.\n');

    console.log('✅ All tests passed! Your Google credentials are working correctly.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('permission')) {
      console.log('\n💡 This usually means:');
      console.log('   1. Google Docs API is not enabled in your project');
      console.log('   2. Google Drive API is not enabled in your project');
      console.log('   3. The service account is in a different project\n');
      console.log('👉 Go to: https://console.cloud.google.com/apis/library');
      console.log('   Search for "Google Docs API" and "Google Drive API"');
      console.log('   Make sure both show "API Enabled" (blue checkmark)');
    }
    
    if (error.message.includes('invalid_grant') || error.message.includes('private key')) {
      console.log('\n💡 This usually means:');
      console.log('   - The private key format is incorrect');
      console.log('   - Try wrapping GOOGLE_PRIVATE_KEY in double quotes');
      console.log('   - Make sure \\n characters are preserved');
    }
  }
}

testGoogleAuth();


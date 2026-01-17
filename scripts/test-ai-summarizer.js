// Test the AI Summarizer with real GitHub webhook data
async function testAISummarizer() {
  console.log('🤖 Testing AI Summarizer');
  console.log('========================\n');

  // Real GitHub webhook payload from your example
  const webhookPayload = {
    "success": true,
    "payload": {
      "event_info": {
        "repository": "desraymondz/hnr-example-project",
        "pr_number": 2,
        "merged_by": "desraymondz",
        "timestamp": "2026-01-17T05:48:52Z"
      },
      "high_level": {
        "title": "Update page.js",
        "body": ""
      },
      "raw_commits": ["Update page.js"],
      "raw_diff": "diff --git a/app/page.js b/app/page.js\nindex eab954e..68adfb1 100644\n--- a/app/page.js\n+++ b/app/page.js\n@@ -62,13 +62,12 @@ export default function Home() {\n               </span>\n               <span className=\"block mt-2\">Innovation</span>\n               <span className=\"block text-4xl sm:text-5xl lg:text-6xl mt-4 text-cyan-100\">\n-                This is the Biggest Summit 2026\n               </span>\n             </h1>\n \n             {/* Tagline */}\n             <p className=\"text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed animate-fade-in-delay\">\n-              Where visionaries connect, ideas flourish, and the future of technology unfolds.\n+              This is the palce for Founders to mingle\n             </p>\n \n             {/* Event Info */}\n"
    }
  };

  const testCases = [
    {
      name: "Real GitHub Webhook Data",
      payload: {
        projectId: "test-project-123",
        webhookPayload: webhookPayload.payload
      }
    },
    {
      name: "Fallback Commits Data", 
      payload: {
        projectId: "test-project-456",
        commits: [
          {
            message: "Update homepage title and tagline",
            files: ["app/page.js"],
            author: "desraymondz"
          }
        ],
        documents: [
          {
            name: "README.md",
            content: "Event website for tech summit"
          }
        ]
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('─'.repeat(40));

    try {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3000/api/projects/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Failed (${response.status}):`, errorData);
        continue;
      }

      const result = await response.json();
      
      console.log(`✅ Success (${duration}ms)`);
      console.log(`📝 Script: "${result.script}"`);
      console.log(`🎬 Changes detected: ${result.changes.length}`);
      
      result.changes.forEach((change, i) => {
        console.log(`   ${i + 1}. ${change.title} (${change.duration_seconds}s)`);
        console.log(`      📍 ${change.page_url} → ${change.selector}`);
        console.log(`      📄 ${change.description}`);
      });

      console.log(`🔑 Report Key: ${result.report_key}`);
      
      if (result.fallback) {
        console.log('⚠️  Used fallback response due to error');
      }

    } catch (error) {
      console.error(`💥 Test failed:`, error.message);
    }
  }

  console.log('\n🎯 Test Summary');
  console.log('===============');
  console.log('The AI should analyze the GitHub diff and detect:');
  console.log('1. Title text removal ("This is the Biggest Summit 2026")');
  console.log('2. Tagline change ("Where visionaries..." → "This is the place for Founders...")');
  console.log('3. Generate appropriate CSS selectors and timing');
  console.log('4. Create natural narration script');
}

// Run the test
testAISummarizer();
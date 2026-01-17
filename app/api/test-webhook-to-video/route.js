// Test endpoint that simulates the full flow: Webhook → AI → Video
export async function POST(request) {
  try {
    console.log('🎣 Webhook-to-Video Test Started');
    
    // Simulate receiving a GitHub webhook
    const webhookData = {
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
          "body": "Updated homepage content and messaging"
        },
        "raw_commits": ["Update page.js"],
        "raw_diff": "diff --git a/app/page.js b/app/page.js\nindex eab954e..68adfb1 100644\n--- a/app/page.js\n+++ b/app/page.js\n@@ -62,13 +62,12 @@ export default function Home() {\n               </span>\n               <span className=\"block mt-2\">Innovation</span>\n               <span className=\"block text-4xl sm:text-5xl lg:text-6xl mt-4 text-cyan-100\">\n-                This is the Biggest Summit 2026\n               </span>\n             </h1>\n \n             {/* Tagline */}\n             <p className=\"text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed animate-fade-in-delay\">\n-              Where visionaries connect, ideas flourish, and the future of technology unfolds.\n+              This is the palce for Founders to mingle\n             </p>\n \n             {/* Event Info */}\n"
      }
    };

    const projectId = `PR_${webhookData.payload.event_info.pr_number}`;
    
    console.log(`📦 Processing webhook for ${projectId}`);

    // Call the full video generation pipeline with webhook data
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const videoResponse = await fetch(`${baseUrl}/api/generate-full-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: projectId,
        webhookPayload: webhookData.payload,
        commits: [], // Will use webhook data instead
        documents: []
      }),
    });

    if (!videoResponse.ok) {
      const errorData = await videoResponse.json();
      throw new Error(`Video generation failed: ${errorData.error}`);
    }

    const result = await videoResponse.json();
    
    console.log('🎉 Webhook-to-Video completed successfully!');

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed and video generated successfully',
      webhook_data: webhookData,
      video_result: result,
      processing_flow: [
        '1. Received GitHub webhook',
        '2. Extracted PR and diff data', 
        '3. AI analyzed changes',
        '4. Generated TTS narration',
        '5. Recorded screen showing changes',
        '6. Combined into final video'
      ]
    }), { status: 200 });

  } catch (error) {
    console.error('❌ Webhook-to-Video test failed:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), { status: 500 });
  }
}
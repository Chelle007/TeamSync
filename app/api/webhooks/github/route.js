import crypto from 'crypto';
import { 
  findProjectByRepo, 
  getProjectOwnerGitHubToken, 
  storeWebhookEvent,
  triggerVideoGeneration 
} from '@/lib/webhook-processor';

// Verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${hash}` === signature;
}

// Fetch commits from GitHub API
async function fetchCommits(commitsUrl, token) {
  const response = await fetch(commitsUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch commits: ${response.status}`);
  const commits = await response.json();
  return commits.map((c) => c.commit.message);
}

// Fetch PR diff from GitHub API
async function fetchDiff(owner, repo, prNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3.diff',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch diff: ${response.status}`);
  return await response.text();
}

// Assemble mega-payload
function assembleMegaPayload(webhookData, commits, diff) {
  const { repository, pull_request, action } = webhookData;

  return {
    event_info: {
      repository: repository.full_name,
      pr_number: pull_request.number,
      merged_by: pull_request.merged_by?.login || 'unknown',
      timestamp: pull_request.merged_at || new Date().toISOString(),
    },
    high_level: {
      title: pull_request.title,
      body: pull_request.body || '',
    },
    raw_commits: commits,
    raw_diff: diff,
  };
}

export async function POST(request) {
  try {
    console.log('🎣 [Webhook] Received webhook from GitHub');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Parse webhook payload first (need it for project lookup)
    const body = await request.text();
    console.log(`📦 [Webhook] Payload size: ${body.length} bytes`);
    
    const webhookData = JSON.parse(body);
    const { action, pull_request, repository } = webhookData;

    console.log(`📋 [Webhook] Event details:`);
    console.log(`   - Action: ${action}`);
    console.log(`   - Repository: ${repository?.full_name}`);
    console.log(`   - PR Number: ${pull_request?.number}`);
    console.log(`   - PR Merged: ${pull_request?.merged}`);

    // Only process merged PRs
    if (action !== 'closed' || !pull_request?.merged) {
      console.log('⏭️  [Webhook] Skipping: Not a merged PR');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return new Response(JSON.stringify({ message: 'Not a merged PR, ignoring' }), { status: 200 });
    }

    console.log(`✅ [Webhook] Processing merged PR #${pull_request.number} from ${repository.full_name}`);

    // Find project by repository URL
    const repoFullName = repository.full_name; // e.g., "owner/repo"
    console.log(`\n🔍 [Webhook] Looking up project for repo: ${repoFullName}`);
    
    const project = await findProjectByRepo(repoFullName);

    if (!project) {
      console.log(`❌ [Webhook] No project found for repository: ${repoFullName}`);
      console.log(`💡 [Webhook] Hint: Make sure a project exists with GitHub URL matching this repo`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return new Response(
        JSON.stringify({ 
          error: 'No project configured for this repository',
          repository: repoFullName,
          hint: 'Create a project with this GitHub repository URL first'
        }), 
        { status: 404 }
      );
    }

    console.log(`✅ [Webhook] Found project: ${project.name} (${project.id})`);
    console.log(`   - Webhook secret: ${project.webhook_secret ? 'Present' : 'MISSING'}`);

    // Verify webhook signature using project's webhook secret
    const signature = request.headers.get('x-hub-signature-256');
    console.log(`\n🔐 [Webhook] Verifying signature...`);
    console.log(`   - Signature header: ${signature ? 'Present' : 'MISSING'}`);
    
    if (!signature) {
      console.log('❌ [Webhook] Missing webhook signature');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 401 });
    }

    const isValid = verifyWebhookSignature(body, signature, project.webhook_secret);
    console.log(`   - Signature valid: ${isValid}`);
    
    if (!isValid) {
      console.log('❌ [Webhook] Invalid webhook signature');
      console.log('   💡 Check that webhook secret in GitHub matches database');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
    }

    console.log('✅ [Webhook] Signature verified');

    // Get project owner's GitHub token for API calls
    console.log(`\n🔑 [Webhook] Getting project owner's GitHub token...`);
    const githubToken = await getProjectOwnerGitHubToken(project.id);
    if (!githubToken) {
      console.log('⚠️  [Webhook] No GitHub token found for project owner, using fallback');
    } else {
      console.log('✅ [Webhook] GitHub token retrieved');
    }

    // Extract data
    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = pull_request.number;
    const commitsUrl = pull_request.commits_url;
    
    console.log(`\n📥 [Webhook] Fetching PR data from GitHub...`);
    console.log(`   - Owner: ${owner}`);
    console.log(`   - Repo: ${repo}`);
    console.log(`   - PR: #${prNumber}`);
    
    // Use project owner's token, fallback to env token
    const token = githubToken || process.env.GITHUB_TEST_TOKEN;

    // Fetch commits and diff
    console.log('   - Fetching commits...');
    const commits = await fetchCommits(commitsUrl, token);
    console.log(`   ✅ Fetched ${commits.length} commits`);
    
    console.log('   - Fetching diff...');
    const diff = await fetchDiff(owner, repo, prNumber, token);
    console.log(`   ✅ Fetched diff (${diff.length} bytes)`);

    // Assemble mega-payload
    const megaPayload = assembleMegaPayload(webhookData, commits, diff);
    console.log('✅ [Webhook] Mega-payload assembled');

    // Store webhook event in database
    console.log('\n💾 [Webhook] Storing webhook event in database...');
    const webhookEvent = await storeWebhookEvent({
      projectId: project.id,
      eventType: 'pull_request',
      prNumber: pull_request.number,
      prTitle: pull_request.title,
      prBody: pull_request.body || '',
      mergedBy: pull_request.merged_by?.login || 'unknown',
      mergedAt: pull_request.merged_at,
      rawPayload: megaPayload,
    });

    if (!webhookEvent) {
      console.error('❌ [Webhook] Failed to store webhook event');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      throw new Error('Failed to store webhook event');
    }

    console.log(`✅ [Webhook] Webhook event stored: ${webhookEvent.id}`);

    // Trigger video generation asynchronously (don't wait)
    console.log('\n🎬 [Webhook] Triggering video generation...');
    triggerVideoGeneration(project.id, webhookEvent.id);
    console.log('✅ [Webhook] Video generation queued');

    // Return success immediately (don't wait for video)
    console.log('\n✅ [Webhook] Webhook processed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received and video generation started',
        project: {
          id: project.id,
          name: project.name,
        },
        webhook_event: {
          id: webhookEvent.id,
          pr_number: pull_request.number,
          pr_title: pull_request.title,
        }
      }), 
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [Webhook] ERROR:', error);
    console.error('   Stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }), 
      { status: 500 }
    );
  }
}

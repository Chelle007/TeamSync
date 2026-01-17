import crypto from 'crypto';

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
    // Get signature from headers
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 401 });
    }

    // Get raw body for signature verification
    const body = await request.text();
    const isValid = verifyWebhookSignature(body, signature, process.env.GITHUB_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
    }

    // Parse webhook payload
    const webhookData = JSON.parse(body);
    const { action, pull_request } = webhookData;

    // Only process merged PRs
    if (action !== 'closed' || !pull_request.merged) {
      return new Response(JSON.stringify({ message: 'Not a merged PR' }), { status: 200 });
    }

    // Extract data
    const { repository } = webhookData;
    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = pull_request.number;
    const commitsUrl = pull_request.commits_url;
    const token = process.env.GITHUB_TEST_TOKEN;

    // Fetch commits and diff
    const commits = await fetchCommits(commitsUrl, token);
    const diff = await fetchDiff(owner, repo, prNumber, token);

    // Assemble mega-payload
    const megaPayload = assembleMegaPayload(webhookData, commits, diff);

    console.log('Mega-payload assembled:', JSON.stringify(megaPayload, null, 2));

    // TODO: Store in Supabase or process further
    return new Response(JSON.stringify({ success: true, payload: megaPayload }), {
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

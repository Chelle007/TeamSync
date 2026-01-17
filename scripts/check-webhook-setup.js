#!/usr/bin/env node

/**
 * Check webhook setup and configuration
 * Run with: node scripts/check-webhook-setup.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWebhookSetup() {
  console.log('🔍 Checking Webhook Setup\n')

  // Step 1: Check if webhook_events table exists
  console.log('1️⃣  Checking database tables...')
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ webhook_events table does NOT exist!')
      console.error('   Error:', error.message)
      console.log('\n💡 Run the migration first:')
      console.log('   File: add_webhook_event_id_to_updates.sql')
      console.log('   In: Supabase Dashboard → SQL Editor\n')
      return
    }
    console.log('✅ webhook_events table exists\n')
  } catch (err) {
    console.error('❌ Error checking tables:', err.message)
    return
  }

  // Step 2: Check projects with GitHub URLs
  console.log('2️⃣  Checking projects with GitHub URLs...')
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, github_url, webhook_secret, live_url')
    .not('github_url', 'is', null)

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError.message)
    return
  }

  if (!projects || projects.length === 0) {
    console.log('❌ No projects with GitHub URLs found!')
    console.log('   You need to create a project and add a GitHub URL\n')
    return
  }

  console.log(`✅ Found ${projects.length} project(s) with GitHub URLs:\n`)
  projects.forEach((project, i) => {
    console.log(`   ${i + 1}. ${project.name}`)
    console.log(`      ID: ${project.id}`)
    console.log(`      GitHub: ${project.github_url}`)
    console.log(`      Live URL: ${project.live_url || 'Not set'}`)
    console.log(`      Webhook Secret: ${project.webhook_secret ? '✅ Set' : '❌ NOT SET'}`)
    console.log()
  })

  // Step 3: Check webhook secret
  const projectsWithoutSecret = projects.filter(p => !p.webhook_secret)
  if (projectsWithoutSecret.length > 0) {
    console.log('⚠️  WARNING: Some projects are missing webhook secrets!')
    console.log('   GitHub webhooks will be rejected without a secret\n')
    console.log('💡 To add a webhook secret:')
    console.log('   1. Generate a secret: openssl rand -hex 32')
    console.log('   2. Update in Supabase:')
    console.log(`      UPDATE projects SET webhook_secret = 'your-secret' WHERE id = 'project-id';`)
    console.log('   3. Configure the same secret in GitHub webhook settings\n')
  }

  // Step 4: Check NEXT_PUBLIC_SITE_URL
  console.log('3️⃣  Checking environment variables...')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    console.log('⚠️  NEXT_PUBLIC_SITE_URL is not set in .env.local')
    console.log('   This is needed for webhook callbacks')
    console.log('   Add: NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app\n')
  } else {
    console.log(`✅ NEXT_PUBLIC_SITE_URL: ${siteUrl}\n`)
  }

  // Step 5: Show webhook URL
  console.log('4️⃣  Your webhook endpoint URL:')
  const webhookUrl = siteUrl 
    ? `${siteUrl}/api/webhooks/github`
    : 'http://localhost:3000/api/webhooks/github'
  console.log(`   ${webhookUrl}`)
  console.log()

  // Step 6: GitHub webhook setup instructions
  console.log('5️⃣  GitHub Webhook Setup Checklist:\n')
  console.log('   Go to your GitHub repo → Settings → Webhooks → Add webhook')
  console.log()
  console.log('   ✓ Payload URL: ' + webhookUrl)
  console.log('   ✓ Content type: application/json')
  console.log('   ✓ Secret: (use the webhook_secret from your project)')
  console.log('   ✓ Events: "Let me select individual events"')
  console.log('     → Check "Pull requests" only')
  console.log('   ✓ Active: ✓ (checked)')
  console.log()

  // Step 7: Test webhook delivery
  console.log('6️⃣  To test if webhooks are being received:\n')
  console.log('   1. Merge a PR on GitHub')
  console.log('   2. Go to GitHub repo → Settings → Webhooks → Your webhook')
  console.log('   3. Click "Recent Deliveries" tab')
  console.log('   4. Check if delivery succeeded (green checkmark) or failed (red X)')
  console.log('   5. Click on a delivery to see request/response details')
  console.log()

  // Step 8: Check recent webhook events
  console.log('7️⃣  Checking recent webhook events in database...')
  const { data: webhookEvents, error: webhookError } = await supabase
    .from('webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (webhookError) {
    console.error('❌ Error fetching webhook events:', webhookError.message)
    return
  }

  if (!webhookEvents || webhookEvents.length === 0) {
    console.log('❌ No webhook events found in database')
    console.log('   This means GitHub webhooks are NOT reaching your app\n')
    console.log('💡 Common issues:')
    console.log('   1. App is not deployed (webhooks need a public URL)')
    console.log('   2. Webhook URL is incorrect in GitHub')
    console.log('   3. Webhook secret mismatch')
    console.log('   4. GitHub webhook is not configured')
    console.log('   5. Firewall/network blocking webhooks')
    console.log()
    console.log('   Check GitHub webhook "Recent Deliveries" for error details')
    console.log()
  } else {
    console.log(`✅ Found ${webhookEvents.length} webhook events:\n`)
    webhookEvents.forEach((event, i) => {
      console.log(`   ${i + 1}. PR #${event.pr_number}: ${event.pr_title}`)
      console.log(`      Status: ${event.processing_status}`)
      console.log(`      Created: ${new Date(event.created_at).toLocaleString()}`)
      if (event.error_message) {
        console.log(`      Error: ${event.error_message}`)
      }
      console.log()
    })
  }

  console.log('✅ Setup check complete!')
}

checkWebhookSetup().catch(console.error)

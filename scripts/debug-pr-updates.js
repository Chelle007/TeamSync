#!/usr/bin/env node

/**
 * Debug script to check why PRs aren't showing up on the updates page
 * Run with: node scripts/debug-pr-updates.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugPRUpdates() {
  console.log('🔍 Debugging PR Updates Flow\n')

  // Step 1: Check if webhook_events table exists
  console.log('1️⃣  Checking if webhook_events table exists...')
  const { data: tables, error: tablesError } = await supabase
    .from('webhook_events')
    .select('id')
    .limit(1)

  if (tablesError) {
    console.error('❌ webhook_events table does NOT exist!')
    console.error('   Error:', tablesError.message)
    console.log('\n💡 Solution: Run the migration SQL:')
    console.log('   File: add_webhook_event_id_to_updates.sql')
    console.log('   Location: Supabase Dashboard → SQL Editor\n')
    return
  }
  console.log('✅ webhook_events table exists\n')

  // Step 2: Check if updates table has webhook_event_id column
  console.log('2️⃣  Checking if updates table has webhook_event_id column...')
  const { data: updates, error: updatesError } = await supabase
    .from('updates')
    .select('id, webhook_event_id')
    .limit(1)

  if (updatesError && updatesError.message.includes('webhook_event_id')) {
    console.error('❌ updates table does NOT have webhook_event_id column!')
    console.error('   Error:', updatesError.message)
    console.log('\n💡 Solution: Run the migration SQL:')
    console.log('   File: add_webhook_event_id_to_updates.sql')
    console.log('   Location: Supabase Dashboard → SQL Editor\n')
    return
  }
  console.log('✅ updates table has webhook_event_id column\n')

  // Step 3: Check recent webhook events
  console.log('3️⃣  Checking recent webhook events...')
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
    console.log('⚠️  No webhook events found')
    console.log('   This means GitHub webhooks are not being received\n')
    console.log('💡 Check:')
    console.log('   1. GitHub webhook is configured correctly')
    console.log('   2. Webhook secret matches in database')
    console.log('   3. GitHub webhook delivery logs for errors\n')
    return
  }

  console.log(`✅ Found ${webhookEvents.length} recent webhook events:\n`)
  webhookEvents.forEach((event, i) => {
    console.log(`   ${i + 1}. PR #${event.pr_number}: ${event.pr_title}`)
    console.log(`      Status: ${event.processing_status}`)
    console.log(`      Created: ${new Date(event.created_at).toLocaleString()}`)
    if (event.error_message) {
      console.log(`      Error: ${event.error_message}`)
    }
    console.log()
  })

  // Step 4: Check if updates were created for these webhook events
  console.log('4️⃣  Checking if updates were created for webhook events...')
  const { data: updatesWithWebhook, error: updatesWithWebhookError } = await supabase
    .from('updates')
    .select('id, title, webhook_event_id, status, created_at')
    .not('webhook_event_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (updatesWithWebhookError) {
    console.error('❌ Error fetching updates:', updatesWithWebhookError.message)
    return
  }

  if (!updatesWithWebhook || updatesWithWebhook.length === 0) {
    console.log('❌ No updates found with webhook_event_id!')
    console.log('   This means video generation is failing to create updates\n')
    
    // Check if there are any updates at all
    const { data: allUpdates } = await supabase
      .from('updates')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (allUpdates && allUpdates.length > 0) {
      console.log('   But found these manual updates:')
      allUpdates.forEach((update, i) => {
        console.log(`   ${i + 1}. ${update.title} (${update.status})`)
      })
    }

    console.log('\n💡 Possible issues:')
    console.log('   1. Video generation is failing (check server logs)')
    console.log('   2. Database insert is failing (check RLS policies)')
    console.log('   3. Webhook events are stuck in "processing" status')
    
    // Check for stuck webhook events
    const stuckEvents = webhookEvents.filter(e => e.processing_status === 'processing')
    if (stuckEvents.length > 0) {
      console.log(`\n   ⚠️  Found ${stuckEvents.length} webhook events stuck in "processing"`)
      console.log('      These may have failed during video generation')
    }
    console.log()
    return
  }

  console.log(`✅ Found ${updatesWithWebhook.length} updates created from webhooks:\n`)
  updatesWithWebhook.forEach((update, i) => {
    console.log(`   ${i + 1}. ${update.title}`)
    console.log(`      Status: ${update.status}`)
    console.log(`      Webhook Event ID: ${update.webhook_event_id}`)
    console.log(`      Created: ${new Date(update.created_at).toLocaleString()}`)
    console.log()
  })

  // Step 5: Check for mismatches
  console.log('5️⃣  Checking for webhook events without updates...')
  const completedWebhooks = webhookEvents.filter(e => e.processing_status === 'completed')
  const webhookIds = new Set(updatesWithWebhook.map(u => u.webhook_event_id))
  const missingUpdates = completedWebhooks.filter(e => !webhookIds.has(e.id))

  if (missingUpdates.length > 0) {
    console.log(`⚠️  Found ${missingUpdates.length} completed webhooks without updates:`)
    missingUpdates.forEach((event, i) => {
      console.log(`   ${i + 1}. PR #${event.pr_number}: ${event.pr_title}`)
      console.log(`      Webhook Event ID: ${event.id}`)
    })
    console.log('\n💡 These webhooks completed but no update was created')
    console.log('   Check server logs for errors during video generation\n')
  } else {
    console.log('✅ All completed webhooks have corresponding updates\n')
  }

  // Step 6: Summary
  console.log('📊 Summary:')
  console.log(`   Total webhook events: ${webhookEvents.length}`)
  console.log(`   Pending: ${webhookEvents.filter(e => e.processing_status === 'pending').length}`)
  console.log(`   Processing: ${webhookEvents.filter(e => e.processing_status === 'processing').length}`)
  console.log(`   Completed: ${webhookEvents.filter(e => e.processing_status === 'completed').length}`)
  console.log(`   Failed: ${webhookEvents.filter(e => e.processing_status === 'failed').length}`)
  console.log(`   Updates created: ${updatesWithWebhook.length}`)
  console.log()

  console.log('✅ Debugging complete!')
}

debugPRUpdates().catch(console.error)

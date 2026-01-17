#!/usr/bin/env node

/**
 * Check if project GitHub URLs match the webhook repository
 * Run with: node scripts/check-project-repo-match.js desraymondz/hnr-example-project
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

function parseGitHubRepoUrl(url) {
  try {
    const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(\.git)?/)
    if (!match) return null
    return {
      owner: match[1],
      repo: match[2],
      fullName: `${match[1]}/${match[2]}`
    }
  } catch {
    return null
  }
}

async function checkRepoMatch(targetRepo) {
  console.log('🔍 Checking Project Repository Matching\n')
  console.log(`Looking for repository: ${targetRepo}\n`)

  // Get all projects with GitHub URLs
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, github_url, webhook_secret')
    .not('github_url', 'is', null)

  if (error) {
    console.error('❌ Error fetching projects:', error.message)
    return
  }

  if (!projects || projects.length === 0) {
    console.log('❌ No projects with GitHub URLs found!')
    console.log('\n💡 Create a project with a GitHub URL first\n')
    return
  }

  console.log(`Found ${projects.length} project(s) with GitHub URLs:\n`)

  let foundMatch = false

  projects.forEach((project, i) => {
    const parsed = parseGitHubRepoUrl(project.github_url)
    
    console.log(`${i + 1}. ${project.name}`)
    console.log(`   ID: ${project.id}`)
    console.log(`   GitHub URL: ${project.github_url}`)
    
    if (parsed) {
      console.log(`   Parsed: ${parsed.fullName}`)
      
      if (parsed.fullName.toLowerCase() === targetRepo.toLowerCase()) {
        console.log(`   ✅ MATCH! This project matches the webhook repository`)
        foundMatch = true
      } else {
        console.log(`   ❌ No match (expected: ${targetRepo})`)
      }
    } else {
      console.log(`   ⚠️  Invalid GitHub URL format`)
    }
    
    console.log(`   Webhook Secret: ${project.webhook_secret ? '✅ Set' : '❌ NOT SET'}`)
    console.log()
  })

  if (!foundMatch) {
    console.log('❌ No matching project found!\n')
    console.log('💡 Solutions:\n')
    console.log('1. Update the GitHub URL in your project:')
    console.log(`   UPDATE projects SET github_url = 'https://github.com/${targetRepo}' WHERE id = 'your-project-id';\n`)
    console.log('2. Or create a new project with the correct GitHub URL\n')
    console.log('3. Make sure the GitHub URL format is correct:')
    console.log('   - https://github.com/owner/repo')
    console.log('   - https://github.com/owner/repo.git')
    console.log('   - git@github.com:owner/repo.git\n')
  } else {
    console.log('✅ Found matching project! Webhook should work.\n')
    console.log('If webhooks still fail, check:')
    console.log('1. Webhook secret matches in GitHub')
    console.log('2. Webhook URL is correct')
    console.log('3. Database migrations are run (webhook_events table exists)\n')
  }
}

const targetRepo = process.argv[2]

if (!targetRepo) {
  console.error('Usage: node scripts/check-project-repo-match.js owner/repo')
  console.error('Example: node scripts/check-project-repo-match.js desraymondz/hnr-example-project')
  process.exit(1)
}

checkRepoMatch(targetRepo).catch(console.error)

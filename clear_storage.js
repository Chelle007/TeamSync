/**
 * Script to clear all files from Supabase Storage buckets
 * 
 * Run this with Node.js:
 * node clear_storage.js
 * 
 * Make sure to set your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in environment variables or update them below
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const buckets = ['project-scopes', 'project-documents']

async function clearBucket(bucketName) {
  console.log(`\n🗑️  Clearing bucket: ${bucketName}`)
  
  try {
    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (listError) {
      console.error(`❌ Error listing files in ${bucketName}:`, listError.message)
      return
    }

    if (!files || files.length === 0) {
      console.log(`✅ Bucket ${bucketName} is already empty`)
      return
    }

    console.log(`   Found ${files.length} file(s) to delete`)

    // Delete all files
    const filePaths = files.map(file => file.name)
    
    // For nested files, we need to get the full path
    // This handles files in subdirectories (like project-scopes/user-id/file.pdf)
    const allFiles = []
    for (const file of files) {
      if (file.id) {
        // It's a file
        allFiles.push(file.name)
      } else {
        // It's a folder, list files inside
        const { data: folderFiles } = await supabase.storage
          .from(bucketName)
          .list(file.name, { limit: 1000 })
        
        if (folderFiles) {
          folderFiles.forEach(f => {
            allFiles.push(`${file.name}/${f.name}`)
          })
        }
      }
    }

    // Delete files in batches
    const batchSize = 100
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize)
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(batch)

      if (deleteError) {
        console.error(`❌ Error deleting batch from ${bucketName}:`, deleteError.message)
      } else {
        console.log(`   Deleted ${batch.length} file(s) (${i + batch.length}/${allFiles.length})`)
      }
    }

    console.log(`✅ Successfully cleared bucket: ${bucketName}`)
  } catch (error) {
    console.error(`❌ Error clearing bucket ${bucketName}:`, error.message)
  }
}

async function clearAllStorage() {
  console.log('🚀 Starting storage cleanup...\n')

  for (const bucket of buckets) {
    await clearBucket(bucket)
  }

  console.log('\n✅ Storage cleanup complete!')
}

// Run the cleanup
clearAllStorage().catch(console.error)

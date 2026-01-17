# Clear All Data and Storage

This guide will help you completely clear all data from your TeamSync database and storage buckets.

## ⚠️ WARNING

**This will permanently delete ALL data:**
- All projects
- All updates
- All chatbot messages
- All user profiles (data only, not auth users)
- All uploaded PDFs and documents

**Make sure you have a backup if you need to restore anything!**

---

## Method 1: Clear Database Only (SQL)

1. Go to **Supabase Dashboard → SQL Editor**
2. Copy and paste the contents of `clear_all_data.sql`
3. Click **Run**
4. Verify the output shows all counts are 0

---

## Method 2: Clear Storage Buckets (Manual)

1. Go to **Supabase Dashboard → Storage**
2. For each bucket (`project-scopes`, `project-documents`):
   - Click on the bucket name
   - Select all files (or use the select all checkbox)
   - Click **Delete** button
   - Confirm deletion

---

## Method 3: Clear Storage Programmatically (Node.js)

1. Install dependencies (if not already installed):
   ```bash
   npm install @supabase/supabase-js
   ```

2. Set environment variables:
   ```bash
   export SUPABASE_URL="your-project-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. Run the script:
   ```bash
   node clear_storage.js
   ```

   Or update the script with your credentials directly.

---

## Method 4: Clear Everything (Database + Storage)

1. **Clear Database**: Run `clear_all_data.sql` in SQL Editor
2. **Clear Storage**: Use Method 2 or Method 3 above

---

## Quick Reset (All-in-One)

If you want to completely reset your database schema:

1. Run `clear_all_data.sql` to delete all data
2. Clear storage buckets manually or with the script
3. (Optional) Re-run `supabase_schema.sql` to reset any sequences or ensure schema is correct

---

## Notes

- **Auth Users**: The SQL script does NOT delete users from `auth.users` (Supabase auth). Only profile data is deleted.
- **Storage Buckets**: The buckets themselves are not deleted, only the files inside them.
- **Sequences**: Auto-increment sequences are reset to start from 1 again.

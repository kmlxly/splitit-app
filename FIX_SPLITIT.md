# FIX SPLITIT DATA NOT SAVING

It seems the `sessions` and `bills` tables for SplitIt might be missing or have restricted permissions (RLS) that block you from saving.

Please run this fix script in Supabase:

1.  Go to [Supabase Dashboard](https://supabase.com/dashboard) > **SQL Editor**.
2.  Open/Copy the file `fix_splitit_db.sql` from your project.
3.  Paste the code and click **Run**.

This script will:
*   Create `sessions` and `bills` tables if they are missing.
*   Update permissions so you (and friends) can save data without "Permission Denied" errors.

After running this, try creating a Bill in SplitIt again.

# DATABASE SETUP REQUIRED

It seems your dashboard is showing "RM 0.00" or "Tiada Data" because the necessary tables for **Budget.AI** and **Sub.Tracker** have not been created in your Supabase project yet.

Please follow these steps to fix it:

1.  **Login to Supabase:** Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  **Select Your Project:** Choose the project linked to `split-bill-app`.
3.  **Go to SQL Editor:** Click on the SQL icon in the left sidebar.
4.  **Run the Script:**
    *   Open the file `supabase_setup.sql` in your project folder.
    *   Copy the *entire* content of `supabase_setup.sql`.
    *   Paste it into the Supabase SQL Editor.
    *   Click **"Run"**.

## What this script does:
*   Creates the table `budget_transactions` (for Budget.AI).
*   Creates the table `subscriptions` (for Sub.Tracker).
*   Enables security policies (RLS) so users can only see their own data.

## After Running the Script:
1.  Go back to your app (localhost:3000).
2.  Open **Budget.AI** and add any transaction (or edit one) to trigger a sync.
3.  Open **Sub.Tracker** and add/edit a subscription.
4.  Go to the **Dashboard** (Home) — the data should now appear!

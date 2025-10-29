# How to Find Your Supabase Project Reference

## Step 1: Go to Your Supabase Dashboard
1. Open your web browser
2. Go to [https://supabase.com](https://supabase.com)
3. Sign in to your account
4. Click on your project

## Step 2: Look at the URL
When you're in your Supabase dashboard, look at the URL in your browser's address bar. It will look like one of these:

- `https://supabase.com/dashboard/project/abcdefghijklmnop`
- `https://app.supabase.com/project/abcdefghijklmnop`
- `https://abcdefghijklmnop.supabase.co`

## Step 3: Find Your Project Reference
The project reference is the part that looks like `abcdefghijklmnop` - it's usually a long string of letters and numbers.

## Step 4: Update the SQL Script
1. Open the file `update-with-your-project-ref.sql`
2. Find all instances of `YOUR-PROJECT-REF`
3. Replace them with your actual project reference (e.g., `abcdefghijklmnop`)
4. Run the updated script in your Supabase SQL editor

## Step 5: Test the URLs
After running the script, test these URLs in your browser:
- `https://YOUR-ACTUAL-PROJECT-REF.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/logo_1761709396787.png`
- `https://YOUR-ACTUAL-PROJECT-REF.supabase.co/storage/v1/object/public/business-photos/f4527f20-6aa0-4efb-9dce-73a7751daf95/cover_1761709403133.png`

If these URLs work in your browser, the images should also load on your public profile page!

## Alternative: Manual Update
If you prefer, you can also manually update the URLs in the Supabase dashboard:
1. Go to the `businesses` table
2. Find the Shleppers Moving business
3. Update the `logo_url`, `cover_photo_url`, and `gallery_photos` fields with the correct URLs

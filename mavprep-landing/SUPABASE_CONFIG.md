# Supabase Email Confirmation Configuration

## QUICK FIX: Add Service Role Key

1. Go to your Supabase dashboard
2. Go to **Settings > API**
3. Copy the **service_role** key (NOT the anon key)
4. Add it to your `.env.local` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Alternative: Direct Database Fix

If the above doesn't work, you can manually fix this in your Supabase database:

1. Go to **SQL Editor** in your Supabase dashboard
2. Run this SQL command:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = now()
   WHERE email_confirmed_at IS NULL;
   ```
3. This will confirm all unconfirmed users immediately

## To disable email confirmation in your Supabase project:

### Step 1: Access Supabase Dashboard

1. Go to [supabase.com](https://supabase.com) and log into your project
2. Select your MavPrep project

### Step 2: Navigate to Authentication Settings

1. In the left sidebar, click on **Authentication**
2. Click on **Settings** in the Authentication section

### Step 3: Disable Email Confirmation

1. Scroll down to the **Email** section
2. Find **"Enable email confirmations"** toggle
3. Turn OFF the toggle (it should be gray/disabled)
4. Click **Save** at the bottom of the page

### Step 4: Update Email Templates (Optional)

1. Still in Authentication > Settings
2. Go to **Email Templates** tab
3. You can customize the welcome email or disable it entirely

### Step 5: For Existing Users with Unconfirmed Emails

If you have existing users who are stuck with unconfirmed emails, you have two options:

**Option A: Use the automated fix (recommended)**

- The app now automatically confirms users when they try to sign in
- Just add the service role key to your `.env.local` file

**Option B: Manual database update**

- Use the SQL command above to confirm all users at once

**Option C: Manually confirm users in Supabase**

1. Go to Authentication > Users in your Supabase dashboard
2. Find the user with unconfirmed email
3. Click on the user
4. Manually set `email_confirmed_at` to the current timestamp

## Additional Settings to Check:

### Auto-confirm users

In Authentication > Settings, you can also:

1. Enable **"Enable auto-confirming users"**
2. This automatically confirms new sign-ups without requiring email verification

### RLS Policies

Make sure your Row Level Security policies don't require `email_confirmed_at` to be set.

## Testing

After making these changes:

1. Try logging in with your existing account
2. If it still fails, try creating a new test account
3. The new account should work immediately without email confirmation

---

**Note**: These settings take effect immediately for new sign-ups, but existing unconfirmed accounts may still need manual intervention.

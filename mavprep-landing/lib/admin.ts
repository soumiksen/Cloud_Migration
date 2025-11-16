import { createClient } from '@supabase/supabase-js';

// This is a server-side utility that requires service role key
// DO NOT use this in client-side code
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for admin operations'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function confirmUserEmail(email: string) {
  try {
    const supabase = createAdminClient();

    // Get user by email
    const { data: user, error: getUserError } =
      await supabase.auth.admin.getUserByEmail(email);

    if (getUserError || !user) {
      return { error: 'User not found' };
    }

    // Update user to confirm email
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true,
      }
    );

    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error confirming user email:', error);
    return { error: 'Failed to confirm email' };
  }
}

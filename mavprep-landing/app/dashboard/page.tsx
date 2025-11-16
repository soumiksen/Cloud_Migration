'use client';

import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      router.push('/');
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className='min-h-screen bg-black flex items-center justify-center'>
        <div className='text-white'>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    profile?.full_name ||
    profile?.username ||
    user.user_metadata?.username ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'User';

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-6 py-8'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-3xl font-bold'>Dashboard</h1>
          <button
            onClick={handleSignOut}
            className='px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors'
          >
            Sign Out
          </button>
        </div>

        <div className='bg-gray-900 rounded-lg p-6 mb-6'>
          <h2 className='text-xl font-semibold mb-4'>
            Welcome back, {displayName}!
          </h2>
          <div className='space-y-2'>
            <p>
              <span className='text-gray-400'>Display Name:</span> {displayName}
            </p>
            <p>
              <span className='text-gray-400'>Email:</span> {user.email}
            </p>
            <p>
              <span className='text-gray-400'>User ID:</span> {user.id}
            </p>
            <p>
              <span className='text-gray-400'>Last Sign In:</span>{' '}
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString()
                : 'Unknown'}
            </p>
            {profile && (
              <p>
                <span className='text-gray-400'>Profile Created:</span>{' '}
                {new Date(profile.updated_at || '').toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <div className='bg-gray-900 rounded-lg p-6'>
            <h3 className='text-lg font-semibold mb-2'>Getting Started</h3>
            <p className='text-gray-400 text-sm'>
              Welcome to MavPrep! Your authentication is now working with
              Supabase.
            </p>
          </div>

          <div className='bg-gray-900 rounded-lg p-6'>
            <h3 className='text-lg font-semibold mb-2'>Profile Setup</h3>
            <p className='text-gray-400 text-sm'>
              Complete your profile to get personalized recommendations.
            </p>
          </div>

          <div className='bg-gray-900 rounded-lg p-6'>
            <h3 className='text-lg font-semibold mb-2'>Study Tools</h3>
            <p className='text-gray-400 text-sm'>
              Access our powerful study tools and resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

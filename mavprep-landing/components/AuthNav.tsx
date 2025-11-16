'use client';

import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import Link from 'next/link';

export default function AuthNav() {
  const { user, loading, signOut } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className='flex items-center space-x-4'>
        <div className='w-8 h-8 bg-gray-700 rounded-full animate-pulse'></div>
      </div>
    );
  }

  const displayName =
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.username ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'User';

  return (
    <div className='flex items-center space-x-4'>
      {user ? (
        <>
          <Link
            href='/dashboard'
            className='px-4 py-2 text-sm bg-primary text-black font-semibold rounded-lg hover:bg-accent transition-colors'
          >
            Dashboard
          </Link>
          <span className='text-gray-400 text-sm'>{displayName}</span>
          <button
            onClick={handleSignOut}
            className='px-4 py-2 text-sm border border-gray-700 rounded-lg text-white hover:border-primary transition-colors'
          >
            Sign Out
          </button>
        </>
      ) : (
        <>
          <Link
            href='/login'
            className='px-4 py-2 text-sm border border-gray-700 rounded-lg text-white hover:border-primary transition-colors'
          >
            Sign In
          </Link>
          <Link
            href='/login'
            className='px-4 py-2 text-sm bg-primary text-black font-semibold rounded-lg hover:bg-accent transition-colors'
          >
            Sign Up
          </Link>
        </>
      )}
    </div>
  );
}

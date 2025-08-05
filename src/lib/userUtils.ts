import { User } from '@supabase/supabase-js';

interface UserDisplayInfo {
  displayName: string;
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  initials: string;
}

export function getUserDisplayInfo(user: User | null): UserDisplayInfo | null {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const email = user.email || '';
  
  // Extract name information
  const fullName = metadata.full_name || metadata.name || '';
  const firstName = metadata.given_name || metadata.first_name || '';
  const lastName = metadata.family_name || metadata.last_name || '';
  
  // Determine display name
  let displayName = '';
  if (fullName) {
    displayName = fullName;
  } else if (firstName && lastName) {
    displayName = `${firstName} ${lastName}`;
  } else if (firstName) {
    displayName = firstName;
  } else {
    // Fallback to email username
    displayName = email.split('@')[0];
  }

  // Get avatar URL
  const avatarUrl = metadata.avatar_url || metadata.picture;

  // Generate initials
  const generateInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (fullName) {
      const nameParts = fullName.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
      } else {
        return fullName.charAt(0).toUpperCase();
      }
    } else {
      return email.charAt(0).toUpperCase();
    }
  };

  return {
    displayName,
    avatarUrl,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email,
    initials: generateInitials(),
  };
}

export function isGoogleUser(user: User | null): boolean {
  if (!user) return false;
  
  // Check if user has Google provider in app_metadata
  const appMetadata = user.app_metadata || {};
  return appMetadata.provider === 'google' || appMetadata.providers?.includes('google');
}
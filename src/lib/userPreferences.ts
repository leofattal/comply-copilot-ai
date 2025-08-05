import { supabase } from './supabase';

export interface UserPlatformConnection {
  id: string;
  platform_id: string;
  platform_name: string;
  connection_status: 'connected' | 'pending' | 'failed' | 'disconnected';
  integration_type: 'api' | 'manual';
  connected_at?: string;
  last_sync_at?: string;
  configuration?: any;
}

export interface UserOnboardingState {
  completed: boolean;
  current_step?: number;
  selected_platforms?: string[];
  completed_at?: string;
}

/**
 * Get user's platform connections
 */
export async function getUserPlatformConnections(): Promise<UserPlatformConnection[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase
      .from('user_platform_connections')
      .select('*')
      .eq('user_id', session.user.id)
      .order('connected_at', { ascending: false });

    if (error) {
      console.error('Error fetching platform connections:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get platform connections:', error);
    return [];
  }
}

/**
 * Save user's platform connection
 */
export async function saveUserPlatformConnection(connection: Omit<UserPlatformConnection, 'id'>): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase
      .from('user_platform_connections')
      .upsert({
        user_id: session.user.id,
        platform_id: connection.platform_id,
        platform_name: connection.platform_name,
        connection_status: connection.connection_status,
        integration_type: connection.integration_type,
        connected_at: connection.connected_at || new Date().toISOString(),
        last_sync_at: connection.last_sync_at,
        configuration: connection.configuration
      }, {
        onConflict: 'user_id,platform_id'
      });

    if (error) {
      console.error('Error saving platform connection:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to save platform connection:', error);
    return false;
  }
}

/**
 * Get user's onboarding state
 */
export async function getUserOnboardingState(): Promise<UserOnboardingState | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('user_onboarding_state')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No onboarding state found - user hasn't started onboarding
        return null;
      }
      console.error('Error fetching onboarding state:', error);
      return null;
    }

    return {
      completed: data.completed,
      current_step: data.current_step,
      selected_platforms: data.selected_platforms,
      completed_at: data.completed_at
    };
  } catch (error) {
    console.error('Failed to get onboarding state:', error);
    return null;
  }
}

/**
 * Save user's onboarding state
 */
export async function saveUserOnboardingState(state: UserOnboardingState): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase
      .from('user_onboarding_state')
      .upsert({
        user_id: session.user.id,
        completed: state.completed,
        current_step: state.current_step,
        selected_platforms: state.selected_platforms,
        completed_at: state.completed_at || (state.completed ? new Date().toISOString() : null),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving onboarding state:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to save onboarding state:', error);
    return false;
  }
}

/**
 * Check if user has completed onboarding
 */
export async function hasUserCompletedOnboarding(): Promise<boolean> {
  const state = await getUserOnboardingState();
  return state?.completed || false;
}

/**
 * Check if user has any platform connections
 */
export async function hasUserPlatformConnections(): Promise<boolean> {
  const connections = await getUserPlatformConnections();
  return connections.some(conn => conn.connection_status === 'connected');
}

/**
 * Get user's primary platform (most recently connected)
 */
export async function getUserPrimaryPlatform(): Promise<UserPlatformConnection | null> {
  const connections = await getUserPlatformConnections();
  const connectedPlatforms = connections.filter(conn => conn.connection_status === 'connected');
  return connectedPlatforms[0] || null;
}

/**
 * Mark onboarding as completed
 */
export async function completeUserOnboarding(selectedPlatforms: string[]): Promise<boolean> {
  return await saveUserOnboardingState({
    completed: true,
    selected_platforms: selectedPlatforms,
    completed_at: new Date().toISOString()
  });
}

/**
 * Reset user onboarding (for testing or re-onboarding)
 */
export async function resetUserOnboarding(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase
      .from('user_onboarding_state')
      .delete()
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error resetting onboarding state:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to reset onboarding:', error);
    return false;
  }
}
import { useApi } from '@/controller/API';
import { useAuthStore } from '@/stores/authStore';

// Environment variable to check if user study mode is enabled
// This would typically come from your app's configuration or environment
const USER_STUDY_MODE = import.meta.env.VITE_PUBLIC_USER_STUDY_MODE === 'true';

/**
 * Hook for logging user study events
 * 
 * This utility simplifies logging user actions.
 * It automatically includes user and session information,
 * and adds an indicator when in user study mode.
 */
export function useUserStudyLogger() {
  const api = useApi();
  const authStore = useAuthStore();
  const { getCurrentUser } = useAuthStore();
  const user = getCurrentUser();
  const userId = authStore.user?.id || 'anonymous';
  const userEmail = authStore.user?.email || null;
  const userName = authStore.user?.user_metadata?.name || null;
  
  // Cache the session ID
  let sessionId: string | null = null;
  
  /**
   * Initialize the logger by fetching the session ID
   */
  const initialize = async (): Promise<string> => {
    if (!sessionId) {
      try {
        const response = await api.checkSessionId();
        sessionId = response.data.session_id;
      } catch (error) {
        console.error('Failed to get session ID for logging:', error);
        sessionId = 'unknown-session';
      }
    }
    return sessionId;
  };
  
  /**
   * Add common metadata to event data
   */
  const enhanceEventData = (data: Record<string, any>): Record<string, any> => {
    return {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      is_user_study_client: USER_STUDY_MODE,
      user_email: userEmail,
      user_name: userName,
      full_url: typeof window !== 'undefined' ? window.location.href : null
    };
  };
  
  /**
   * Log a page view event
   * 
   * @param pageName The name of the page being viewed
   * @param extraData Any additional data to log
   */
  const logPageView = async (pageName: string, extraData: Record<string, any> = {}): Promise<void> => {
    const sid = await initialize();
    const eventData = enhanceEventData({
      page: pageName,
      ...extraData
    });
    
    await api.logUserStudyEvent(userId, 'page_view', eventData);
  };
  
  /**
   * Log an interaction event (clicks, selections, etc.)
   * 
   * @param action The type of action (e.g., 'click', 'select')
   * @param element The element interacted with
   * @param extraData Any additional data to log
   */
  const logInteraction = async (
    action: string, 
    element: string, 
    extraData: Record<string, any> = {}
  ): Promise<void> => {
    const sid = await initialize();
    const eventData = enhanceEventData({
      action,
      element,
      ...extraData
    });
    
    await api.logUserStudyEvent(userId, 'interaction', eventData);
  };
  
  /**
   * Log search and query events
   * 
   * @param query The search query or prompt
   * @param extraData Any additional data to log
   */
  const logSearch = async (query: string, extraData: Record<string, any> = {}): Promise<void> => {
    const sid = await initialize();
    const eventData = enhanceEventData({
      query,
      ...extraData
    });
    
    await api.logUserStudyEvent(userId, 'search', eventData);
  };
  
  /**
   * Log feature usage
   * 
   * @param feature The feature being used
   * @param action The action taken with the feature
   * @param extraData Any additional data to log
   */
  const logFeatureUsage = async (
    feature: string, 
    action: string, 
    extraData: Record<string, any> = {}
  ): Promise<void> => {
    const sid = await initialize();
    const eventData = enhanceEventData({
      feature,
      action,
      ...extraData
    });
    
    await api.logUserStudyEvent(userId, 'feature_usage', eventData);
  };
  
  /**
   * Log time spent on a task
   * 
   * @param task The task or activity
   * @param durationMs Duration in milliseconds
   * @param extraData Any additional data to log
   */
  const logTimeSpent = async (
    task: string, 
    durationMs: number, 
    extraData: Record<string, any> = {}
  ): Promise<void> => {
    const sid = await initialize();
    const eventData = enhanceEventData({
      task,
      duration_ms: durationMs,
      ...extraData
    });
    
    await api.logUserStudyEvent(userId, 'time_spent', eventData);
  };
  
  /**
   * Log a custom event type
   * 
   * @param eventType Custom event type 
   * @param eventData Event data object
   */
  const logCustomEvent = async (
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> => {
    const sid = await initialize();
    const fullEventData = enhanceEventData(eventData);
    
    await api.logUserStudyEvent(userId, eventType, fullEventData);
  };
  
  return {
    logPageView,
    logInteraction,
    logSearch,
    logFeatureUsage,
    logTimeSpent,
    logCustomEvent,
    initialize,
    isUserStudyMode: USER_STUDY_MODE
  };
} 
/**
 * =============================================================================
 * WOS Core Architecture: Notification Event Listener
 * Bounded Context: Core System / Notifications
 * Description: Bootstraps the Enterprise Notification Engine subscriptions.
 * =============================================================================
 */

import { globalNotificationEngine } from "./notification-engine.js";

export function initializeNotificationEventListeners() {
  globalNotificationEngine.initialize();
}

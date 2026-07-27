/**
 * Notification system for Property Rotator plugin
 * This module handles all user notifications
 * Contract: Provides typed notification functions with consistent formatting
 */

import "@logseq/libs";
import { NotificationType } from '../types';

/**
 * Show a notification to the user
 * @param message - Notification message
 * @param type - Notification type
 * @param _duration - Duration in milliseconds (optional, not used in current implementation)
 */
export function showNotification(
  message: string,
  type: NotificationType = 'info',
  _duration?: number
): void {
  logseq.UI.showMsg(message, type);
}

/**
 * Show success notification
 * @param message - Success message
 */
export function showSuccess(message: string): void {
  showNotification(message, 'success');
}

/**
 * Show error notification
 * @param message - Error message
 */
export function showError(message: string): void {
  showNotification(message, 'error');
}

/**
 * Show warning notification
 * @param message - Warning message
 */
export function showWarning(message: string): void {
  showNotification(message, 'warning');
}

/**
 * Show info notification
 * @param message - Info message
 */
export function showInfo(message: string): void {
  showNotification(message, 'info');
}

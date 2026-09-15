import { Capacitor } from '@capacitor/core';

/**
 * SMS Strategy:
 * 1. Try silent send via Android SmsManager (requires SEND_SMS permission)
 * 2. Fallback: open native SMS app pre-filled (works everywhere)
 */

export interface SmsResult {
  success: boolean;
  method: 'silent' | 'intent' | 'failed';
  message?: string;
}

/**
 * Opens the native SMS app with number and body pre-filled.
 * This is the reliable fallback (Option A / C).
 */
export async function openSmsApp(phone: string, body: string): Promise<SmsResult> {
  try {
    // Clean phone number (Ethiopia format support)
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+?251/, '0');
    
    if (Capacitor.getPlatform() === 'android') {
      // Use Android Intent via a simple custom approach
      // For Capacitor we can use @capacitor-community/sms or window.open sms: link
      const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
      window.open(smsUrl, '_system');
      return { success: true, method: 'intent' };
    } else {
      // Browser / iOS fallback
      const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
      window.location.href = smsUrl;
      return { success: true, method: 'intent' };
    }
  } catch (e) {
    return { success: false, method: 'failed', message: String(e) };
  }
}

/**
 * Attempt silent SMS send.
 * In a real Capacitor Android project this would call a native plugin.
 * For now we prepare the interface and fall back gracefully.
 * 
 * To enable true silent send later:
 * - Add a Capacitor plugin that uses android.telephony.SmsManager
 * - Request SEND_SMS permission in AndroidManifest.xml
 */
export async function sendSilentSms(phone: string, body: string): Promise<SmsResult> {
  // Placeholder for native silent send.
  // When the native plugin is added, this will call it.
  // For the first version we immediately fall back to intent.
  console.log('[SMS] Silent send requested for', phone);
  
  // Simulate checking permission / capability
  const canSilent = false; // Set to true once native plugin is integrated
  
  if (canSilent && Capacitor.getPlatform() === 'android') {
    // Future: await SmsPlugin.send({ number: phone, message: body });
    return { success: true, method: 'silent' };
  }
  
  // Fallback
  return openSmsApp(phone, body);
}

/**
 * Main entry point used by the app.
 * Tries silent first, falls back to pre-filled SMS app.
 */
export async function sendReminderSms(phone: string, message: string): Promise<SmsResult> {
  const result = await sendSilentSms(phone, message);
  return result;
}

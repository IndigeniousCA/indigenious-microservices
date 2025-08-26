'use server';

import { headers } from 'next/headers';
import { logger } from '@/lib/monitoring/logger';
import { cookies } from 'next/headers';
import { UserDetectionService, DetectionContext } from '@/lib/brand/user-detection';
import { UserType } from '@/lib/brand/brand-config';

/**
 * Server action to detect user type
 * Runs on the server to access headers, cookies, etc.
 */
export async function detectUserType(): Promise<{
  userType: UserType;
  confidence: number;
  cached?: boolean;
}> {
  try {
    // Check if we already have a cached user type
    const cookieStore = await cookies();
    const cachedType = cookieStore.get('indigenious_user_type');
    const cachedConfidence = cookieStore.get('indigenious_confidence');
    
    if (cachedType?.value && cachedConfidence?.value) {
      return {
        userType: cachedType.value as UserType,
        confidence: parseInt(cachedConfidence.value),
        cached: true,
      };
    }
    
    // Get request headers
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const referer = headersList.get('referer') || '';
    const xForwardedFor = headersList.get('x-forwarded-for');
    const xRealIp = headersList.get('x-real-ip');
    
    // Get IP address (handle various proxy scenarios)
    const ip = xForwardedFor?.split(',')[0].trim() || xRealIp || '';
    
    // Build detection context
    const context: DetectionContext = {
      ip,
      userAgent,
      referrer: referer,
    };
    
    // Run detection
    const result = await UserDetectionService.detectUserType(context);
    
    // Cache the result in a cookie for this session
    // Use httpOnly for security, sameSite for CSRF protection
    cookieStore.set({
      name: 'indigenious_user_type',
      value: result.userType,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
    cookieStore.set({
      name: 'indigenious_confidence',
      value: result.confidence.toString(),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
    return {
      userType: result.userType,
      confidence: result.confidence,
      cached: false,
    };
  } catch (error) {
    logger.error('User detection failed:', error);
    // Default to visitor on error
    return {
      userType: UserType.VISITOR,
      confidence: 0,
      cached: false,
    };
  }
}

/**
 * Update user type based on user actions
 * Called when user provides more information
 */
export async function updateUserType(
  newType: UserType,
  source: 'registration' | 'profile' | 'explicit'
): Promise<void> {
  const cookieStore = await cookies();
  
  // Update with high confidence since user provided info
  cookieStore.set({
    name: 'indigenious_user_type',
    value: newType,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days for explicit selection
    path: '/',
  });
  
  cookieStore.set({
    name: 'indigenious_confidence',
    value: '100',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  
  // Log the update for improving detection
  await UserDetectionService.detectUserType({
    sessionData: {
      explicitType: newType,
      source,
    },
  });
}

/**
 * Clear user type detection (for testing or user request)
 */
export async function clearUserType(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({ name: 'indigenious_user_type', value: '', maxAge: 0 });
  cookieStore.set({ name: 'indigenious_confidence', value: '', maxAge: 0 });
}
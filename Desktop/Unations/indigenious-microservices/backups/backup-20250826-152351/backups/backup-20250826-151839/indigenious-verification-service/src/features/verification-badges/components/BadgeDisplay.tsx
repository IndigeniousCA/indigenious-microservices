'use client';

import React, { useEffect, useState } from 'react';
import { Badge, Platform } from '../types';
import { BadgeRenderer } from './BadgeRenderer';
import { motion } from 'framer-motion';

interface BadgeDisplayProps {
  badgeId: string;
  platform?: Platform;
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
  showMetrics?: boolean;
  onVerificationClick?: () => void;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badgeId,
  platform = Platform.WEBSITE,
  size = 'medium',
  theme = 'light',
  showMetrics = true,
  onVerificationClick
}) => {
  const [badge, setBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    fetchBadgeData();
  }, [badgeId]);

  const fetchBadgeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/badges/${badgeId}`);
      if (!response.ok) throw new Error('Failed to fetch badge');
      
      const data = await response.json();
      setBadge(data);
      
      // Track impression
      await fetch(`/api/badges/${badgeId}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'impression',
          platform
        })
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badge');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (!badge) return;

    // Track click
    await fetch(`/api/badges/${badge.id}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'click',
        platform
      })
    });

    // Navigate to verification page
    if (onVerificationClick) {
      onVerificationClick();
    } else {
      window.open(`${process.env.NEXT_PUBLIC_APP_URL}/verify/${badge.id}`, '_blank');
    }
  };

  const verifyBadge = async () => {
    if (!badge) return;

    try {
      const response = await fetch('/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: badge.identity.publicKey,
          temporalProof: badge.identity.temporalProof,
          blockchainAnchor: badge.identity.blockchainAnchor
        })
      });

      const result = await response.json();
      setIsVerified(result.isValid);
    } catch (err) {
      console.error('Verification failed:', err);
    }
  };

  if (loading) {
    return (
      <div className={`inline-flex items-center justify-center ${getSizeClasses(size)}`}>
        <div className="animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  if (error || !badge) {
    return (
      <div className={`inline-flex items-center justify-center ${getSizeClasses(size)} bg-red-100 rounded-lg p-4`}>
        <span className="text-red-600 text-sm">Failed to load badge</span>
      </div>
    );
  }

  return (
    <motion.div
      className={`inline-block relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-xl p-2`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <BadgeRenderer
        badge={badge.visual}
        size={size}
        interactive={true}
        showMetrics={showMetrics}
        onClick={handleClick}
      />
      
      {/* Verification indicator */}
      <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2">
        <motion.button
          onClick={verifyBadge}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center
            ${isVerified ? 'bg-green-500' : 'bg-gray-400'}
            hover:scale-110 transition-transform cursor-pointer
          `}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            {isVerified ? (
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            ) : (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            )}
          </svg>
        </motion.button>
      </div>

      {/* Badge info on hover */}
      <motion.div
        className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
          px-3 py-2 rounded-lg shadow-lg whitespace-nowrap
          ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
          opacity-0 pointer-events-none
        `}
        initial={{ opacity: 0, y: 10 }}
        whileHover={{ opacity: 1, y: 0 }}
      >
        <p className="text-xs font-semibold">Indigenous Verified Business</p>
        <p className="text-xs opacity-75">Click to learn more</p>
      </motion.div>
    </motion.div>
  );
};

function getSizeClasses(size: 'small' | 'medium' | 'large'): string {
  switch (size) {
    case 'small':
      return 'w-24 h-24';
    case 'medium':
      return 'w-48 h-48';
    case 'large':
      return 'w-72 h-72';
  }
}
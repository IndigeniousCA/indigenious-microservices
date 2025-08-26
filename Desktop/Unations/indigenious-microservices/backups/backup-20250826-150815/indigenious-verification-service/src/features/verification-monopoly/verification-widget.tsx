'use client';

/**
 * Verification Widget
 * Embeddable widget that other sites MUST use to show verification
 * This enforces our monopoly - everyone displays OUR badge
 */

import { useEffect, useState } from 'react';
import { Shield, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';

interface VerificationWidgetProps {
  businessId?: string;
  verificationId?: string;
  businessName?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  showDetails?: boolean;
}

interface VerificationData {
  verified: boolean;
  business?: {
    name: string;
    verificationLevel: string;
    verifiedSince: string;
    validUntil: string;
    indigenousOwnership: number;
    publicUrl: string;
  };
  reason?: string;
}

export function VerificationWidget({
  businessId,
  verificationId,
  businessName,
  size = 'md',
  theme = 'light',
  showDetails = true,
}: VerificationWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const params = new URLSearchParams();
        if (businessId) params.append('businessId', businessId);
        if (verificationId) params.append('verificationId', verificationId);
        if (businessName) params.append('businessName', businessName);
        
        const response = await fetch(`/api/verify?${params.toString()}`);
        const result = await response.json();
        
        if (!response.ok) {
          setError(result.message || 'Verification check failed');
        } else {
          setData(result);
        }
      } catch (err) {
        setError('Failed to verify business');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVerification();
  }, [businessId, verificationId, businessName]);
  
  const sizeClasses = {
    sm: 'p-2 text-xs',
    md: 'p-3 text-sm',
    lg: 'p-4 text-base',
  };
  
  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  if (loading) {
    return (
      <div className={`indigenious-verification-widget ${sizeClasses[size]} ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} inline-flex items-center gap-2`}>
        <Loader2 className={`${iconSize[size]} animate-spin text-gray-500`} />
        <span>Verifying...</span>
      </div>
    );
  }
  
  if (error || !data?.verified) {
    return (
      <div className={`indigenious-verification-widget ${sizeClasses[size]} ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg border border-red-500 inline-flex items-center gap-2`}>
        <XCircle className={`${iconSize[size]} text-red-500`} />
        <span>Not Verified</span>
        {showDetails && error && (
          <span className="text-xs opacity-70">({error})</span>
        )}
      </div>
    );
  }
  
  const levelColors = {
    registered: 'text-gray-600 border-gray-300',
    verified: 'text-green-600 border-green-500',
    certified: 'text-blue-600 border-blue-500',
    elite: 'text-purple-600 border-purple-500',
  };
  
  const levelBgColors = {
    registered: theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50',
    verified: theme === 'dark' ? 'bg-green-900' : 'bg-green-50',
    certified: theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50',
    elite: theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50',
  };
  
  const level = data.business?.verificationLevel || 'verified';
  const colors = levelColors[level as keyof typeof levelColors] || levelColors.verified;
  const bgColor = levelBgColors[level as keyof typeof levelBgColors] || levelBgColors.verified;
  
  return (
    <div className={`indigenious-verification-widget ${sizeClasses[size]} ${bgColor} rounded-lg border ${colors} ${showDetails ? 'min-w-[200px]' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`${iconSize[size]} ${colors.split(' ')[0]}`} />
          <div>
            <div className="font-semibold flex items-center gap-1">
              Indigenious {level.charAt(0).toUpperCase() + level.slice(1)}
              <CheckCircle className={`${iconSize[size]} ${colors.split(' ')[0]}`} />
            </div>
            {showDetails && data.business && (
              <div className="text-xs opacity-70 space-y-1 mt-1">
                <div>{data.business.indigenousOwnership}% Indigenous Owned</div>
                <div>Valid until {new Date(data.business.validUntil).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>
        {data.business?.publicUrl && (
          <a
            href={data.business.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${iconSize[size]} ${colors.split(' ')[0]} hover:opacity-70`}
          >
            <ExternalLink className={iconSize[size]} />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Embed script for external websites
 * This is what other sites include to show our verification
 */
export const embedScript = `
<!-- Indigenious Verification Widget -->
<div id="indigenious-verification" 
     data-business-id="YOUR_BUSINESS_ID"
     data-size="md"
     data-theme="light"
     data-show-details="true">
</div>
<script src="https://cdn.indigenious.ca/verify-widget.js" async></script>
`;

/**
 * React component for partners using React
 */
export function VerificationBadge({ businessId }: { businessId: string }) {
  return (
    <VerificationWidget
      businessId={businessId}
      size="sm"
      showDetails={false}
    />
  );
}

/**
 * Styles for the widget (injected into partner sites)
 */
export const widgetStyles = `
.indigenious-verification-widget {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  cursor: default;
  user-select: none;
}

.indigenious-verification-widget:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.indigenious-verification-widget a {
  text-decoration: none;
  color: inherit;
}
`;
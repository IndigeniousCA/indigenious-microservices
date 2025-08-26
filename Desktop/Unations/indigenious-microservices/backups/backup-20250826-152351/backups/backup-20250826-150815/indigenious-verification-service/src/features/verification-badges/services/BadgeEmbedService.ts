import { Badge, Platform, BadgeEmbedOptions } from '../types';

export class BadgeEmbedService {
  private static readonly CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.indigenious.ca';
  private static readonly API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.indigenious.ca';

  /**
   * Generate embeddable HTML/JS code for websites
   */
  static generateWebsiteEmbed(
    badgeId: string,
    options: BadgeEmbedOptions = {
      size: 'medium',
      theme: 'light',
      showMetrics: true,
      showAnimation: true,
      clickable: true,
      trackingEnabled: true
    }
  ): string {
    const embedId = `indigenous-badge-${badgeId}`;
    
    return `
<!-- Indigenous Business Verification Badge -->
<div id="${embedId}" 
     data-badge-id="${badgeId}"
     data-size="${options.size}"
     data-theme="${options.theme}"
     data-show-metrics="${options.showMetrics}"
     data-show-animation="${options.showAnimation}"
     data-clickable="${options.clickable}"
     data-tracking="${options.trackingEnabled}">
</div>
<script>
(function() {
  // Check if script already loaded
  if (window.IndigenousBadgeLoaded) return;
  window.IndigenousBadgeLoaded = true;
  
  // Load badge script
  var script = document.createElement('script');
  script.src = '${this.CDN_URL}/badge-widget.js';
  script.async = true;
  script.onload = function() {
    // Initialize all badges on page
    if (window.IndigenousBadge) {
      window.IndigenousBadge.init();
    }
  };
  document.head.appendChild(script);
  
  // Load badge styles
  var style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '${this.CDN_URL}/badge-widget.css';
  document.head.appendChild(style);
})();
</script>
<!-- End Indigenous Business Verification Badge -->
`.trim();
  }

  /**
   * Generate LinkedIn badge code
   */
  static generateLinkedInEmbed(badge: Badge): string {
    // LinkedIn doesn't support custom widgets, so we generate an image URL
    const imageUrl = `${this.API_URL}/badges/${badge.id}/image?platform=linkedin`;
    const verifyUrl = `${this.API_URL}/verify/${badge.id}`;
    
    return `
[Indigenous Verified Business - ${badge.visual.animal.toUpperCase()} Spirit]
${imageUrl}
Verified: ${verifyUrl}
#IndigenousVerified #EconomicReconciliation #${badge.visual.animal}Spirit
`.trim();
  }

  /**
   * Generate email signature HTML
   */
  static generateEmailSignature(
    badge: Badge,
    businessName: string,
    personName?: string,
    title?: string
  ): string {
    const imageUrl = `${this.API_URL}/badges/${badge.id}/image?size=small&platform=email`;
    const verifyUrl = `${this.API_URL}/verify/${badge.id}`;
    
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top;">
      <a href="${verifyUrl}" target="_blank">
        <img src="${imageUrl}" alt="Indigenous Verified Business" width="80" height="80" style="border: none; display: block;">
      </a>
    </td>
    <td style="vertical-align: top;">
      ${personName ? `<div style="font-weight: bold; color: #333; margin-bottom: 2px;">${personName}</div>` : ''}
      ${title ? `<div style="color: #666; margin-bottom: 5px;">${title}</div>` : ''}
      <div style="font-weight: bold; color: #0066cc; margin-bottom: 5px;">${businessName}</div>
      <div style="color: #666; font-size: 12px;">
        <a href="${verifyUrl}" style="color: #0066cc; text-decoration: none;">
          Indigenous Verified Business - ${badge.visual.animal.toUpperCase()} Spirit
        </a>
      </div>
    </td>
  </tr>
</table>
`.trim();
  }

  /**
   * Generate social media sharing code
   */
  static generateSocialShareCode(
    badge: Badge,
    platform: 'twitter' | 'facebook' | 'instagram'
  ): string {
    const shareUrl = `${this.API_URL}/share/${badge.id}`;
    const imageUrl = `${this.API_URL}/badges/${badge.id}/image?platform=${platform}`;
    
    const messages = {
      twitter: `We're proud to be an Indigenous Verified Business with ${badge.visual.animal.toUpperCase()} spirit! 🪶 Learn more about economic reconciliation: ${shareUrl} #IndigenousVerified #EconomicReconciliation`,
      facebook: `We're proud to display our Indigenous Business Verification Badge! Our ${badge.visual.animal.toUpperCase()} spirit represents our commitment to economic reconciliation and Indigenous prosperity. Learn more: ${shareUrl}`,
      instagram: `Indigenous Verified Business 🪶 ${badge.visual.animal.toUpperCase()} Spirit\n\n#IndigenousVerified #EconomicReconciliation #IndigenousBusiness #${badge.visual.animal}Spirit`
    };
    
    return messages[platform];
  }

  /**
   * Generate iframe embed code
   */
  static generateIframeEmbed(
    badgeId: string,
    options: BadgeEmbedOptions
  ): string {
    const params = new URLSearchParams({
      size: options.size || 'medium',
      theme: options.theme || 'light',
      metrics: String(options.showMetrics ?? true),
      animation: String(options.showAnimation ?? true),
      clickable: String(options.clickable ?? true)
    });
    
    const iframeUrl = `${this.API_URL}/badges/${badgeId}/iframe?${params.toString()}`;
    const sizes = {
      small: { width: 120, height: 120 },
      medium: { width: 200, height: 200 },
      large: { width: 300, height: 300 }
    };
    
    const { width, height } = sizes[options.size || 'medium'];
    
    return `
<iframe 
  src="${iframeUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  scrolling="no"
  title="Indigenous Business Verification Badge"
  style="border: none; overflow: hidden;"
></iframe>
`.trim();
  }

  /**
   * Generate WordPress plugin shortcode
   */
  static generateWordPressShortcode(badgeId: string, options: BadgeEmbedOptions): string {
    const attrs = [
      `id="${badgeId}"`,
      `size="${options.size || 'medium'}"`,
      `theme="${options.theme || 'light'}"`,
      `metrics="${options.showMetrics ?? true}"`,
      `animation="${options.showAnimation ?? true}"`
    ].join(' ');
    
    return `[indigenous_badge ${attrs}]`;
  }

  /**
   * Generate React component code
   */
  static generateReactComponent(badgeId: string): string {
    return `
import { IndigenousBadge } from '@indigenious/react-badge';

function MyComponent() {
  return (
    <IndigenousBadge
      badgeId="${badgeId}"
      size="medium"
      theme="light"
      showMetrics={true}
      onVerificationClick={() => console.log('Badge clicked')}
    />
  );
}
`.trim();
  }

  /**
   * Generate mobile SDK integration code
   */
  static generateMobileSDKCode(
    badgeId: string,
    platform: 'ios' | 'android'
  ): string {
    if (platform === 'ios') {
      return `
// Swift/iOS
import IndigenousBadgeSDK

let badgeView = IndigenousBadgeView(badgeId: "${badgeId}")
badgeView.size = .medium
badgeView.theme = .light
badgeView.showMetrics = true
badgeView.delegate = self
view.addSubview(badgeView)
`.trim();
    } else {
      return `
// Kotlin/Android
import ca.indigenious.badge.IndigenousBadgeView

val badgeView = IndigenousBadgeView(context).apply {
    badgeId = "${badgeId}"
    size = BadgeSize.MEDIUM
    theme = BadgeTheme.LIGHT
    showMetrics = true
    setOnClickListener { /* Handle click */ }
}
layout.addView(badgeView)
`.trim();
    }
  }

  /**
   * Generate QR code for offline verification
   */
  static generateQRCodeUrl(badgeId: string): string {
    const verifyUrl = `${this.API_URL}/verify/${badgeId}`;
    return `${this.API_URL}/qr?data=${encodeURIComponent(verifyUrl)}&size=200`;
  }

  /**
   * Generate tracking pixel
   */
  static generateTrackingPixel(badgeId: string, platform: Platform): string {
    return `<img src="${this.API_URL}/badges/${badgeId}/pixel?platform=${platform}" width="1" height="1" style="display:none;" alt="" />`;
  }
}
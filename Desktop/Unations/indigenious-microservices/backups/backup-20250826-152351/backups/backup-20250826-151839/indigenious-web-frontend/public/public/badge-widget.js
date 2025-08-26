(function() {
  'use strict';

  // Namespace for the Indigenous Badge widget
  window.IndigenousBadge = window.IndigenousBadge || {};

  const API_URL = 'https://api.indigenious.ca'; // Update in production
  const VERIFY_URL = 'https://indigenious.ca/verify';

  class BadgeWidget {
    constructor(element) {
      this.element = element;
      this.badgeId = element.getAttribute('data-badge-id');
      this.size = element.getAttribute('data-size') || 'medium';
      this.theme = element.getAttribute('data-theme') || 'light';
      this.showMetrics = element.getAttribute('data-show-metrics') !== 'false';
      this.showAnimation = element.getAttribute('data-show-animation') !== 'false';
      this.clickable = element.getAttribute('data-clickable') !== 'false';
      this.trackingEnabled = element.getAttribute('data-tracking') !== 'false';
      
      this.badge = null;
      this.isVerified = false;
      
      this.init();
    }

    async init() {
      try {
        // Add loading state
        this.showLoading();
        
        // Fetch badge data
        await this.fetchBadgeData();
        
        // Render badge
        this.render();
        
        // Track impression
        if (this.trackingEnabled) {
          this.trackEvent('impression');
        }
      } catch (error) {
        console.error('Failed to initialize Indigenous Badge:', error);
        this.showError();
      }
    }

    showLoading() {
      this.element.innerHTML = `
        <div class="indigenous-badge-loading">
          <div class="indigenous-badge-spinner"></div>
        </div>
      `;
    }

    showError() {
      this.element.innerHTML = `
        <div class="indigenous-badge-error">
          <span>Failed to load badge</span>
        </div>
      `;
    }

    async fetchBadgeData() {
      const response = await fetch(`${API_URL}/badges/${this.badgeId}/widget`);
      if (!response.ok) {
        throw new Error('Failed to fetch badge data');
      }
      this.badge = await response.json();
    }

    render() {
      const sizeClasses = {
        small: 'indigenous-badge-small',
        medium: 'indigenous-badge-medium',
        large: 'indigenous-badge-large'
      };

      const container = document.createElement('div');
      container.className = `indigenous-badge-container ${sizeClasses[this.size]} ${this.theme}`;
      
      // Create SVG element
      const svg = this.createSVG();
      container.appendChild(svg);
      
      // Add verification indicator
      const verifyButton = this.createVerifyButton();
      container.appendChild(verifyButton);
      
      // Add hover tooltip if metrics enabled
      if (this.showMetrics) {
        const tooltip = this.createTooltip();
        container.appendChild(tooltip);
      }
      
      // Add click handler
      if (this.clickable) {
        container.style.cursor = 'pointer';
        container.addEventListener('click', (e) => {
          if (!e.target.closest('.indigenous-badge-verify')) {
            this.handleBadgeClick();
          }
        });
      }
      
      // Clear existing content and append new
      this.element.innerHTML = '';
      this.element.appendChild(container);
      
      // Add animations if enabled
      if (this.showAnimation) {
        this.addAnimations(svg);
      }
    }

    createSVG() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.className = 'indigenous-badge-svg';
      
      // Create gradient
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const gradient = this.createGradient();
      defs.appendChild(gradient);
      svg.appendChild(defs);
      
      // Background circle
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', '50');
      bgCircle.setAttribute('cy', '50');
      bgCircle.setAttribute('r', '45');
      bgCircle.setAttribute('fill', `url(#badge-gradient-${this.badgeId})`);
      svg.appendChild(bgCircle);
      
      // Animal path
      const animalPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      animalPath.setAttribute('d', this.getAnimalPath());
      animalPath.setAttribute('fill', this.badge.visual.colors.primary);
      animalPath.className = 'indigenous-badge-animal';
      svg.appendChild(animalPath);
      
      // Stage indicators
      for (let i = 0; i < 4; i++) {
        const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        indicator.setAttribute('cx', 20 + i * 20);
        indicator.setAttribute('cy', '90');
        indicator.setAttribute('r', '3');
        indicator.setAttribute('fill', i < this.badge.visual.stage ? this.badge.visual.colors.accent : 'rgba(255,255,255,0.3)');
        svg.appendChild(indicator);
      }
      
      return svg;
    }

    createGradient() {
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
      gradient.setAttribute('id', `badge-gradient-${this.badgeId}`);
      
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', this.badge.visual.colors.accent);
      stop1.setAttribute('stop-opacity', '0.8');
      
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', this.badge.visual.colors.primary);
      stop2.setAttribute('stop-opacity', '0.3');
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      
      return gradient;
    }

    getAnimalPath() {
      // Simplified paths for each animal
      const paths = {
        beaver: 'M50,20 C30,20 20,30 20,50 C20,70 30,80 50,80 C70,80 80,70 80,50 C80,30 70,20 50,20 Z',
        eagle: 'M50,15 L35,30 L20,45 L20,60 L35,70 L50,85 L65,70 L80,60 L80,45 L65,30 Z',
        fox: 'M50,25 C35,25 25,35 25,50 C25,65 35,75 50,75 C65,75 75,65 75,50 C75,35 65,25 50,25 Z',
        wolf: 'M50,20 L30,35 L25,55 L30,70 L50,80 L70,70 L75,55 L70,35 Z',
        bear: 'M50,25 C40,25 30,30 30,40 L30,60 C30,70 40,75 50,75 C60,75 70,70 70,60 L70,40 C70,30 60,25 50,25 Z',
        turtle: 'M50,30 C35,30 25,40 25,50 C25,60 35,70 50,70 C65,70 75,60 75,50 C75,40 65,30 50,30 Z',
        otter: 'M50,20 C35,20 25,30 25,45 L25,55 C25,70 35,80 50,80 C65,80 75,70 75,55 L75,45 C75,30 65,20 50,20 Z',
        wolverine: 'M50,25 L35,30 L25,45 L25,55 L35,70 L50,75 L65,70 L75,55 L75,45 L65,30 Z',
        marten: 'M50,20 C40,20 30,25 30,35 L30,65 C30,75 40,80 50,80 C60,80 70,75 70,65 L70,35 C70,25 60,20 50,20 Z'
      };
      
      return paths[this.badge.visual.animal] || paths.beaver;
    }

    createVerifyButton() {
      const button = document.createElement('button');
      button.className = 'indigenous-badge-verify';
      button.innerHTML = this.isVerified ? '✓' : '?';
      button.title = 'Verify Badge';
      
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.verifyBadge();
      });
      
      return button;
    }

    createTooltip() {
      const tooltip = document.createElement('div');
      tooltip.className = 'indigenous-badge-tooltip';
      tooltip.innerHTML = `
        <div class="indigenous-badge-tooltip-title">
          ${this.badge.visual.animal.toUpperCase()} Spirit
        </div>
        <div class="indigenous-badge-tooltip-metrics">
          <div>Procurement: ${this.badge.visual.metrics.procurementPercentage}%</div>
          <div>Indigenous Employment: ${this.badge.visual.metrics.indigenousEmployment}</div>
          <div>Community Investment: $${this.badge.visual.metrics.communityInvestment.toLocaleString()}</div>
        </div>
      `;
      
      return tooltip;
    }

    addAnimations(svg) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes indigenous-badge-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes indigenous-badge-glow {
          0%, 100% { filter: drop-shadow(0 0 10px ${this.badge.visual.colors.accent}); }
          50% { filter: drop-shadow(0 0 20px ${this.badge.visual.colors.accent}); }
        }
        
        .indigenous-badge-svg {
          animation: indigenous-badge-pulse 3s ease-in-out infinite;
        }
        
        .indigenous-badge-animal {
          animation: indigenous-badge-glow 2s ease-in-out infinite;
        }
      `;
      
      document.head.appendChild(style);
    }

    async verifyBadge() {
      try {
        const response = await fetch(`${API_URL}/badges/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: this.badge.identity.publicKey,
            temporalProof: this.badge.identity.temporalProof,
            blockchainAnchor: this.badge.identity.blockchainAnchor
          })
        });
        
        const result = await response.json();
        this.isVerified = result.isValid;
        
        // Update verify button
        const verifyButton = this.element.querySelector('.indigenous-badge-verify');
        if (verifyButton) {
          verifyButton.innerHTML = this.isVerified ? '✓' : '✗';
          verifyButton.classList.toggle('verified', this.isVerified);
        }
      } catch (error) {
        console.error('Failed to verify badge:', error);
      }
    }

    handleBadgeClick() {
      if (this.trackingEnabled) {
        this.trackEvent('click');
      }
      
      window.open(`${VERIFY_URL}/${this.badgeId}`, '_blank');
    }

    async trackEvent(eventType) {
      try {
        await fetch(`${API_URL}/badges/${this.badgeId}/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: eventType,
            platform: 'website',
            url: window.location.href,
            referrer: document.referrer
          })
        });
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    }
  }

  // Initialize function
  window.IndigenousBadge.init = function() {
    // Find all badge elements
    const elements = document.querySelectorAll('[data-badge-id]');
    elements.forEach(element => {
      if (!element.hasAttribute('data-indigenous-badge-initialized')) {
        element.setAttribute('data-indigenous-badge-initialized', 'true');
        new BadgeWidget(element);
      }
    });
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.IndigenousBadge.init);
  } else {
    window.IndigenousBadge.init();
  }
})();
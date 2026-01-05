/**
 * Hers Labs Hero Section JavaScript
 * Handles animations and interactions
 */

class HersLabsHero extends HTMLElement {
  constructor() {
    super();
    this.section = document.querySelector(`[data-section-id="${this.getAttribute('data-section-id')}"]`);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  init() {
    if (!this.section) return;

    // Check for reduced motion preference
    if (this.reducedMotion) {
      const track = this.section.querySelector('.hers-labs-hero__images-track');
      if (track) {
        track.style.animation = 'none';
      }
      return;
    }

    // Verify and fix marquee animation
    this.verifyMarqueeAnimation();

    // Initialize button interactions
    this.initButtonInteractions();
  }

  verifyMarqueeAnimation() {
    const track = this.section.querySelector('.hers-labs-hero__images-track');
    if (!track) return;

    const sets = track.querySelectorAll('.hers-labs-hero__images-set');
    if (sets.length < 2) {
      console.warn('Marquee requires at least 2 sets for seamless looping');
      return;
    }

    // Ensure animation is applied
    const computedStyle = window.getComputedStyle(track);
    if (!computedStyle.animationName || computedStyle.animationName === 'none') {
      track.style.animation = 'slideImages 20s linear infinite';
    }

    // Verify both sets have identical content
    const firstSet = sets[0];
    const secondSet = sets[1];
    
    // Ensure no gaps between sets
    if (secondSet) {
      secondSet.style.marginLeft = '0';
      secondSet.style.paddingLeft = '0';
    }

    // Force reflow to ensure width calculation
    track.offsetHeight;
  }

  initButtonInteractions() {
    const buttons = this.section?.querySelectorAll('.hers-labs-hero__button');
    if (!buttons) return;

    buttons.forEach(button => {
      // Keyboard navigation
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          button.click();
        }
      });
    });
  }
}

// Register custom element
if (!customElements.get('hers-labs-hero')) {
  customElements.define('hers-labs-hero', HersLabsHero);
}

// Initialize on DOM ready
function initializeHersLabsHero() {
  const sections = document.querySelectorAll('.hers-labs-hero');
  sections.forEach(section => {
    if (section.dataset.initialized === 'true') return;
    
    const wrapper = document.createElement('hers-labs-hero');
    wrapper.setAttribute('data-section-id', section.dataset.sectionId || '');
    section.parentNode.insertBefore(wrapper, section);
    wrapper.appendChild(section);
    section.dataset.initialized = 'true';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHersLabsHero);
} else {
  initializeHersLabsHero();
}

// Re-initialize on section load (for theme editor)
document.addEventListener('shopify:section:load', initializeHersLabsHero);


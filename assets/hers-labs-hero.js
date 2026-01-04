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
        track.setAttribute('data-images-loaded', 'true');
      }
      this.initButtonInteractions();
      return;
    }

    // Preload all images and start animation when ready
    this.preloadImages();
    
    // Initialize button interactions
    this.initButtonInteractions();
  }

  preloadImages() {
    const track = this.section.querySelector('.hers-labs-hero__images-track');
    if (!track) return;

    const images = track.querySelectorAll('.hers-labs-hero__sliding-image');
    if (images.length === 0) {
      track.setAttribute('data-images-loaded', 'true');
      return;
    }

    let loadedCount = 0;
    const totalImages = images.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        track.setAttribute('data-images-loaded', 'true');
      }
    };

    images.forEach(img => {
      if (img.complete && img.naturalHeight !== 0) {
        checkAllLoaded();
      } else {
        img.addEventListener('load', checkAllLoaded, { once: true });
        img.addEventListener('error', checkAllLoaded, { once: true });
      }
    });

    // Fallback: start animation after 2 seconds even if not all loaded
    setTimeout(() => {
      if (track.getAttribute('data-images-loaded') !== 'true') {
        track.setAttribute('data-images-loaded', 'true');
      }
    }, 2000);
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


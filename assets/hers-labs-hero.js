/**
 * Hers Labs Hero Section JavaScript
 * Handles seamless infinite marquee animation
 */

class HersLabsHero extends HTMLElement {
  constructor() {
    super();
    this.section = document.querySelector(`[data-section-id="${this.getAttribute('data-section-id')}"]`);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animationFrameId = null;
    this.currentTranslateX = 0;
    this.setWidth = 0;
    this.speed = 0.5; // pixels per frame (adjust for speed)
    this.resizeTimeout = null;
    this.imagesLoaded = false;
    this.init();
  }

  init() {
    if (!this.section) return;

    // Check for reduced motion preference
    if (this.reducedMotion) {
      const track = this.section.querySelector('.hers-labs-hero__images-track');
      if (track) {
        track.style.animation = 'none';
        track.style.transform = 'translate3d(0, 0, 0)';
      }
      return;
    }

    // Wait for images to load, then initialize marquee
    this.waitForImagesToLoad().then(() => {
      this.imagesLoaded = true;
      this.initSeamlessMarquee();
    });

    // Initialize button interactions
    this.initButtonInteractions();

    // Handle resize with debouncing
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (this.imagesLoaded) {
          this.initSeamlessMarquee();
        }
      }, 250);
    });
  }

  /**
   * Wait for all images in the track to load before measuring widths
   */
  waitForImagesToLoad() {
    const track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    if (!track) return Promise.resolve();

    const images = track.querySelectorAll('img');
    if (images.length === 0) return Promise.resolve();

    const imagePromises = Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const onLoad = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onLoad);
          resolve();
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onLoad);
        // Fallback timeout
        setTimeout(resolve, 3000);
      });
    });

    return Promise.all(imagePromises);
  }

  /**
   * Initialize seamless marquee animation using requestAnimationFrame
   * KEY CHANGE: Uses exact pixel measurements and continuous animation
   */
  initSeamlessMarquee() {
    const track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    if (!track) return;

    // Stop any existing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove CSS animation (we'll use JS instead)
    track.style.animation = 'none';

    // Get all sets
    const sets = track.querySelectorAll('.hers-labs-hero__images-set');
    if (sets.length === 0) return;

    // Ensure sets are properly displayed
    sets.forEach(set => {
      set.style.display = 'flex';
      set.style.flexShrink = '0';
      set.style.flexGrow = '0';
      set.style.width = 'max-content';
      set.style.minWidth = 'max-content';
    });

    // Force a reflow to ensure accurate measurements
    track.offsetHeight;

    // Measure the width of the first set (this is our "one complete set" width)
    const firstSet = sets[0];
    const firstSetWidth = firstSet.offsetWidth;
    
    if (firstSetWidth === 0) {
      console.warn('⚠️ First set has zero width, retrying after delay');
      setTimeout(() => this.initSeamlessMarquee(), 100);
      return;
    }

    // KEY FIX: Store the exact width of one set
    this.setWidth = firstSetWidth;

    // Ensure we have at least 2 sets for seamless looping
    // If we only have 1 set, duplicate it
    if (sets.length < 2) {
      const firstSetClone = firstSet.cloneNode(true);
      firstSetClone.setAttribute('data-marquee-set', '2');
      track.appendChild(firstSetClone);
    }

    // Ensure we have enough sets to cover viewport + buffer
    // Duplicate sets until we have at least 3 total (original + 2 duplicates)
    // This ensures seamless looping even on wide screens
    const viewportWidth = window.innerWidth;
    const minSetsNeeded = Math.ceil((viewportWidth * 2) / this.setWidth) + 2;
    
    // KEY FIX: Re-query sets after cloning to get updated NodeList
    let currentSets = track.querySelectorAll('.hers-labs-hero__images-set');
    while (currentSets.length < minSetsNeeded && currentSets.length < 10) {
      const lastSet = track.lastElementChild;
      const newSet = lastSet.cloneNode(true);
      newSet.setAttribute('data-marquee-set', String(currentSets.length + 1));
      track.appendChild(newSet);
      // Re-query to get updated count
      currentSets = track.querySelectorAll('.hers-labs-hero__images-set');
    }

    // Reset animation position
    this.currentTranslateX = 0;
    track.style.transform = 'translate3d(0, 0, 0)';
    track.style.willChange = 'transform';

    // Start the animation loop
    this.animate();
  }

  /**
   * Continuous animation loop using requestAnimationFrame
   * KEY CHANGE: Wraps position seamlessly when reaching setWidth
   */
  animate() {
    if (this.reducedMotion) return;

    const track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    if (!track || this.setWidth === 0) return;

    // Move the track
    this.currentTranslateX -= this.speed;

    // KEY FIX: When we've moved exactly one set width, wrap back seamlessly
    // This creates the illusion of infinite scrolling with no visible reset
    if (this.currentTranslateX <= -this.setWidth) {
      this.currentTranslateX += this.setWidth;
    }

    // Apply the transform using translate3d for hardware acceleration
    track.style.transform = `translate3d(${this.currentTranslateX}px, 0, 0)`;

    // Continue animation
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Clean up animation on disconnect
   */
  disconnectedCallback() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
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

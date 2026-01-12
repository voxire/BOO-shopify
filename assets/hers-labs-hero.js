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
    // FIX: Set speed based on reduced motion preference (0 if reduced, otherwise 0.5)
    this.speed = this.reducedMotion ? 0 : 0.5; // pixels per frame
    this.resizeTimeout = null;
    this.imagesLoaded = false;
    this.track = null; // Cache track reference
    this.init();
  }

  init() {
    if (!this.section) return;

    // FIX: Always initialize marquee, but set speed = 0 if reduced motion
    // Do NOT return early - animation loop must still initialize and render

    // Wait for images to load, then initialize marquee
    this.waitForImagesToLoad().then(() => {
      this.imagesLoaded = true;
      this.initSeamlessMarquee();
    }).catch(() => {
      // Even if images fail to load, try to initialize
      this.imagesLoaded = true;
      this.initSeamlessMarquee();
    });

    // Initialize button interactions
    this.initButtonInteractions();

    // Handle resize with debouncing
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (this.imagesLoaded && this.track) {
          // FIX: On resize, cancel animation, re-measure, reset position, restart loop
          if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
          }
          this.initSeamlessMarquee();
        }
      }, 250);
    });
  }

  /**
   * Wait for all images in the track to load before measuring widths
   * FIX: Use img.decode() for proper image loading detection
   */
  waitForImagesToLoad() {
    this.track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    if (!this.track) return Promise.resolve();

    const images = this.track.querySelectorAll('img');
    if (images.length === 0) return Promise.resolve();

    // FIX: Use Promise.all with img.decode() as requested
    const imagePromises = Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      // Use decode() method for better image loading detection
      return img.decode().catch(() => {
        // If decode fails, wait for load event
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
    });

    return Promise.all(imagePromises);
  }

  /**
   * Initialize seamless marquee animation using requestAnimationFrame
   * FIX: Explicitly start requestAnimationFrame loop AFTER images load and widths measured
   */
  initSeamlessMarquee() {
    this.track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    if (!this.track) return;

    // Stop any existing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // FIX: Remove CSS animation and ensure no transform override
    this.track.style.animation = 'none';
    this.track.style.willChange = 'transform';

    // Get all sets
    const sets = this.track.querySelectorAll('.hers-labs-hero__images-set');
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
    this.track.offsetHeight;

    // Measure the width of the first set (this is our "one complete set" width)
    const firstSet = sets[0];
    const firstSetWidth = firstSet.offsetWidth;
    
    if (firstSetWidth === 0) {
      console.warn('⚠️ First set has zero width, retrying after delay');
      setTimeout(() => this.initSeamlessMarquee(), 100);
      return;
    }

    // FIX: Store the exact width of one set
    this.setWidth = firstSetWidth;

    // Ensure we have at least 2 sets for seamless looping
    if (sets.length < 2) {
      const firstSetClone = firstSet.cloneNode(true);
      firstSetClone.setAttribute('data-marquee-set', '2');
      this.track.appendChild(firstSetClone);
    }

    // Ensure we have enough sets to cover viewport + buffer
    const viewportWidth = window.innerWidth;
    const minSetsNeeded = Math.ceil((viewportWidth * 2) / this.setWidth) + 2;
    
    let currentSets = this.track.querySelectorAll('.hers-labs-hero__images-set');
    while (currentSets.length < minSetsNeeded && currentSets.length < 10) {
      const lastSet = this.track.lastElementChild;
      const newSet = lastSet.cloneNode(true);
      newSet.setAttribute('data-marquee-set', String(currentSets.length + 1));
      this.track.appendChild(newSet);
      currentSets = this.track.querySelectorAll('.hers-labs-hero__images-set');
    }

    // FIX: Reset animation position to 0
    this.currentTranslateX = 0;
    this.track.style.transform = 'translate3d(0, 0, 0)';

    // FIX: Update speed based on current reduced motion preference
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.speed = this.reducedMotion ? 0 : 0.5;

    // FIX: EXPLICITLY start the requestAnimationFrame loop AFTER images load and widths measured
    // This is the critical fix - the loop must be explicitly started here
    this.startAnimationLoop();
  }

  /**
   * FIX: Separate method to explicitly start the animation loop
   * Uses the exact pattern requested: loop() function that continuously calls requestAnimationFrame
   */
  startAnimationLoop() {
    // Stop any existing loop first
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // FIX: Use the exact loop pattern requested - NO early returns that stop the loop
    const loop = () => {
      // FIX: Ensure translateX advances every frame
      this.currentTranslateX -= this.speed;

      // FIX: Wrap seamlessly when reaching setWidth
      if (this.currentTranslateX <= -this.setWidth) {
        this.currentTranslateX += this.setWidth;
      }

      // FIX: Apply transform using translate3d
      if (this.track && this.setWidth > 0) {
        this.track.style.transform = `translate3d(${this.currentTranslateX}px, 0, 0)`;
      }

      // FIX: Continue loop - NO conditions that stop it unless section is destroyed
      this.animationFrameId = requestAnimationFrame(loop);
    };

    // FIX: EXPLICITLY start the loop - this was missing or broken before
    // The loop must start here, not in a separate animate() method with early returns
    this.animationFrameId = requestAnimationFrame(loop);
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

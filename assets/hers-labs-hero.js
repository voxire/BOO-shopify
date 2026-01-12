/**
 * Hers Labs Hero Section JavaScript
 * Handles seamless infinite marquee animation
 */

class HersLabsHero extends HTMLElement {
  constructor() {
    super();
    this.animationFrameId = null;
    this.currentTranslateX = 0;
    this.setWidth = 0;
    this.speed = 0.5; // pixels per frame
    this.resizeTimeout = null;
    this.imagesLoaded = false;
    this.track = null;
    this.section = null;
    this.isInitialized = false;
  }

  // FIX: Use connectedCallback instead of constructor init - ensures DOM is ready
  connectedCallback() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Find section - it should be a child of this custom element
    this.section = this.querySelector('.hers-labs-hero') || 
                   document.querySelector(`[data-section-id="${this.getAttribute('data-section-id')}"]`);
    
    if (!this.section) {
      console.warn('⚠️ Hers Labs Hero section not found');
      return;
    }

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.speed = this.reducedMotion ? 0 : 0.5;

    // Wait for images to load, then initialize marquee
    this.waitForImagesToLoad().then(() => {
      this.imagesLoaded = true;
      this.initSeamlessMarquee();
    }).catch((err) => {
      console.warn('⚠️ Image loading error, initializing anyway:', err);
      this.imagesLoaded = true;
      // Try to initialize even if images fail
      setTimeout(() => this.initSeamlessMarquee(), 100);
    });

    // Initialize button interactions
    this.initButtonInteractions();

    // Handle resize with debouncing
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (this.imagesLoaded && this.track) {
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
   */
  waitForImagesToLoad() {
    this.track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    
    if (!this.track) {
      console.warn('⚠️ Track not found');
      return Promise.resolve();
    }

    const images = this.track.querySelectorAll('img');
    if (images.length === 0) {
      console.warn('⚠️ No images found in track');
      return Promise.resolve();
    }

    const imagePromises = Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return img.decode().catch(() => {
        return new Promise((resolve) => {
          const onLoad = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onLoad);
            resolve();
          };
          img.addEventListener('load', onLoad);
          img.addEventListener('error', onLoad);
          setTimeout(resolve, 3000);
        });
      });
    });

    return Promise.all(imagePromises);
  }

  /**
   * Initialize seamless marquee animation using requestAnimationFrame
   */
  initSeamlessMarquee() {
    this.track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    
    if (!this.track) {
      console.error('❌ Track not found in initSeamlessMarquee');
      return;
    }

    // Stop any existing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove CSS animation
    this.track.style.animation = 'none';
    this.track.style.willChange = 'transform';

    // Get all sets
    const sets = this.track.querySelectorAll('.hers-labs-hero__images-set');
    if (sets.length === 0) {
      console.error('❌ No image sets found');
      return;
    }

    // Ensure sets are properly displayed
    sets.forEach(set => {
      set.style.display = 'flex';
      set.style.flexShrink = '0';
      set.style.flexGrow = '0';
      set.style.width = 'max-content';
      set.style.minWidth = 'max-content';
    });

    // Force a reflow
    void this.track.offsetHeight;

    // Measure the width of the first set
    const firstSet = sets[0];
    const firstSetWidth = firstSet.offsetWidth;
    
    if (firstSetWidth === 0) {
      console.warn('⚠️ First set has zero width, retrying...');
      setTimeout(() => this.initSeamlessMarquee(), 100);
      return;
    }

    this.setWidth = firstSetWidth;
    console.log('✅ Set width measured:', this.setWidth, 'px');

    // Ensure we have at least 2 sets
    if (sets.length < 2) {
      const firstSetClone = firstSet.cloneNode(true);
      firstSetClone.setAttribute('data-marquee-set', '2');
      this.track.appendChild(firstSetClone);
    }

    // Ensure we have enough sets to cover viewport
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

    // Reset animation position
    this.currentTranslateX = 0;
    this.track.style.transform = 'translate3d(0, 0, 0)';

    // Update speed
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.speed = this.reducedMotion ? 0 : 0.5;

    console.log('✅ Starting animation loop, speed:', this.speed, 'px/frame');

    // CRITICAL: Start the animation loop
    this.startAnimationLoop();
  }

  /**
   * Start the animation loop - this MUST be called explicitly
   */
  startAnimationLoop() {
    // Stop any existing loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Validate prerequisites
    if (!this.track) {
      console.error('❌ Cannot start loop: track is null');
      return;
    }
    if (this.setWidth === 0) {
      console.error('❌ Cannot start loop: setWidth is 0');
      return;
    }

    console.log('✅ Starting requestAnimationFrame loop');

    // CRITICAL: The loop function - this runs every frame
    const loop = () => {
      // Update position
      this.currentTranslateX -= this.speed;

      // Wrap seamlessly
      if (this.currentTranslateX <= -this.setWidth) {
        this.currentTranslateX += this.setWidth;
      }

      // Apply transform - CRITICAL: This must happen every frame
      if (this.track && this.setWidth > 0) {
        this.track.style.transform = `translate3d(${this.currentTranslateX}px, 0, 0)`;
      }

      // Continue loop - NO conditions that stop it
      this.animationFrameId = requestAnimationFrame(loop);
    };

    // CRITICAL: Start the loop immediately
    this.animationFrameId = requestAnimationFrame(loop);
    console.log('✅ requestAnimationFrame called, ID:', this.animationFrameId);
  }

  /**
   * Clean up on disconnect
   */
  disconnectedCallback() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.isInitialized = false;
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

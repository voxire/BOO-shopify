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
    if (!track) {
      console.error('❌ .hers-labs-hero__images-track not found!');
      console.log('Section element:', this.section);
      console.log('Section HTML:', this.section.innerHTML.substring(0, 500));
      // Try alternative selector
      const altTrack = this.section.querySelector('[data-marquee-track]');
      if (altTrack) {
        console.log('✅ Found track using data-marquee-track attribute');
        return this.verifyMarqueeAnimationForTrack(altTrack);
      }
      return;
    }

    this.verifyMarqueeAnimationForTrack(track);
  }

  verifyMarqueeAnimationForTrack(track) {
    console.log('✅ Track found:', track);
    
    const sets = track.querySelectorAll('.hers-labs-hero__images-set');
    console.log('✅ Found', sets.length, 'image sets');
    
    if (sets.length < 2) {
      console.warn('⚠️ Marquee requires at least 2 sets for seamless looping. Found:', sets.length);
      return;
    }

    const firstSet = sets[0];
    const secondSet = sets[1];
    
    // CRITICAL: Force both sets to have width
    // Apply explicit flex properties to prevent collapse
    sets.forEach((set, index) => {
      set.style.display = 'flex';
      set.style.flexShrink = '0';
      set.style.flexGrow = '0';
      set.style.width = 'max-content';
      set.style.minWidth = 'max-content';
      set.style.overflow = 'visible';
    });

    // Force image wrappers to maintain width
    const wrappers = track.querySelectorAll('.hers-labs-hero__image-wrapper');
    wrappers.forEach(wrapper => {
      wrapper.style.flexShrink = '0';
      wrapper.style.flexGrow = '0';
      wrapper.style.minWidth = '30rem';
      wrapper.style.width = '30rem';
    });

    // Find and verify all images
    const images = track.querySelectorAll('.hers-labs-hero__sliding-image, .hers-labs-hero__image-wrapper img');
    console.log('✅ Found', images.length, 'images');
    
    images.forEach((img, index) => {
      // Force images to display
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      
      // Check if image loaded
      if (img.complete && img.naturalHeight !== 0) {
        console.log(`✅ Image ${index + 1} loaded:`, img.src.substring(0, 50));
      } else {
        console.warn(`⚠️ Image ${index + 1} not loaded yet:`, img.src.substring(0, 50));
        img.loading = 'eager';
      }
    });

    // Force track to respect max-content
    track.style.display = 'flex';
    track.style.flexShrink = '0';
    track.style.flexGrow = '0';
    track.style.width = 'max-content';
    track.style.minWidth = 'max-content';

    // Ensure animation is applied
    const computedStyle = window.getComputedStyle(track);
    if (!computedStyle.animationName || computedStyle.animationName === 'none') {
      console.log('🔧 Applying animation manually');
      track.style.animation = 'slideImages 20s linear infinite';
    } else {
      console.log('✅ Animation already applied:', computedStyle.animationName);
    }
    
    // CRITICAL: Verify both sets have width after forcing layout
    // Force a reflow to ensure width calculation
    track.offsetHeight;
    firstSet.offsetHeight;
    secondSet.offsetHeight;
    
    const firstSetWidth = firstSet.offsetWidth;
    const secondSetWidth = secondSet.offsetWidth;
    const trackWidth = track.offsetWidth;
    
    console.log('📏 First set width:', firstSetWidth, 'px');
    console.log('📏 Second set width:', secondSetWidth, 'px');
    console.log('📏 Track width:', trackWidth, 'px');
    console.log('📏 Expected track width (set1 + set2):', firstSetWidth + secondSetWidth, 'px');
    
    if (secondSetWidth === 0) {
      console.error('❌ CRITICAL: Second set has zero width!');
      console.log('Second set computed styles:', window.getComputedStyle(secondSet));
      console.log('Second set children:', secondSet.children.length);
      console.log('Second set innerHTML length:', secondSet.innerHTML.length);
    } else if (Math.abs(trackWidth - (firstSetWidth + secondSetWidth)) > 10) {
      console.warn('⚠️ Track width mismatch! Expected:', firstSetWidth + secondSetWidth, 'Got:', trackWidth);
    } else {
      console.log('✅ Width verification passed!');
    }
    
    // Ensure no gaps between sets
    if (secondSet) {
      secondSet.style.marginLeft = '0';
      secondSet.style.paddingLeft = '0';
    }

    console.log('✅ Marquee animation verified and initialized');
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


/**
 * GIF Media Carousel
 * Transform-based infinite looping carousel with smooth animations
 * Uses transform: translateX() instead of scrollLeft for true infinite loop
 * Supports multiple instances on the same page
 */

(function () {
  'use strict';

  class GifMediaCarousel {
    constructor(section) {
      this.section = section;
      this.track = section.querySelector('[data-track]');
      this.prevBtn = section.querySelector('.gmc-arrow--prev');
      this.nextBtn = section.querySelector('.gmc-arrow--next');
      this.dots = section.querySelectorAll('[data-dot-index]');
      this.autoplayEnabled = section.dataset.autoplay === 'true';
      this.autoplayDelay = parseInt(section.dataset.autoplayDelay) || 5000;
      this.autoplayTimer = null;
      this.isPaused = false;
      this.loopEnabled = section.dataset.loop === 'true';
      this.isDragging = false;
      this.isTransitioning = false;

      // Transform-based properties
      this.currentTranslateX = 0;
      this.slideWidth = 0;
      this.gap = 0;
      this.realSlides = [];
      this.allSlides = [];
      this.realSlideCount = 0;
      this.cloneCount = 0; // Number of clones at each end
      this.currentIndex = 0; // Index of REAL slides only (0 to realSlideCount - 1)

      if (!this.track || !this.track.children.length) return;

      this.init();
    }

    init() {
      // Store original slides before cloning
      this.realSlides = Array.from(this.track.querySelectorAll('.gmc-slide'));
      this.realSlideCount = this.realSlides.length;

      if (this.realSlideCount === 0) return;

      // Calculate slide width and gap
      this.calculateDimensions();

      // Clone slides for infinite loop (if enabled)
      if (this.loopEnabled) {
        this.cloneSlides();
      }

      // Get all slides (real + clones)
      this.allSlides = Array.from(this.track.querySelectorAll('.gmc-slide'));

      // Setup track for transform-based movement
      this.setupTrack();

      // Initialize position to first real slide
      this.currentIndex = 0;
      this.updateTransform(0, false); // No animation on init

      // Setup navigation buttons
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => this.goToPrev());
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.goToNext());
      }

      // Setup dots (only for real slides)
      this.dots.forEach((dot, index) => {
        if (index < this.realSlideCount) {
          dot.addEventListener('click', () => this.goToSlide(index));
        }
      });

      // Setup touch/drag support
      this.setupTouchSupport();

      // Setup autoplay
      if (this.autoplayEnabled) {
        this.startAutoplay();
        this.section.addEventListener('mouseenter', () => this.pauseAutoplay());
        this.section.addEventListener('mouseleave', () => this.resumeAutoplay());
        this.section.addEventListener('focusin', () => this.pauseAutoplay());
        this.section.addEventListener('focusout', () => this.resumeAutoplay());
      }

      // Setup quick add buttons
      this.setupQuickAdd();

      // Setup overlay buttons
      this.setupOverlayButtons();

      // Initial state update
      this.updateActiveState();
    }

    /**
     * Calculate slide width and gap from first slide
     * This is used to determine how much to translate
     */
    calculateDimensions() {
      if (this.realSlides.length === 0) return;

      const firstSlide = this.realSlides[0];
      const trackStyles = getComputedStyle(this.track);
      this.gap = parseInt(trackStyles.gap) || 18;
      this.slideWidth = firstSlide.offsetWidth + this.gap;
    }

    /**
     * Clone slides for infinite loop
     * Clones first N slides to end, and last N slides to beginning
     * N = number of visible slides (to ensure seamless transition)
     */
    cloneSlides() {
      // Determine how many clones we need (enough to cover viewport)
      const visibleSlides = Math.ceil(this.track.offsetWidth / this.slideWidth) + 2;
      this.cloneCount = Math.min(visibleSlides, this.realSlideCount);

      // Clone last N slides and prepend to beginning
      for (let i = this.realSlideCount - this.cloneCount; i < this.realSlideCount; i++) {
        const clone = this.realSlides[i].cloneNode(true);
        clone.classList.add('gmc-clone');
        this.track.insertBefore(clone, this.track.firstChild);
      }

      // Clone first N slides and append to end
      for (let i = 0; i < this.cloneCount; i++) {
        const clone = this.realSlides[i].cloneNode(true);
        clone.classList.add('gmc-clone');
        this.track.appendChild(clone);
      }
    }

    /**
     * Setup track for transform-based movement
     * Disable native scrolling, enable transform
     */
    setupTrack() {
      // Disable native scrolling
      this.track.style.overflow = 'hidden';
      this.track.style.display = 'flex';
      this.track.style.willChange = 'transform';

      // Add transition for smooth animations
      this.track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }

    /**
     * Update transform position
     * @param {number} index - Real slide index (0 to realSlideCount - 1)
     * @param {boolean} animate - Whether to animate the transition
     */
    updateTransform(index, animate = true) {
      // Clamp or wrap index to valid range
      let targetIndex = index;
      if (!this.loopEnabled) {
        targetIndex = Math.max(0, Math.min(index, this.realSlideCount - 1));
      } else {
        // Wrap around for loop
        if (index < 0) {
          targetIndex = this.realSlideCount - 1;
        } else if (index >= this.realSlideCount) {
          targetIndex = 0;
        }
      }

      // Calculate translateX position
      // If looped, account for prepended clones
      let translateX = 0;
      if (this.loopEnabled) {
        // Start position accounts for prepended clones
        const startOffset = this.cloneCount * this.slideWidth;
        translateX = startOffset + (targetIndex * this.slideWidth);

        // If going from last to first (next), go to clone at end
        if (this.currentIndex === this.realSlideCount - 1 && targetIndex === 0) {
          translateX = startOffset + (this.realSlideCount * this.slideWidth);
        }
        // If going from first to last (prev), go to clone at start
        else if (this.currentIndex === 0 && targetIndex === this.realSlideCount - 1) {
          translateX = 0; // Start of clones
        }
      } else {
        translateX = targetIndex * this.slideWidth;
      }

      // Apply transform
      if (animate) {
        this.isTransitioning = true;
        this.track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      } else {
        this.track.style.transition = 'none';
      }

      this.track.style.transform = `translateX(-${translateX}px)`;
      this.currentTranslateX = translateX;
      this.currentIndex = targetIndex;

      // Handle loop jump after transition
      if (animate && this.loopEnabled) {
        this.track.addEventListener('transitionend', this.handleTransitionEnd.bind(this), { once: true });
      } else if (!animate) {
        this.isTransitioning = false;
      }

      // Update active state
      this.updateActiveState();
    }

    /**
     * Handle transition end - check if we need to jump to real slide
     * This creates the seamless infinite loop effect
     * 
     * When we reach a clone slide, we instantly jump (without animation) to the
     * corresponding real slide, creating the illusion of infinite scrolling
     */
    handleTransitionEnd() {
      this.isTransitioning = false;

      if (!this.loopEnabled) return;

      // Calculate boundaries
      const startOffset = this.cloneCount * this.slideWidth;
      const endOffset = startOffset + (this.realSlideCount * this.slideWidth);

      // If we've scrolled to or past the end clones (after last real slide), jump to first real slide
      if (this.currentTranslateX >= endOffset) {
        this.track.style.transition = 'none';
        this.currentTranslateX = startOffset; // Jump to first real slide
        this.track.style.transform = `translateX(-${this.currentTranslateX}px)`;
        this.currentIndex = 0;
        this.updateActiveState();
      }
      // If we've scrolled before the start clones, jump to last real slide
      else if (this.currentTranslateX < startOffset) {
        this.track.style.transition = 'none';
        this.currentTranslateX = startOffset + ((this.realSlideCount - 1) * this.slideWidth);
        this.track.style.transform = `translateX(-${this.currentTranslateX}px)`;
        this.currentIndex = this.realSlideCount - 1;
        this.updateActiveState();
      }
    }

    /**
     * Go to specific slide index (real slides only)
     */
    goToSlide(index) {
      if (this.isTransitioning) return;
      this.updateTransform(index, true);

      // Reset autoplay timer
      if (this.autoplayEnabled && !this.isPaused) {
        this.resetAutoplay();
      }
    }

    /**
     * Go to previous slide
     */
    goToPrev() {
      if (this.isTransitioning) return;
      const newIndex = this.currentIndex - 1;
      this.goToSlide(newIndex);
    }

    /**
     * Go to next slide
     */
    goToNext() {
      if (this.isTransitioning) return;
      const newIndex = this.currentIndex + 1;
      this.goToSlide(newIndex);
    }

    /**
     * Update active state (dots, arrows, slide classes)
     * Only applies to real slides, ignores clones
     */
    updateActiveState() {
      // Update dots (only for real slides)
      this.dots.forEach((dot, index) => {
        if (index < this.realSlideCount) {
          if (index === this.currentIndex) {
            dot.classList.add('gmc-dot--active');
          } else {
            dot.classList.remove('gmc-dot--active');
          }
        }
      });

      // Update arrow states
      if (this.prevBtn) {
        if (this.loopEnabled) {
          this.prevBtn.disabled = false;
        } else {
          this.prevBtn.disabled = this.currentIndex === 0;
        }
      }
      if (this.nextBtn) {
        if (this.loopEnabled) {
          this.nextBtn.disabled = false;
        } else {
          this.nextBtn.disabled = this.currentIndex >= this.realSlideCount - 1;
        }
      }

      // Update active class on real slides only
      this.realSlides.forEach((slide, index) => {
        if (index === this.currentIndex) {
          slide.classList.add('is-active');
        } else {
          slide.classList.remove('is-active');
        }
      });
    }

    /**
     * Setup touch/drag support for swipe gestures
     * Uses transform instead of scroll
     */
    setupTouchSupport() {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let touchStartTranslateX = 0;
      let isDragging = false;
      const SWIPE_THRESHOLD = 50;
      const SWIPE_VELOCITY_THRESHOLD = 0.3;
      const MAX_VERTICAL_SWIPE = 30;

      // Touch events
      this.track.addEventListener('touchstart', (e) => {
        if (this.isTransitioning) return;
        touchStartX = e.touches[0].pageX;
        touchStartY = e.touches[0].pageY;
        touchStartTime = Date.now();
        touchStartTranslateX = this.currentTranslateX;
        isDragging = true;
        this.isDragging = true;

        // Disable transition during drag
        this.track.style.transition = 'none';
      }, { passive: true });

      this.track.addEventListener('touchmove', (e) => {
        if (!isDragging || this.isTransitioning) return;

        const deltaX = e.touches[0].pageX - touchStartX;
        const newTranslateX = touchStartTranslateX - deltaX;

        // Apply transform during drag
        this.track.style.transform = `translateX(-${newTranslateX}px)`;
        this.currentTranslateX = newTranslateX;
      }, { passive: true });

      this.track.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        this.isDragging = false;

        const endX = e.changedTouches[0].pageX;
        const endY = e.changedTouches[0].pageY;
        const endTime = Date.now();
        const deltaX = endX - touchStartX;
        const deltaY = Math.abs(endY - touchStartY);
        const deltaTime = endTime - touchStartTime;
        const distance = Math.abs(deltaX);
        const velocity = distance / Math.max(deltaTime, 1);

        // Check if it's a valid swipe
        if (deltaY < MAX_VERTICAL_SWIPE && (distance > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD)) {
          if (deltaX > 0) {
            this.goToPrev();
          } else {
            this.goToNext();
          }
        } else {
          // Snap back to current slide
          this.updateTransform(this.currentIndex, true);
        }
      }, { passive: true });

      // Mouse drag support
      let mouseDown = false;
      let mouseStartX = 0;
      let mouseStartTime = 0;
      let mouseStartTranslateX = 0;

      this.track.addEventListener('mousedown', (e) => {
        if (this.isTransitioning) return;
        mouseDown = true;
        mouseStartX = e.pageX;
        mouseStartTime = Date.now();
        mouseStartTranslateX = this.currentTranslateX;
        this.isDragging = true;
        this.track.style.cursor = 'grabbing';
        this.track.style.transition = 'none';
        e.preventDefault();
      });

      this.track.addEventListener('mousemove', (e) => {
        if (!mouseDown || this.isTransitioning) return;

        const deltaX = e.pageX - mouseStartX;
        const newTranslateX = mouseStartTranslateX - deltaX;

        this.track.style.transform = `translateX(-${newTranslateX}px)`;
        this.currentTranslateX = newTranslateX;
      });

      this.track.addEventListener('mouseup', (e) => {
        if (!mouseDown) return;
        mouseDown = false;
        this.isDragging = false;
        this.track.style.cursor = 'grab';

        const endX = e.pageX;
        const endTime = Date.now();
        const deltaX = endX - mouseStartX;
        const deltaTime = endTime - mouseStartTime;
        const distance = Math.abs(deltaX);
        const velocity = distance / Math.max(deltaTime, 1);

        if (distance > SWIPE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD) {
          if (deltaX > 0) {
            this.goToPrev();
          } else {
            this.goToNext();
          }
        } else {
          this.updateTransform(this.currentIndex, true);
        }
      });

      this.track.addEventListener('mouseleave', () => {
        if (mouseDown) {
          mouseDown = false;
          this.isDragging = false;
          this.track.style.cursor = 'grab';
          this.updateTransform(this.currentIndex, true);
        }
      });

      this.track.style.cursor = 'grab';
    }

    startAutoplay() {
      if (this.isPaused) return;

      this.autoplayTimer = setInterval(() => {
        if (!this.isTransitioning) {
          this.goToNext();
        }
      }, this.autoplayDelay);
    }

    pauseAutoplay() {
      this.isPaused = true;
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    }

    resumeAutoplay() {
      this.isPaused = false;
      this.startAutoplay();
    }

    resetAutoplay() {
      this.pauseAutoplay();
      this.resumeAutoplay();
    }

    setupOverlayButtons() {
      const overlayNextButtons = this.section.querySelectorAll('.gmc-overlay-button--next');
      overlayNextButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.goToNext();
        });
      });
    }

    setupQuickAdd() {
      const quickAddButtons = this.section.querySelectorAll('.gmc-quick-add-btn');
      const overlayQuickAddButtons = this.section.querySelectorAll('.gmc-overlay-button--quick-add');
      const allQuickAddButtons = [...quickAddButtons, ...overlayQuickAddButtons];

      allQuickAddButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleQuickAdd(button);
        });
      });
    }

    async handleQuickAdd(button) {
      const variantId = button.dataset.variantId;
      const productId = button.dataset.productId;

      if (!variantId) {
        console.error('Variant ID not found');
        return;
      }

      button.disabled = true;
      button.classList.add('loading');

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: 1
          })
        });

        const data = await response.json();

        if (response.ok && !data.status) {
          button.classList.remove('loading');
          button.classList.add('success');

          if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
            const cartResponse = await fetch('/cart.js');
            const cartData = await cartResponse.json();

            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'gif-media-carousel',
              productVariantId: variantId,
              cartData: cartData
            });
          } else {
            document.dispatchEvent(new CustomEvent('cart:refresh'));
          }

          setTimeout(() => {
            button.classList.remove('success');
            button.disabled = false;
          }, 2000);

          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer && typeof cartDrawer.open === 'function') {
            cartDrawer.open();
          }
        } else {
          throw new Error(data.description || 'Failed to add to cart');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        button.classList.remove('loading');
        button.disabled = false;
        alert(error.message || 'Unable to add product to cart. Please try again.');
      }
    }

    destroy() {
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
      }
    }
  }

  // Initialize all carousel instances
  function initCarousels() {
    const sections = document.querySelectorAll('[id^="GifMediaCarousel-"]');
    const carousels = [];

    sections.forEach(section => {
      const carousel = new GifMediaCarousel(section);
      if (carousel.track) {
        carousels.push(carousel);
      }
    });

    return carousels;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousels);
  } else {
    initCarousels();
  }

  // Re-initialize when sections are loaded dynamically (Theme Editor)
  if (typeof document.addEventListener !== 'undefined') {
    document.addEventListener('shopify:section:load', (event) => {
      const sectionElement = event.detail || event.target;
      const section = sectionElement.querySelector ?
        sectionElement.querySelector('[id^="GifMediaCarousel-"]') :
        (sectionElement.id && sectionElement.id.startsWith('GifMediaCarousel-') ? sectionElement : null);
      if (section) {
        new GifMediaCarousel(section);
      }
    });

    document.addEventListener('shopify:section:unload', (event) => {
      // Cleanup handled by destroy method
    });
  }
})();

/**
 * GIF Media Carousel
 * Handles carousel navigation, autoplay, active slide detection, and quick add to cart
 * Supports multiple instances on the same page
 * Active slide is determined by which slide's center is closest to the track's center
 */

(function() {
  'use strict';

  class GifMediaCarousel {
    constructor(section) {
      this.section = section;
      this.track = section.querySelector('[data-track]');
      this.prevBtn = section.querySelector('.gmc-arrow--prev');
      this.nextBtn = section.querySelector('.gmc-arrow--next');
      this.dots = section.querySelectorAll('[data-dot-index]');
      this.slides = section.querySelectorAll('.gmc-slide');
      this.autoplayEnabled = section.dataset.autoplay === 'true';
      this.autoplayDelay = parseInt(section.dataset.autoplayDelay) || 5000;
      this.autoplayTimer = null;
      this.isPaused = false;
      this.currentIndex = 0;
      this.scrollRaf = null;
      this.loopEnabled = section.dataset.loop === 'true';
      this.isDragging = false;
      this.touchStartX = 0;
      this.touchStartY = 0;

      if (!this.track || this.slides.length === 0) return;

      this.init();
    }

    init() {
      // Setup navigation buttons
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => this.scrollToPrev());
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.scrollToNext());
      }

      // Setup dots
      this.dots.forEach((dot, index) => {
        dot.addEventListener('click', () => this.scrollToIndex(index));
      });

      // Setup scroll listener for updating active slide and dots/arrows
      this.track.addEventListener('scroll', () => this.handleScroll(), { passive: true });
      
      // Setup touch/drag support for better swiping
      this.setupTouchSupport();
      
      // Setup autoplay
      if (this.autoplayEnabled) {
        this.startAutoplay();
        
        // Pause on hover/focus
        this.section.addEventListener('mouseenter', () => this.pauseAutoplay());
        this.section.addEventListener('mouseleave', () => this.resumeAutoplay());
        this.section.addEventListener('focusin', () => this.pauseAutoplay());
        this.section.addEventListener('focusout', () => this.resumeAutoplay());
      }

      // Setup quick add buttons (both product bar and overlay)
      this.setupQuickAdd();

      // Setup overlay buttons
      this.setupOverlayButtons();

      // Initial state update
      this.updateActiveSlide();
      this.updateActiveState();
    }

    /**
     * Setup touch/drag support for better mobile swiping
     */
    setupTouchSupport() {
      let isDragging = false;
      let startX = 0;
      let scrollLeft = 0;
      let startTime = 0;
      let velocity = 0;
      let lastX = 0;
      let lastTime = 0;

      const snapToNearestSlide = () => {
        const slideWidth = this.getSlideWidth();
        const currentScroll = this.track.scrollLeft;
        const nearestIndex = Math.round(currentScroll / slideWidth);
        
        // Clamp to valid range
        const targetIndex = Math.max(0, Math.min(nearestIndex, this.slides.length - 1));
        
        // Use smooth scroll to snap to nearest slide
        this.track.style.scrollBehavior = 'smooth';
        this.track.scrollTo({
          left: targetIndex * slideWidth,
          behavior: 'smooth'
        });
        
        // Update after a short delay to allow scroll to complete
        setTimeout(() => {
          this.updateActiveSlide();
          this.updateActiveState();
        }, 100);
      };

      // Touch events
      this.track.addEventListener('touchstart', (e) => {
        isDragging = true;
        this.isDragging = true;
        startX = e.touches[0].pageX - this.track.offsetLeft;
        scrollLeft = this.track.scrollLeft;
        startTime = Date.now();
        lastX = startX;
        lastTime = startTime;
        velocity = 0;
        
        // Disable scroll-snap during drag
        this.track.style.scrollSnapType = 'none';
        this.track.style.scrollBehavior = 'auto';
      }, { passive: true });

      this.track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.touches[0].pageX - this.track.offsetLeft;
        const currentTime = Date.now();
        const deltaX = x - lastX;
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime > 0) {
          velocity = deltaX / deltaTime;
        }
        
        const walk = (x - startX) * 1.2; // Reduced multiplier for smoother control
        this.track.scrollLeft = scrollLeft - walk;
        
        lastX = x;
        lastTime = currentTime;
      }, { passive: false });

      this.track.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        this.isDragging = false;
        
        // Re-enable scroll-snap
        this.track.style.scrollSnapType = 'x mandatory';
        
        // Snap to nearest slide
        snapToNearestSlide();
      }, { passive: true });

      // Mouse drag support for desktop
      this.track.addEventListener('mousedown', (e) => {
        isDragging = true;
        this.isDragging = true;
        startX = e.pageX - this.track.offsetLeft;
        scrollLeft = this.track.scrollLeft;
        startTime = Date.now();
        lastX = startX;
        lastTime = startTime;
        velocity = 0;
        
        // Disable scroll-snap during drag
        this.track.style.scrollSnapType = 'none';
        this.track.style.scrollBehavior = 'auto';
        this.track.style.cursor = 'grabbing';
      });

      this.track.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - this.track.offsetLeft;
        const currentTime = Date.now();
        const deltaX = x - lastX;
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime > 0) {
          velocity = deltaX / deltaTime;
        }
        
        const walk = (x - startX) * 1.2;
        this.track.scrollLeft = scrollLeft - walk;
        
        lastX = x;
        lastTime = currentTime;
      });

      this.track.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        this.isDragging = false;
        
        // Re-enable scroll-snap
        this.track.style.scrollSnapType = 'x mandatory';
        this.track.style.cursor = 'grab';
        
        // Snap to nearest slide
        snapToNearestSlide();
      });

      this.track.addEventListener('mouseleave', () => {
        if (isDragging) {
          isDragging = false;
          this.isDragging = false;
          
          // Re-enable scroll-snap
          this.track.style.scrollSnapType = 'x mandatory';
          this.track.style.cursor = 'grab';
          
          // Snap to nearest slide
          snapToNearestSlide();
        }
      });

      // Set initial cursor
      this.track.style.cursor = 'grab';
    }

    getSlideWidth() {
      if (this.slides.length === 0) return 0;
      const firstSlide = this.slides[0];
      const gap = parseInt(getComputedStyle(this.track).gap) || 18;
      return firstSlide.offsetWidth + gap;
    }

    /**
     * Find the slide whose center is closest to the track's center
     * This determines which slide should be marked as active
     */
    findActiveSlideIndex() {
      if (this.slides.length === 0) return 0;

      const trackRect = this.track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      
      let closestIndex = 0;
      let closestDistance = Infinity;

      this.slides.forEach((slide, index) => {
        const slideRect = slide.getBoundingClientRect();
        const slideCenter = slideRect.left + slideRect.width / 2;
        const distance = Math.abs(trackCenter - slideCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    }

    /**
     * Update which slide has the .is-active class based on center position
     */
    updateActiveSlide() {
      const activeIndex = this.findActiveSlideIndex();
      
      this.slides.forEach((slide, index) => {
        if (index === activeIndex) {
          slide.classList.add('is-active');
        } else {
          slide.classList.remove('is-active');
        }
      });

      this.currentIndex = activeIndex;
    }

    /**
     * Throttled scroll handler using requestAnimationFrame
     * Only updates if not currently dragging
     */
    handleScroll() {
      // Don't update during drag - let snapToNearestSlide handle it
      if (this.isDragging) return;
      
      if (this.scrollRaf) {
        cancelAnimationFrame(this.scrollRaf);
      }

      this.scrollRaf = requestAnimationFrame(() => {
        this.updateActiveSlide();
        this.updateActiveState();
      });
    }

    scrollToIndex(index, smooth = true) {
      if (this.slides.length === 0) return;
      
      // Handle infinite loop
      if (this.loopEnabled) {
        // Allow wrapping around
        if (index < 0) {
          index = this.slides.length - 1;
        } else if (index >= this.slides.length) {
          index = 0;
        }
      } else {
        // No loop - clamp to bounds
        if (index < 0 || index >= this.slides.length) return;
      }
      
      const slideWidth = this.getSlideWidth();
      const scrollPosition = slideWidth * index;
      
      if (smooth) {
        this.track.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      } else {
        this.track.scrollLeft = scrollPosition;
      }
      
      // Update immediately for better UX
      this.currentIndex = index;
      this.updateActiveSlide();
      this.updateActiveState();
      
      // Reset autoplay timer
      if (this.autoplayEnabled && !this.isPaused) {
        this.resetAutoplay();
      }
    }

    scrollToPrev() {
      if (this.loopEnabled) {
        const newIndex = this.currentIndex - 1 < 0 ? this.slides.length - 1 : this.currentIndex - 1;
        this.scrollToIndex(newIndex);
      } else {
        const newIndex = Math.max(0, this.currentIndex - 1);
        this.scrollToIndex(newIndex);
      }
    }

    scrollToNext() {
      if (this.loopEnabled) {
        const newIndex = (this.currentIndex + 1) % this.slides.length;
        this.scrollToIndex(newIndex);
      } else {
        const newIndex = Math.min(this.slides.length - 1, this.currentIndex + 1);
        this.scrollToIndex(newIndex);
      }
    }

    updateActiveState() {
      // Update dots
      this.dots.forEach((dot, index) => {
        if (index === this.currentIndex) {
          dot.classList.add('gmc-dot--active');
        } else {
          dot.classList.remove('gmc-dot--active');
        }
      });

      // Update arrow states (disabled only if loop is off and at boundaries)
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
          this.nextBtn.disabled = this.currentIndex >= this.slides.length - 1;
        }
      }
    }

    startAutoplay() {
      if (this.isPaused) return;
      
      this.autoplayTimer = setInterval(() => {
        // Always use scrollToNext which handles loop automatically
        this.scrollToNext();
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
      // Handle overlay "next" buttons
      const overlayNextButtons = this.section.querySelectorAll('.gmc-overlay-button--next');
      overlayNextButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.scrollToNext();
        });
      });

      // Overlay quick add buttons are handled in setupQuickAdd
      // Overlay link buttons are just regular links, no JS needed
    }

    setupQuickAdd() {
      // Product bar quick add buttons
      const quickAddButtons = this.section.querySelectorAll('.gmc-quick-add-btn');
      
      // Overlay quick add buttons
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

      // Disable button and show loading state
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
          // Success - update cart and show success state
          button.classList.remove('loading');
          button.classList.add('success');
          
          // Dispatch cart update event (Dawn theme compatible)
          if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
            // Fetch updated cart data
            const cartResponse = await fetch('/cart.js');
            const cartData = await cartResponse.json();
            
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'gif-media-carousel',
              productVariantId: variantId,
              cartData: cartData
            });
          } else {
            // Fallback: dispatch custom event
            document.dispatchEvent(new CustomEvent('cart:refresh'));
          }

          // Reset button after 2 seconds
          setTimeout(() => {
            button.classList.remove('success');
            button.disabled = false;
          }, 2000);

          // Try to open cart drawer if available
          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer && typeof cartDrawer.open === 'function') {
            cartDrawer.open();
          }
        } else {
          // Error handling
          throw new Error(data.description || 'Failed to add to cart');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        button.classList.remove('loading');
        button.disabled = false;
        
        // Show error message (you can customize this)
        alert(error.message || 'Unable to add product to cart. Please try again.');
      }
    }

    destroy() {
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
      }
      if (this.scrollRaf) {
        cancelAnimationFrame(this.scrollRaf);
      }
    }
  }

  // Initialize all carousel instances on the page
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
      // Cleanup if needed - section will be removed from DOM
      const sectionElement = event.detail || event.target;
      const section = sectionElement.querySelector ? 
        sectionElement.querySelector('[id^="GifMediaCarousel-"]') : 
        (sectionElement.id && sectionElement.id.startsWith('GifMediaCarousel-') ? sectionElement : null);
      if (section) {
        // Carousel will be cleaned up when section is removed
      }
    });
  }
})();

/**
 * GIF Media Carousel
 * Handles carousel navigation, autoplay, and quick add to cart
 * Supports multiple instances on the same page
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

      // Setup scroll listener for updating dots and arrows
      this.track.addEventListener('scroll', () => this.updateActiveState());
      
      // Setup autoplay
      if (this.autoplayEnabled) {
        this.startAutoplay();
        
        // Pause on hover/focus
        this.section.addEventListener('mouseenter', () => this.pauseAutoplay());
        this.section.addEventListener('mouseleave', () => this.resumeAutoplay());
        this.section.addEventListener('focusin', () => this.pauseAutoplay());
        this.section.addEventListener('focusout', () => this.resumeAutoplay());
      }

      // Setup quick add buttons
      this.setupQuickAdd();

      // Initial state update
      this.updateActiveState();
    }

    getSlideWidth() {
      if (this.slides.length === 0) return 0;
      const firstSlide = this.slides[0];
      const gap = parseInt(getComputedStyle(this.track).gap) || 20;
      return firstSlide.offsetWidth + gap;
    }

    scrollToIndex(index) {
      if (index < 0 || index >= this.slides.length) return;
      
      const slideWidth = this.getSlideWidth();
      const scrollPosition = slideWidth * index;
      
      this.track.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
      
      this.currentIndex = index;
      this.updateActiveState();
      
      // Reset autoplay timer
      if (this.autoplayEnabled && !this.isPaused) {
        this.resetAutoplay();
      }
    }

    scrollToPrev() {
      const newIndex = Math.max(0, this.currentIndex - 1);
      this.scrollToIndex(newIndex);
    }

    scrollToNext() {
      const newIndex = Math.min(this.slides.length - 1, this.currentIndex + 1);
      this.scrollToIndex(newIndex);
    }

    updateActiveState() {
      // Calculate current index based on scroll position
      const slideWidth = this.getSlideWidth();
      const scrollLeft = this.track.scrollLeft;
      const newIndex = Math.round(scrollLeft / slideWidth);
      
      if (newIndex !== this.currentIndex) {
        this.currentIndex = newIndex;
      }

      // Update dots
      this.dots.forEach((dot, index) => {
        if (index === this.currentIndex) {
          dot.classList.add('gmc-dot--active');
        } else {
          dot.classList.remove('gmc-dot--active');
        }
      });

      // Update arrow states
      if (this.prevBtn) {
        this.prevBtn.disabled = this.currentIndex === 0;
      }
      if (this.nextBtn) {
        this.nextBtn.disabled = this.currentIndex >= this.slides.length - 1;
      }
    }

    startAutoplay() {
      if (this.isPaused) return;
      
      this.autoplayTimer = setInterval(() => {
        if (this.currentIndex >= this.slides.length - 1) {
          // Loop back to start
          this.scrollToIndex(0);
        } else {
          this.scrollToNext();
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

    setupQuickAdd() {
      const quickAddButtons = this.section.querySelectorAll('.gmc-quick-add-btn');
      
      quickAddButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
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
      const originalText = button.querySelector('.gmc-quick-add-text')?.textContent;

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


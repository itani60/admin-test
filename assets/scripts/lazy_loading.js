/**
 * Lazy Loading Script
 * Handles page loading overlay display and removal
 * Smart loading overlay that only shows when necessary
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MIN_DISPLAY_TIME: 200,      // Minimum time to show overlay (ms) - prevents flash on fast loads
        MAX_DISPLAY_TIME: 2000,     // Maximum time to show overlay (ms) - prevents annoying long waits
        LOAD_THRESHOLD: 100,        // Only show if page takes longer than this (ms)
        FADE_OUT_DURATION: 500      // Fade out animation duration (ms)
    };

    // Capture page load start time immediately
    const pageLoadStartTime = performance.now ? performance.now() : Date.now();
    let overlayShown = false;
    let maxDisplayTimer = null;

    /**
     * Initialize the loading overlay
     */
    function initLoadingOverlay() {
        const loadingOverlay = document.getElementById('pageLoadingOverlay');
        
        if (!loadingOverlay) {
            console.warn('Loading overlay element not found');
            return;
        }

        // Check if page is already mostly loaded (fast connection)
        const now = performance.now ? performance.now() : Date.now();
        const timeSinceStart = now - pageLoadStartTime;
        
        // Only show overlay if page is taking a while to load
        if (timeSinceStart > CONFIG.LOAD_THRESHOLD && document.readyState !== 'complete') {
            overlayShown = true;
            
            // Set maximum display time - always hide after this
            maxDisplayTimer = setTimeout(function() {
                if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
                    hideLoadingOverlay(loadingOverlay);
                }
            }, CONFIG.MAX_DISPLAY_TIME);
        } else {
            // Page loaded quickly, hide immediately
            setTimeout(function() {
                hideLoadingOverlay(loadingOverlay);
            }, CONFIG.MIN_DISPLAY_TIME);
            return;
        }

        // Hide loading overlay when page is fully loaded
        window.addEventListener('load', function() {
            const now = performance.now ? performance.now() : Date.now();
            const loadTime = now - pageLoadStartTime;
            const remainingTime = Math.max(0, CONFIG.MIN_DISPLAY_TIME - loadTime);
            
            setTimeout(function() {
                if (maxDisplayTimer) {
                    clearTimeout(maxDisplayTimer);
                }
                hideLoadingOverlay(loadingOverlay);
            }, remainingTime);
        });

        // Also hide loading overlay when DOM is ready (fallback for fast loads)
        document.addEventListener('DOMContentLoaded', function() {
            const now = performance.now ? performance.now() : Date.now();
            const domTime = now - pageLoadStartTime;
            
            // If DOM loaded very quickly and page is complete, hide overlay
            if (domTime < CONFIG.LOAD_THRESHOLD && document.readyState === 'complete') {
                if (maxDisplayTimer) {
                    clearTimeout(maxDisplayTimer);
                }
                setTimeout(function() {
                    hideLoadingOverlay(loadingOverlay);
                }, CONFIG.MIN_DISPLAY_TIME);
            }
        });
    }

    /**
     * Hide the loading overlay with smooth transition
     * @param {HTMLElement} overlay - The loading overlay element
     */
    function hideLoadingOverlay(overlay) {
        if (!overlay) return;
        
        // Clear max display timer if it exists
        if (maxDisplayTimer) {
            clearTimeout(maxDisplayTimer);
            maxDisplayTimer = null;
        }
        
        overlay.classList.add('hidden');
        
        // Remove from DOM after animation completes
        setTimeout(function() {
            overlay.style.display = 'none';
        }, CONFIG.FADE_OUT_DURATION);
    }

    /**
     * Show the loading overlay
     * @param {HTMLElement} overlay - The loading overlay element (optional)
     */
    function showLoadingOverlay(overlay) {
        const loadingOverlay = overlay || document.getElementById('pageLoadingOverlay');
        
        if (!loadingOverlay) {
            console.warn('Loading overlay element not found');
            return;
        }

        loadingOverlay.style.display = 'flex';
        loadingOverlay.classList.remove('hidden');
    }

    /**
     * Check if page is fully loaded
     * @returns {boolean} - True if page is fully loaded
     */
    function isPageLoaded() {
        return document.readyState === 'complete';
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLoadingOverlay);
    } else {
        // DOM is already ready
        initLoadingOverlay();
    }

    // Export functions to global scope for manual control if needed
    window.LazyLoading = {
        show: showLoadingOverlay,
        hide: hideLoadingOverlay,
        isLoaded: isPageLoaded,
        config: CONFIG
    };

})();


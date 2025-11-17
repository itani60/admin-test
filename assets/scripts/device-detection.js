/**
 * Device Detection for Tablets and iPads
 * Ensures tablets use mobile/tablet layouts instead of desktop
 */

class DeviceDetection {
    constructor() {
        this.deviceInfo = this.detectDevice();
        this.applyDeviceClasses();
    }

    detectDevice() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        const screen = window.screen;
        
        // iPad detection patterns
        const isIPad = this.isIPad(userAgent, platform);
        
        // Samsung Galaxy Tab detection
        const isSamsungTablet = this.isSamsungTablet(userAgent, screen);
        
        // Huawei MatePad detection
        const isHuaweiTablet = this.isHuaweiTablet(userAgent, screen);
        
        // HONOR Pad detection
        const isHonorTablet = this.isHonorTablet(userAgent, screen);
        
        // Xiaomi Redmi Pad detection
        const isXiaomiTablet = this.isXiaomiTablet(userAgent, screen);
        
        // OPPO Pad detection
        const isOppoTablet = this.isOppoTablet(userAgent, screen);
        
        // Lenovo Tab detection
        const isLenovoTablet = this.isLenovoTablet(userAgent, screen);
        
        // Android tablet detection
        const isAndroidTablet = this.isAndroidTablet(userAgent, screen);
        
        // Other tablet detection
        const isOtherTablet = this.isOtherTablet(userAgent, screen);
        
        // Screen size based detection
        const isTabletBySize = this.isTabletByScreenSize(screen);
        
        const isTablet = isIPad || isSamsungTablet || isHuaweiTablet || isHonorTablet || 
                        isXiaomiTablet || isOppoTablet || isLenovoTablet || isAndroidTablet || 
                        isOtherTablet || isTabletBySize;
        
        return {
            isIPad,
            isSamsungTablet,
            isHuaweiTablet,
            isHonorTablet,
            isXiaomiTablet,
            isOppoTablet,
            isLenovoTablet,
            isAndroidTablet,
            isOtherTablet,
            isTabletBySize,
            isTablet,
            isMobile: this.isMobile(userAgent, screen),
            isDesktop: !isTablet && !this.isMobile(userAgent, screen),
            userAgent,
            screenWidth: screen.width,
            screenHeight: screen.height,
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    isIPad(userAgent, platform) {
        // iPad Pro 13" (M4/M5) - 1376 × 1032 @2x
        // iPad Pro 12.9" - 1024 × 1366 @2x  
        // iPad Pro 11" (M4/M5) - 1210 × 834 @2x
        // iPad Air (M2) - 1180 × 820 @2x
        // iPad Air 13" - 820 × 1180 @2x
        // iPad (gen 11, 10) - 810 × 1080 @2x
        // iPad (gen 9, 8, 7) - 810 × 1080 @2x
        // iPad mini - 744 × 1133 @2x
        // iPad Air (gen 3) - 834 × 1112 @2x
        // iPad (gen 6, 5) - 768 × 1024 @2x
        
        const iPadPatterns = [
            /iPad/i,
            /iPadOS/i,
            /Macintosh.*Safari.*Mobile/i
        ];
        
        const isIPadUA = iPadPatterns.some(pattern => pattern.test(userAgent));
        
        // Check for iPad-specific screen dimensions
        const screen = window.screen;
        const width = screen.width;
        const height = screen.height;
        const ratio = window.devicePixelRatio || 1;
        
        // iPad screen size detection
        const iPadSizes = [
            // iPad Pro 13" (M4/M5)
            { w: 1376, h: 1032, ratio: 2 },
            // iPad Pro 12.9"
            { w: 1024, h: 1366, ratio: 2 },
            // iPad Pro 11" (M4/M5)
            { w: 1210, h: 834, ratio: 2 },
            // iPad Pro 11" (gen 4, 3, 2, 1)
            { w: 834, h: 1210, ratio: 2 },
            { w: 834, h: 1194, ratio: 2 },
            // iPad Air (M2)
            { w: 1180, h: 820, ratio: 2 },
            // iPad Air 13"
            { w: 820, h: 1180, ratio: 2 },
            // iPad (gen 11, 10)
            { w: 810, h: 1080, ratio: 2 },
            // iPad (gen 9, 8, 7)
            { w: 810, h: 1080, ratio: 2 },
            // iPad mini
            { w: 744, h: 1133, ratio: 2 },
            // iPad Air (gen 3)
            { w: 834, h: 1112, ratio: 2 },
            // iPad (gen 6, 5)
            { w: 768, h: 1024, ratio: 2 },
            // iPad mini (gen 1) @1x
            { w: 768, h: 1024, ratio: 1 }
        ];
        
        const isIPadSize = iPadSizes.some(size => {
            return (width === size.w && height === size.h && ratio === size.ratio) ||
                   (width === size.h && height === size.w && ratio === size.ratio);
        });
        
        return isIPadUA || isIPadSize;
    }

    // Samsung Galaxy Tab detection
    isSamsungTablet(userAgent, screen) {
        const isSamsung = /Samsung/i.test(userAgent);
        const isTabletUA = /Tablet/i.test(userAgent) || /SM-/i.test(userAgent);
        
        const width = screen.width;
        const height = screen.height;
        const ratio = window.devicePixelRatio || 1;
        
        // Samsung Galaxy Tab screen sizes
        const samsungTabletSizes = [
            // Galaxy Tab S11 Ultra
            { w: 1480, h: 924, ratio: 2 },
            // Galaxy Tab S11+
            { w: 1400, h: 876, ratio: 2 },
            // Galaxy Tab S11
            { w: 1280, h: 800, ratio: 2 },
            // Galaxy Tab S10 Ultra
            { w: 1480, h: 924, ratio: 2 },
            // Galaxy Tab S10+
            { w: 1400, h: 876, ratio: 2 },
            // Galaxy Tab S10
            { w: 1280, h: 800, ratio: 2 },
            // Galaxy Tab S9 Ultra
            { w: 1480, h: 924, ratio: 2 },
            // Galaxy Tab S9+
            { w: 1400, h: 876, ratio: 2 },
            // Galaxy Tab S9
            { w: 1280, h: 800, ratio: 2 },
            // Galaxy Tab S9 FE+
            { w: 1280, h: 800, ratio: 2 },
            // Galaxy Tab S9 FE
            { w: 1152, h: 720, ratio: 2 },
            // Galaxy Tab A9+ (5G/Wi-Fi)
            { w: 960, h: 600, ratio: 2 },
            // Galaxy Tab A9/A11 (Wi-Fi/LTE)
            { w: 400, h: 670, ratio: 2 }
        ];
        
        const isSamsungTabletSize = samsungTabletSizes.some(size => {
            return (width === size.w && height === size.h && ratio === size.ratio) ||
                   (width === size.h && height === size.w && ratio === size.ratio);
        });
        
        return isSamsung && (isTabletUA || isSamsungTabletSize);
    }

    // Huawei MatePad detection
    isHuaweiTablet(userAgent, screen) {
        const isHuawei = /Huawei/i.test(userAgent) || /HUAWEI/i.test(userAgent);
        const isTabletUA = /Tablet/i.test(userAgent) || /Pad/i.test(userAgent);
        
        const width = screen.width;
        const height = screen.height;
        const ratio = window.devicePixelRatio || 1;
        
        // Debug logging for MatePad Pro 13.2
        if (isHuawei) {
            console.log('Huawei device detected:', {
                userAgent: userAgent,
                screen: { width, height },
                ratio: ratio,
                isTabletUA: isTabletUA
            });
        }
        
        // Huawei MatePad screen sizes
        const huaweiTabletSizes = [
            // MatePad Pro 13.2 - Portrait: 960×1440, Landscape: 1440×960
            { w: 960, h: 1440, ratio: 2 },   // Portrait
            { w: 1440, h: 960, ratio: 2 },  // Landscape
            // MatePad Pro 12.2 (2025)
            { w: 1400, h: 920, ratio: 2 },
            { w: 920, h: 1400, ratio: 2 },
            // MatePad Pro 11" (gen 6)
            { w: 1210, h: 834, ratio: 2 },
            { w: 834, h: 1210, ratio: 2 },
            // MatePad Pro 11" (gen 4, 3, 2, 1)
            { w: 834, h: 1210, ratio: 2 },
            { w: 834, h: 1194, ratio: 2 },
            { w: 1210, h: 834, ratio: 2 },
            { w: 1194, h: 834, ratio: 2 },
            // MatePad 11.5 (2025)
            { w: 1280, h: 800, ratio: 2 },
            { w: 800, h: 1280, ratio: 2 },
            // MatePad 11.5 S (2025)
            { w: 920, h: 1400, ratio: 2 },
            { w: 1400, h: 920, ratio: 2 },
            // MatePad Air 13" (gen 6)
            { w: 820, h: 1180, ratio: 2 },
            { w: 1180, h: 820, ratio: 2 },
            
            { w: 820, h: 1180, ratio: 2 },
            { w: 1180, h: 820, ratio: 2 },
            // MatePad Air (gen 3)
            { w: 834, h: 1112, ratio: 2 },
            { w: 1112, h: 834, ratio: 2 },
            // MatePad SE 11
            { w: 960, h: 600, ratio: 2 },
            { w: 600, h: 960, ratio: 2 },
            // MatePad T10s
            { w: 960, h: 600, ratio: 2 },
            { w: 600, h: 960, ratio: 2 },
            // MediaPad T5
            { w: 960, h: 600, ratio: 2 },
            { w: 600, h: 960, ratio: 2 }
        ];
        
        const isHuaweiTabletSize = huaweiTabletSizes.some(size => {
            return (width === size.w && height === size.h && ratio === size.ratio) ||
                   (width === size.h && height === size.w && ratio === size.ratio);
        });
        
        // Also check for tablet screen size ranges for Huawei devices
        // Check both portrait and landscape orientations
        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);
        const isTabletSize = minDimension >= 600 && maxDimension >= 800 && 
                           minDimension <= 1600 && maxDimension <= 2000;
        
        // Force Huawei devices to be detected as tablets if they have tablet-like dimensions
        const isHuaweiTablet = isHuawei && (isTabletUA || isHuaweiTabletSize || isTabletSize);
        
        const result = isHuaweiTablet;
        
        if (result) {
            console.log('Huawei tablet detected:', {
                width, height, ratio,
                isTabletUA, isHuaweiTabletSize, isTabletSize
            });
        }
        
        return result;
    }

    // HONOR Pad detection
    isHonorTablet(userAgent, screen) {
        const isHonor = /HONOR/i.test(userAgent) || /Honor/i.test(userAgent);
        const isTabletUA = /Tablet/i.test(userAgent) || /Pad/i.test(userAgent);
        
        const width = screen.width;
        const height = screen.height;
        const ratio = window.devicePixelRatio || 1;
        
        // HONOR Pad screen sizes
        const honorTabletSizes = [
            // Pad 9
            { w: 1280, h: 800, ratio: 2 },
            // Pad X9
            { w: 1000, h: 600, ratio: 2 },
            // Pad X8a
            { w: 540, h: 1200, ratio: 2 }
        ];
        
        const isHonorTabletSize = honorTabletSizes.some(size => {
            return (width === size.w && height === size.h && ratio === size.ratio) ||
                   (width === size.h && height === size.w && ratio === size.ratio);
        });
        
        return isHonor && (isTabletUA || isHonorTabletSize);
    }

    // Xiaomi Redmi Pad detection
    isXiaomiTablet(userAgent, screen) {
        const isXiaomi = /Xiaomi/i.test(userAgent) || /Redmi/i.test(userAgent) || /MIUI/i.test(userAgent);
        const isTabletUA = /Tablet/i.test(userAgent) || /Pad/i.test(userAgent);
        
        const width = screen.width;
        const height = screen.height;
        const ratio = window.devicePixelRatio || 1;
        
        // Xiaomi Redmi Pad screen sizes
        const xiaomiTabletSizes = [
            // Redmi Pad 2 & Redmi Pad 2 4G
            { w: 1280, h: 800, ratio: 2 },
            // Redmi Pad SE 8.7 (@1x scaling)
            { w: 800, h: 1340, ratio: 1 }
        ];
        
        const isXiaomiTabletSize = xiaomiTabletSizes.some(size => {
            return (width === size.w && height === size.h && ratio === size.ratio) ||
                   (width === size.h && height === size.w && ratio === size.ratio);
        });
        
        return isXiaomi && (isTabletUA || isXiaomiTabletSize);
    }

    // OPPO Pad detection
    isOppoTablet(userAgent, screen) {
        const isOppo = /OPPO/i.test(userAgent) || /Oppo/i.test(userAgent);
        const isTabletUA = /Tablet/i.test(userAgent) || /Pad/i.test(userAgent);
        
        const width = screen.width;
        const height = screen.height;
        const ratio = window.devicePixelRatio || 1;
        
        // OPPO Pad screen sizes
        const oppoTabletSizes = [
            // Pad Neo
            { w: 1204, h: 860, ratio: 2 },
            // Pad SE (@1x scaling)
            { w: 1920, h: 1200, ratio: 1 }
        ];
        
        const isOppoTabletSize = oppoTabletSizes.some(size => {
            return (width === size.w && height === size.h && ratio === size.ratio) ||
                   (width === size.h && height === size.w && ratio === size.ratio);
        });
        
        return isOppo && (isTabletUA || isOppoTabletSize);
    }

    // Lenovo Tab detection
    isLenovoTablet(userAgent, screen) {
        const isLenovo = /Lenovo/i.test(userAgent);
        const isTabletUA = /Tablet/i.test(userAgent) || /Tab/i.test(userAgent);
        
        const width = screen.width;
        const height = screen.height;
        const ratio = window.devicePixelRatio || 1;
        
        // Lenovo Tab screen sizes (@1x scaling for all models)
        const lenovoTabletSizes = [
            // Tab P12
            { w: 2560, h: 1600, ratio: 1 },
            // Tab P11 Pro Gen 2
            { w: 2560, h: 1600, ratio: 1 },
            // Tab M11
            { w: 2000, h: 1200, ratio: 1 },
            // Tab Plus
            { w: 2000, h: 1200, ratio: 1 },
            // IdeaPad Duet 3i
            { w: 1920, h: 1200, ratio: 1 },
            // Tab M9
            { w: 1280, h: 800, ratio: 1 },
            // Tab M8 Gen 4
            { w: 1280, h: 800, ratio: 1 }
        ];
        
        const isLenovoTabletSize = lenovoTabletSizes.some(size => {
            return (width === size.w && height === size.h && ratio === size.ratio) ||
                   (width === size.h && height === size.w && ratio === size.ratio);
        });
        
        return isLenovo && (isTabletUA || isLenovoTabletSize);
    }

    isAndroidTablet(userAgent, screen) {
        const isAndroid = /Android/i.test(userAgent);
        const isTabletUA = /Tablet/i.test(userAgent) || /Pad/i.test(userAgent);
        
        // Android tablet screen size detection
        const width = screen.width;
        const height = screen.height;
        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);
        
        // Android tablets typically have:
        // - Width between 600-1200px
        // - Height between 800-1600px
        // - Aspect ratio between 1.2-1.6
        const isTabletSize = minDimension >= 600 && maxDimension >= 800 && 
                           (maxDimension / minDimension) >= 1.2 && 
                           (maxDimension / minDimension) <= 1.6;
        
        return isAndroid && (isTabletUA || isTabletSize);
    }

    isOtherTablet(userAgent, screen) {
        // Windows tablets
        const isWindowsTablet = /Windows/i.test(userAgent) && /Touch/i.test(userAgent);
        
        // Other tablet indicators
        const isTabletUA = /Tablet/i.test(userAgent) || /Pad/i.test(userAgent);
        
        const width = screen.width;
        const height = screen.height;
        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);
        
        const isTabletSize = minDimension >= 600 && maxDimension >= 800;
        
        return isWindowsTablet || (isTabletUA && isTabletSize);
    }

    isTabletByScreenSize(screen) {
        const width = screen.width;
        const height = screen.height;
        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);
        
        // Tablet screen size criteria
        return minDimension >= 600 && maxDimension >= 800 && 
               minDimension <= 1200 && maxDimension <= 1600;
    }

    isMobile(userAgent, screen) {
        const isMobileUA = /Mobile/i.test(userAgent) || /Android/i.test(userAgent);
        const width = screen.width;
        const height = screen.height;
        const minDimension = Math.min(width, height);
        
        return isMobileUA && minDimension < 600;
    }

    applyDeviceClasses() {
        const body = document.body;
        const html = document.documentElement;
        
        // Remove existing device classes
        body.classList.remove('is-ipad', 'is-samsung-tablet', 'is-huawei-tablet', 'is-honor-tablet', 
                             'is-xiaomi-tablet', 'is-oppo-tablet', 'is-lenovo-tablet', 'is-android-tablet', 
                             'is-tablet', 'is-mobile', 'is-desktop');
        html.classList.remove('device-ipad', 'device-samsung-tablet', 'device-huawei-tablet', 'device-honor-tablet',
                             'device-xiaomi-tablet', 'device-oppo-tablet', 'device-lenovo-tablet', 'device-tablet', 
                             'device-mobile', 'device-desktop');
        
        // Apply device-specific classes
        if (this.deviceInfo.isIPad) {
            body.classList.add('is-ipad');
            html.classList.add('device-ipad');
            console.log('iPad detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isSamsungTablet) {
            body.classList.add('is-samsung-tablet');
            html.classList.add('device-samsung-tablet', 'device-tablet');
            console.log('Samsung tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isHuaweiTablet) {
            body.classList.add('is-huawei-tablet');
            html.classList.add('device-huawei-tablet', 'device-tablet');
            console.log('Huawei tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isHonorTablet) {
            body.classList.add('is-honor-tablet');
            html.classList.add('device-honor-tablet', 'device-tablet');
            console.log('HONOR tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isXiaomiTablet) {
            body.classList.add('is-xiaomi-tablet');
            html.classList.add('device-xiaomi-tablet', 'device-tablet');
            console.log('Xiaomi tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isOppoTablet) {
            body.classList.add('is-oppo-tablet');
            html.classList.add('device-oppo-tablet', 'device-tablet');
            console.log('OPPO tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isLenovoTablet) {
            body.classList.add('is-lenovo-tablet');
            html.classList.add('device-lenovo-tablet', 'device-tablet');
            console.log('Lenovo tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isAndroidTablet) {
            body.classList.add('is-android-tablet');
            html.classList.add('device-tablet');
            console.log('Android tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isTablet) {
            body.classList.add('is-tablet');
            html.classList.add('device-tablet');
            console.log('Tablet detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isMobile) {
            body.classList.add('is-mobile');
            html.classList.add('device-mobile');
            console.log('Mobile detected:', this.deviceInfo);
        }
        
        if (this.deviceInfo.isDesktop) {
            body.classList.add('is-desktop');
            html.classList.add('device-desktop');
            console.log('Desktop detected:', this.deviceInfo);
        }
        
        // Add viewport meta tag for tablets if not present
        this.ensureTabletViewport();
    }

    ensureTabletViewport() {
        if (this.deviceInfo.isTablet) {
            let viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) {
                viewport = document.createElement('meta');
                viewport.name = 'viewport';
                document.head.appendChild(viewport);
            }
            
            // Set viewport for tablets to prevent desktop layout
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
    }

    // Method to get current device info
    getDeviceInfo() {
        return this.deviceInfo;
    }

    // Method to check if current device is tablet
    isTablet() {
        return this.deviceInfo.isTablet;
    }

    // Method to check if current device is iPad
    isIPadDevice() {
        return this.deviceInfo.isIPad;
    }
}

// Initialize device detection when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.deviceDetection = new DeviceDetection();
    
    // Also run on window load for additional accuracy
    window.addEventListener('load', function() {
        // Re-detect in case of dynamic content
        window.deviceDetection = new DeviceDetection();
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceDetection;
}
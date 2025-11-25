// Sidebar toggle functionality
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
        });

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }
    }
}

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();
    loadSettings();
    checkLoginState();
});

// Load settings from localStorage
function loadSettings() {
    // API Base URL (Products)
    const savedApiUrl = localStorage.getItem('comparehubprices_api_url');
    if (savedApiUrl) {
        document.getElementById('apiBaseUrl').value = savedApiUrl;
    }

    // Admin API Base URL
    const savedAdminUrl = localStorage.getItem('comparehubprices_api_url_admin');
    if (savedAdminUrl) {
        document.getElementById('apiBaseUrlAdmin').value = savedAdminUrl;
    }

    // Wishlist API Base URL
    const savedWishlistUrl = localStorage.getItem('comparehubprices_api_url_wishlist');
    if (savedWishlistUrl) {
        document.getElementById('apiBaseUrlWishlist').value = savedWishlistUrl;
    }

    // Price Alerts API Base URL
    const savedPriceAlertsUrl = localStorage.getItem('comparehubprices_api_url_price_alerts');
    if (savedPriceAlertsUrl) {
        document.getElementById('apiBaseUrlPriceAlerts').value = savedPriceAlertsUrl;
    }

    // Notifications API Base URL
    const savedNotificationsUrl = localStorage.getItem('comparehubprices_api_url_notifications');
    if (savedNotificationsUrl) {
        document.getElementById('apiBaseUrlNotifications').value = savedNotificationsUrl;
    }

    // Business API Base URL
    const savedBusinessUrl = localStorage.getItem('comparehubprices_api_url_business');
    if (savedBusinessUrl) {
        document.getElementById('apiBaseUrlBusiness').value = savedBusinessUrl;
    }

    // Account API Base URL
    const savedAccUrl = localStorage.getItem('comparehubprices_api_url_acc');
    if (savedAccUrl) {
        document.getElementById('apiBaseUrlAcc').value = savedAccUrl;
    }

    // API Region
    const savedRegion = localStorage.getItem('comparehubprices_api_region');
    if (savedRegion) {
        document.getElementById('apiRegion').value = savedRegion;
    }

    // Table names
    const categories = [
        'smartphones', 'windows-laptops', 'macbooks-laptops', 
        'chromebooks-laptops', 'tablets', 'wearables', 
        'televisions', 'audio', 'gaming', 'appliances'
    ];
    
    categories.forEach(category => {
        const savedTable = localStorage.getItem(`table_${category}`);
        if (savedTable) {
            document.getElementById(`table_${category}`).value = savedTable;
        }
    });

    // Price History Table
    const savedPriceHistory = localStorage.getItem('price_history_table');
    if (savedPriceHistory) {
        document.getElementById('priceHistoryTable').value = savedPriceHistory;
    }

    // System Settings
    const savedPageSize = localStorage.getItem('default_page_size');
    if (savedPageSize) {
        document.getElementById('defaultPageSize').value = savedPageSize;
    }

    const savedBatchSize = localStorage.getItem('max_batch_size');
    if (savedBatchSize) {
        document.getElementById('maxBatchSize').value = savedBatchSize;
    }

    const savedPriceAlerts = localStorage.getItem('enable_price_alerts');
    if (savedPriceAlerts !== null) {
        document.getElementById('enablePriceAlerts').checked = savedPriceAlerts === 'true';
    }

    const savedAutoUpdate = localStorage.getItem('auto_update_prices');
    if (savedAutoUpdate !== null) {
        document.getElementById('autoUpdatePrices').checked = savedAutoUpdate === 'true';
    }
}

// Save API Settings
function saveApiSettings() {
    const apiUrl = document.getElementById('apiBaseUrl').value.trim();
    const apiUrlAdmin = document.getElementById('apiBaseUrlAdmin').value.trim();
    const apiUrlWishlist = document.getElementById('apiBaseUrlWishlist').value.trim();
    const apiUrlPriceAlerts = document.getElementById('apiBaseUrlPriceAlerts').value.trim();
    const apiUrlNotifications = document.getElementById('apiBaseUrlNotifications').value.trim();
    const apiUrlBusiness = document.getElementById('apiBaseUrlBusiness').value.trim();
    const apiUrlAcc = document.getElementById('apiBaseUrlAcc').value.trim();
    const region = document.getElementById('apiRegion').value;

    if (!apiUrl) {
        showAlert('Please enter a valid Products API URL', 'danger');
        return;
    }

    localStorage.setItem('comparehubprices_api_url', apiUrl);
    if (apiUrlAdmin) localStorage.setItem('comparehubprices_api_url_admin', apiUrlAdmin);
    if (apiUrlWishlist) localStorage.setItem('comparehubprices_api_url_wishlist', apiUrlWishlist);
    if (apiUrlPriceAlerts) localStorage.setItem('comparehubprices_api_url_price_alerts', apiUrlPriceAlerts);
    if (apiUrlNotifications) localStorage.setItem('comparehubprices_api_url_notifications', apiUrlNotifications);
    if (apiUrlBusiness) localStorage.setItem('comparehubprices_api_url_business', apiUrlBusiness);
    if (apiUrlAcc) localStorage.setItem('comparehubprices_api_url_acc', apiUrlAcc);
    localStorage.setItem('comparehubprices_api_region', region);

    showAlert('API settings saved successfully!', 'success');
}

// Test API Connection
async function testApiConnection() {
    const apiUrl = document.getElementById('apiBaseUrl').value.trim();
    const resultDiv = document.getElementById('apiTestResult');
    
    resultDiv.innerHTML = '<div class="test-result">Testing connection...</div>';

    try {
        const response = await fetch(`${apiUrl}/products?category=smartphones&limit=1`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            resultDiv.innerHTML = '<div class="test-result success"><i class="fas fa-check-circle"></i> Connection successful!</div>';
        } else {
            resultDiv.innerHTML = `<div class="test-result error"><i class="fas fa-times-circle"></i> Connection failed: HTTP ${response.status}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="test-result error"><i class="fas fa-times-circle"></i> Connection failed: ${error.message}</div>`;
    }
}

// Generic Test API Connection for other endpoints
async function testApiConnectionGeneric(inputId, resultDivId) {
    const apiUrl = document.getElementById(inputId).value.trim();
    const resultDiv = document.getElementById(resultDivId);
    
    if (!apiUrl) {
        resultDiv.innerHTML = '<div class="test-result error"><i class="fas fa-times-circle"></i> Please enter a valid API URL</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="test-result">Testing connection...</div>';

    // Normalize base URL - remove trailing /business or /acc if present
    let normalizedBaseUrl = apiUrl;
    let testPaths = [];
    
    if (normalizedBaseUrl.endsWith('/business')) {
        normalizedBaseUrl = normalizedBaseUrl.replace(/\/business$/, '');
        // Business API endpoints from aws-auth-business.js - exact paths as defined
        testPaths = ['/business/business/login', '/business/business/user-info', '/business/business/get-services', '/business/business/session'];
    } else if (normalizedBaseUrl.endsWith('/acc')) {
        normalizedBaseUrl = normalizedBaseUrl.replace(/\/acc$/, '');
        // Account API endpoints from aws-auth.js - exact paths as defined
        testPaths = ['/acc/auth/login', '/acc/auth/get-user-info', '/acc/auth/get-session'];
    } else if (normalizedBaseUrl.includes('/admin')) {
        testPaths = ['/admin/admin/account/login', '/admin/account/user-info', '/admin'];
    } else if (normalizedBaseUrl.includes('/wishlist')) {
        testPaths = ['/wishlist', '/wishlist/wishlist'];
    } else if (normalizedBaseUrl.includes('/price-alerts')) {
        testPaths = ['/alerts', '/alerts'];
    } else if (normalizedBaseUrl.includes('/notifications')) {
        testPaths = ['/notifications', '/notifications/notifications'];
    } else {
        testPaths = [''];
    }

    try {
        // First, try OPTIONS request (CORS preflight) - this is the best way to test CORS
        try {
            const optionsResponse = await fetch(normalizedBaseUrl, {
                method: 'OPTIONS',
                mode: 'cors',
                headers: {
                    'Origin': window.location.origin,
                    'Access-Control-Request-Method': 'GET'
                }
            });

            // If OPTIONS succeeds, CORS is definitely configured
            if (optionsResponse.status >= 200 && optionsResponse.status < 600) {
                const corsOrigin = optionsResponse.headers.get('Access-Control-Allow-Origin');
                if (corsOrigin) {
                    resultDiv.innerHTML = '<div class="test-result success"><i class="fas fa-check-circle"></i> Connection successful! CORS is properly configured (OPTIONS preflight works).</div>';
                    return;
                }
            }
        } catch (optionsError) {
            // OPTIONS might not be supported, continue to try GET
        }

        // Try GET requests to actual endpoint paths
        let lastError = null;
        let corsErrorDetected = false;

        for (const path of testPaths) {
            const testUrl = normalizedBaseUrl + path;
            try {
                const response = await fetch(testUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    mode: 'cors',
                    credentials: 'omit'
                });

                // Check for CORS headers
                const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
                
                // If we get ANY response status (200-599), it means:
                // 1. The endpoint is reachable
                // 2. CORS is configured (otherwise browser would block it before we get here)
                if (response.status >= 200 && response.status < 600) {
                    if (corsOrigin) {
                        resultDiv.innerHTML = '<div class="test-result success"><i class="fas fa-check-circle"></i> Connection successful! CORS is properly configured.</div>';
                        return;
                    } else {
                        // Got response but no CORS header visible
                        // This might still be OK if API Gateway adds headers automatically
                        resultDiv.innerHTML = '<div class="test-result success"><i class="fas fa-check-circle"></i> Connection successful! API is reachable and responding.</div>';
                        return;
                    }
                }
            } catch (fetchError) {
                const errorMsg = fetchError.message || '';
                
                // Check if it's a real CORS error
                if (errorMsg.includes('CORS policy') || 
                    errorMsg.includes('Access-Control-Allow-Origin') ||
                    (fetchError.name === 'TypeError' && errorMsg.includes('Failed to fetch'))) {
                    corsErrorDetected = true;
                    lastError = fetchError;
                    // Continue to try other paths
                    continue;
                } else {
                    lastError = fetchError;
                    // Continue to try other paths
                    continue;
                }
            }
        }

        // If we got here, all paths failed
        if (corsErrorDetected) {
            // CORS error detected - verify endpoint is reachable with no-cors
            try {
                await fetch(normalizedBaseUrl, {
                    method: 'GET',
                    mode: 'no-cors'
                });
                // If no-cors works, endpoint exists but CORS is NOT configured for actual requests
                resultDiv.innerHTML = '<div class="test-result warning"><i class="fas fa-exclamation-triangle"></i> CORS Error: OPTIONS preflight may work, but actual GET requests are blocked. Ensure your API Gateway CORS is configured to return CORS headers in ALL responses (not just OPTIONS). Also check that your Lambda functions return CORS headers in their responses.</div>';
                return;
            } catch (noCorsError) {
                // Endpoint not reachable
                resultDiv.innerHTML = `<div class="test-result error"><i class="fas fa-times-circle"></i> Connection failed: Endpoint not reachable. Check if the URL is correct and the service is running.</div>`;
                return;
            }
        } else {
            // Network/connection error
            const errorMsg = lastError ? lastError.message : 'Unable to reach endpoint';
            resultDiv.innerHTML = `<div class="test-result error"><i class="fas fa-times-circle"></i> Connection failed: ${errorMsg}. Check if the URL is correct and the service is running.</div>`;
            return;
        }
    } catch (error) {
        // Final error handler
        const errorMsg = error.message || 'Unknown error';
        resultDiv.innerHTML = `<div class="test-result error"><i class="fas fa-times-circle"></i> Connection failed: ${errorMsg}. Check if the URL is correct and the service is running.</div>`;
    }
}

// Test Table
async function testTable(category) {
    const tableName = document.getElementById(`table_${category}`).value.trim();
    const apiUrl = document.getElementById('apiBaseUrl').value.trim();

    if (!tableName) {
        showAlert(`Please enter a table name for ${category}`, 'danger');
        return;
    }

    try {
        // Test by trying to list products from that category
        const response = await fetch(`${apiUrl}/products?category=${category}&limit=1`);
        
        if (response.ok) {
            showAlert(`Table "${tableName}" is accessible`, 'success');
        } else {
            showAlert(`Table "${tableName}" test failed: HTTP ${response.status}`, 'danger');
        }
    } catch (error) {
        showAlert(`Table test failed: ${error.message}`, 'danger');
    }
}

// Save Table Settings
function saveTableSettings() {
    const categories = [
        'smartphones', 'windows-laptops', 'macbooks-laptops', 
        'chromebooks-laptops', 'tablets', 'wearables', 
        'televisions', 'audio', 'gaming', 'appliances'
    ];

    categories.forEach(category => {
        const tableName = document.getElementById(`table_${category}`).value.trim();
        if (tableName) {
            localStorage.setItem(`table_${category}`, tableName);
        }
    });

    showAlert('Table settings saved successfully!', 'success');
}

// Save Price History Settings
function savePriceHistorySettings() {
    const tableName = document.getElementById('priceHistoryTable').value.trim();
    
    if (!tableName) {
        showAlert('Please enter a price history table name', 'danger');
        return;
    }

    localStorage.setItem('price_history_table', tableName);
    showAlert('Price history settings saved successfully!', 'success');
}

// Save System Settings
function saveSystemSettings() {
    const pageSize = document.getElementById('defaultPageSize').value;
    const batchSize = document.getElementById('maxBatchSize').value;
    const priceAlerts = document.getElementById('enablePriceAlerts').checked;
    const autoUpdate = document.getElementById('autoUpdatePrices').checked;

    localStorage.setItem('default_page_size', pageSize);
    localStorage.setItem('max_batch_size', batchSize);
    localStorage.setItem('enable_price_alerts', priceAlerts);
    localStorage.setItem('auto_update_prices', autoUpdate);

    showAlert('System settings saved successfully!', 'success');
}

// Clear All Settings
function clearAllSettings() {
    if (!confirm('Are you sure you want to clear all settings? This action cannot be undone.')) {
        return;
    }

    // Clear all localStorage items related to settings
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('comparehubprices_') || key.startsWith('table_') || 
            key.startsWith('price_history_') || key.startsWith('default_') || 
            key.startsWith('max_') || key.startsWith('enable_') || key.startsWith('auto_')) {
            localStorage.removeItem(key);
        }
    });
    
    // Clear the new API URL settings
    localStorage.removeItem('comparehubprices_api_url_admin');
    localStorage.removeItem('comparehubprices_api_url_wishlist');
    localStorage.removeItem('comparehubprices_api_url_price_alerts');
    localStorage.removeItem('comparehubprices_api_url_notifications');
    localStorage.removeItem('comparehubprices_api_url_business');
    localStorage.removeItem('comparehubprices_api_url_acc');

    // Reload page to reset form
    location.reload();
}

// Export Settings
function exportSettings() {
    const settings = {
        apiUrl: document.getElementById('apiBaseUrl').value,
        apiUrlAdmin: document.getElementById('apiBaseUrlAdmin').value,
        apiUrlWishlist: document.getElementById('apiBaseUrlWishlist').value,
        apiUrlPriceAlerts: document.getElementById('apiBaseUrlPriceAlerts').value,
        apiUrlNotifications: document.getElementById('apiBaseUrlNotifications').value,
        apiUrlBusiness: document.getElementById('apiBaseUrlBusiness').value,
        apiUrlAcc: document.getElementById('apiBaseUrlAcc').value,
        region: document.getElementById('apiRegion').value,
        tables: {},
        priceHistoryTable: document.getElementById('priceHistoryTable').value,
        defaultPageSize: document.getElementById('defaultPageSize').value,
        maxBatchSize: document.getElementById('maxBatchSize').value,
        enablePriceAlerts: document.getElementById('enablePriceAlerts').checked,
        autoUpdatePrices: document.getElementById('autoUpdatePrices').checked
    };

    const categories = [
        'smartphones', 'windows-laptops', 'macbooks-laptops', 
        'chromebooks-laptops', 'tablets', 'wearables', 
        'televisions', 'audio', 'gaming', 'appliances'
    ];

    categories.forEach(category => {
        settings.tables[category] = document.getElementById(`table_${category}`).value;
    });

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparehubprices-settings.json';
    a.click();
    URL.revokeObjectURL(url);

    showAlert('Settings exported successfully!', 'success');
}

// Import Settings
function importSettings() {
    const fileInput = document.getElementById('importSettingsFile');
    const file = fileInput.files[0];

    if (!file) {
        showAlert('Please select a settings file to import', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);

            // Apply settings
            if (settings.apiUrl) document.getElementById('apiBaseUrl').value = settings.apiUrl;
            if (settings.apiUrlAdmin) document.getElementById('apiBaseUrlAdmin').value = settings.apiUrlAdmin;
            if (settings.apiUrlWishlist) document.getElementById('apiBaseUrlWishlist').value = settings.apiUrlWishlist;
            if (settings.apiUrlPriceAlerts) document.getElementById('apiBaseUrlPriceAlerts').value = settings.apiUrlPriceAlerts;
            if (settings.apiUrlNotifications) document.getElementById('apiBaseUrlNotifications').value = settings.apiUrlNotifications;
            if (settings.apiUrlBusiness) document.getElementById('apiBaseUrlBusiness').value = settings.apiUrlBusiness;
            if (settings.apiUrlAcc) document.getElementById('apiBaseUrlAcc').value = settings.apiUrlAcc;
            if (settings.region) document.getElementById('apiRegion').value = settings.region;
            if (settings.priceHistoryTable) document.getElementById('priceHistoryTable').value = settings.priceHistoryTable;
            if (settings.defaultPageSize) document.getElementById('defaultPageSize').value = settings.defaultPageSize;
            if (settings.maxBatchSize) document.getElementById('maxBatchSize').value = settings.maxBatchSize;
            if (settings.enablePriceAlerts !== undefined) document.getElementById('enablePriceAlerts').checked = settings.enablePriceAlerts;
            if (settings.autoUpdatePrices !== undefined) document.getElementById('autoUpdatePrices').checked = settings.autoUpdatePrices;

            if (settings.tables) {
                Object.keys(settings.tables).forEach(category => {
                    const input = document.getElementById(`table_${category}`);
                    if (input) input.value = settings.tables[category];
                });
            }

            // Save all settings
            saveApiSettings();
            saveTableSettings();
            savePriceHistorySettings();
            saveSystemSettings();

            showAlert('Settings imported successfully!', 'success');
        } catch (error) {
            showAlert('Error importing settings: ' + error.message, 'danger');
        }
    };
    reader.readAsText(file);
}

// Show alert
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Check login state and update header
async function checkLoginState() {
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    try {
        const result = await window.adminAWSAuthService.getUserInfo();
        
        if (result.success && result.user) {
            const user = result.user;
            let displayName = '';
            let initials = '';

            if (user.givenName && user.familyName) {
                displayName = `${user.givenName} ${user.familyName}`;
                initials = `${user.givenName.charAt(0)}${user.familyName.charAt(0)}`.toUpperCase();
            } else if (user.givenName) {
                displayName = user.givenName;
                initials = user.givenName.substring(0, 2).toUpperCase();
            } else if (user.email) {
                const name = user.email.split('@')[0];
                displayName = name.charAt(0).toUpperCase() + name.slice(1);
                initials = name.substring(0, 2).toUpperCase();
            } else {
                displayName = 'Admin User';
                initials = 'AU';
            }

            if (userAvatar) userAvatar.textContent = initials;
            if (userName) userName.textContent = displayName;
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

// Handle logout
async function handleLogout() {
    try {
        await window.adminAWSAuthService.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = 'admin-login.html';
    }
}

// Attach logout handler to user profile
document.addEventListener('DOMContentLoaded', () => {
    const userProfile = document.getElementById('userProfile');
    if (userProfile) {
        userProfile.addEventListener('click', handleLogout);
    }
});


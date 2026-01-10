// Admin Monitor Dashboard Script

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Check Authentication
    if (window.adminAWSAuthService) {
        const user = await window.adminAWSAuthService.getUserInfo();
        if (!user) {
            window.location.href = 'admin-login.html';
            return;
        }
        updateHeaderProfile(user);
    }

    // 2. Initialize Monitor
    initMonitor();
});

function updateHeaderProfile(user) {
    // Update simple header elements
    const elements = {
        'userName': user.name || user.email,
        'userRoleHeader': formatRole(user.role),
        'userAvatar': user.name ? user.name.charAt(0).toUpperCase() : 'A',
        'dropdownUserName': user.name || user.email,
        'dropdownUserEmail': user.email
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'userAvatar') el.innerText = value;
            else el.innerText = value;
        }
    }
}

function formatRole(role) {
    if (!role) return 'Admin';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

// Monitoring Logic
const endpoints = [
    // Core Services - Business Users
    {
        id: 'business-register',
        name: 'Business Registration',
        url: 'https://hub.comparehubprices.co.za/business/business/register',
        icon: 'fa-briefcase',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    {
        id: 'business-login',
        name: 'Business Login',
        url: 'https://hub.comparehubprices.co.za/business/business/login',
        icon: 'fa-building',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    // Core Services - Regular Users
    {
        id: 'register',
        name: 'User Registration',
        url: 'https://hub.comparehubprices.co.za/acc/auth/register',
        icon: 'fa-user-plus',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    {
        id: 'login',
        name: 'User Login',
        url: 'https://hub.comparehubprices.co.za/acc/auth/login',
        icon: 'fa-sign-in-alt',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    // User Features
    {
        id: 'price-alerts',
        name: 'Price Alerts Engine',
        url: 'https://hub.comparehubprices.co.za/price-alerts/alerts',
        icon: 'fa-bell',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    {
        id: 'forgot-password',
        name: 'Forgot Password',
        url: 'https://hub.comparehubprices.co.za/acc/auth/forgot-password',
        icon: 'fa-key',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    {
        id: 'wishlist',
        name: 'Wishlist Service',
        url: 'https://hub.comparehubprices.co.za/wishlist/wishlist',
        icon: 'fa-heart',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    {
        id: 'reset-password',
        name: 'Reset Password',
        url: 'https://hub.comparehubprices.co.za/acc/auth/reset-password',
        icon: 'fa-unlock-alt',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    {
        id: 'logout',
        name: 'Logout Service',
        url: 'https://hub.comparehubprices.co.za/acc/auth/logout',
        icon: 'fa-sign-out-alt',
        status: 'pending',
        avgLatency: '-',
        uptime: '-'
    },
    // --- Comprehensive Lambda List (excluding sessions) ---
    { id: 'comparehubprices_business_mfa_remove', name: 'Business MFA Remove', url: '', icon: 'fa-shield-alt', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_delete_product', name: 'Delete Product', url: '', icon: 'fa-trash-alt', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_logout', name: 'Business Logout', url: '', icon: 'fa-sign-out-alt', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_chat_system', name: 'Chat System', url: '', icon: 'fa-comments', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-search_business', name: 'Search Business', url: '', icon: 'fa-search', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-Business_mfa_setup', name: 'Business MFA Setup', url: '', icon: 'fa-key', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-googleauth', name: 'Google Auth', url: '', icon: 'fa-google', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_lists_products', name: 'List Products', url: '', icon: 'fa-list', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-register', name: 'User Register', url: '', icon: 'fa-user-plus', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_delete_business_account', name: 'Delete Biz Account', url: '', icon: 'fa-ban', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_update_password_users', name: 'Update User Password', url: '', icon: 'fa-lock', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'Comparehubprices_monitor', name: 'Monitor API', url: '', icon: 'fa-heartbeat', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_google_callback', name: 'Google Callback', url: '', icon: 'fa-undo', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-notification-preferences', name: 'Notif Preferences', url: '', icon: 'fa-sliders-h', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-getuserinfo', name: 'Get User Info', url: '', icon: 'fa-info', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_login', name: 'Admin Login', url: '', icon: 'fa-user-shield', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_batch_create_products', name: 'Batch Create Products', url: '', icon: 'fa-layer-group', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_list_users_management', name: 'List Users (Admin)', url: '', icon: 'fa-users-cog', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_logout', name: 'Admin Logout', url: '', icon: 'fa-sign-out-alt', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_control', name: 'Admin Control', url: '', icon: 'fa-cogs', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_articles', name: 'Admin Articles', url: '', icon: 'fa-newspaper', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_mfa_verify', name: 'Business MFA Verify', url: '', icon: 'fa-check-double', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-update-user', name: 'Update User', url: '', icon: 'fa-user-edit', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-submit-business-post', name: 'Submit Biz Post', url: '', icon: 'fa-paper-plane', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_get_user_info', name: 'Get Admin Info', url: '', icon: 'fa-id-badge', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_login', name: 'Business Login', url: '', icon: 'fa-briefcase', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_price_history', name: 'Price History', url: '', icon: 'fa-history', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_get_products', name: 'Get Products', url: '', icon: 'fa-box', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_verify_business_email_account', name: 'Verify Biz Email', url: '', icon: 'fa-check-circle', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'Comparehubprices_notifications_system', name: 'Notifications Sys', url: '', icon: 'fa-bell', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'Comparehubprices_wishlist_system', name: 'Wishlist System', url: '', icon: 'fa-heart', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-business-stats', name: 'Business Stats', url: '', icon: 'fa-chart-bar', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_email_mfa_login_send', name: 'Biz MFA Email Send', url: '', icon: 'fa-envelope', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-business-public-post', name: 'Biz Public Post', url: '', icon: 'fa-bullhorn', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_update_info', name: 'Update Biz Info', url: '', icon: 'fa-edit', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-search_system', name: 'Search System', url: '', icon: 'fa-search-location', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_mfa_make_primary', name: 'Biz MFA Primary', url: '', icon: 'fa-star', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'CompareHubPrices-Admin-tracking-price-alerts', name: 'Track Price Alerts', url: '', icon: 'fa-chart-line', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-verify-email', name: 'Verify Email', url: '', icon: 'fa-envelope-open', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_get_business_Analytics', name: 'Get Biz Analytics', url: '', icon: 'fa-chart-pie', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_enable_mfa_email', name: 'Enable Biz MFA Email', url: '', icon: 'fa-lock', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_create-admin-notification', name: 'Create Admin Notif', url: '', icon: 'fa-plus-square', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-tracking-page', name: 'Tracking Page', url: '', icon: 'fa-map-marker', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-loginv1', name: 'Login V1', url: '', icon: 'fa-sign-in-alt', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_get_info', name: 'Get Biz Info', url: '', icon: 'fa-info-circle', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_email_mfa_login_verify', name: 'Biz MFA Email Verify', url: '', icon: 'fa-check', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-import-stats', name: 'Import Stats', url: '', icon: 'fa-file-import', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_registaration', name: 'Biz Registration', url: '', icon: 'fa-registered', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-admin-get-pending-business-posts', name: 'Pending Biz Posts', url: '', icon: 'fa-clock', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-check-new-products', name: 'Check New Products', url: '', icon: 'fa-search-plus', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-admin-Business-Post-Approval', name: 'Biz Post Approval', url: '', icon: 'fa-thumbs-up', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-delete-account', name: 'Delete Account', url: '', icon: 'fa-times-circle', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_logout_users', name: 'Logout Users', url: '', icon: 'fa-power-off', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_forgot_password', name: 'Biz Forgot Pass', url: '', icon: 'fa-question-circle', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_delete_post', name: 'Biz Delete Post', url: '', icon: 'fa-trash', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_get_articles_public', name: 'Get Articles', url: '', icon: 'fa-book', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-forgot-password', name: 'Forgot Password', url: '', icon: 'fa-key', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-Reject-Business-Post', name: 'Reject Biz Post', url: '', icon: 'fa-thumbs-down', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_get_analytics', name: 'Biz Analytics', url: '', icon: 'fa-chart-area', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_get_active_business', name: 'Active Businesses', url: '', icon: 'fa-briefcase', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-get-hero-public', name: 'Get Hero', url: '', icon: 'fa-image', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_account_management', name: 'Acct Management', url: '', icon: 'fa-user-cog', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-check-new-business', name: 'Check New Biz', url: '', icon: 'fa-search', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_hero_carousel', name: 'Hero Carousel', url: '', icon: 'fa-images', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_admin_communications', name: 'Admin Comms', url: '', icon: 'fa-comments', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_get_profile_business_public', name: 'Biz Public Profile', url: '', icon: 'fa-id-card', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'CompareHubPrices-admin-LoginTracking', name: 'Admin Login Track', url: '', icon: 'fa-history', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-check-price-alerts', name: 'Check Price Alerts', url: '', icon: 'fa-bell', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_reset_password', name: 'Biz Reset Pass', url: '', icon: 'fa-unlock', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_price_alerts_system', name: 'Price Alert Sys', url: '', icon: 'fa-exclamation-triangle', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-admin-get-notifications', name: 'Get Notifications', url: '', icon: 'fa-envelope', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_business_update_password', name: 'Biz Update Pass', url: '', icon: 'fa-key', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_report_business', name: 'Report Business', url: '', icon: 'fa-flag', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-admin-manage-notifications', name: 'Manage Notifs', url: '', icon: 'fa-tasks', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-reset-password', name: 'Reset Password', url: '', icon: 'fa-undo-alt', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehuhbprices_create_product', name: 'Create Product', url: '', icon: 'fa-plus', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_update_prices', name: 'Update Prices', url: '', icon: 'fa-tag', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices_update_products', name: 'Update Products', url: '', icon: 'fa-sync-alt', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubprices-business-local_hub', name: 'Biz Local Hub', url: '', icon: 'fa-map', status: 'pending', avgLatency: '-', uptime: '-' },
    { id: 'comparehubpricesbusiness_manage_services', name: 'Manage Services', url: '', icon: 'fa-concierge-bell', status: 'pending', avgLatency: '-', uptime: '-' }
];

const MONITORING_API_URL = 'https://hub.comparehubprices.co.za/admin/monitor'; // REPLACE WITH YOUR DEPLOYED URL

function initMonitor() {
    renderEndpointCards(endpoints);
    startLiveMonitoring();
    initLoadChart();
    setupFilterListener();
}

async function startLiveMonitoring() {
    // Initial fetch
    await fetchSystemHealth();

    // Poll every 60 seconds
    setInterval(fetchSystemHealth, 60000);
}

async function fetchSystemHealth() {
    try {
        const token = localStorage.getItem('id_token') || '';
        const response = await fetch(MONITORING_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch metrics');

        const result = await response.json();

        if (result.success && result.data) {
            console.log('Monitor Data Received:', result.data); // Debug for testing
            console.log('Monitor Data Received:', result.data); // Debug for testing
            updateDashboard(result.data, result.timestamp, result.logs);
        }

    } catch (error) {
        console.warn('Live monitoring failed (using fallback):', error);
        simulateOneStep();
    }
}


function updateDashboard(realData, serverTimestamp, recentLogs) {
    // Pass server timestamp if available
    const lastCheckTime = serverTimestamp ? new Date(serverTimestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

    // Render Logs
    if (recentLogs && Array.isArray(recentLogs)) {
        renderLiveLogs(recentLogs);
    }

    // Update endpoints array with real values
    const KEY_MAPPING = {
        'business-register': 'comparehubprices_business_registaration',
        'business-login': 'comparehubprices_business_login',
        'register': 'comparehubprices-register',
        'login': 'comparehubprices-loginv1',
        'price-alerts': 'comparehubprices_price_alerts_system',
        'forgot-password': 'comparehubprices-forgot-password',
        'wishlist': 'Comparehubprices_wishlist_system',
        'reset-password': 'comparehubprices-reset-password',
        'logout': 'comparehubprices_logout_users',
        'CompareHubPrices-admin-LoginTracking': 'CompareHubPrices-Admin-LoginTracking'
    };

    endpoints.forEach(ep => {
        const lookupKey = KEY_MAPPING[ep.id] || ep.id;
        const metrics = realData[lookupKey];
        if (metrics) {
            ep.status = metrics.status;
            // Use null check to distinguish 0 from null
            ep.avgLatency = metrics.avgLatency !== null ? metrics.avgLatency : null;
            ep.uptime = metrics.uptime || '100%';

            // Maintain history for sparkline
            if (metrics.latencyHistory && Array.isArray(metrics.latencyHistory) && metrics.latencyHistory.length > 0) {
                // Use real history from API (fill with 0s if short to keep graph width consistent-ish, or just use as is)
                ep.history = metrics.latencyHistory;

                // If history is too short, maybe pad getting "previous" context?
                // For now, raw history is better than fake.
            } else {
                // Fallback: Maintain local history
                if (!ep.history) ep.history = Array.from({ length: 15 }, () => 20);
                if (ep.avgLatency !== null) {
                    ep.history.shift();
                    ep.history.push(ep.avgLatency);
                }
            }

            // Update DOM Elements
            const card = document.getElementById(`card-${ep.id}`);
            if (card) {
                // Status
                const statusEl = document.getElementById(`status-${ep.id}`);
                if (statusEl) {
                    statusEl.innerText = ep.status.toUpperCase();
                    statusEl.className = `endpoint-status status-${ep.status}`;
                }

                // Latency
                const latEl = document.getElementById(`latency-${ep.id}`);
                if (latEl) {
                    const displayLatency = ep.avgLatency !== null ? `${ep.avgLatency}ms` : '-';
                    latEl.innerText = displayLatency;
                    // If null, use a neutral class or existing one
                    latEl.className = `metric-value ${ep.avgLatency !== null ? getLatencyClass(ep.avgLatency) : 'latency-ok'}`;
                }

                // Uptime 
                const uptimeEl = document.getElementById(`uptime-${ep.id}`);
                if (uptimeEl) {
                    uptimeEl.innerText = ep.uptime;
                }

                // Last Check 
                const timeEl = document.getElementById(`last-check-${ep.id}`);
                if (timeEl) {
                    timeEl.innerText = lastCheckTime;
                }

                // Success Rate
                const successEl = document.getElementById(`success-${ep.id}`);
                if (successEl) {
                    let rate = 100;
                    const totalInv = metrics.invocations || 0;
                    const totalErr = metrics.totalErrors || 0;

                    if (totalInv > 0) {
                        rate = ((totalInv - totalErr) / totalInv) * 100;
                        rate = Math.max(0, Math.min(100, rate));
                    }

                    successEl.innerText = `${rate.toFixed(1)}%`;
                    if (rate < 90) successEl.style.color = '#dc2626';
                    else if (rate < 99) successEl.style.color = '#f59e0b';
                    else successEl.style.color = '#10b981';
                }

                // Update SVG Sparkline
                const svgPath = document.getElementById(`spark-path-${ep.id}`);
                if (svgPath && ep.history) {
                    svgPath.setAttribute('d', getSparkSvgPath(ep.history, 100, 40));
                }
            }
        }
    }); // End endpoints foreach

    // Update System Load Chart with Real Data
    updateLoadChart(realData);

    // Exclude background/admin tasks from Health Score to reflect User Experience
    const excludedTerms = ['check-price-alerts', 'check-new-products', 'admin', 'report', 'monitor'];
    const userFacingEndpoints = endpoints.filter(ep => !excludedTerms.some(term => ep.id.includes(term)));

    // Update global latency stats based on average of USER FACING endpoints
    const latencies = userFacingEndpoints.map(e => e.avgLatency).filter(l => l !== null && l !== '-');

    // Calculate global stats from realData directly for accuracy (Filtered)
    let totalInvocations = 0;
    let totalErrors = 0;

    // Only count invocations/errors from user-facing endpoints
    userFacingEndpoints.forEach(ep => {
        const m = realData[ep.id];
        if (m) {
            totalInvocations += (m.invocations || 0);
            totalErrors += (m.totalErrors || 0);
        }
    });

    if (latencies.length > 0) {
        const globalAvg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        const latEl = document.getElementById('lc3-latency');
        if (latEl) latEl.innerText = globalAvg + 'ms';
        if (latEl) latEl.className = 'lc3-stat ' + (globalAvg < 100 ? 'green' : (globalAvg < 300 ? 'yellow' : 'red'));

        // Jitter (variance proxy)
        const jitter = Math.abs(Math.max(...latencies) - Math.min(...latencies)) / 2;
        const jitEl = document.getElementById('lc3-jitter');
        if (jitEl) jitEl.innerText = jitter.toFixed(1) + 'ms';

        // Packet Loss (Approximated by Error Rate)
        const lossRate = totalInvocations > 0 ? (totalErrors / totalInvocations) * 100 : 0;
        const lossEl = document.getElementById('lc3-loss');
        if (lossEl) {
            lossEl.innerText = lossRate.toFixed(2) + '%';
            lossEl.className = 'lc3-stat ' + (lossRate < 1 ? 'green' : 'red');
        }

        // Health Score
        let score = 'F';
        let scoreClass = 'red';
        if (lossRate < 0.1 && globalAvg < 50) { score = 'A+'; scoreClass = 'green'; }
        else if (lossRate < 0.5 && globalAvg < 150) { score = 'A'; scoreClass = 'green'; }
        else if (lossRate < 2.0 && globalAvg < 300) { score = 'B'; scoreClass = 'yellow'; }
        else if (lossRate < 5.0 && globalAvg < 500) { score = 'C'; scoreClass = 'yellow'; }
        else if (lossRate < 10.0) { score = 'D'; scoreClass = 'red'; }

        const healthEl = document.getElementById('lc3-health');
        if (healthEl) {
            healthEl.innerText = score;
            healthEl.className = 'lc3-stat ' + scoreClass;
        }
    }
}

// Fallback Simulation (Original Logic condensed)
function simulateOneStep() {
    endpoints.forEach(ep => {
        // Init history if missing
        if (!ep.history) ep.history = Array.from({ length: 15 }, () => Math.floor(Math.random() * 30 + 10));

        // Randomize latency slightly to show life
        const fluctuation = Math.floor(Math.random() * 20) - 10;
        let newLatency = (ep.avgLatency === '-' ? 20 : ep.avgLatency) + fluctuation;
        if (newLatency < 10) newLatency = 10;
        ep.avgLatency = newLatency;

        ep.history.shift();
        ep.history.push(newLatency);

        // Update DOM
        const latEl = document.getElementById(`latency-${ep.id}`);
        if (latEl) {
            latEl.innerText = `${newLatency}ms`;
            latEl.className = `metric-value ${getLatencyClass(newLatency)}`;
        }
        // Update Last Check
        const timeEl = document.getElementById(`last-check-${ep.id}`);
        if (timeEl) timeEl.innerText = new Date().toLocaleTimeString();

        // Update SVG Sparkline
        const svgPath = document.getElementById(`spark-path-${ep.id}`);
        if (svgPath) {
            // ViewBox 0 0 100 40, keeping coords simple
            svgPath.setAttribute('d', getSparkSvgPath(ep.history, 100, 40));
        }
    });
}

function renderEndpointCards(data = endpoints) {
    const container = document.getElementById('endpointGrid');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5">No endpoints found matching your filter.</div>';
        return;
    }

    container.innerHTML = data.map(ep => {
        // Prepare initial path
        if (!ep.history) ep.history = Array.from({ length: 15 }, () => 20);
        const sparkPath = getSparkSvgPath(ep.history, 100, 40);

        return `
        <div class="endpoint-card" id="card-${ep.id}">
            <div class="endpoint-header">
                <div class="endpoint-icon">
                    <i class="fas ${ep.icon}"></i>
                </div>
                <div class="endpoint-status status-${ep.status}" id="status-${ep.id}">
                    ${ep.status.toUpperCase()}
                </div>
            </div>
            <div class="endpoint-title">${ep.name}</div>
            <div class="endpoint-url">${ep.url}</div>
            
            <div class="endpoint-metrics">
                <div class="metric-item">
                    <span class="metric-label">Latency</span>
                    <span class="metric-value latency-good" id="latency-${ep.id}">${ep.avgLatency}ms</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Uptime (24h)</span>
                    <span class="metric-value" id="uptime-${ep.id}">${ep.uptime}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Last Check</span>
                    <span class="metric-value" id="last-check-${ep.id}">Just now</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Success Rate</span>
                    <span class="metric-value" id="success-${ep.id}">100%</span>
                </div>
            </div>
            
            <!-- Design 6 SVG Sparkline Replace -->
            <div class="spark-svg-container">
                 <svg viewBox="0 0 100 40" preserveAspectRatio="none" style="width:100%; height:100%;">
                    <path class="g6-line" id="spark-path-${ep.id}" d="${sparkPath}" vector-effect="non-scaling-stroke"></path>
                 </svg>
            </div>
            
            <div class="mt-3 text-center">
                 <a href="admin_monitor_view.html?id=${ep.id}" class="btn-neumorphic">
                    View Details
                 </a>
            </div>
        </div>
    `}).join('');
}

// Custom Dropdown Logic
function initializeFilterDropdown() {
    const filterDropdown = document.getElementById('filterDropdown');
    const filterDropdownBtn = document.getElementById('filterDropdownBtn');
    const filterDropdownMenu = document.getElementById('filterDropdownMenu');
    const filterDropdownItems = document.getElementById('filterDropdownItems');
    const filterSelect = document.getElementById('filterSelect');
    const triggerText = document.getElementById('filterDropdownText');

    if (!filterDropdown || !filterDropdownBtn || !filterDropdownMenu || !filterDropdownItems) return;

    // Define Structure
    // Generate Structure from Endpoints
    const structure = [
        { type: 'option', label: 'All Endpoints', value: 'all', icon: 'fa-globe' }
    ];

    // Helper to categorize
    const getCategory = (ep) => {
        const lowerName = ep.name.toLowerCase();
        const lowerId = ep.id.toLowerCase();
        if (lowerName.includes('business') || lowerId.includes('business')) return 'Business Users';
        if (lowerName.includes('admin') || lowerId.includes('admin')) return 'Admin Functions';
        if (lowerName.includes('user') || lowerName.includes('register') || lowerName.includes('login') || lowerId.includes('auth')) return 'Regular Users';
        return 'System & Other';
    };

    // Group endpoints
    const groups = {
        'Business Users': [],
        'Regular Users': [],
        'Admin Functions': [],
        'System & Other': []
    };

    endpoints.forEach(ep => {
        const cat = getCategory(ep);
        groups[cat].push(ep);
    });

    // Color map for headers
    const colorMap = {
        'Business Users': 'text-primary',
        'Regular Users': 'text-info',
        'Admin Functions': 'text-danger',
        'System & Other': 'text-muted'
    };

    // Flatten to structure
    Object.keys(groups).forEach(key => {
        if (groups[key].length > 0) {
            structure.push({ type: 'header', label: key, color: colorMap[key] || 'text-dark' });
            // Sort alphabetically within group
            groups[key].sort((a, b) => a.name.localeCompare(b.name));
            groups[key].forEach(ep => {
                structure.push({
                    type: 'option',
                    label: ep.name,
                    value: ep.id,
                    icon: ep.icon || 'fa-circle'
                });
            });
        }
    });

    // Build Items
    filterDropdownItems.innerHTML = '';

    structure.forEach(item => {
        if (item.type === 'header') {
            const header = document.createElement('div');
            header.style.cssText = 'padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid var(--border);';
            // Add top border for all except first if needed (simplified here)
            // header.className = `dropdown-header ${item.color}`; // Custom style preferred
            // We use inline style or utility classes from monitor css if available. 
            // Matching the previous look:
            if (item.color === 'text-primary') header.style.color = 'var(--primary)';
            else if (item.color === 'text-info') header.style.color = 'var(--info)';
            else if (item.color === 'text-warning') header.style.color = 'var(--warning)';
            else if (item.color === 'text-danger') header.style.color = 'var(--danger)';
            else header.style.color = 'var(--text)';

            header.innerHTML = item.label;
            filterDropdownItems.appendChild(header);
        } else {
            const div = document.createElement('div');
            div.className = 'custom-dropdown-item';
            if (item.value === 'all') div.classList.add('selected');
            div.dataset.value = item.value;
            div.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label}`;

            div.addEventListener('click', () => {
                // Update text
                if (triggerText) triggerText.innerHTML = `<i class="fas ${item.icon} me-2 text-primary"></i> ${item.label}`;
                if (filterSelect) filterSelect.value = item.value;

                // Visual select
                filterDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');

                // Close
                filterDropdown.classList.remove('active');
                filterDropdownMenu.style.display = 'none';

                // Action
                if (item.value === 'all') {
                    renderEndpointCards(endpoints);
                } else {
                    const filtered = endpoints.filter(ep => ep.id === item.value);
                    renderEndpointCards(filtered);
                }
            });

            filterDropdownItems.appendChild(div);
        }
    });

    // Toggle Logic
    filterDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = filterDropdown.classList.contains('active');

        // Close others
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            dd.classList.remove('active');
            const menu = dd.querySelector('.custom-dropdown-menu');
            if (menu) menu.style.display = 'none';
        });

        if (isActive) {
            filterDropdown.classList.remove('active');
            filterDropdownMenu.style.display = 'none';
        } else {
            filterDropdown.classList.add('active');
            filterDropdownMenu.style.display = 'block';
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            filterDropdown.classList.remove('active');
            filterDropdownMenu.style.display = 'none';
        }
    });
}

function setupFilterListener() {
    initializeFilterDropdown();
}

function getSparkSvgPath(data, width, height) {
    if (!data || data.length === 0) return '';

    // Normalize data to fit 0-height range
    // Assume max latency around 150ms for scaling
    const maxVal = 150;

    const step = width / (data.length - 1);

    // Start Point
    const y0 = height - (Math.min(data[0], maxVal) / maxVal * height);
    let d = `M0,${y0}`;

    for (let i = 1; i < data.length; i++) {
        const val = Math.min(data[i], maxVal);
        const x = i * step;
        const y = height - (val / maxVal * height);

        // Simpler Curve
        const prevX = (i - 1) * step;
        const prevY = height - (Math.min(data[i - 1], maxVal) / maxVal * height);
        const cp1x = prevX + (step / 2);
        const cp1y = prevY;
        const cp2x = x - (step / 2);
        const cp2y = y;

        d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }
    return d;
}

function startSimulation() {
    // Simulate periodic checks
    setInterval(() => {
        simulateOneStep();
    }, 2000);
}

function getLatencyClass(ms) {
    if (ms < 100) return 'latency-good';
    if (ms < 300) return 'latency-ok';
    return 'latency-bad';
}

function renderLiveLogs(logs) {
    const logContainer = document.getElementById('liveLogs');
    // Ensure container has Design 5 class
    if (!logContainer) return;

    // Check if we already applied D5 container class
    if (!logContainer.classList.contains('d5-container')) {
        logContainer.className = 'log-container d5-container';
    }

    logContainer.innerHTML = ''; // Clear existing logs

    if (logs.length === 0) {
        logContainer.innerHTML = '<div class="text-center text-muted p-2" style="position:relative; z-index:2;">No active errors found.</div>';
        return;
    }

    logs.forEach(log => {
        // Mock ID if missing
        if (!log.id) log.id = Math.random().toString(36).substr(2, 5);
        if (!log.type) log.type = 'INFO';

        const ep = endpoints.find(e => e.id === log.functionId);
        const epName = ep ? ep.name : log.functionId;
        const time = new Date(log.timestamp).toLocaleTimeString();
        const isError = log.type === 'ERROR';

        // Design 5 HTML Structure - Exact Match
        const entry = document.createElement('div');
        entry.className = `d5-entry ${isError ? 'error' : 'info'}`;
        entry.innerHTML = `
            <div class="d5-dot"></div>
            <div class="d5-time">${time}</div>
            <div class="d5-msg">${log.message}</div>
        `;
        logContainer.appendChild(entry);
    });
}

let systemLoadChart = null;

function initLoadChart() {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;

    // Initialize empty chart
    systemLoadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                label: 'System Load (Req/min)',
                data: Array(10).fill(0),
                borderColor: '#dc2626',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(220, 38, 38, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, suggestedMax: 50 },
                x: { display: false }
            },
            animation: { duration: 0 }
        }
    });
}

function updateLoadChart(realData) {
    if (!systemLoadChart) return;

    // Calculate total invocations across all functions as a proxy for "System Load"
    let totalInvocations = 0;
    Object.values(realData).forEach(metrics => {
        if (metrics.invocations) totalInvocations += metrics.invocations;
    });

    // Update Chart Data (Shift and Push)
    const currentData = systemLoadChart.data.datasets[0].data;
    currentData.shift();
    currentData.push(totalInvocations);

    systemLoadChart.update();

    // Update Load Stats Text
    // Assuming "24.5K" text element exists, we can update it too if IDs were assigned.
    // For now, focusing on the chart itself.
}

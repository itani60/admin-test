// Configuration
const API_BASE_URL = localStorage.getItem('comparehubprices_api_url') || 'https://hub.comparehubprices.co.za/admin';
const ADMIN_NOTIFICATIONS_API = `${API_BASE_URL}/admin/notifications`;

// State
let allNotifications = [];
let filteredNotifications = [];

// Chart instances
let notificationsOverTimeChart = null;
let notificationTypesChart = null;
let activityByCategoryChart = null;
let readStatusChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupSidebar();
    loadNotifications();
    checkLoginState();
    initializeCharts();
});

// Setup sidebar toggle
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }

    // Initialize custom dropdowns
    initializeTypeDropdown();
    initializeStatusDropdown();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyFilters();
        });
    });
}

// Load notifications from API
async function loadNotifications() {
    try {
        showLoading();

        const response = await fetch(`${ADMIN_NOTIFICATIONS_API}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.notifications) {
                allNotifications = data.notifications || [];
                updateStats();
                applyFilters();
                updateCharts();
            } else {
                throw new Error(data.message || 'Invalid response format');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 401) {
                showAlert('Please log in to view notifications', 'warning');
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
                return;
            }

            throw new Error(errorData.message || `Failed to load notifications: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        showAlert(`Failed to load notifications: ${error.message}`, 'danger');
        allNotifications = [];
        updateStats();
        applyFilters();
    }
}

// Apply filters
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const typeSelect = document.getElementById('typeSelect');
    const statusSelect = document.getElementById('statusSelect');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const typeFilterValue = typeSelect ? typeSelect.value : 'all';
    const statusFilterValue = statusSelect ? statusSelect.value : 'all';
    const timeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

    filteredNotifications = allNotifications.filter(notification => {
        // Search filter
        const matchesSearch = !searchTerm ||
            (notification.userEmail && notification.userEmail.toLowerCase().includes(searchTerm)) ||
            (notification.userName && notification.userName.toLowerCase().includes(searchTerm)) ||
            notification.title.toLowerCase().includes(searchTerm) ||
            notification.message.toLowerCase().includes(searchTerm) ||
            notification.type.toLowerCase().includes(searchTerm);

        // Type filter
        const matchesType = typeFilterValue === 'all' ||
            notification.type === typeFilterValue ||
            (typeFilterValue === 'price_alert' && (notification.type === 'price_alert' || notification.type === 'price_alert_created'));

        // Status filter
        const matchesStatus = statusFilterValue === 'all' ||
            (statusFilterValue === 'unread' && !notification.isRead) ||
            (statusFilterValue === 'read' && notification.isRead);

        // Time filter
        let matchesTime = true;
        const notificationDate = new Date(notification.timestamp || notification.createdAt);
        const now = new Date();

        if (timeFilter === 'today') {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            matchesTime = notificationDate >= todayStart;
        } else if (timeFilter === 'week') {
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            matchesTime = notificationDate >= weekAgo;
        } else if (timeFilter === 'month') {
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            matchesTime = notificationDate >= monthAgo;
        }

        return matchesSearch && matchesType && matchesStatus && matchesTime;
    });

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.createdAt);
        const dateB = new Date(b.timestamp || b.createdAt);
        return dateB - dateA;
    });

    renderNotifications();
}

// Render notifications
function renderNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    if (filteredNotifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h4>No notifications found</h4>
                <p>No notifications match your current filters.</p>
            </div>
        `;
        return;
    }

    let html = '';

    filteredNotifications.forEach(notification => {
        const iconClass = getIconClass(notification.type);
        const badgeClass = getBadgeClass(notification.type);
        const badgeText = getBadgeText(notification.type);
        const formattedTime = formatTimeAgo(notification.timestamp || notification.createdAt);
        const unreadClass = !notification.isRead ? 'unread' : '';
        const notifId = notification.id || notification.notificationId;

        html += `
            <div class="notification-item ${unreadClass}" data-notification-id="${notifId}">
                <div class="notification-header">
                    <div class="notification-icon ${iconClass}">
                        <i class="${getIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">
                            ${escapeHtml(notification.title)}
                            <span class="badge ${badgeClass}">${badgeText}</span>
                        </div>
                        <div class="notification-message">
                            ${escapeHtml(notification.message)}
                        </div>
                        <div class="notification-meta">
                            <div class="notification-meta-item">
                                <i class="fas fa-user"></i>
                                <span>${escapeHtml(notification.userEmail || 'N/A')}</span>
                            </div>
                            <div class="notification-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${notification.metadata && notification.metadata.formattedTime ? escapeHtml(notification.metadata.formattedTime) : formattedTime}</span>
                            </div>
                            ${notification.metadata && notification.metadata.formattedDate ? `
                                <div class="notification-meta-item">
                                    <i class="fas fa-calendar"></i>
                                    <span>${escapeHtml(notification.metadata.formattedDate)}</span>
                                </div>
                            ` : ''}
                            ${notification.metadata && notification.metadata.os ? `
                                <div class="notification-meta-item">
                                    <i class="fas fa-mobile-alt"></i>
                                    <span>${escapeHtml(notification.metadata.os)}</span>
                                </div>
                            ` : ''}
                            ${notification.metadata && notification.metadata.ipAddress ? `
                                <div class="notification-meta-item">
                                    <i class="fas fa-network-wired"></i>
                                    <span>${escapeHtml(notification.metadata.ipAddress)}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${notification.metadata && notification.metadata.productName ? `
                            <div class="notification-meta" style="margin-top: 0.5rem;">
                                <div class="notification-meta-item">
                                    <i class="fas fa-box"></i>
                                    <span><strong>Product:</strong> ${escapeHtml(notification.metadata.productName)}</span>
                                </div>
                                ${notification.metadata.targetPrice ? `
                                    <div class="notification-meta-item">
                                        <i class="fas fa-tag"></i>
                                        <span><strong>Target Price:</strong> ${formatCurrency(notification.metadata.targetPrice)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        <div class="notification-actions">
                            ${!notification.isRead ? `
                                <button class="btn btn-success btn-sm" onclick="markAsRead('${notifId}')">
                                    Mark as Read
                                </button>
                            ` : ''}
                            <button class="btn btn-danger btn-sm" onclick="deleteNotification('${notifId}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Get icon class for notification type
function getIconClass(type) {
    const classes = {
        'user_registration': 'user-registration',
        'business_registration': 'business-registration',
        'password_reset': 'password-reset',
        'email_update': 'email-update',
        'price_alert': 'price-alert'
    };
    return classes[type] || 'user-registration';
}

// Get icon for notification type
function getIcon(type) {
    const icons = {
        'user_registration': 'fas fa-user-plus',
        'business_registration': 'fas fa-building',
        'password_reset': 'fas fa-key',
        'email_update': 'fas fa-envelope',
        'price_alert': 'fas fa-bell'
    };
    return icons[type] || 'fas fa-bell';
}

// Get badge class for notification type
function getBadgeClass(type) {
    const classes = {
        'user_registration': 'badge-success',
        'business_registration': 'badge-info',
        'password_reset': 'badge-warning',
        'email_update': 'badge-primary',
        'price_alert': 'badge-danger'
    };
    return classes[type] || 'badge-secondary';
}

// Get badge text for notification type
function getBadgeText(type) {
    const texts = {
        'user_registration': 'User Registration',
        'business_registration': 'Business Registration',
        'password_reset': 'Password Reset',
        'email_update': 'Email Update',
        'price_alert': 'Price Alert'
    };
    return texts[type] || 'Notification';
}

// Update statistics
function updateStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalCount = allNotifications.length;
    const unreadCount = allNotifications.filter(n => !n.isRead).length;
    const todayCount = allNotifications.filter(n => new Date(n.timestamp || n.createdAt) >= todayStart).length;
    const priceAlertsCount = allNotifications.filter(n => n.type === 'price_alert_created' || n.type === 'price_alert').length;

    const totalEl = document.getElementById('totalNotificationsCount');
    const unreadEl = document.getElementById('unreadNotificationsCount');
    const todayEl = document.getElementById('todayNotificationsCount');
    const priceAlertsEl = document.getElementById('priceAlertsCount');
    const navBadge = document.getElementById('navBadge');
    const headerBadge = document.getElementById('headerBadge');

    if (totalEl) totalEl.textContent = totalCount;
    if (unreadEl) unreadEl.textContent = unreadCount;
    if (todayEl) todayEl.textContent = todayCount;
    if (priceAlertsEl) priceAlertsEl.textContent = priceAlertsCount;

    // Update badges
    if (navBadge) {
        navBadge.textContent = unreadCount;
        navBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    if (headerBadge) {
        headerBadge.textContent = unreadCount;
        headerBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        const response = await fetch(`${ADMIN_NOTIFICATIONS_API}/${notificationId}/read`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const notification = allNotifications.find(n => (n.id === notificationId || n.notificationId === notificationId));
                if (notification) notification.isRead = true;
                updateStats();
                applyFilters();
                updateCharts();
                showAlert('Notification marked as read', 'success');
            } else {
                throw new Error(data.message || 'Failed to mark notification as read');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to mark as read: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        showAlert(`Failed to mark notification as read: ${error.message}`, 'danger');
    }
}

// Mark all as read
async function markAllAsRead() {
    const confirmed = await showConfirmationModal(
        'Mark All as Read',
        'Are you sure you want to mark all notifications as read?',
        'success'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${ADMIN_NOTIFICATIONS_API}/read-all`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                allNotifications.forEach(n => n.isRead = true);
                updateStats();
                applyFilters();
                updateCharts();
                showAlert(`All notifications marked as read (${data.updated || allNotifications.length} updated)`, 'success');
            } else {
                throw new Error(data.message || 'Failed to mark all as read');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to mark all as read: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
        showAlert(`Failed to mark all as read: ${error.message}`, 'danger');
    }
}

// Delete notification
async function deleteNotification(notificationId) {
    const confirmed = await showConfirmationModal(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        'danger'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${ADMIN_NOTIFICATIONS_API}/${notificationId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                allNotifications = allNotifications.filter(n => (n.id !== notificationId && n.notificationId !== notificationId));
                updateStats();
                applyFilters();
                updateCharts();
                showAlert('Notification deleted successfully', 'success');
            } else {
                throw new Error(data.message || 'Failed to delete notification');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to delete notification: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showAlert(`Failed to delete notification: ${error.message}`, 'danger');
    }
}

// Clear all notifications
async function clearAllNotifications() {
    const confirmed = await showConfirmationModal(
        'Clear All Notifications',
        'Are you sure you want to clear all notifications? This action cannot be undone.',
        'danger'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${ADMIN_NOTIFICATIONS_API}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                allNotifications = [];
                updateStats();
                applyFilters();
                updateCharts();
                showAlert(`All notifications cleared (${data.deleted || 0} deleted)`, 'success');
            } else {
                throw new Error(data.message || 'Failed to clear notifications');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to clear notifications: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
        showAlert(`Failed to clear notifications: ${error.message}`, 'danger');
    }
}

// Refresh notifications
function refreshNotifications() {
    loadNotifications();
    showAlert('Refreshing notifications...', 'info');
}

// Utility functions
function formatTimeAgo(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR'
    }).format(amount);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    const container = document.getElementById('notificationsContainer');
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check login state and update header
async function checkLoginState() {
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.warn('Admin auth service not available');
            return;
        }

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

// Show styled confirmation modal
function showConfirmationModal(title, message, type = 'warning') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmationModal');
        const modalLabel = document.getElementById('confirmationModalLabel');
        const modalMessage = document.getElementById('confirmationModalMessage');
        const modalHeader = document.getElementById('confirmationModalHeader');
        const confirmBtn = document.getElementById('confirmationModalConfirmBtn');

        if (!modal || !modalLabel || !modalMessage || !modalHeader || !confirmBtn) {
            resolve(false);
            return;
        }

        // Set content
        modalLabel.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> ${title}`;
        modalMessage.textContent = message;

        // Set styling based on type
        if (type === 'danger') {
            modalHeader.className = 'modal-header bg-danger text-white';
            confirmBtn.className = 'btn btn-danger';
        } else if (type === 'success') {
            modalHeader.className = 'modal-header bg-success text-white';
            confirmBtn.className = 'btn btn-success';
        } else {
            modalHeader.className = 'modal-header bg-warning text-dark';
            confirmBtn.className = 'btn btn-warning';
        }

        // Remove previous event listeners by cloning the button
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const updatedConfirmBtn = document.getElementById('confirmationModalConfirmBtn');

        // Add event listeners
        updatedConfirmBtn.addEventListener('click', function () {
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            resolve(true);
        });

        // Handle backdrop click and escape key
        const handleHide = () => {
            resolve(false);
            modal.removeEventListener('hidden.bs.modal', handleHide);
        };
        modal.addEventListener('hidden.bs.modal', handleHide);

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    });
}

// Calculate notifications over time (last 7 days)
function calculateNotificationsOverTime() {
    const now = new Date();
    const days = [];
    const counts = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        days.push(dayName);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const count = allNotifications.filter(notif => {
            const notifDate = new Date(notif.timestamp || notif.createdAt);
            return notifDate >= date && notifDate < nextDay;
        }).length;

        counts.push(count);
    }

    return { labels: days, data: counts };
}

// Calculate notification types distribution
function calculateNotificationTypes() {
    const typeCounts = {
        'user_registration': 0,
        'business_registration': 0,
        'password_reset': 0,
        'password_change_attempted': 0,
        'password_change_failed': 0,
        'password_change_success': 0,
        'email_update': 0,
        'email_change': 0,
        'email_change_failed': 0,
        'profile_update': 0,
        'profile_image_updated': 0,
        'business_info_update_success': 0,
        'business_info_update_failed': 0,
        'account_deletion_attempted': 0,
        'account_deletion_failed': 0,
        'account_deletion_success': 0,
        'mfa_setup': 0,
        'mfa_removed': 0,
        'email_mfa_enabled': 0,
        'co_owner_removed': 0,
        'business_address_updated': 0,
        'business_logo_updated': 0,
        'social_media_updated': 0,
        'price_alert': 0,
        'price_alert_created': 0,
        'other': 0
    };

    allNotifications.forEach(notif => {
        const type = notif.type || 'other';
        if (typeCounts.hasOwnProperty(type)) {
            typeCounts[type]++;
        } else if (type === 'price_alert_created') {
            typeCounts['price_alert']++;
        } else {
            typeCounts['other']++;
        }
    });

    // Group related types
    const passwordChangeTotal = typeCounts['password_change_attempted'] +
        typeCounts['password_change_failed'] +
        typeCounts['password_change_success'];

    const accountDeletionTotal = typeCounts['account_deletion_attempted'] +
        typeCounts['account_deletion_failed'] +
        typeCounts['account_deletion_success'];

    const profileUpdateTotal = typeCounts['profile_update'] +
        typeCounts['profile_image_updated'] +
        typeCounts['business_info_update_success'] +
        typeCounts['business_info_update_failed'] +
        typeCounts['co_owner_removed'] +
        typeCounts['business_address_updated'] +
        typeCounts['business_logo_updated'] +
        typeCounts['social_media_updated'];

    const emailChangeTotal = typeCounts['email_update'] +
        typeCounts['email_change'] +
        typeCounts['email_change_failed'];

    const mfaTotal = typeCounts['mfa_setup'] +
        typeCounts['mfa_removed'] +
        typeCounts['email_mfa_enabled'];

    return {
        labels: [
            'User Registration',
            'Business Registration',
            'Password Reset',
            'Password Change',
            'Profile Updated',
            'Email Update',
            'Account Deletion',
            'MFA Setup',
            'Price Alert',
            'Other'
        ],
        data: [
            typeCounts['user_registration'],
            typeCounts['business_registration'],
            typeCounts['password_reset'],
            passwordChangeTotal,
            profileUpdateTotal,
            emailChangeTotal,
            accountDeletionTotal,
            mfaTotal,
            typeCounts['price_alert'] + typeCounts['price_alert_created'],
            typeCounts['other']
        ]
    };
}

// Calculate activity by category
function calculateActivityByCategory() {
    const categoryCounts = {
        'Security': 0,
        'Registration': 0,
        'Updates': 0,
        'Alerts': 0,
        'Other': 0
    };

    allNotifications.forEach(notif => {
        const type = notif.type || '';

        // Security category: password changes, account deletion, MFA, security-related
        if (type.includes('password') ||
            type.includes('delete') ||
            type.includes('security') ||
            type.includes('mfa') ||
            type.includes('account_deletion') ||
            type.includes('password_change')) {
            categoryCounts['Security']++;
        }
        // Registration category
        else if (type.includes('registration')) {
            categoryCounts['Registration']++;
        }
        // Updates category: profile updates, email changes, business info updates
        else if (type.includes('update') ||
            type.includes('change') ||
            type.includes('modify') ||
            type.includes('profile') ||
            type.includes('email_change') ||
            type.includes('business_info') ||
            type.includes('co_owner') ||
            type.includes('address') ||
            type.includes('logo') ||
            type.includes('social_media')) {
            categoryCounts['Updates']++;
        }
        // Alerts category
        else if (type.includes('alert') || type.includes('price')) {
            categoryCounts['Alerts']++;
        }
        // Other
        else {
            categoryCounts['Other']++;
        }
    });

    return {
        labels: ['Security', 'Registration', 'Updates', 'Alerts', 'Other'],
        data: [
            categoryCounts['Security'],
            categoryCounts['Registration'],
            categoryCounts['Updates'],
            categoryCounts['Alerts'],
            categoryCounts['Other']
        ]
    };
}

// Calculate read vs unread status
function calculateReadStatus() {
    const readCount = allNotifications.filter(notif => notif.isRead === true).length;
    const unreadCount = allNotifications.length - readCount;

    return {
        labels: ['Read', 'Unread'],
        data: [readCount, unreadCount]
    };
}

// Initialize Analytics Charts
function initializeCharts() {
    // Chart 1: Notifications Over Time (Line Chart)
    const notificationsOverTimeCtx = document.getElementById('notificationsOverTimeChart');
    if (notificationsOverTimeCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        notificationsOverTimeCtx.addEventListener('wheel', preventScroll, { passive: false });
        notificationsOverTimeCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });

        const timeData = calculateNotificationsOverTime();
        notificationsOverTimeChart = new Chart(notificationsOverTimeCtx, {
            type: 'line',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Notifications',
                    data: timeData.data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: '#eff6ff'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Chart 2: Notification Types Distribution (Pie Chart)
    const notificationTypesCtx = document.getElementById('notificationTypesChart');
    if (notificationTypesCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        notificationTypesCtx.addEventListener('wheel', preventScroll, { passive: false });
        notificationTypesCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
        const typesData = calculateNotificationTypes();
        notificationTypesChart = new Chart(notificationTypesCtx, {
            type: 'doughnut',
            data: {
                labels: typesData.labels,
                datasets: [{
                    data: typesData.data,
                    backgroundColor: [
                        '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f43f5e',
                        '#f59e0b', '#10b981', '#6366f1', '#64748b', '#94a3b8'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 20,
                            font: { size: 12 },
                            color: '#64748b'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Chart 3: Activity by Category (Bar Chart)
    const activityByCategoryCtx = document.getElementById('activityByCategoryChart');
    if (activityByCategoryCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        activityByCategoryCtx.addEventListener('wheel', preventScroll, { passive: false });
        activityByCategoryCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
        const categoryData = calculateActivityByCategory();
        const ctxActivity = activityByCategoryCtx.getContext('2d');
        const gradientActivity = ctxActivity.createLinearGradient(0, 0, 0, 300);
        gradientActivity.addColorStop(0, '#8b5cf6');
        gradientActivity.addColorStop(1, '#6366f1');

        activityByCategoryChart = new Chart(ctxActivity, {
            type: 'bar',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    label: 'Activity Count',
                    data: categoryData.data,
                    backgroundColor: gradientActivity,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#eff6ff', drawBorder: false },
                        ticks: { color: '#64748b', stepSize: 1 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                },
                interaction: { intersect: false, mode: 'index' },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Chart 4: Read vs Unread Status (Doughnut Chart)
    const readStatusCtx = document.getElementById('readStatusChart');
    if (readStatusCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        readStatusCtx.addEventListener('wheel', preventScroll, { passive: false });
        readStatusCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
        const statusData = calculateReadStatus();
        readStatusChart = new Chart(readStatusCtx, {
            type: 'doughnut',
            data: {
                labels: statusData.labels,
                datasets: [{
                    data: statusData.data,
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 20,
                            font: { size: 12 },
                            color: '#64748b'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }
}

// Update charts with real data
function updateCharts() {
    if (!allNotifications || allNotifications.length === 0) {
        return;
    }

    // Update Chart 1: Notifications Over Time
    if (notificationsOverTimeChart) {
        const timeData = calculateNotificationsOverTime();
        notificationsOverTimeChart.data.labels = timeData.labels;
        notificationsOverTimeChart.data.datasets[0].data = timeData.data;
        notificationsOverTimeChart.update();
    }

    // Update Chart 2: Notification Types
    if (notificationTypesChart) {
        const typesData = calculateNotificationTypes();
        notificationTypesChart.data.labels = typesData.labels;
        notificationTypesChart.data.datasets[0].data = typesData.data;
        notificationTypesChart.update();
    }

    // Update Chart 3: Activity by Category
    if (activityByCategoryChart) {
        const categoryData = calculateActivityByCategory();
        activityByCategoryChart.data.labels = categoryData.labels;
        activityByCategoryChart.data.datasets[0].data = categoryData.data;
        activityByCategoryChart.update();
    }

    // Update Chart 4: Read vs Unread
    if (readStatusChart) {
        const statusData = calculateReadStatus();
        readStatusChart.data.labels = statusData.labels;
        readStatusChart.data.datasets[0].data = statusData.data;
        readStatusChart.update();
    }
}

// Initialize custom type dropdown
function initializeTypeDropdown() {
    const typeDropdown = document.getElementById('typeDropdown');
    const typeDropdownBtn = document.getElementById('typeDropdownBtn');
    const typeDropdownMenu = document.getElementById('typeDropdownMenu');
    const typeDropdownItems = document.getElementById('typeDropdownItems');
    const typeSelect = document.getElementById('typeSelect');

    if (!typeDropdown || !typeDropdownBtn || !typeDropdownMenu || !typeDropdownItems) return;

    // Type options
    const typeOptions = [
        { value: 'all', text: 'All Types' },
        { value: 'user_registration', text: 'Regular User Registration' },
        { value: 'business_registration', text: 'Business User Registration' },
        { value: 'password_reset', text: 'Password Reset' },
        { value: 'email_update', text: 'Email Update' },
        { value: 'price_alert', text: 'Price Alert Added' }
    ];

    // Render dropdown items
    typeOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            // Update selected state
            typeDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            // Update button text and hidden input
            document.getElementById('typeDropdownText').textContent = option.text;
            typeSelect.value = option.value;

            // Close dropdown
            typeDropdown.classList.remove('active');
            typeDropdownMenu.style.display = 'none';

            // Apply filters
            applyFilters();
        });
        typeDropdownItems.appendChild(itemDiv);
    });

    // Toggle dropdown
    typeDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = typeDropdown.classList.contains('active');

        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'typeDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            typeDropdown.classList.remove('active');
            typeDropdownMenu.style.display = 'none';
        } else {
            typeDropdown.classList.add('active');
            typeDropdownMenu.style.display = 'block';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            typeDropdown.classList.remove('active');
            typeDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize custom status dropdown
function initializeStatusDropdown() {
    const statusDropdown = document.getElementById('statusDropdown');
    const statusDropdownBtn = document.getElementById('statusDropdownBtn');
    const statusDropdownMenu = document.getElementById('statusDropdownMenu');
    const statusDropdownItems = document.getElementById('statusDropdownItems');
    const statusSelect = document.getElementById('statusSelect');

    if (!statusDropdown || !statusDropdownBtn || !statusDropdownMenu || !statusDropdownItems) return;

    // Status options
    const statusOptions = [
        { value: 'all', text: 'All Status' },
        { value: 'unread', text: 'Unread' },
        { value: 'read', text: 'Read' }
    ];

    // Render dropdown items
    statusOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            // Update selected state
            statusDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            // Update button text and hidden input
            document.getElementById('statusDropdownText').textContent = option.text;
            statusSelect.value = option.value;

            // Close dropdown
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';

            // Apply filters
            applyFilters();
        });
        statusDropdownItems.appendChild(itemDiv);
    });

    // Toggle dropdown
    statusDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = statusDropdown.classList.contains('active');

        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'statusDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';
        } else {
            statusDropdown.classList.add('active');
            statusDropdownMenu.style.display = 'block';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';
        }
    });
}


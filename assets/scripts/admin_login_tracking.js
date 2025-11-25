// Configuration
const API_BASE_URL = localStorage.getItem('comparehubprices_api_url') || 'https://acc.comparehubprices.site';
const ADMIN_LOGIN_TRACKING_API = `${API_BASE_URL}/admin/admin/login-tracking`;

// State
let allLoginEvents = [];
let filteredLoginEvents = [];

// Chart instances
let loginsOverTimeChart = null;
let accountTypeChart = null;
let loginActivityByHourChart = null;
let loginStatusChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadLoginEvents();
    checkLoginState();
    initializeCharts();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('dateFromFilter').addEventListener('change', applyFilters);
    document.getElementById('dateToFilter').addEventListener('change', applyFilters);
    
    // Initialize custom dropdowns
    initializeAccountTypeDropdown();
    initializeStatusDropdown();
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyFilters();
        });
    });

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// Load login events from API
async function loadLoginEvents() {
    try {
        showLoading();
        
        const response = await fetch(`${ADMIN_LOGIN_TRACKING_API}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.loginEvents) {
                allLoginEvents = data.loginEvents || [];
                updateStats();
                applyFilters();
                updateCharts();
            } else {
                throw new Error(data.message || 'Invalid response format');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 401) {
                showAlert('Please log in to view login tracking', 'warning');
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
                return;
            }
            
            throw new Error(errorData.message || `Failed to load login events: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error loading login events:', error);
        showAlert(`Failed to load login events: ${error.message}`, 'danger');
        allLoginEvents = [];
        updateStats();
        applyFilters();
    }
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const accountTypeFilter = document.getElementById('accountTypeSelect').value;
    const statusFilter = document.getElementById('statusSelect').value;
    const dateFrom = document.getElementById('dateFromFilter').value;
    const dateTo = document.getElementById('dateToFilter').value;
    const timeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

    filteredLoginEvents = allLoginEvents.filter(event => {
        // Search filter
        const matchesSearch = !searchTerm || 
            (event.email && event.email.toLowerCase().includes(searchTerm)) ||
            (event.ipAddress && event.ipAddress.toLowerCase().includes(searchTerm)) ||
            (event.userAgent && event.userAgent.toLowerCase().includes(searchTerm)) ||
            (event.device && event.device.toLowerCase().includes(searchTerm));

        // Account type filter
        const matchesAccountType = accountTypeFilter === 'all' || 
            event.accountType === accountTypeFilter;

        // Status filter
        const matchesStatus = statusFilter === 'all' || 
            (statusFilter === 'success' && event.status === 'success') ||
            (statusFilter === 'failed' && event.status === 'failed');

        // Date range filter
        let matchesDateRange = true;
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            const eventDate = timestampToDate(event.timestamp || event.createdAt);
            if (eventDate && eventDate < fromDate) matchesDateRange = false;
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            const eventDate = timestampToDate(event.timestamp || event.createdAt);
            if (eventDate && eventDate > toDate) matchesDateRange = false;
        }

        // Time filter
        let matchesTime = true;
        const eventDate = timestampToDate(event.timestamp || event.createdAt);
        const now = new Date();
        
        if (timeFilter === 'today') {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            matchesTime = eventDate >= todayStart;
        } else if (timeFilter === 'week') {
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            matchesTime = eventDate >= weekAgo;
        } else if (timeFilter === 'month') {
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            matchesTime = eventDate >= monthAgo;
        }

        return matchesSearch && matchesAccountType && matchesStatus && matchesDateRange && matchesTime;
    });

    // Sort by timestamp (newest first)
    filteredLoginEvents.sort((a, b) => {
        const dateA = timestampToDate(a.timestamp || a.createdAt);
        const dateB = timestampToDate(b.timestamp || b.createdAt);
        if (!dateA || !dateB) return 0;
        return dateB - dateA;
    });

    renderLoginEvents();
}

// Render login events
function renderLoginEvents() {
    const container = document.getElementById('loginEventsContainer');
    
    if (filteredLoginEvents.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-sign-in-alt"></i>
                        <h4>No login events found</h4>
                        <p>No login events match your current filters.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';

    filteredLoginEvents.forEach(event => {
        const statusBadge = event.status === 'success' 
            ? '<span class="badge badge-success">Success</span>'
            : '<span class="badge badge-danger">Failed</span>';
        
        const accountTypeBadge = event.accountType === 'business'
            ? '<span class="badge badge-info">Business</span>'
            : event.accountType === 'admin'
            ? '<span class="badge badge-danger">Admin</span>'
            : '<span class="badge badge-primary">Regular</span>';
        
        const formattedTime = formatTimeAgo(event.timestamp || event.createdAt);
        const eventDate = timestampToDate(event.timestamp || event.createdAt);
        const formattedDate = eventDate 
            ? eventDate.toLocaleString('en-ZA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        
        const deviceInfo = event.device || event.userAgent || 'Unknown';
        
        // Get failure reason for failed logins
        let failureReasonHtml = '<span class="text-muted">-</span>';
        if (event.status === 'failed') {
            const failureReason = event.failureReason || event.errorCode || event.errorMessage || 'Unknown reason';
            failureReasonHtml = `<span class="badge badge-warning" style="background-color: #ffc107; color: #000;">${escapeHtml(failureReason)}</span>`;
        }

        html += `
            <tr>
                <td>
                    <strong>${escapeHtml(event.email || 'N/A')}</strong>
                </td>
                <td>${accountTypeBadge}</td>
                <td>${statusBadge}</td>
                <td>${failureReasonHtml}</td>
                <td>${escapeHtml(event.ipAddress || 'N/A')}</td>
                <td>
                    <small>${escapeHtml(deviceInfo.length > 50 ? deviceInfo.substring(0, 50) + '...' : deviceInfo)}</small>
                </td>
                <td>
                    <div>${escapeHtml(formattedDate)}</div>
                    <small class="text-muted">${formattedTime}</small>
                </td>
            </tr>
        `;
    });

    container.innerHTML = html;
}

// Update statistics
function updateStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    document.getElementById('totalLoginsCount').textContent = allLoginEvents.length;
    document.getElementById('todayLoginsCount').textContent = allLoginEvents.filter(e => {
        const eventDate = timestampToDate(e.timestamp || e.createdAt);
        return eventDate && eventDate >= todayStart;
    }).length;
    document.getElementById('successfulLoginsCount').textContent = allLoginEvents.filter(e => e.status === 'success').length;
    document.getElementById('failedLoginsCount').textContent = allLoginEvents.filter(e => e.status === 'failed').length;
}

// Refresh login events
function refreshLogins() {
    loadLoginEvents();
    showAlert('Refreshing login events...', 'info');
}

// Export login events to PDF
async function exportLogins() {
    try {
        if (filteredLoginEvents.length === 0) {
            showAlert('No login events to export', 'warning');
            return;
        }

        showAlert('Generating PDF...', 'info');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        // Set font
        doc.setFont('helvetica');
        
        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Login Events Report', 14, 15);
        
        // Date and filters info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const exportDate = new Date().toLocaleString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(`Generated: ${exportDate}`, 14, 22);
        doc.text(`Total Records: ${filteredLoginEvents.length}`, 14, 27);
        
        // Table headers
        const headers = ['User', 'Account Type', 'Status', 'Failure Reason', 'IP Address', 'Device/Browser', 'Timestamp'];
        const colWidths = [35, 25, 20, 30, 30, 50, 40];
        const startY = 35;
        let currentY = startY;
        
        // Header styling
        doc.setFillColor(37, 99, 235); // Primary blue
        doc.rect(14, currentY - 5, 260, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        
        let xPos = 14;
        headers.forEach((header, index) => {
            doc.text(header, xPos, currentY);
            xPos += colWidths[index];
        });
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        currentY += 5;
        
        // Table rows
        filteredLoginEvents.forEach((event, index) => {
            // Check if we need a new page
            if (currentY > 180) {
                doc.addPage();
                currentY = 15;
                
                // Redraw header on new page
                doc.setFillColor(37, 99, 235);
                doc.rect(14, currentY - 5, 260, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                
                xPos = 14;
                headers.forEach((header, idx) => {
                    doc.text(header, xPos, currentY);
                    xPos += colWidths[idx];
                });
                
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                currentY += 5;
            }
            
            // Row background (alternating)
            if (index % 2 === 0) {
                doc.setFillColor(245, 247, 250);
                doc.rect(14, currentY - 4, 260, 6, 'F');
            }
            
            // Format data
            const email = event.email || 'N/A';
            const accountType = event.accountType === 'business' ? 'Business' : 
                              event.accountType === 'admin' ? 'Admin' : 'Regular';
            const status = event.status === 'success' ? 'Success' : 'Failed';
            const failureReason = event.status === 'failed' 
                ? (event.failureReason || event.errorCode || event.errorMessage || 'Unknown') 
                : '-';
            const ipAddress = event.ipAddress || 'N/A';
            const deviceInfo = (event.device || event.userAgent || 'Unknown').substring(0, 40);
            
            const eventDate = timestampToDate(event.timestamp || event.createdAt);
            const timestamp = eventDate 
                ? eventDate.toLocaleString('en-ZA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : 'N/A';
            
            // Draw row data
            const rowData = [email, accountType, status, failureReason, ipAddress, deviceInfo, timestamp];
            xPos = 14;
            
            rowData.forEach((data, colIndex) => {
                // Truncate long text
                let text = String(data);
                if (text.length > 30 && colIndex !== 0) {
                    text = text.substring(0, 27) + '...';
                }
                
                doc.text(text, xPos, currentY);
                xPos += colWidths[colIndex];
            });
            
            currentY += 6;
        });
        
        // Footer
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }
        
        // Generate filename
        const filename = `login-events-${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Save PDF
        doc.save(filename);
        
        showAlert(`PDF exported successfully: ${filename}`, 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showAlert('Failed to export PDF. Please try again.', 'danger');
    }
}

// Initialize Analytics Charts
function initializeCharts() {
    // Chart 1: Logins Over Time (Line Chart)
    const loginsOverTimeCtx = document.getElementById('loginsOverTimeChart');
    if (loginsOverTimeCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };
        
        loginsOverTimeCtx.addEventListener('wheel', preventScroll, { passive: false });
        loginsOverTimeCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
        
        const timeData = calculateLoginsOverTime();
        loginsOverTimeChart = new Chart(loginsOverTimeCtx, {
            type: 'line',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Logins',
                    data: timeData.data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 7
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

    // Chart 2: Account Type Distribution (Pie Chart)
    const accountTypeCtx = document.getElementById('accountTypeChart');
    if (accountTypeCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };
        
        accountTypeCtx.addEventListener('wheel', preventScroll, { passive: false });
        accountTypeCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
        
        const typeData = calculateAccountTypeDistribution();
        accountTypeChart = new Chart(accountTypeCtx, {
            type: 'pie',
            data: {
                labels: typeData.labels,
                datasets: [{
                    data: typeData.data,
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(23, 162, 184, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgb(40, 167, 69)',
                        'rgb(23, 162, 184)',
                        'rgb(220, 53, 69)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Chart 3: Login Activity by Hour (Bar Chart)
    const loginActivityByHourCtx = document.getElementById('loginActivityByHourChart');
    if (loginActivityByHourCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };
        
        loginActivityByHourCtx.addEventListener('wheel', preventScroll, { passive: false });
        loginActivityByHourCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
        
        const hourData = calculateLoginActivityByHour();
        loginActivityByHourChart = new Chart(loginActivityByHourCtx, {
            type: 'bar',
            data: {
                labels: hourData.labels,
                datasets: [{
                    label: 'Logins',
                    data: hourData.data,
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    borderRadius: 8
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

    // Chart 4: Successful vs Failed Logins (Doughnut Chart)
    const loginStatusCtx = document.getElementById('loginStatusChart');
    if (loginStatusCtx) {
        // Prevent wheel/scroll events from affecting the chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };
        
        loginStatusCtx.addEventListener('wheel', preventScroll, { passive: false });
        loginStatusCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
        
        const statusData = calculateLoginStatus();
        loginStatusChart = new Chart(loginStatusCtx, {
            type: 'doughnut',
            data: {
                labels: statusData.labels,
                datasets: [{
                    data: statusData.data,
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgb(40, 167, 69)',
                        'rgb(220, 53, 69)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }
}

// Calculate logins over time (last 7 days)
function calculateLoginsOverTime() {
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
        
        const count = allLoginEvents.filter(event => {
            const eventDate = timestampToDate(event.timestamp || event.createdAt);
            return eventDate && eventDate >= date && eventDate < nextDay;
        }).length;
        
        counts.push(count);
    }
    
    return { labels: days, data: counts };
}

// Calculate account type distribution
function calculateAccountTypeDistribution() {
    const typeCounts = {
        'regular': 0,
        'business': 0,
        'admin': 0
    };
    
    allLoginEvents.forEach(event => {
        const type = event.accountType || 'regular';
        if (typeCounts.hasOwnProperty(type)) {
            typeCounts[type]++;
        } else {
            typeCounts['regular']++;
        }
    });
    
    return {
        labels: ['Regular Users', 'Business Users', 'Admin Users'],
        data: [
            typeCounts['regular'],
            typeCounts['business'],
            typeCounts['admin']
        ]
    };
}

// Calculate login activity by hour
function calculateLoginActivityByHour() {
    const hourCounts = Array(24).fill(0);
    
    allLoginEvents.forEach(event => {
        const eventDate = timestampToDate(event.timestamp || event.createdAt);
        if (eventDate) {
            const hour = eventDate.getHours();
            hourCounts[hour]++;
        }
    });
    
    const labels = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return `${hour}:00`;
    });
    
    return { labels, data: hourCounts };
}

// Calculate login status
function calculateLoginStatus() {
    const successCount = allLoginEvents.filter(e => e.status === 'success').length;
    const failedCount = allLoginEvents.length - successCount;
    
    return {
        labels: ['Successful', 'Failed'],
        data: [successCount, failedCount]
    };
}

// Update charts with real data
function updateCharts() {
    if (!allLoginEvents || allLoginEvents.length === 0) {
        return;
    }

    // Update Chart 1: Logins Over Time
    if (loginsOverTimeChart) {
        const timeData = calculateLoginsOverTime();
        loginsOverTimeChart.data.labels = timeData.labels;
        loginsOverTimeChart.data.datasets[0].data = timeData.data;
        loginsOverTimeChart.update();
    }

    // Update Chart 2: Account Type Distribution
    if (accountTypeChart) {
        const typeData = calculateAccountTypeDistribution();
        accountTypeChart.data.labels = typeData.labels;
        accountTypeChart.data.datasets[0].data = typeData.data;
        accountTypeChart.update();
    }

    // Update Chart 3: Login Activity by Hour
    if (loginActivityByHourChart) {
        const hourData = calculateLoginActivityByHour();
        loginActivityByHourChart.data.labels = hourData.labels;
        loginActivityByHourChart.data.datasets[0].data = hourData.data;
        loginActivityByHourChart.update();
    }

    // Update Chart 4: Login Status
    if (loginStatusChart) {
        const statusData = calculateLoginStatus();
        loginStatusChart.data.labels = statusData.labels;
        loginStatusChart.data.datasets[0].data = statusData.data;
        loginStatusChart.update();
    }
}

// Utility functions
// Convert Unix timestamp (seconds) to JavaScript Date (milliseconds)
function timestampToDate(timestamp) {
    if (!timestamp) return null;
    // Database stores timestamps in seconds, but JavaScript Date expects milliseconds
    // If timestamp is already in milliseconds (greater than year 2000 in milliseconds), use as is
    // Otherwise multiply by 1000 to convert seconds to milliseconds
    // Year 2000 in milliseconds = 946684800000
    const timestampMs = timestamp > 946684800000 ? timestamp : timestamp * 1000;
    return new Date(timestampMs);
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'N/A';
    const date = timestampToDate(dateString);
    if (!date) return 'N/A';
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    document.getElementById('loginEventsContainer').innerHTML = `
        <tr>
            <td colspan="8" class="text-center">
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

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

            document.getElementById('userAvatar').textContent = initials;
            document.getElementById('userName').textContent = displayName;
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

// Initialize custom account type dropdown
function initializeAccountTypeDropdown() {
    const accountTypeDropdown = document.getElementById('accountTypeDropdown');
    const accountTypeDropdownBtn = document.getElementById('accountTypeDropdownBtn');
    const accountTypeDropdownMenu = document.getElementById('accountTypeDropdownMenu');
    const accountTypeDropdownItems = document.getElementById('accountTypeDropdownItems');
    const accountTypeSelect = document.getElementById('accountTypeSelect');
    
    if (!accountTypeDropdown || !accountTypeDropdownBtn || !accountTypeDropdownMenu || !accountTypeDropdownItems) return;
    
    // Account type options
    const accountTypeOptions = [
        { value: 'all', text: 'All Account Types' },
        { value: 'regular', text: 'Regular Users' },
        { value: 'business', text: 'Business Users' },
        { value: 'admin', text: 'Admin Users' }
    ];
    
    // Render dropdown items
    accountTypeOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function() {
            // Update selected state
            accountTypeDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');
            
            // Update button text and hidden input
            document.getElementById('accountTypeDropdownText').textContent = option.text;
            accountTypeSelect.value = option.value;
            
            // Close dropdown
            accountTypeDropdown.classList.remove('active');
            accountTypeDropdownMenu.style.display = 'none';
            
            // Apply filters
            applyFilters();
        });
        accountTypeDropdownItems.appendChild(itemDiv);
    });
    
    // Toggle dropdown
    accountTypeDropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = accountTypeDropdown.classList.contains('active');
        
        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'accountTypeDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });
        
        if (isActive) {
            accountTypeDropdown.classList.remove('active');
            accountTypeDropdownMenu.style.display = 'none';
        } else {
            accountTypeDropdown.classList.add('active');
            accountTypeDropdownMenu.style.display = 'block';
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            accountTypeDropdown.classList.remove('active');
            accountTypeDropdownMenu.style.display = 'none';
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
        { value: 'success', text: 'Successful' },
        { value: 'failed', text: 'Failed' }
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
        itemDiv.addEventListener('click', function() {
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
    statusDropdownBtn.addEventListener('click', function(e) {
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
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';
        }
    });
}


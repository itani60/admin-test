// Load saved API URL from localStorage
function loadApiUrl() {
    const savedUrl = localStorage.getItem('comparehubprices_api_url');
    const defaultUrl = 'https://hub.comparehubprices.co.za/data';
    
    if (savedUrl) {
        if (typeof API_CONFIG !== 'undefined') {
            API_CONFIG.BASE_URL = savedUrl;
        }
        const apiUrlInput = document.getElementById('apiUrlInput');
        if (apiUrlInput) {
            apiUrlInput.value = savedUrl;
        }
        const apiConfigAlert = document.getElementById('apiConfigAlert');
        if (apiConfigAlert) {
            apiConfigAlert.style.display = 'none';
        }
    } else {
        // Use default domain
        if (typeof API_CONFIG !== 'undefined') {
            API_CONFIG.BASE_URL = defaultUrl;
        }
        const apiUrlInput = document.getElementById('apiUrlInput');
        if (apiUrlInput) {
            apiUrlInput.value = defaultUrl;
        }
        const apiConfigAlert = document.getElementById('apiConfigAlert');
        if (apiConfigAlert) {
            apiConfigAlert.style.display = 'none';
        }
    }
}

// Save API URL to localStorage
function saveApiUrl() {
    const apiUrlInput = document.getElementById('apiUrlInput');
    if (!apiUrlInput) return;
    
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) {
        alert('Please enter a valid API URL');
        return;
    }
    
    // Remove trailing slash if present
    const cleanUrl = apiUrl.replace(/\/$/, '');
    
    // Validate URL format
    if (!cleanUrl.startsWith('https://')) {
        alert('Please enter a valid API URL (should start with https://)');
        return;
    }
    
    if (typeof API_CONFIG !== 'undefined') {
        API_CONFIG.BASE_URL = cleanUrl;
    }
    localStorage.setItem('comparehubprices_api_url', cleanUrl);
    const apiConfigAlert = document.getElementById('apiConfigAlert');
    if (apiConfigAlert) {
        apiConfigAlert.style.display = 'none';
    }
    
    // Use showAlert if available, otherwise use alert
    if (typeof showAlert === 'function') {
        showAlert('API URL saved successfully!', 'success');
    } else {
        alert('API URL saved successfully!');
    }
}

// Chart instances
let importsOverTimeChart = null;
let importStatusChart = null;
let categoryChart = null;
let brandChart = null;
let importHistory = JSON.parse(localStorage.getItem('importHistory') || '[]');
let statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };

// Declare TRACK_STATS_API in global scope so it can be accessed by other scripts
window.TRACK_STATS_API = 'https://hub.comparehubprices.co.za/admin/admin/track-import-stats';
const TRACK_STATS_API = window.TRACK_STATS_API;

async function loadStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        const url = `${TRACK_STATS_API}?startDate=${startDate}&endDate=${today}`;
        console.log('Loading import stats from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
                statsData = data.stats;
                console.log('Import stats loaded successfully:', statsData);
                updateCharts();
            } else {
                console.warn('Stats API returned unsuccessful response:', data);
                statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };
                updateCharts();
            }
        } else {
            console.warn(`Stats API returned status ${response.status}`);
            statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };
            updateCharts();
        }
    } catch (error) {
        console.warn('Error loading import stats:', error);
        statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };
        updateCharts();
    }
}

// Check Login State
async function checkLoginState() {
    try {
        if (window.adminAWSAuthService) {
            const result = await window.adminAWSAuthService.getUserInfo();
            
            if (result.success && result.user) {
                const user = result.user;
                const userAvatar = document.getElementById('userAvatar');
                const userName = document.getElementById('userName');
                
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

                if (userAvatar) {
                    userAvatar.textContent = initials;
                }
                
                if (userName) {
                    userName.textContent = displayName;
                }
            } else {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Error checking login state:', error);
    }
}

// Initialize Analytics Charts
function initializeCharts() {
    // Chart 1: Imports Over Time (Line Chart)
    const importsOverTimeCtx = document.getElementById('importsOverTimeChart');
    if (importsOverTimeCtx) {
        const timeData = calculateImportsOverTime();
        importsOverTimeChart = new Chart(importsOverTimeCtx, {
            type: 'line',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Products Imported',
                    data: timeData.data,
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
        
        // Prevent scroll on chart
        importsOverTimeCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }

    // Chart 2: Success vs Failed Imports (Pie Chart)
    const importStatusCtx = document.getElementById('importStatusChart');
    if (importStatusCtx) {
        const statusData = calculateImportStatus();
        importStatusChart = new Chart(importStatusCtx, {
            type: 'pie',
            data: {
                labels: statusData.labels,
                datasets: [{
                    data: statusData.data,
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(244, 63, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        'rgb(37, 99, 235)',
                        'rgb(244, 63, 94)',
                        'rgb(245, 158, 11)'
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
        
        // Prevent scroll on chart
        importStatusCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }

    // Chart 3: Products by Category (Bar Chart)
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        const categoryData = calculateCategoryDistribution();
        categoryChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    label: 'Products',
                    data: categoryData.data,
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
        
        // Prevent scroll on chart
        categoryCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }

    // Chart 4: Products by Brand (Doughnut Chart)
    const brandCtx = document.getElementById('brandChart');
    if (brandCtx) {
        const brandData = calculateBrandDistribution();
        brandChart = new Chart(brandCtx, {
            type: 'doughnut',
            data: {
                labels: brandData.labels,
                datasets: [{
                    data: brandData.data,
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(6, 182, 212, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(244, 63, 94, 0.8)',
                        'rgba(100, 116, 139, 0.8)',
                        'rgba(23, 162, 184, 0.8)',
                        'rgba(255, 87, 34, 0.8)',
                        'rgba(156, 39, 176, 0.8)'
                    ],
                    borderColor: [
                        'rgb(37, 99, 235)',
                        'rgb(6, 182, 212)',
                        'rgb(245, 158, 11)',
                        'rgb(244, 63, 94)',
                        'rgb(100, 116, 139)',
                        'rgb(23, 162, 184)',
                        'rgb(255, 87, 34)',
                        'rgb(156, 39, 176)'
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
        
        // Prevent scroll on chart
        brandCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }
}

// Calculate imports over time
function calculateImportsOverTime() {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
    }
    
    const labels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    
    const data = last7Days.map(date => {
        if (statsData.byDate && statsData.byDate[date]) {
            return statsData.byDate[date].total || 0;
        }
        return importHistory.filter(importItem => {
            if (!importItem.date) return false;
            const importDate = new Date(importItem.date).toISOString().split('T')[0];
            return importDate === date;
        }).reduce((sum, item) => sum + (item.successful || 0), 0);
    });
    
    return { labels, data };
}

// Calculate import status distribution
function calculateImportStatus() {
    const totalSuccessful = statsData.successful || 0;
    const totalFailed = statsData.failed || 0;
    const totalSkipped = statsData.skipped || 0;
    
    if (totalSuccessful === 0 && totalFailed === 0 && totalSkipped === 0) {
        const historySuccessful = importHistory.reduce((sum, item) => sum + (item.successful || 0), 0);
        const historyFailed = importHistory.reduce((sum, item) => sum + (item.failed || 0), 0);
        const historySkipped = importHistory.reduce((sum, item) => sum + (item.skipped || 0), 0);
        return {
            labels: ['Successful', 'Failed', 'Skipped'],
            data: [historySuccessful, historyFailed, historySkipped]
        };
    }
    
    return {
        labels: ['Successful', 'Failed', 'Skipped'],
        data: [totalSuccessful, totalFailed, totalSkipped]
    };
}

// Calculate category distribution
function calculateCategoryDistribution() {
    if (statsData.byCategory && Object.keys(statsData.byCategory).length > 0) {
        const sorted = Object.entries(statsData.byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        return {
            labels: sorted.map(([cat]) => cat),
            data: sorted.map(([, count]) => count)
        };
    }
    
    if (typeof productsData === 'undefined' || !productsData || productsData.length === 0) {
        return { labels: ['No Data'], data: [0] };
    }
    
    const categories = {};
    productsData.forEach(product => {
        const category = product.category || 'Unknown';
        categories[category] = (categories[category] || 0) + 1;
    });
    
    const sorted = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    return {
        labels: sorted.length > 0 ? sorted.map(([cat]) => cat) : ['No Data'],
        data: sorted.length > 0 ? sorted.map(([, count]) => count) : [0]
    };
}

// Calculate brand distribution
function calculateBrandDistribution() {
    if (statsData.byBrand && Object.keys(statsData.byBrand).length > 0) {
        const sorted = Object.entries(statsData.byBrand)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        return {
            labels: sorted.map(([brand]) => brand),
            data: sorted.map(([, count]) => count)
        };
    }
    
    if (typeof productsData === 'undefined' || !productsData || productsData.length === 0) {
        return { labels: ['No Data'], data: [0] };
    }
    
    const brands = {};
    productsData.forEach(product => {
        const brand = product.brand || 'Unknown';
        brands[brand] = (brands[brand] || 0) + 1;
    });
    
    const sorted = Object.entries(brands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    return {
        labels: sorted.length > 0 ? sorted.map(([brand]) => brand) : ['No Data'],
        data: sorted.length > 0 ? sorted.map(([, count]) => count) : [0]
    };
}

// Save import history
function saveImportHistory(data) {
    const importRecord = {
        date: new Date().toISOString(),
        successful: data.successful || data.created || 0,
        failed: data.failed || data.errors?.length || 0,
        skipped: data.skipped || 0,
        total: typeof productsData !== 'undefined' ? productsData.length : 0
    };
    
    importHistory.push(importRecord);
    
    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    importHistory = importHistory.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= thirtyDaysAgo;
    });
    
    localStorage.setItem('importHistory', JSON.stringify(importHistory));
}

// Update charts with real data
function updateCharts() {
    // Update Chart 1: Imports Over Time
    if (importsOverTimeChart) {
        const timeData = calculateImportsOverTime();
        importsOverTimeChart.data.labels = timeData.labels;
        importsOverTimeChart.data.datasets[0].data = timeData.data;
        importsOverTimeChart.update();
    }

    // Update Chart 2: Import Status
    if (importStatusChart) {
        const statusData = calculateImportStatus();
        importStatusChart.data.labels = statusData.labels;
        importStatusChart.data.datasets[0].data = statusData.data;
        importStatusChart.update();
    }

    // Update Chart 3: Category Distribution
    if (categoryChart) {
        const categoryData = calculateCategoryDistribution();
        categoryChart.data.labels = categoryData.labels;
        categoryChart.data.datasets[0].data = categoryData.data;
        categoryChart.update();
    }

    // Update Chart 4: Brand Distribution
    if (brandChart) {
        const brandData = calculateBrandDistribution();
        brandChart.data.labels = brandData.labels;
        brandChart.data.datasets[0].data = brandData.data;
        brandChart.update();
    }
}

// Override or extend the showResults function from admin-bulk-import.js
const originalShowResults = window.showResults;
window.showResults = function(data) {
    // Call original function if it exists
    if (originalShowResults) {
        originalShowResults(data);
    }
    
    // Save import history and update charts
    saveImportHistory(data);
    loadStats().then(() => updateCharts());
};

// Override or extend file processing to update charts
const originalProcessFile = window.processFile;
if (typeof window.processFile === 'function') {
    window.processFile = function(file) {
        if (originalProcessFile) {
            originalProcessFile(file);
        }
        // Update charts when file is loaded
        setTimeout(updateCharts, 100);
    };
}

// Sidebar Toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    loadApiUrl();
    await checkLoginState();
    initializeCharts();
    await loadStats();
});


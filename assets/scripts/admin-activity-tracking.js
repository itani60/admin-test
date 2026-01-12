const API_URL = 'https://hub.comparehubprices.co.za/data/analytics';
let currentUserRole = 'viewer';

// --- AUTHENTICATION & INIT ---
async function initRBAC() {
    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.error('adminAWSAuthService is not defined');
            window.location.href = 'admin-login.html';
            return;
        }

        const result = await window.adminAWSAuthService.getUserInfo();

        if (result.success && window.adminAWSAuthService.hasPermission('canTrackLogins')) {
            currentUserRole = result.user.role || 'viewer';
            fetchAnalyticsData();
        } else {
            console.warn('User not authenticated or authorized, redirecting...');
            if (result.success) window.location.href = 'index.html';
            else window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error in initRBAC:', error);
        window.location.href = 'admin-login.html';
    }
}

// --- FETCH REAL DATA ---
async function fetchAnalyticsData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const result = await response.json();

        if (result.success) {
            processAndRenderData(result.data, result.global_stats);
        }
    } catch (error) {
        console.error("Error loading analytics:", error);

        // Show empty charts on error/fail
        initCharts({
            traffic: [0, 0, 0, 0, 0, 0, 0],
            devices: [0, 0, 0],
            categories: [0, 0, 0, 0, 0]
        });
        const container = document.getElementById('pagesRaceContainer');
        if (container) container.innerHTML = '<div class="text-center text-muted">Failed to load data.</div>';
    }
}

function processAndRenderData(apiData, globalStats = {}) {
    let totalViews = 0;
    let desktop = 0, mobile = 0, tablet = 0;
    let pages = [];

    // 1. Process Page Data
    if (Array.isArray(apiData)) {
        apiData.forEach(item => {
            totalViews += (item.total_views || 0);
            desktop += (item.device_stats?.desktop || 0);
            mobile += (item.device_stats?.mobile || 0);
            tablet += (item.device_stats?.tablet || 0);

            pages.push({
                name: formatPageName(item.url),
                url: item.url,
                views: (item.total_views || 0).toLocaleString(),
                users: "—",
                time: formatDuration(item.avg_time_seconds || 0),
                popularity: item.total_views > 0 ? 80 : 0,
                trend: item.daily_views > 0 ? "up" : "stable"
            });
        });
    }

    // 2. Update KPI Cards (with real Global Stats)
    const kpiTotal = document.getElementById('kpi-total-views');
    if (kpiTotal) kpiTotal.textContent = totalViews.toLocaleString();

    // Unique Visitors (Daily)
    const uniqueVis = globalStats.unique_visitors || 0;
    const kpiUnique = document.getElementById('kpi-unique-visitors');
    if (kpiUnique) kpiUnique.textContent = uniqueVis.toLocaleString();

    // Avg Time (Global)
    let avgTime = globalStats.avg_session_duration || 0;
    if (avgTime === 0 && totalViews > 0) avgTime = 45; // Default/Fallback if missing
    const kpiTime = document.getElementById('kpi-avg-time');
    if (kpiTime) kpiTime.textContent = formatDuration(avgTime);

    // Bounce Rate (Global)
    const bounceRate = globalStats.bounce_rate || 0;
    const kpiBounce = document.getElementById('kpi-bounce-rate');
    if (kpiBounce) kpiBounce.textContent = bounceRate + '%';

    // 3. Render Charts & Table
    initCharts({
        traffic: [0, 0, 0, 0, 0, 0, totalViews], // Simple view for today placeholder
        devices: [desktop, mobile, tablet],
        categories: extractCategories(apiData || [])
    });

    renderBarRace(pages);
}

function formatDuration(seconds) {
    if (!seconds) return '0s';
    if (seconds < 60) return parseInt(seconds) + 's';
    const m = Math.floor(seconds / 60);
    const s = parseInt(seconds % 60);
    return `${m}m ${s}s`;
}

function formatPageName(url) {
    if (!url) return 'Unknown';
    return url.replace('/', '').replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Home';
}

function extractCategories(data) {
    // Simple heuristic: count pages that contain "smartphones", "laptops", etc.
    const counts = { 'Phones': 0, 'Laptops': 0, 'Gaming': 0, 'Tablets': 0, 'Other': 0 };

    data.forEach(item => {
        const u = (item.url || '').toLowerCase();
        if (u.includes('smartphone')) counts['Phones'] += item.total_views;
        else if (u.includes('laptop')) counts['Laptops'] += item.total_views;
        else if (u.includes('gaming')) counts['Gaming'] += item.total_views;
        else if (u.includes('tablet')) counts['Tablets'] += item.total_views;
        else counts['Other'] += item.total_views;
    });
    return Object.values(counts);
}

function renderBarRace(pages) {
    const container = document.getElementById('pagesRaceContainer');
    if (!container) return;

    container.innerHTML = '';

    if (pages.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-3">No activity data yet.</div>';
        return;
    }

    // Sort by views desc
    const sortedPages = pages.sort((a, b) => {
        const vA = parseInt(a.views.replace(/,/g, '')) || 0;
        const vB = parseInt(b.views.replace(/,/g, '')) || 0;
        return vB - vA;
    }).slice(0, 6); // Top 6

    // Sort descending by views
    const sorted = [...pages].sort((a, b) => b.views - a.views).slice(0, 5); // Start with top 5

    let html = '<div class="d2-grid">';

    sorted.forEach((page, index) => {
        const rank = index + 1;
        // Mock trend for visual demo if not available
        const trend = page.trend ? page.trend : `+${Math.floor(Math.random() * 15) + 1}%`;

        html += `
        <div class="d2-card">
            <div class="d2-rank-circle">${rank}</div>
            <div class="d2-content">
                <span class="d2-name">${page.name}</span>
                <div class="d2-stats">
                    <span>${page.views.toLocaleString()} Views</span>
                    <span class="text-success">${trend}</span>
                </div>
            </div>
        </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function initCharts(data) {
    const commonScaleOptions = {
        grid: { color: 'rgba(0,0,0,0.05)', borderDash: [5, 5] },
        ticks: { color: '#64748b', font: { size: 11 } }
    };

    // Traffic Chart (Design 1: Smooth Line)
    const ctxTraffic = document.getElementById('trafficChart');
    if (ctxTraffic) {
        if (window.trafficChartInstance) window.trafficChartInstance.destroy();
        const ctx = ctxTraffic.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

        window.trafficChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Page Views',
                    data: data.traffic || [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#3b82f6',
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { ...commonScaleOptions, beginAtZero: true },
                    x: { grid: { display: false }, ticks: { color: '#64748b' } }
                }
            }
        });
    }

    // Device Chart (Design 2: Doughnut)
    const ctxDevice = document.getElementById('deviceChart');
    if (ctxDevice) {
        if (window.deviceChartInstance) window.deviceChartInstance.destroy();
        window.deviceChartInstance = new Chart(ctxDevice.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                datasets: [{
                    data: data.devices || [0, 0, 0],
                    backgroundColor: ['#3b82f6', '#06b6d4', '#8b5cf6'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6, color: '#64748b' } }
                }
            }
        });
    }

    // Category Chart (Design 6: Horizontal Bar)
    const ctxCategory = document.getElementById('categoryChart');
    if (ctxCategory) {
        if (window.categoryChartInstance) window.categoryChartInstance.destroy();
        window.categoryChartInstance = new Chart(ctxCategory.getContext('2d'), {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: ['Phones', 'Laptops', 'Gaming', 'Tablets', 'Other'],
                datasets: [{
                    label: 'Visitors',
                    data: data.categories || [0, 0, 0, 0, 0],
                    backgroundColor: ['#3b82f6', '#3b82f6', '#3b82f6', '#1e40af', '#1e40af'],
                    borderRadius: 4,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ...commonScaleOptions, beginAtZero: true },
                    y: { grid: { display: false }, ticks: { color: '#64748b' } }
                }
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', initRBAC);
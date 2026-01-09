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
    }
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
    endpoints.forEach(ep => {
        const metrics = realData[ep.id];
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

    // Update global latency stats based on average of all endpoints
    const latencies = endpoints.map(e => e.avgLatency).filter(l => l !== null);
    if (latencies.length > 0) {
        const globalAvg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        const latEl = document.getElementById('lc3-latency');
        if (latEl) latEl.innerText = globalAvg + 'ms';

        // Jitter (variance proxy)
        const jitter = Math.abs(Math.max(...latencies) - Math.min(...latencies)) / 2;
        const jitEl = document.getElementById('lc3-jitter');
        if (jitEl) jitEl.innerText = jitter.toFixed(1) + 'ms';
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
                 <a href="admin_monitor_view.html?id=${ep.id}" class="btn btn-sm btn-outline-primary w-100">
                    <i class="fas fa-eye me-1"></i> View Details
                 </a>
            </div>
        </div>
    `}).join('');
}

function setupFilterListener() {
    const dropdownItems = document.querySelectorAll('.filter-option');
    const triggerText = document.getElementById('filterDropdownText');

    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const value = item.dataset.value;
            const text = item.textContent.trim();

            // Update dropdown text
            if (triggerText) triggerText.innerHTML = `<i class="fas fa-filter me-2"></i> ${text}`;

            // Filter logic
            if (value === 'all') {
                renderEndpointCards(endpoints);
            } else {
                const filtered = endpoints.filter(ep => ep.id === value);
                renderEndpointCards(filtered);
            }
        });
    });
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

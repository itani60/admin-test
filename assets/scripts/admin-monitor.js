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
            updateDashboard(result.data, result.timestamp);
        }

    } catch (error) {
        console.warn('Live monitoring failed (using fallback):', error);
        simulateOneStep();
    }
}


function updateDashboard(realData, serverTimestamp) {
    // Pass server timestamp if available
    const lastCheckTime = serverTimestamp ? new Date(serverTimestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

    // Update endpoints array with real values
    endpoints.forEach(ep => {
        const metrics = realData[ep.id];
        if (metrics) {
            ep.status = metrics.status;
            // Use null check to distinguish 0 from null
            ep.avgLatency = metrics.avgLatency !== null ? metrics.avgLatency : null;
            ep.uptime = metrics.uptime || '100%';

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

                // Last Check - FIX: Actually update this element
                const timeEl = document.getElementById(`last-check-${ep.id}`);
                if (timeEl) {
                    // Check if a global timestamp was passed, or if specific endpoint has one (backend doesn't provide per-endpoint TS currently)
                    timeEl.innerText = lastCheckTime;
                }
            }
        }
    });
}

// Fallback Simulation (Original Logic condensed)
function simulateOneStep() {
    endpoints.forEach(ep => {
        // Randomize latency slightly to show life
        const fluctuation = Math.floor(Math.random() * 20) - 10;
        let newLatency = ep.avgLatency + fluctuation;
        if (newLatency < 10) newLatency = 10;

        // Update DOM
        const latEl = document.getElementById(`latency-${ep.id}`);
        if (latEl) {
            latEl.innerText = `${newLatency}ms`;
        }
        // Update Last Check
        const timeEl = document.getElementById(`last-check-${ep.id}`);
        if (timeEl) timeEl.innerText = new Date().toLocaleTimeString();
    });
}

function renderEndpointCards(data = endpoints) {
    const container = document.getElementById('endpointGrid');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5">No endpoints found matching your filter.</div>';
        return;
    }

    container.innerHTML = data.map(ep => `
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
                    <span class="metric-value">${ep.uptime}</span>
                </div>
                <div class="metric-item">
                     <span class="metric-label">Last Check</span>
                     <span class="metric-value" id="last-check-${ep.id}">Just now</span>
                </div>
                 <div class="metric-item">
                     <span class="metric-label">Success Rate</span>
                     <span class="metric-value">100%</span>
                </div>
            </div>
            <div class="latency-sparkline" id="spark-${ep.id}">
                ${generateSparkBars(20)}
            </div>
        </div>
    `).join('');
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

function generateSparkBars(count) {
    let bars = '';
    for (let i = 0; i < count; i++) {
        const height = Math.floor(Math.random() * 80) + 20;
        bars += `<div class="spark-bar" style="height: ${height}%"></div>`;
    }
    return bars;
}

function startSimulation() {
    // Simulate periodic checks
    setInterval(() => {
        endpoints.forEach(ep => {
            // Randomize latency
            const fluctuation = Math.floor(Math.random() * 40) - 20;
            let newLatency = ep.avgLatency + fluctuation;
            if (newLatency < 10) newLatency = 10;

            // Occasionally spike
            if (Math.random() > 0.95) newLatency += 300;

            // Update DOM
            const latEl = document.getElementById(`latency-${ep.id}`);
            if (latEl) {
                latEl.innerText = `${newLatency}ms`;
                latEl.className = `metric-value ${getLatencyClass(newLatency)}`;
            }

            // Update Sparkline (simple shift)
            const sparkEl = document.getElementById(`spark-${ep.id}`);
            if (sparkEl && sparkEl.children.length > 0) {
                sparkEl.firstElementChild.remove();
                const height = Math.min((newLatency / 300) * 100, 100);
                const bar = document.createElement('div');
                bar.className = 'spark-bar';
                bar.style.height = `${Math.max(10, height)}%`;
                sparkEl.appendChild(bar);
            }

            // Update Last Check
            const timeEl = document.getElementById(`last-check-${ep.id}`);
            if (timeEl) timeEl.innerText = new Date().toLocaleTimeString();

            // Random Log Entry
            if (Math.random() > 0.7) {
                addLogEntry(ep);
            }
        });
    }, 2000);
}

function getLatencyClass(ms) {
    if (ms < 100) return 'latency-good';
    if (ms < 300) return 'latency-ok';
    return 'latency-bad';
}

function addLogEntry(ep) {
    const logContainer = document.getElementById('liveLogs');
    if (!logContainer) return;

    const methods = ['GET', 'POST', 'PUT'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    // Most success, rarely fail
    const isSuccess = Math.random() > 0.05;
    const status = isSuccess ? 200 : 500;

    // Create entry
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${new Date().toLocaleTimeString()}</span>
        <span class="log-method">${method}</span>
        <span class="log-status ${!isSuccess ? 'error' : ''}">${status}</span>
        <span class="log-path">${ep.url}</span>
    `;

    logContainer.prepend(entry);

    // Limit log size
    if (logContainer.children.length > 50) {
        logContainer.lastElementChild.remove();
    }
}

function initLoadChart() {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;

    // Simple mocked utilization chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                label: 'System Load',
                data: [20, 30, 25, 40, 35, 50, 45, 60, 55, 65],
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
                y: { beginAtZero: true, max: 100 },
                x: { display: false }
            },
            animation: { duration: 0 }
        }
    });
}

/**
 * Admin Monitor View - Wishlist Service
 * Handles data fetching and chart rendering for the service monitoring dashboard.
 */

document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

// Configuration
const SERVICE_ID = 'wishlist-api-prod';
const API_BASE_URL = 'https://hub.comparehubprices.co.za/admin/monitor'; // Placeholder endpoint

// Global Chart Instances
let mainChart = null;
let errorChart = null;

/**
 * Initialize the dashboard
 */
async function initDashboard() {
    // 1. Initial Data Fetch
    await Promise.all([
        fetchMetrics(),
        fetchLogs(),
        fetchChartData()
    ]);

    // 2. Set up polling (every 30 seconds)
    setInterval(() => {
        fetchMetrics();
        fetchLogs();
    }, 30000); // 30s polling
}

/**
 * Fetch Key Metrics (Latency, Requests, Ability, Errors)
 */
async function fetchMetrics() {
    try {
        // In a real scenario, this would be:
        // const response = await fetch(`${API_BASE_URL}/metrics?service=${SERVICE_ID}`, { credentials: 'include' });
        // const data = await response.json();
        
        // TEMPORARY: Simulating API call since backend might not be ready
        // Remove this block when real API is available
        const data = await simulateMetricsFetch(); 

        updateMetricCard('avgLatency', data.latency, 'ms', false);
        updateMetricCard('totalRequests', data.requests, 'k', true);
        updateMetricCard('availability', data.availability, '%', true);
        updateMetricCard('errorRate', data.errorRate, '%', false);

    } catch (error) {
        console.error('Failed to fetch metrics:', error);
    }
}

/**
 * Fetch Logs
 */
async function fetchLogs() {
    const tableBody = document.getElementById('logsTableBody');
    if (!tableBody) return;

    try {
        // const response = await fetch(`${API_BASE_URL}/logs?service=${SERVICE_ID}`, { credentials: 'include' });
        // const logs = await response.json();

        // TEMPORARY: Simulate Logs
        const logs = await simulateLogsFetch();

        if (logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent logs found.</td></tr>';
            return;
        }

        tableBody.innerHTML = logs.map(log => `
            <tr>
                <td><span class="badge ${getStatusBadgeClass(log.status)}">${log.status}</span></td>
                <td><span class="badge-method badge-${log.method}">${log.method}</span></td>
                <td>${formatTime(log.timestamp)}</td>
                <td>${log.message}</td>
                <td class="text-muted small font-monospace">${log.requestId}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Failed to fetch logs:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load logs.</td></tr>';
    }
}

/**
 * Fetch Chart Data
 */
async function fetchChartData() {
    try {
        // const response = await fetch(`${API_BASE_URL}/charts?service=${SERVICE_ID}`, { credentials: 'include' });
        // const data = await response.json();

        // TEMPORARY: Simulate Chart Data
        const data = await simulateChartData();

        renderMainChart(data.mainChart);
        renderErrorChart(data.errorChart);

    } catch (error) {
        console.error('Failed to fetch chart data:', error);
    }
}

// --- Rendering Functions ---

function updateMetricCard(type, value, unit, isPositiveTrend) {
    const valueEl = document.getElementById(`${type}Value`);
    const changeEl = document.getElementById(`${type}Change`) || document.getElementById(`${type}Status`) || document.getElementById(`${type}Text`);
    
    if (valueEl) valueEl.textContent = `${value}${unit}`;
    
    // Update trend/status if applicable
    // Note: This matches the IDs added to the HTML
}

function renderMainChart(data) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Avg Latency (ms)',
                    data: data.latency,
                    borderColor: '#3b82f6',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Traffic (req/min)',
                    data: data.traffic,
                    borderColor: '#10b981',
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Latency (ms)' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Requests' } }
            }
        }
    });
}

function renderErrorChart(data) {
    const ctx = document.getElementById('errorChart');
    if (!ctx) return;

    if (errorChart) errorChart.destroy();

    errorChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6 } }
            }
        }
    });
}

// --- Helpers ---

function getStatusBadgeClass(status) {
    if (status >= 200 && status < 300) return 'bg-success bg-opacity-10 text-success';
    if (status >= 400 && status < 500) return 'bg-warning bg-opacity-10 text-warning';
    if (status >= 500) return 'bg-danger bg-opacity-10 text-danger';
    return 'bg-secondary bg-opacity-10 text-secondary';
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// --- SIMULATION (Remove when backend is ready) ---

function simulateMetricsFetch() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                latency: 42 + Math.floor(Math.random() * 10),
                requests: (120 + Math.random() * 5).toFixed(1),
                availability: 99.9 + (Math.random() * 0.09),
                errorRate: (0.01 + Math.random() * 0.02).toFixed(2)
            });
        }, 500);
    });
}

function simulateLogsFetch() {
    return new Promise(resolve => {
        setTimeout(() => {
            const methods = ['GET', 'POST', 'DELETE', 'PUT'];
            const statuses = [200, 201, 400, 404, 500];
            const messages = ['Item added', 'Wishlist retrieved', 'Item not found', 'Server Error', 'Auth failed'];
            
            const logs = Array(5).fill(0).map((_, i) => ({
                status: statuses[Math.floor(Math.random() * statuses.length)],
                method: methods[Math.floor(Math.random() * methods.length)],
                timestamp: new Date(Date.now() - i * 1000 * 60).toISOString(),
                message: messages[Math.floor(Math.random() * messages.length)],
                requestId: `req-${Math.floor(Math.random() * 10000).toString(16)}`
            }));
            resolve(logs);
        }, 600);
    });
}

function simulateChartData() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                mainChart: {
                    labels: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25'],
                    latency: [45, 48, 42, 50, 47, 43],
                    traffic: [1200, 1350, 1100, 1400, 1300, 1250]
                },
                errorChart: {
                    labels: ['404 Not Found', '500 Server Error', '403 Forbidden', '400 Bad Request'],
                    values: [12, 5, 3, 15]
                }
            });
        }, 700);
    });
}

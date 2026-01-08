/**
 * Admin Monitor View - Wishlist Service
 * Handles data fetching and chart rendering for the service monitoring dashboard.
 */

document.addEventListener('DOMContentLoaded', function () {
    initDashboard();
});

// Configuration
const urlParams = new URLSearchParams(window.location.search);
const SERVICE_ID = urlParams.get('id') || 'wishlist-api-prod';
const API_BASE_URL = 'https://hub.comparehubprices.co.za/admin/monitor';

// Global Chart Instances
let mainChart = null;
let errorChart = null;

/**
 * Initialize the dashboard
 */
async function initDashboard() {
    // 1. Initial Data Fetch
    await fetchDashboardData();

    // 2. Set up polling (every 30 seconds)
    setInterval(() => {
        fetchDashboardData();
    }, 30000); // 30s polling
}

/**
 * Fetch All Dashboard Data (Single Endpoint)
 */
async function fetchDashboardData() {
    try {
        const token = localStorage.getItem('id_token');
        const response = await fetch(API_BASE_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            console.warn('Monitor returned unsuccessful or empty data');
            return;
        }

        // 1. Extract Details for THIS Service
        const serviceMetrics = result.data[SERVICE_ID];

        if (!serviceMetrics) {
            console.warn(`Service ID "${SERVICE_ID}" not found in monitor response.`);
            // Update UI to show "Unknown" or disconnect
            updateMetricCard('avgLatency', '-', '', false);
            updateMetricCard('totalRequests', '-', '', false);
            updateMetricCard('availability', '-', '', false);
            updateMetricCard('errorRate', '-', '', false);
            return;
        }

        // 2. Update Metric Cards
        updateMetricCard('avgLatency', serviceMetrics.avgLatency !== null ? serviceMetrics.avgLatency : '-', 'ms', false);
        updateMetricCard('totalRequests', serviceMetrics.invocations, '', true);
        updateMetricCard('availability', serviceMetrics.uptime, '', true);

        // Calculate Error Rate for display
        const total = serviceMetrics.invocations || 0;
        const totalErrs = (serviceMetrics.errors || 0) + (serviceMetrics.logErrors || 0);
        let errRate = 0;
        if (total > 0) errRate = ((totalErrs / total) * 100).toFixed(2);
        updateMetricCard('errorRate', errRate, '%', false);

        // 3. Update Charts (Accumulate data points)
        processMainChart(result.timestamp, serviceMetrics);
        renderErrorChart(serviceMetrics);

        // 4. Filter and Render Logs
        const serviceLogs = result.logs ? result.logs.filter(l => l.functionId === SERVICE_ID) : [];
        renderLogs(serviceLogs);

    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
    }
}

function renderLogs(logs) {
    const tableBody = document.getElementById('logsTableBody');
    if (!tableBody) return;

    if (!logs || logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent logs found for this service.</td></tr>';
        return;
    }

    tableBody.innerHTML = logs.map(log => `
        <tr>
            <td><span class="badge ${getStatusBadgeClass(log.type === 'ERROR' ? 500 : 200)}">${log.type}</span></td>
            <td><span class="badge-method badge-GET">LOG</span></td>
            <td>${formatTime(log.timestamp)}</td>
            <td title="${log.message}" style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${log.message}</td>
            <td class="text-muted small font-monospace">-</td>
        </tr>
    `).join('');
}

// --- Rendering Functions ---

// --- Rendering Functions ---

function updateMetricCard(type, value, unit, isPositiveTrend) {
    const valueEl = document.getElementById(`${type}Value`);
    // const changeEl = document.getElementById(`${type}Change`); 

    if (valueEl) valueEl.textContent = `${value}${unit}`;
}

function processMainChart(timestamp, metrics) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;

    if (!mainChart) {
        mainChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Avg Latency (ms)',
                        data: [],
                        borderColor: '#3b82f6',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'Total Requests',
                        data: [],
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
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Requests (15m sum)' } }
                }
            }
        });
    }

    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add new data point
    mainChart.data.labels.push(timeLabel);

    const latency = metrics.avgLatency || 0;
    const requests = metrics.invocations || 0;

    mainChart.data.datasets[0].data.push(latency);
    mainChart.data.datasets[1].data.push(requests);

    // Keep only last 20 points
    if (mainChart.data.labels.length > 20) {
        mainChart.data.labels.shift();
        mainChart.data.datasets[0].data.shift();
        mainChart.data.datasets[1].data.shift();
    }

    mainChart.update();
}

function renderErrorChart(metrics) {
    const ctx = document.getElementById('errorChart');
    if (!ctx) return;

    // Derived values
    const total = metrics.invocations || 0;
    const errors = (metrics.errors || 0) + (metrics.logErrors || 0);
    const success = Math.max(0, total - errors);

    const data = {
        labels: ['Success', 'Errors'],
        values: [success, errors]
    };

    if (errorChart) {
        errorChart.data.datasets[0].data = data.values;
        errorChart.update();
        return;
    }

    errorChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ['#10b981', '#ef4444'],
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



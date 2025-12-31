/**
 * Admin Bulk Import Charts
 * Handles the initialization and rendering of charts on the Bulk Import page.
 */

document.addEventListener('DOMContentLoaded', function () {
    // specific chart initialization
    initializeImportCharts();
});

let importsOverTimeChart, importStatusChart, categoryChart, brandChart;

function initializeImportCharts() {
    console.log('Initializing Import Charts...');

    // 1. Imports Over Time (Line Chart)
    const importsCtx = document.getElementById('importsOverTimeChart');
    if (importsCtx) {
        importsOverTimeChart = new Chart(importsCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Imports',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        grid: {
                            display: true,
                            color: '#f0f0f0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // 2. Success vs Failed Imports (Design 2: Doughnut Chart)
    const statusCtx = document.getElementById('importStatusChart');
    if (statusCtx) {
        importStatusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Successful', 'Failed'],
                datasets: [{
                    data: [85, 15],
                    backgroundColor: [
                        '#10b981', // Success (Emerald)
                        '#ef4444'  // Failed (Red)
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%', // Thinner ring (Design 2)
                plugins: {
                    legend: {
                        position: 'right', // Legend Right (Design 2)
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    // 3. Products by Category (Bar Chart)
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        categoryChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: ['Smartphones', 'Laptops', 'Tablets', 'Audio', 'TVs'],
                datasets: [{
                    label: 'Products',
                    data: [65, 59, 80, 81, 56],
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
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
                        beginAtZero: true
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // 4. Products by Brand (Design 2: Doughnut Chart)
    const brandCtx = document.getElementById('brandChart');
    if (brandCtx) {
        brandChart = new Chart(brandCtx, {
            type: 'doughnut',
            data: {
                labels: ['Samsung', 'Apple', 'Huawei', 'Other'],
                datasets: [{
                    data: [40, 35, 15, 10],
                    backgroundColor: [
                        '#3b82f6', // Blue
                        '#06b6d4', // Cyan
                        '#ec4899', // Pink
                        '#f59e0b'  // Amber
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%', // Thinner ring (Design 2)
                plugins: {
                    legend: {
                        position: 'right', // Legend Right (Design 2)
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }
}

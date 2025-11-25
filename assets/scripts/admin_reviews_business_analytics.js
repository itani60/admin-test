// Hardcoded reviews data
const reviewsData = [
    {
        id: 'rabs-itani#user123',
        businessId: 'rabs-itani',
        businessName: 'Tech Solutions Inc.',
        reviewerId: 'user123',
        reviewerName: 'John Doe',
        reviewerEmail: 'john@example.com',
        rating: 5,
        comment: 'Excellent service! The team was very professional and delivered exactly what was promised.',
        date: '2025-01-15T10:30:00Z',
        helpfulCount: 12
    },
    {
        id: 'rabs-itani#user456',
        businessId: 'rabs-itani',
        businessName: 'Tech Solutions Inc.',
        reviewerId: 'user456',
        reviewerName: 'Sarah Miller',
        reviewerEmail: 'sarah@example.com',
        rating: 4,
        comment: 'Good service overall. Could improve on response time but quality was great.',
        date: '2025-01-14T14:20:00Z',
        helpfulCount: 8
    },
    {
        id: 'abc-services#user789',
        businessId: 'abc-services',
        businessName: 'ABC Services',
        reviewerId: 'user789',
        reviewerName: 'Mike Johnson',
        reviewerEmail: 'mike@example.com',
        rating: 5,
        comment: 'Amazing experience! Highly recommend this business to everyone.',
        date: '2025-01-13T09:15:00Z',
        helpfulCount: 15
    },
    {
        id: 'xyz-company#user321',
        businessId: 'xyz-company',
        businessName: 'XYZ Company',
        reviewerId: 'user321',
        reviewerName: 'Emma Davis',
        reviewerEmail: 'emma@example.com',
        rating: 3,
        comment: 'Average service. Nothing special but nothing bad either.',
        date: '2025-01-12T16:45:00Z',
        helpfulCount: 3
    },
    {
        id: 'rabs-itani#user654',
        businessId: 'rabs-itani',
        businessName: 'Tech Solutions Inc.',
        reviewerId: 'user654',
        reviewerName: 'David Wilson',
        reviewerEmail: 'david@example.com',
        rating: 2,
        comment: 'Not satisfied with the service. Had to wait too long and the quality was poor.',
        date: '2025-01-11T11:00:00Z',
        helpfulCount: 1
    },
    {
        id: 'abc-services#user987',
        businessId: 'abc-services',
        businessName: 'ABC Services',
        reviewerId: 'user987',
        reviewerName: 'Lisa Brown',
        reviewerEmail: 'lisa@example.com',
        rating: 5,
        comment: 'Outstanding service! Exceeded all expectations. Will definitely use again.',
        date: '2025-01-10T08:30:00Z',
        helpfulCount: 20
    },
    {
        id: 'xyz-company#user111',
        businessId: 'xyz-company',
        businessName: 'XYZ Company',
        reviewerId: 'user111',
        reviewerName: 'Robert Taylor',
        reviewerEmail: 'robert@example.com',
        rating: 4,
        comment: 'Very good service. Professional staff and timely delivery.',
        date: '2025-01-09T13:20:00Z',
        helpfulCount: 7
    },
    {
        id: 'tech-solutions#user222',
        businessId: 'tech-solutions',
        businessName: 'Tech Solutions Inc.',
        reviewerId: 'user222',
        reviewerName: 'Jennifer Lee',
        reviewerEmail: 'jennifer@example.com',
        rating: 5,
        comment: 'Perfect! Everything was done exactly as requested. Very happy with the results.',
        date: '2025-01-08T15:45:00Z',
        helpfulCount: 18
    },
    {
        id: 'abc-services#user333',
        businessId: 'abc-services',
        businessName: 'ABC Services',
        reviewerId: 'user333',
        reviewerName: 'Michael Chen',
        reviewerEmail: 'michael@example.com',
        rating: 1,
        comment: 'Terrible experience. Poor communication and subpar quality.',
        date: '2025-01-07T10:15:00Z',
        helpfulCount: 0
    },
    {
        id: 'xyz-company#user444',
        businessId: 'xyz-company',
        businessName: 'XYZ Company',
        reviewerId: 'user444',
        reviewerName: 'Amanda White',
        reviewerEmail: 'amanda@example.com',
        rating: 4,
        comment: 'Good service with room for improvement. Overall satisfied.',
        date: '2025-01-06T12:00:00Z',
        helpfulCount: 5
    }
];

// Top businesses data
const topBusinessesData = [
    { businessId: 'tech-solutions', businessName: 'Tech Solutions Inc.', avgRating: 4.8, totalReviews: 156, fiveStarReviews: 132 },
    { businessId: 'abc-services', businessName: 'ABC Services', avgRating: 4.6, totalReviews: 98, fiveStarReviews: 78 },
    { businessId: 'xyz-company', businessName: 'XYZ Company', avgRating: 4.4, totalReviews: 87, fiveStarReviews: 65 },
    { businessId: 'rabs-itani', businessName: 'Rabs Itani', avgRating: 4.2, totalReviews: 124, fiveStarReviews: 89 },
    { businessId: 'premium-services', businessName: 'Premium Services', avgRating: 4.1, totalReviews: 76, fiveStarReviews: 54 }
];

let filteredReviews = [...reviewsData];

// Scroll prevention for charts
const preventScroll = (e) => {
    e.stopPropagation();
    e.preventDefault();
    return false;
};

// Initialize charts
function initCharts() {
    // Rating Distribution Chart
    const ratingCtx = document.getElementById('ratingDistributionChart');
    
    // Add scroll prevention
    ratingCtx.addEventListener('wheel', preventScroll, { passive: false });
    ratingCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
    ratingCtx.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - (ratingCtx._lastTouchX || touch.clientX);
            const deltaY = touch.clientY - (ratingCtx._lastTouchY || touch.clientY);
            ratingCtx._lastTouchX = touch.clientX;
            ratingCtx._lastTouchY = touch.clientY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                e.preventDefault();
            }
        }
    }, { passive: false });

    new Chart(ratingCtx, {
        type: 'doughnut',
        data: {
            labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
            datasets: [{
                data: [
                    reviewsData.filter(r => r.rating === 5).length,
                    reviewsData.filter(r => r.rating === 4).length,
                    reviewsData.filter(r => r.rating === 3).length,
                    reviewsData.filter(r => r.rating === 2).length,
                    reviewsData.filter(r => r.rating === 1).length
                ],
                backgroundColor: [
                    '#28a745',
                    '#17a2b8',
                    '#ffc107',
                    '#fd7e14',
                    '#dc3545'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
        }
    });

    // Reviews Over Time Chart
    const timeCtx = document.getElementById('reviewsOverTimeChart');
    
    // Add scroll prevention
    timeCtx.addEventListener('wheel', preventScroll, { passive: false });
    timeCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
    timeCtx.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - (timeCtx._lastTouchX || touch.clientX);
            const deltaY = touch.clientY - (timeCtx._lastTouchY || touch.clientY);
            timeCtx._lastTouchX = touch.clientX;
            timeCtx._lastTouchY = touch.clientY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                e.preventDefault();
            }
        }
    }, { passive: false });

    new Chart(timeCtx, {
        type: 'line',
        data: {
            labels: ['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6', 'Jan 7'],
            datasets: [{
                label: 'Reviews',
                data: [12, 19, 15, 25, 22, 18, 24],
                borderColor: '#2563eb',
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
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
        }
    });
}

function renderReviews() {
    const tbody = document.getElementById('reviewsTableBody');
    tbody.innerHTML = '';

    if (filteredReviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No reviews found</td></tr>';
        return;
    }

    filteredReviews.forEach(review => {
        const row = document.createElement('tr');
        const reviewDate = new Date(review.date).toLocaleDateString();
        const commentPreview = review.comment.length > 60 
            ? review.comment.substring(0, 60) + '...' 
            : review.comment;

        const ratingClass = review.rating >= 4 ? 'high' : review.rating >= 3 ? 'medium' : 'low';

        row.innerHTML = `
            <td>
                <div class="business-name">${review.businessName}</div>
                <small class="text-muted">${review.businessId}</small>
            </td>
            <td>
                <div class="reviewer-name">${review.reviewerName}</div>
                <small class="text-muted">${review.reviewerEmail}</small>
            </td>
            <td>
                <div class="rating-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                <span class="badge-rating ${ratingClass}">${review.rating}/5</span>
            </td>
            <td>
                <div class="review-comment" title="${review.comment}">${commentPreview}</div>
            </td>
            <td>${reviewDate}</td>
            <td>
                <i class="fas fa-thumbs-up text-primary"></i> ${review.helpfulCount}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderTopBusinesses() {
    const tbody = document.getElementById('topBusinessesTableBody');
    tbody.innerHTML = '';

    topBusinessesData.forEach((business, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="badge bg-primary">#${index + 1}</span>
            </td>
            <td>
                <div class="business-name">${business.businessName}</div>
                <small class="text-muted">${business.businessId}</small>
            </td>
            <td>
                <div class="rating-stars">${'★'.repeat(Math.round(business.avgRating))}${'☆'.repeat(5 - Math.round(business.avgRating))}</div>
                <span class="badge-rating high">${business.avgRating.toFixed(1)}</span>
            </td>
            <td>${business.totalReviews}</td>
            <td>${business.fiveStarReviews}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterReviews() {
    const businessFilter = document.getElementById('businessFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

    filteredReviews = reviewsData.filter(review => {
        const businessMatch = businessFilter === 'all' || review.businessId === businessFilter;
        const ratingMatch = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);
        const searchMatch = !searchFilter || 
            review.businessName.toLowerCase().includes(searchFilter) ||
            review.reviewerName.toLowerCase().includes(searchFilter) ||
            review.comment.toLowerCase().includes(searchFilter);

        let dateMatch = true;
        if (dateFilter !== 'all') {
            const reviewDate = new Date(review.date);
            const now = new Date();
            const diffTime = now - reviewDate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (dateFilter === 'today' && diffDays >= 1) dateMatch = false;
            else if (dateFilter === 'week' && diffDays >= 7) dateMatch = false;
            else if (dateFilter === 'month' && diffDays >= 30) dateMatch = false;
            else if (dateFilter === 'year' && diffDays >= 365) dateMatch = false;
        }

        return businessMatch && ratingMatch && dateMatch && searchMatch;
    });

    renderReviews();
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

// Check Login State
async function checkLoginState() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.loggedIn && data.user) {
            const userAvatar = document.getElementById('userAvatar');
            const userName = document.getElementById('userName');
            
            if (userAvatar && data.user.name) {
                const initials = data.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                userAvatar.textContent = initials;
            }
            
            if (userName && data.user.name) {
                userName.textContent = data.user.name;
            }
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkLoginState();
    initCharts();
    renderReviews();
    renderTopBusinesses();
});


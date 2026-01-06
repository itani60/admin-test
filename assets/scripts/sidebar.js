document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');

    function toggleSidebar() {
        const isMobile = window.innerWidth < 1025;

        // Unified toggle: 'active' class controls visibility based on CSS
        if (sidebar) sidebar.classList.toggle('active');

        // Unified content toggle: 'sidebar-open' controls margin on desktop
        if (mainContent) mainContent.classList.toggle('sidebar-open');

        if (isMobile) {
            // Mobile specific: toggle overlay and body scroll
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = sidebar && sidebar.classList.contains('active') ? 'hidden' : '';
        }
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('active');
            if (mainContent) mainContent.classList.remove('sidebar-open');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Handle window resize: reset to closed state to ensure consistent UI
    window.addEventListener('resize', () => {
        // Close sidebar on resize to prevent layout issues
        if (sidebar) sidebar.classList.remove('active');
        if (mainContent) mainContent.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close on tile click (mobile UX)
    const tiles = document.querySelectorAll('.sb9-tile');
    tiles.forEach(tile => {
        tile.addEventListener('click', () => {
            if (window.innerWidth < 1025) {
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // User Dropdown functionality matching index.html logic
    if (userProfile && userDropdown) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!userProfile.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                if (typeof window.adminAWSAuthService !== 'undefined') {
                    await window.adminAWSAuthService.logout();
                }
                window.location.href = 'admin-login.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = 'admin-login.html';
            }
        });
    }
});

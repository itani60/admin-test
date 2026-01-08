
        let currentUserRole = 'viewer';

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

                    const userAvatar = document.getElementById('userAvatar');
                    if (userAvatar) userAvatar.textContent = initials;
                    const userName = document.getElementById('userName');
                    if (userName) userName.textContent = displayName;

                    // Update Role
                    currentUserRole = user.role || 'viewer';
                    const rawRole = (user.role || 'viewer').replace('_', ' ');
                    const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
                    const roleHeader = document.getElementById('userRoleHeader');
                    if (roleHeader) roleHeader.textContent = roleDisplay;

                    const ddName = document.getElementById('dropdownUserName');
                    if (ddName) ddName.textContent = displayName;
                    const ddEmail = document.getElementById('dropdownUserEmail');
                    if (ddEmail) ddEmail.textContent = user.email || '';

                    // RBAC Logic
                    if (currentUserRole === 'viewer') {
                        const settingsBtn = document.querySelector('button[onclick="saveCarouselSettings()"]');
                        if (settingsBtn) settingsBtn.style.display = 'none';

                        // We might need to hide savePageSlides button but it might not exist yet (dynamic).
                        // We should handle it in render/creation or check periodically?
                        // Actually, savePageSlides button is static in HTML?
                        // Let's check HTML.
                    }

                } else {
                    window.location.href = 'admin-login.html';
                }
            } catch (error) {
                console.error('Error checking login state:', error);
                window.location.href = 'admin-login.html';
            }
        }

        function initUserDropdown() {
            const userProfile = document.getElementById('userProfile');
            const userDropdown = document.getElementById('userDropdown');
            const logoutBtn = document.getElementById('logoutBtn');

            if (!userProfile || !userDropdown || !logoutBtn) return;

            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!userProfile.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });

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

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initUserDropdown();
                checkLoginState();
            });
        } else {
            initUserDropdown();
            checkLoginState();
        }

        // --- CAROUSEL LOGIC (Design 3 Refactor) ---
        let currentPage = '';
        let pageSlides = {};
        let currentSlideIndex = -1;

        function showAlert(message, type = 'success') {
            const alertContainer = document.getElementById('alertContainer');
            if (!alertContainer) return;
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
            alertContainer.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 5000);
        }

        function onPageSelect(pageValue, pageHTML) {
            currentPage = pageValue;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = pageHTML;

            // Update info display if it exists, or just ensure Title is known
            const infoDisplay = document.getElementById('pageInfoDisplay');
            if (infoDisplay) {
                document.getElementById('currentPageName').textContent = tempDiv.textContent.trim();
                infoDisplay.style.display = 'block';
            }

            // Hide old Add Button if it exists
            const oldAddBtn = document.getElementById('addSlideBtn');
            if (oldAddBtn) oldAddBtn.style.display = 'none';

            // Show D3 Container
            const d3Container = document.getElementById('d3Container');
            if (d3Container) d3Container.style.display = 'grid';

            loadSlidesForPage(pageValue);
        }

        async function loadSlidesForPage(page) {
            const listContainer = document.getElementById('d3SlideList');
            listContainer.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

            try {
                const res = await fetch(`${API_CONFIG.ENDPOINTS.SLIDES}?page=${page}`);
                if (!res.ok) throw new Error('Failed to load slides');
                const data = await res.json();
                const slides = data.slides || [];
                pageSlides[page] = slides;

                // Enable Add Button
                const addBtn = document.getElementById('d3AddBtn');
                if (addBtn) addBtn.disabled = false;

                renderSlideList();

                if (slides.length > 0) {
                    selectSlide(0);
                } else {
                    document.getElementById('d3EmptyFormState').style.display = 'block';
                    document.getElementById('d3RealForm').style.display = 'none';
                    resetPreview();
                }

            } catch (e) {
                console.error(e);
                listContainer.innerHTML = '<div class="text-danger text-center">Failed to load slides</div>';
            }
        }

        function renderSlideList() {
            const listContainer = document.getElementById('d3SlideList');
            listContainer.innerHTML = '';
            const slides = pageSlides[currentPage] || [];

            if (slides.length === 0) {
                listContainer.innerHTML = '<div class="text-center text-muted py-3">No slides found.</div>';
                return;
            }

            slides.forEach((slide, index) => {
                const div = document.createElement('div');
                div.className = `d3-list-item ${index === currentSlideIndex ? 'active' : ''}`;
                div.onclick = () => selectSlide(index);
                div.innerHTML = `
        <div class="fw-bold text-truncate" style="max-width: 200px;">${slide.title || 'Untitled Slide'}</div>
        <div class="badge bg-light text-dark border">${index + 1}</div>
        `;
                listContainer.appendChild(div);
            });
        }

        function selectSlide(index) {
            currentSlideIndex = index;
            renderSlideList(); // Update active class

            const slide = pageSlides[currentPage][index];
            if (!slide) return;

            // Populate Form
            document.getElementById('d3EmptyFormState').style.display = 'none';
            document.getElementById('d3RealForm').style.display = 'block';

            document.getElementById('d3Title').value = slide.title || '';
            document.getElementById('d3Subtitle').value = slide.subtitle || '';
            document.getElementById('d3BtnText').value = slide.buttonText || '';
            document.getElementById('d3BtnLink').value = slide.buttonLink || '';
            document.getElementById('d3ImgDesktop').value = slide.imageUrl || '';
            document.getElementById('d3ImgMobile').value = slide.mobileImageUrl || '';
            document.getElementById('d3Active').checked = slide.active !== false;

            updatePreview();
        }

        function addSlideForPage() {
            if (!currentPage) return;
            const newSlide = {
                id: Date.now().toString(),
                title: 'New Slide',
                subtitle: 'Enter subtitle',
                buttonText: 'Learn More',
                imageUrl: '',
                active: true
            };

            if (!pageSlides[currentPage]) pageSlides[currentPage] = [];
            pageSlides[currentPage].push(newSlide);
            selectSlide(pageSlides[currentPage].length - 1);
        }

        function deleteCurrentSlide() {
            if (currentSlideIndex === -1) return;
            if (confirm('Delete this slide?')) {
                pageSlides[currentPage].splice(currentSlideIndex, 1);

                // Select previous or next or reset
                const slides = pageSlides[currentPage];
                if (slides.length > 0) {
                    currentSlideIndex = Math.min(currentSlideIndex, slides.length - 1);
                    if (currentSlideIndex < 0) currentSlideIndex = 0;
                    selectSlide(currentSlideIndex);
                } else {
                    currentSlideIndex = -1;
                    renderSlideList();
                    document.getElementById('d3EmptyFormState').style.display = 'block';
                    document.getElementById('d3RealForm').style.display = 'none';
                    resetPreview();
                }
            }
        }

        function updatePreviewText() {
            if (currentSlideIndex === -1) return;
            const slide = pageSlides[currentPage][currentSlideIndex];
            slide.title = document.getElementById('d3Title').value;
            slide.subtitle = document.getElementById('d3Subtitle').value;
            slide.buttonText = document.getElementById('d3BtnText').value;

            // Update List Title in UI immediately for better UX
            const listItems = document.querySelectorAll('.d3-list-item');
            if (listItems[currentSlideIndex]) {
                listItems[currentSlideIndex].querySelector('.fw-bold').textContent = slide.title || 'Untitled';
            }

            updatePreview();
        }

        let previewMode = 'desktop';

        function setPreviewMode(mode) {
            previewMode = mode;
            document.getElementById('btnPreviewDesktop').classList.toggle('active', mode === 'desktop');
            document.getElementById('btnPreviewMobile').classList.toggle('active', mode === 'mobile');

            const mockup = document.getElementById('d3PreviewMockup');
            mockup.classList.toggle('mobile-mode', mode === 'mobile');

            updatePreview();
        }

        function updatePreviewBg(type) {
            if (currentSlideIndex === -1) return;
            const slide = pageSlides[currentPage][currentSlideIndex];
            if (type === 'desktop') slide.imageUrl = document.getElementById('d3ImgDesktop').value;
            if (type === 'mobile') slide.mobileImageUrl = document.getElementById('d3ImgMobile').value;
            updatePreview();
        }

        function updatePreview() {
            if (currentSlideIndex === -1 || !pageSlides[currentPage]) return;
            const slide = pageSlides[currentPage][currentSlideIndex];

            document.getElementById('pTitle').textContent = slide.title;
            document.getElementById('pSubtitle').textContent = slide.subtitle;
            document.getElementById('pButton').textContent = slide.buttonText;

            const mockup = document.getElementById('d3PreviewMockup');

            let imgUrl = (previewMode === 'mobile') ? slide.mobileImageUrl : slide.imageUrl;

            if (imgUrl) {
                mockup.style.backgroundImage = `url('${imgUrl}')`;
            } else {
                mockup.style.backgroundImage = 'none';
                mockup.style.backgroundColor = '#1e293b';
            }
        }

        function resetPreview() {
            document.getElementById('pTitle').textContent = 'Title';
            document.getElementById('pSubtitle').textContent = 'Subtitle';
            document.getElementById('pButton').textContent = 'Button';
            const mockup = document.getElementById('d3PreviewMockup');
            mockup.style.backgroundImage = 'none';
            mockup.style.backgroundColor = '#1e293b';
        }

        async function handleD3Upload(type) {
            const inputId = type === 'mobile' ? 'slideMobileImageUpload' : 'slideImageUpload';
            const textId = type === 'mobile' ? 'd3ImgMobile' : 'd3ImgDesktop';

            const fileInput = document.getElementById(inputId);
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById(textId).value = e.target.result;
                    updatePreviewBg(type); // Update with type
                };
                reader.readAsDataURL(file);
            }
        }

        async function savePageSlides() {
            if (currentSlideIndex !== -1) {
                const slide = pageSlides[currentPage][currentSlideIndex];
                slide.title = document.getElementById('d3Title').value;
                slide.subtitle = document.getElementById('d3Subtitle').value;
                slide.buttonText = document.getElementById('d3BtnText').value;
                slide.buttonLink = document.getElementById('d3BtnLink').value;
                slide.imageUrl = document.getElementById('d3ImgDesktop').value;
                slide.mobileImageUrl = document.getElementById('d3ImgMobile').value;
                slide.active = document.getElementById('d3Active').checked;
            }

            // Save to API
            const slidesData = pageSlides[currentPage];
            const btn = document.querySelector('button[onclick="savePageSlides()"]');
            if (btn) {
                var originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                btn.disabled = true;
            }

            try {
                const res = await fetch(API_CONFIG.ENDPOINTS.SLIDES, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page: currentPage, slides: slidesData })
                });

                if (!res.ok) throw new Error('Failed to save slides');
                showAlert(`Slides for ${currentPage} saved successfully!`, 'success');
            } catch (err) {
                console.error(err);
                showAlert('Failed to save slides', 'danger');
            } finally {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }
        }



        function initCustomDropdown(dropdownId, textId, hiddenInputId, onSelect) {
            const dropdown = document.getElementById(dropdownId);
            const dropdownBtn = dropdown.querySelector('.custom-dropdown-btn');
            const dropdownText = document.getElementById(textId);
            const hiddenInput = document.getElementById(hiddenInputId);
            const dropdownItems = dropdown.querySelectorAll('.custom-dropdown-item');

            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.custom-dropdown').forEach(dd => {
                    if (dd !== dropdown) dd.classList.remove('active');
                });
                dropdown.classList.toggle('active');
            });

            dropdownItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownItems.forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    const value = item.getAttribute('data-value');
                    const text = item.innerHTML;
                    dropdownText.innerHTML = text;
                    hiddenInput.value = value;
                    dropdown.classList.remove('active');
                    if (onSelect) onSelect(value, text);
                });
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.custom-dropdown').forEach(dd => dd.classList.remove('active'));
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            initCustomDropdown('animationDropdown', 'animationDropdownText', 'animationEffect');
            initCustomDropdown('paginationDropdown', 'paginationDropdownText', 'paginationStyle');
            initCustomDropdown('pageSelectionDropdown', 'pageSelectionDropdownText', 'selectedPage', onPageSelect);

            // Load Settings
            loadCarouselSettings();
        });

        async function loadCarouselSettings() {
            try {
                const res = await fetch(API_CONFIG.ENDPOINTS.SETTINGS);
                if (!res.ok) throw new Error('Failed to load settings');
                const data = await res.json();

                // Use fetched settings or defaults if empty
                const mockSettings = data.settings || {
                    autoplayInterval: 5,
                    transitionSpeed: 500,
                    enableAutoplay: true,
                    showArrows: true,
                    animationEffect: 'slide',
                    paginationStyle: 'dots'
                };

                document.getElementById('autoplayInterval').value = mockSettings.autoplayInterval;
                document.getElementById('transitionSpeed').value = mockSettings.transitionSpeed;
                document.getElementById('enableAutoplay').checked = mockSettings.enableAutoplay;
                document.getElementById('showArrows').checked = mockSettings.showArrows;

                // Update dropdowns
                updateDropdownSelection('animationDropdown', mockSettings.animationEffect);
                updateDropdownSelection('paginationDropdown', mockSettings.paginationStyle);
            } catch (error) {
                console.error(error);
            }
        }

        function updateDropdownSelection(id, value) {
            const dropdown = document.getElementById(id);
            const item = dropdown.querySelector(`.custom-dropdown-item[data-value="${value}"]`);
            if (item) item.click();
        }

        async function saveCarouselSettings() {
            const settings = {
                autoplayInterval: document.getElementById('autoplayInterval').value,
                transitionSpeed: document.getElementById('transitionSpeed').value,
                enableAutoplay: document.getElementById('enableAutoplay').checked,
                showArrows: document.getElementById('showArrows').checked,
                animationEffect: document.getElementById('animationEffect').value,
                paginationStyle: document.getElementById('paginationStyle').value
            };

            const btn = document.querySelector('button[onclick="saveCarouselSettings()"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            try {
                const res = await fetch(API_CONFIG.ENDPOINTS.SETTINGS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });

                if (!res.ok) throw new Error('Failed to save settings');

                showAlert('Carousel settings saved successfully!', 'success');
            } catch (error) {
                showAlert('Failed to save settings', 'danger');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }





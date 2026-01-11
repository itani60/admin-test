// --- API CONFIGURATION ---
const API_CONFIG = {
    BASE_URL: 'https://hub.comparehubprices.co.za/admin', // Change this if needed
    get ENDPOINTS() {
        return {
            SETTINGS: `${this.BASE_URL}/carousel-settings`,
            SLIDES: `${this.BASE_URL}/carousel-slides`,
            UPLOAD: `${this.BASE_URL}/upload-url`
        };
    }
};

// --- CAROUSEL LOGIC (Design 3 Refactor) ---
let currentPage = '';
let pageSlides = {};
let currentSlideIndex = -1;
let currentUserRole = 'viewer';

// Initialize RBAC and User Info
// Initialize RBAC and User Info
async function initRBAC() {
    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.error('adminAWSAuthService is not defined');
            return;
        }

        const result = await window.adminAWSAuthService.getUserInfo();

        if (result.success && window.adminAWSAuthService.hasPermission('canManageHero')) {
            currentUserRole = result.user.role || 'viewer';
            initPage();
        } else {
            console.warn('User not authorized, redirecting...');
            if (result.success) window.location.href = 'index.html';
            else window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error in initRBAC:', error);
        window.location.href = 'admin-login.html';
    }
}

function initPage() {
    initCustomDropdown('animationDropdown', 'animationDropdownText', 'animationEffect');
    initCustomDropdown('paginationDropdown', 'paginationDropdownText', 'paginationStyle');
    initCustomDropdown('pageSelectionDropdown', 'pageSelectionDropdownText', 'selectedPage', onPageSelect);

    // Load Settings
    loadCarouselSettings();

    // Attach event listeners for static buttons
    const btnPreviewDesktop = document.getElementById('btnPreviewDesktop');
    if (btnPreviewDesktop) btnPreviewDesktop.addEventListener('click', () => setPreviewMode('desktop'));

    const btnPreviewMobile = document.getElementById('btnPreviewMobile');
    if (btnPreviewMobile) btnPreviewMobile.addEventListener('click', () => setPreviewMode('mobile'));

    const d3AddBtn = document.getElementById('d3AddBtn');
    if (d3AddBtn) d3AddBtn.addEventListener('click', addSlideForPage);
}

// --- Helper Functions ---

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

    // Update info display if it exists
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

// Global functions exposed for inline onclicks in generated HTML or if needed
// Moving away from inline, but some might still be bound via onclick in innerHTML
window.deleteCurrentSlide = deleteCurrentSlide;
window.savePageSlides = savePageSlides;


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

// Expose for input listeners
window.updatePreviewText = updatePreviewText;

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
window.updatePreviewBg = updatePreviewBg;

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
window.handleD3Upload = handleD3Upload;

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
    // Find button by onclick, or better, by specific selector if we update HTML. 
    // For now, looking for the button inside d3RealForm or similar
    // The original code used querySelector('button[onclick="savePageSlides()"]')

    // Let's assume we'll update the HTML to give it an ID, but fallback to searching
    let btn = document.getElementById('btnSavePageSlides');
    if (!btn) {
        // Fallback if ID is not yet in HTML
        const buttons = document.querySelectorAll('button');
        for (const b of buttons) {
            if (b.textContent.includes('Save Changes')) {
                btn = b;
                break;
            }
        }
    }

    var originalHTML = btn ? btn.innerHTML : '';
    if (btn) {
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
    if (!dropdown) return;

    const dropdownBtn = dropdown.querySelector('.custom-dropdown-btn');
    const dropdownText = document.getElementById(textId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const dropdownItems = dropdown.querySelectorAll('.custom-dropdown-item');

    if (dropdownBtn) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-dropdown').forEach(dd => {
                if (dd !== dropdown) dd.classList.remove('active');
            });
            dropdown.classList.toggle('active');
        });
    }

    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            const value = item.getAttribute('data-value');
            const text = item.innerHTML;
            if (dropdownText) dropdownText.innerHTML = text;
            if (hiddenInput) hiddenInput.value = value;
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

        if (document.getElementById('autoplayInterval')) document.getElementById('autoplayInterval').value = mockSettings.autoplayInterval;
        if (document.getElementById('transitionSpeed')) document.getElementById('transitionSpeed').value = mockSettings.transitionSpeed;
        if (document.getElementById('enableAutoplay')) document.getElementById('enableAutoplay').checked = mockSettings.enableAutoplay;
        if (document.getElementById('showArrows')) document.getElementById('showArrows').checked = mockSettings.showArrows;

        // Update dropdowns
        updateDropdownSelection('animationDropdown', mockSettings.animationEffect);
        updateDropdownSelection('paginationDropdown', mockSettings.paginationStyle);
    } catch (error) {
        console.error(error);
    }
}

function updateDropdownSelection(id, value) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
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

    // Try to find the button
    let btn = document.getElementById('btnSaveGlobalSettings');
    if (!btn) {
        // Fallback search
        btn = document.querySelector('button[title="Save Configuration"]');
    }

    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;
    }

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
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}
// Expose
window.saveCarouselSettings = saveCarouselSettings;

// Main Init
document.addEventListener('DOMContentLoaded', initRBAC);

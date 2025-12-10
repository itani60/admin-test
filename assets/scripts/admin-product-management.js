// Configuration
const API_CONFIG = {
    BASE_URL: 'https://hub.comparehubprices.co.za/data',
    LIST_PRODUCTS_ENDPOINT: '/products',
    GET_PRODUCT_ENDPOINT: '/products',
    UPDATE_PRODUCT_ENDPOINT: '/products',
    DELETE_PRODUCT_ENDPOINT: '/products',
};

let currentPage = 1;
let pageSize = 25;
let lastKey = null;
let currentCategory = '';

// Load saved API URL
const savedUrl = localStorage.getItem('comparehubprices_api_url');
if (savedUrl) {
    API_CONFIG.BASE_URL = savedUrl;
}

// Categories
const CATEGORIES = [
    { value: 'smartphones', label: 'Smartphones' },
    { value: 'windows-laptops', label: 'Windows Laptops' },
    { value: 'macbooks-laptops', label: 'MacBooks' },
    { value: 'chromebooks-laptops', label: 'Chromebooks' },
    { value: 'tablets', label: 'Tablets' },
    { value: 'wearables', label: 'Wearables' },
    { value: 'televisions', label: 'Televisions' },
    { value: 'audio', label: 'Audio' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'appliances', label: 'Appliances' }
];

// Smartphone brands
const SMARTPHONE_BRANDS = [
    'Apple',
    'Huawei',
    'Samsung',
    'Xiaomi',
    'OPPO',
    'Honor',
    'Motorola',
    'Nokia',
    'Tecno',
    'Vivo',
    'Realme'
];

// Initialize category grid
function initializeCategoryGrid() {
    const categoryGrid = document.getElementById('categoryGrid');
    if (!categoryGrid) return;
    
    categoryGrid.innerHTML = '';
    
    // Add category buttons
    CATEGORIES.forEach(cat => {
        const catBtn = document.createElement('button');
        catBtn.type = 'button';
        catBtn.className = 'category-option';
        catBtn.textContent = cat.label;
        catBtn.dataset.category = cat.value;
        catBtn.onclick = () => toggleCategoryOption(cat.value);
        categoryGrid.appendChild(catBtn);
    });
}

// Toggle category option selection (for multi-select in panel)
function toggleCategoryOption(category) {
    const optionBtn = document.querySelector(`.category-option[data-category="${category}"]`);
    if (optionBtn) {
        optionBtn.classList.toggle('active');
    }
}

// Apply category filter
function applyCategoryFilter() {
    const activeCategory = document.querySelector('.category-option.active');
    const category = activeCategory ? activeCategory.dataset.category : '';
    
    // Update the hidden select for compatibility
    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) {
        categorySelect.value = category;
    }
    
    // Update category filter button active state
    const categoryFilterBtn = document.getElementById('categoryFilterBtn');
    if (categoryFilterBtn) {
        if (category) {
            categoryFilterBtn.classList.add('filter-active');
        } else {
            categoryFilterBtn.classList.remove('filter-active');
        }
    }
    
    // Update brand filter based on category
    updateBrandFilter();
    
    // Close the filter panel
    closeFilterPanel('category');
    
    // Load products if category is selected
    if (category) {
        loadProducts();
    }
}

// Clear category filter
function clearCategoryFilter() {
    document.querySelectorAll('.category-option').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Select category from grid (for direct selection - used by restoreState)
function selectCategory(category) {
    // Remove active class from all category options
    document.querySelectorAll('.category-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected category
    const selectedBtn = document.querySelector(`.category-option[data-category="${category}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Update the hidden select for compatibility
    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) {
        categorySelect.value = category;
    }
    
    // Update category filter button active state
    const categoryFilterBtn = document.getElementById('categoryFilterBtn');
    if (categoryFilterBtn) {
        if (category) {
            categoryFilterBtn.classList.add('filter-active');
        } else {
            categoryFilterBtn.classList.remove('filter-active');
        }
    }
    
    // Update brand filter based on category
    updateBrandFilter();
}

// Update brand filter based on category
function updateBrandFilter() {
    const categorySelect = document.getElementById('categoryFilter');
    if (!categorySelect) return;
    
    const category = categorySelect.value;
    const brandSelect = document.getElementById('brandFilter');
    const brandText = document.getElementById('brandFilterText');
    const brandGrid = document.getElementById('brandGrid');
    const brandOptions = document.getElementById('brandOptions');
    const brandFilterBtn = document.getElementById('brandFilterBtn');
    
    // Clear existing options
    if (brandSelect) {
        brandSelect.innerHTML = '<option value="">All Brands</option>';
    }
    if (brandGrid) {
        brandGrid.innerHTML = '';
    }
    
    if (category === 'smartphones') {
        // Show brand filter button and grid
        if (brandFilterBtn) brandFilterBtn.style.display = 'inline-flex';
        if (brandSelect) brandSelect.style.display = 'none';
        if (brandText) brandText.style.display = 'none';
        
        // Populate brand grid
        if (brandGrid) {
            SMARTPHONE_BRANDS.forEach(brand => {
                const brandBtn = document.createElement('button');
                brandBtn.type = 'button';
                brandBtn.className = 'brand-option';
                brandBtn.textContent = brand;
                brandBtn.dataset.brand = brand.toLowerCase();
                brandBtn.onclick = () => toggleBrandOption(brand.toLowerCase());
                brandGrid.appendChild(brandBtn);
            });
        }
    } else if (category) {
        // For other categories, show brand filter button (but use text input in panel)
        if (brandFilterBtn) brandFilterBtn.style.display = 'inline-flex';
        // Keep brand options panel available but it will use text input
        if (brandSelect) brandSelect.style.display = 'none';
        if (brandText) brandText.style.display = 'none'; // Will show in panel when opened
        if (brandGrid) brandGrid.style.display = 'none';
    } else {
        // No category selected, hide brand filter
        if (brandFilterBtn) brandFilterBtn.style.display = 'none';
        if (brandOptions) brandOptions.style.display = 'none';
        if (brandSelect) brandSelect.style.display = 'none';
        if (brandText) brandText.style.display = 'none';
        if (brandGrid) brandGrid.style.display = 'none';
    }
}

// Toggle brand option selection (for multi-select in panel)
function toggleBrandOption(brand) {
    const optionBtn = document.querySelector(`.brand-option[data-brand="${brand}"]`);
    if (optionBtn) {
        optionBtn.classList.toggle('active');
    }
}

// Apply brand filter
function applyBrandFilter() {
    const categorySelect = document.getElementById('categoryFilter');
    if (!categorySelect) return;
    
    const category = categorySelect.value;
    let brand = '';
    
    if (category === 'smartphones') {
        // Get brand from active button
        const activeBrand = document.querySelector('.brand-option.active');
        brand = activeBrand ? activeBrand.dataset.brand : '';
        // Convert to proper case for API
        if (brand && SMARTPHONE_BRANDS.includes(brand.charAt(0).toUpperCase() + brand.slice(1))) {
            brand = brand.charAt(0).toUpperCase() + brand.slice(1);
        }
    } else {
        // Get brand from text input
        const brandText = document.getElementById('brandFilterText');
        brand = brandText ? brandText.value.trim() : '';
    }
    
    // Update the hidden select for compatibility
    const brandSelect = document.getElementById('brandFilter');
    if (brandSelect) {
        brandSelect.value = brand;
    }
    
    // Update brand filter button active state
    const brandFilterBtn = document.getElementById('brandFilterBtn');
    if (brandFilterBtn) {
        if (brand) {
            brandFilterBtn.classList.add('filter-active');
        } else {
            brandFilterBtn.classList.remove('filter-active');
        }
    }
    
    // Close the filter panel
    closeFilterPanel('brand');
    
    // Load products if category is selected
    if (category) {
        loadProducts();
    }
}

// Clear brand filter
function clearBrandFilter() {
    document.querySelectorAll('.brand-option').forEach(btn => {
        btn.classList.remove('active');
    });
    const brandText = document.getElementById('brandFilterText');
    if (brandText) {
        brandText.value = '';
    }
}

// Select brand from grid (for direct selection - legacy)
function selectBrand(brand) {
    // Remove active class from all brand options
    document.querySelectorAll('.brand-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected brand
    const selectedBtn = document.querySelector(`.brand-option[data-brand="${brand}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Update the hidden select for compatibility
    const brandSelect = document.getElementById('brandFilter');
    if (brandSelect) {
        brandSelect.value = brand;
    }
    
    // Auto-load products if category is selected
    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect && categorySelect.value) {
        loadProducts();
    }
}

// Toggle filter panel
function toggleFilterPanel(filterType) {
    const panel = document.getElementById(`${filterType}Options`);
    const btn = document.getElementById(`${filterType}FilterBtn`);
    
    if (!panel || !btn) return;
    
    // Close other panels
    document.querySelectorAll('.filter-options').forEach(p => {
        if (p.id !== `${filterType}Options`) {
            p.style.display = 'none';
        }
    });
    
    // Remove active from other buttons
    document.querySelectorAll('.filter-btn').forEach(b => {
        if (b.id !== `${filterType}FilterBtn`) {
            b.classList.remove('filter-active');
        }
    });
    
    // Toggle current panel
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        btn.classList.add('filter-active');
        
        // If brand panel and not smartphones, show text input
        if (filterType === 'brand') {
            const categorySelect = document.getElementById('categoryFilter');
            const category = categorySelect ? categorySelect.value : '';
            const brandGrid = document.getElementById('brandGrid');
            const brandTextContainer = document.getElementById('brandTextInputContainer');
            
            if (category === 'smartphones') {
                if (brandGrid) brandGrid.style.display = 'grid';
                if (brandTextContainer) brandTextContainer.style.display = 'none';
            } else if (category) {
                if (brandGrid) brandGrid.style.display = 'none';
                if (brandTextContainer) brandTextContainer.style.display = 'block';
            }
        }
    } else {
        panel.style.display = 'none';
        btn.classList.remove('filter-active');
    }
}

// Close filter panel
function closeFilterPanel(filterType) {
    const panel = document.getElementById(`${filterType}Options`);
    const btn = document.getElementById(`${filterType}FilterBtn`);
    if (panel) panel.style.display = 'none';
    if (btn) btn.classList.remove('filter-active');
}

// Load products from API
async function loadProducts() {
    // Get category from active button or select
    let category = '';
    const activeCategory = document.querySelector('.category-option.active');
    if (activeCategory) {
        category = activeCategory.dataset.category || '';
    } else {
        const categorySelect = document.getElementById('categoryFilter');
        category = categorySelect ? categorySelect.value : '';
    }
    
    const brandSelect = document.getElementById('brandFilter');
    const brandText = document.getElementById('brandFilterText');
    const brandGrid = document.getElementById('brandGrid');
    
    // Get brand value - check grid first (for smartphones), then select, then text input
    let brand = '';
    if (category === 'smartphones') {
        const activeBrand = document.querySelector('.brand-option.active');
        brand = activeBrand ? (activeBrand.dataset.brand || '').trim() : '';
        // Convert to proper case for API (e.g., "apple" -> "Apple")
        if (brand && SMARTPHONE_BRANDS.includes(brand.charAt(0).toUpperCase() + brand.slice(1))) {
            brand = brand.charAt(0).toUpperCase() + brand.slice(1);
        }
    } else {
        brand = brandText ? brandText.value.trim() : '';
    }
    
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.trim() : '';
    const pageSizeSelect = document.getElementById('pageSize');
    const size = pageSizeSelect ? parseInt(pageSizeSelect.value) : 25;

    // Category is required - API requires it
    if (!category) {
        showAlert('Please select a category first', 'warning');
        return;
    }

    currentCategory = category;
    pageSize = size;
    currentPage = 1;
    lastKey = null;

    try {
        // Build query parameters (API requires category, search is handled client-side)
        let url = `${API_CONFIG.BASE_URL}${API_CONFIG.LIST_PRODUCTS_ENDPOINT}?category=${encodeURIComponent(category)}&limit=${pageSize}`;
        if (brand) url += `&brand=${encodeURIComponent(brand)}`;
        // Note: Search is handled client-side since API doesn't support search parameter
        if (lastKey) url += `&lastKey=${encodeURIComponent(lastKey)}`;

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const products = data.body ? JSON.parse(data.body) : data;
        let allProducts = products.products || products.items || [];

        // Client-side filtering for search term
        if (search && allProducts.length > 0) {
            const searchLower = search.toLowerCase();
            allProducts = allProducts.filter(product => {
                const model = (product.model || '').toLowerCase();
                const brand = (product.brand || '').toLowerCase();
                const productId = (product.product_id || '').toLowerCase();
                const description = (product.description || '').toLowerCase();
                
                return model.includes(searchLower) || 
                       brand.includes(searchLower) || 
                       productId.includes(searchLower) ||
                       description.includes(searchLower);
            });
        }

        displayProducts(allProducts);
        updateStats(allProducts.length);
        updatePagination(products.lastKey);

    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('Error loading products: ' + error.message, 'danger');
    }
}

// Display products
function displayProducts(products) {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-box-open"></i>
                <h4>No products found</h4>
                <p>Try adjusting your filters or select a different category</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        const lowestPrice = getLowestPrice(product.offers);
        const formattedPrice = lowestPrice ? lowestPrice.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'Price not available';
        const imageUrl = product.imageUrl || product.image || product.img || 'https://via.placeholder.com/150?text=No+Image';
        const productName = product.model || product.title || 'Unknown Product';
        const brandName = product.brand || 'Unknown Brand';

        // Extract specs
        const specs = [];
        if (product.specs?.Performance?.Ram) specs.push(product.specs.Performance.Ram);
        if (product.specs?.Performance?.Storage) specs.push(product.specs.Performance.Storage);
        if (product.specs?.Os?.['Operating System']) specs.push(product.specs.Os['Operating System']);
        if (product.color) specs.push(product.color);

        const specsHtml = specs.length > 0 ? `<div class="product-specs"><span>${specs.join(' • ')}</span></div>` : '';

        // Get retailer count
        const retailerCount = product.offers?.length || 0;

        return `
            <div class="smartphone-card">
                <div class="card-image-container">
                    <img src="${imageUrl}" alt="${productName}" class="card-image" loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                </div>
                <div class="card-content">
                    <span class="brand-badge">${brandName}</span>
                    <h3 class="product-name">${productName}</h3>
                    ${specsHtml}
                    <div class="product-price">
                        <span class="current-price">${formattedPrice}</span>
                    </div>
                    <div class="retailer-info">
                        <span>${retailerCount} retailer${retailerCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-view" onclick="viewProduct('${product.product_id}', '${product.category}')">View</button>
                    <button class="btn-edit" onclick="editProduct('${product.product_id}', '${product.category}')">Edit</button>
                    <button class="btn-delete" onclick="deleteProduct('${product.product_id}', '${product.category}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Get lowest price from offers
function getLowestPrice(offers) {
    if (!offers || offers.length === 0) return 0;
    const prices = offers.map(o => o.price || o.originalPrice || 0).filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
}

// Update stats
function updateStats(count) {
    const filteredCount = document.getElementById('filteredCount');
    const currentCategoryCount = document.getElementById('currentCategoryCount');
    if (filteredCount) filteredCount.textContent = count;
    if (currentCategoryCount) currentCategoryCount.textContent = count;
}

// Update pagination
function updatePagination(nextKey) {
    const paginationContainer = document.getElementById('paginationContainer');
    const pagination = document.getElementById('pagination');
    
    if (!paginationContainer || !pagination) return;
    
    if (!nextKey && currentPage === 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'block';
    pagination.innerHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="previousPage(); return false;">Previous</a>
        </li>
        <li class="page-item active">
            <span class="page-link">Page ${currentPage}</span>
        </li>
        <li class="page-item ${!nextKey ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="nextPage(); return false;">Next</a>
        </li>
    `;
}

// Pagination functions
function nextPage() {
    if (lastKey) {
        currentPage++;
        loadProducts();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        // Note: DynamoDB doesn't support backward pagination easily
        // You may need to reload from start
        loadProducts();
    }
}

// View product
function viewProduct(productId, category) {
    // Save current state before navigating
    let categoryValue = '';
    const activeCategory = document.querySelector('.category-option.active');
    if (activeCategory) {
        categoryValue = activeCategory.dataset.category || '';
    } else {
        const categorySelect = document.getElementById('categoryFilter');
        categoryValue = categorySelect ? categorySelect.value : '';
    }
    
    let brandValue = '';
    
    // Get brand value based on category type
    if (categoryValue === 'smartphones') {
        const brandGrid = document.getElementById('brandGrid');
        if (brandGrid && brandGrid.style.display !== 'none') {
            const activeBrand = document.querySelector('.brand-option.active');
            brandValue = activeBrand ? (activeBrand.dataset.brand || '') : '';
        } else {
            const brandSelect = document.getElementById('brandFilter');
            brandValue = brandSelect ? brandSelect.value : '';
        }
    } else {
        const brandText = document.getElementById('brandFilterText');
        brandValue = brandText ? brandText.value : '';
    }
    
    const searchInput = document.getElementById('searchInput');
    const pageSizeSelect = document.getElementById('pageSize');
    
    const state = {
        category: categoryValue,
        brand: brandValue,
        search: searchInput ? searchInput.value : '',
        pageSize: pageSizeSelect ? pageSizeSelect.value : '25',
        currentPage: currentPage,
        lastKey: lastKey
    };
    sessionStorage.setItem('productManagementState', JSON.stringify(state));
    
    window.location.href = `admin-view-info.html?product_id=${encodeURIComponent(productId)}&category=${encodeURIComponent(category)}`;
}

// Handle image upload and show preview
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('Image file size must be less than 5MB', 'danger');
        event.target.value = '';
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showAlert('Please select a valid image file', 'danger');
        event.target.value = '';
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const imagePreview = document.getElementById('imagePreview');
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        if (imagePreview) imagePreview.src = e.target.result;
        if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Clear image preview
function clearImagePreview() {
    const editImageFile = document.getElementById('editImageFile');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    if (editImageFile) editImageFile.value = '';
    if (imagePreview) imagePreview.src = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
}

// Edit product
async function editProduct(productId, category) {
    try {
        // Show loading state
        const modalElement = document.getElementById('editProductModal');
        if (!modalElement) return;
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        const modalLabel = document.getElementById('editProductModalLabel');
        const editForm = document.getElementById('editProductForm');
        const modalFooter = document.querySelector('.modal-footer');
        
        if (modalLabel) modalLabel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        if (editForm) editForm.style.opacity = '0.5';
        if (modalFooter) modalFooter.style.display = 'none';

        // Fetch product data
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.GET_PRODUCT_ENDPOINT}/${productId}?category=${category}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const product = data.body ? JSON.parse(data.body) : data;
        const productData = product.product || product;

        // Populate form
        const editProductId = document.getElementById('editProductId');
        const editProductCategory = document.getElementById('editProductCategory');
        const editBrand = document.getElementById('editBrand');
        const editModel = document.getElementById('editModel');
        const editColor = document.getElementById('editColor');
        const editImageUrl = document.getElementById('editImageUrl');
        const editImageFile = document.getElementById('editImageFile');
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const imagePreview = document.getElementById('imagePreview');
        const editDescription = document.getElementById('editDescription');
        const editSpecs = document.getElementById('editSpecs');
        
        if (editProductId) editProductId.value = productId;
        if (editProductCategory) editProductCategory.value = category;
        if (editBrand) editBrand.value = productData.brand || '';
        if (editModel) editModel.value = productData.model || '';
        if (editColor) editColor.value = productData.color || '';
        if (editImageUrl) editImageUrl.value = productData.imageUrl || '';
        if (editImageFile) editImageFile.value = ''; // Clear file input
        if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
        if (imagePreview) imagePreview.src = '';
        if (editDescription) editDescription.value = productData.description || '';
        
        // Show current image if exists
        if (productData.imageUrl) {
            if (imagePreview) imagePreview.src = productData.imageUrl;
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
        }
        if (editSpecs) editSpecs.value = productData.specs ? JSON.stringify(productData.specs, null, 2) : '';

        // Populate offers
        populateOffers(productData.offers || []);

        // Show form
        if (modalLabel) modalLabel.innerHTML = '<i class="fas fa-edit"></i> Edit Product';
        if (editForm) editForm.style.opacity = '1';
        if (modalFooter) modalFooter.style.display = 'flex';

    } catch (error) {
        console.error('Error loading product:', error);
        showAlert('Error loading product: ' + error.message, 'danger');
        const modalElement = document.getElementById('editProductModal');
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    }
}

// Populate offers in the form
function populateOffers(offers) {
    const container = document.getElementById('offersContainer');
    if (!container) return;
    
    container.innerHTML = '';

    if (offers.length === 0) {
        container.innerHTML = '<p class="text-muted">No offers available. Click "Add Offer" to add one.</p>';
        return;
    }

    offers.forEach((offer, index) => {
        addOfferToForm(offer, index);
    });
}

// Add offer to form
function addOfferToForm(offer = {}, index = null) {
    const container = document.getElementById('offersContainer');
    if (!container) return;
    
    const offerIndex = index !== null ? index : container.children.length;
    
    const offerHTML = `
        <div class="offer-item" data-offer-index="${offerIndex}">
            <div class="offer-item-header">
                <span class="offer-item-title">Offer #${offerIndex + 1}</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeOffer(${offerIndex})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Retailer <span class="text-danger">*</span></label>
                    <input type="text" class="form-control offer-retailer" value="${(offer.retailer || '').replace(/"/g, '&quot;')}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">URL</label>
                    <input type="url" class="form-control offer-url" value="${(offer.url || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Price (R) <span class="text-danger">*</span></label>
                    <input type="number" class="form-control offer-price" value="${offer.price || ''}" step="0.01" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Original Price (R)</label>
                    <input type="number" class="form-control offer-original-price" value="${offer.originalPrice || ''}" step="0.01">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Sale Ends</label>
                    <input type="text" class="form-control offer-sale-ends" value="${(offer.saleEnds || '').replace(/"/g, '&quot;')}" placeholder="e.g., 15 December 2024">
                </div>
                <div class="col-md-12">
                    <label class="form-label">Logo URL</label>
                    <input type="url" class="form-control offer-logo-url" value="${(offer.logoUrl || '').replace(/"/g, '&quot;')}">
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', offerHTML);
}

// Add new offer
function addOffer() {
    addOfferToForm();
}

// Remove offer
function removeOffer(index) {
    const offerItem = document.querySelector(`.offer-item[data-offer-index="${index}"]`);
    if (offerItem) {
        offerItem.remove();
        // Reindex remaining offers
        document.querySelectorAll('.offer-item').forEach((item, idx) => {
            item.setAttribute('data-offer-index', idx);
            const titleElement = item.querySelector('.offer-item-title');
            if (titleElement) {
                titleElement.textContent = `Offer #${idx + 1}`;
            }
        });
    }
}

// Save product changes
async function saveProductChanges() {
    const editProductId = document.getElementById('editProductId');
    const editProductCategory = document.getElementById('editProductCategory');
    
    if (!editProductId || !editProductCategory) {
        showAlert('Missing product ID or category', 'danger');
        return;
    }
    
    const productId = editProductId.value;
    const category = editProductCategory.value;
    
    if (!productId || !category) {
        showAlert('Missing product ID or category', 'danger');
        return;
    }

    try {
        // Handle image upload if file is selected
        const editImageFile = document.getElementById('editImageFile');
        const imageFile = editImageFile ? editImageFile.files[0] : null;
        
        if (imageFile) {
            // Validate file size (max 5MB)
            if (imageFile.size > 5 * 1024 * 1024) {
                showAlert('Image file size must be less than 5MB', 'danger');
                return;
            }
            
            // Validate file type
            if (!imageFile.type.startsWith('image/')) {
                showAlert('Please select a valid image file', 'danger');
                return;
            }
        }
        
        // Collect form data
        const editBrand = document.getElementById('editBrand');
        const editModel = document.getElementById('editModel');
        const editColor = document.getElementById('editColor');
        const editDescription = document.getElementById('editDescription');
        
        const updateData = {
            category: category,
            brand: editBrand ? editBrand.value.trim() : '',
            model: editModel ? editModel.value.trim() : '',
            color: editColor ? editColor.value.trim() : '',
            description: editDescription ? editDescription.value.trim() : '',
        };
        
        // Add image URL if no new file is uploaded (keep existing)
        const editImageUrl = document.getElementById('editImageUrl');
        const existingImageUrl = editImageUrl ? editImageUrl.value.trim() : '';
        if (!imageFile && existingImageUrl) {
            updateData.imageUrl = existingImageUrl;
        }

        // Collect offers
        const offers = [];
        document.querySelectorAll('.offer-item').forEach((item) => {
            const retailerInput = item.querySelector('.offer-retailer');
            const urlInput = item.querySelector('.offer-url');
            const priceInput = item.querySelector('.offer-price');
            const originalPriceInput = item.querySelector('.offer-original-price');
            const saleEndsInput = item.querySelector('.offer-sale-ends');
            const logoUrlInput = item.querySelector('.offer-logo-url');
            
            const offer = {
                retailer: retailerInput ? retailerInput.value.trim() : '',
                url: urlInput ? urlInput.value.trim() : '',
                price: priceInput ? parseFloat(priceInput.value) || 0 : 0,
                originalPrice: originalPriceInput ? parseFloat(originalPriceInput.value) || null : null,
                saleEnds: saleEndsInput ? saleEndsInput.value.trim() || null : null,
                logoUrl: logoUrlInput ? logoUrlInput.value.trim() || null : null,
            };
            
            if (offer.retailer && offer.price > 0) {
                offers.push(offer);
            }
        });

        if (offers.length > 0) {
            updateData.offers = offers;
        }

        // Parse specs if provided
        const editSpecs = document.getElementById('editSpecs');
        const specsText = editSpecs ? editSpecs.value.trim() : '';
        if (specsText) {
            try {
                updateData.specs = JSON.parse(specsText);
            } catch (e) {
                showAlert('Invalid JSON in specifications field. Please check the format.', 'danger');
                return;
            }
        }

        // Convert image file to base64 if file is selected
        if (imageFile) {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
            
            updateData.imageBase64 = base64;
            updateData.imageContentType = imageFile.type;
        }

        // Remove empty fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === '' || updateData[key] === null) {
                delete updateData[key];
            }
        });

        // Show loading state
        const saveBtn = document.querySelector('.modal-footer .btn-primary');
        const originalText = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        // Send update request
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.UPDATE_PRODUCT_ENDPOINT}/${productId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const resultData = result.body ? JSON.parse(result.body) : result;

        if (resultData.success) {
            showAlert(`Product "${productId}" updated successfully!`, 'success');
            const modalElement = document.getElementById('editProductModal');
            if (modalElement) {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
            }
            loadProducts(); // Reload product list
        } else {
            throw new Error(resultData.message || 'Update failed');
        }

    } catch (error) {
        console.error('Error updating product:', error);
        showAlert('Error updating product: ' + error.message, 'danger');
    } finally {
        const saveBtn = document.querySelector('.modal-footer .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
}

// Delete product
async function deleteProduct(productId, category) {
    if (!confirm(`Are you sure you want to delete product "${productId}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.DELETE_PRODUCT_ENDPOINT}/${productId}?category=${category}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        showAlert(`Product "${productId}" deleted successfully`, 'success');
        loadProducts(); // Reload list

    } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('Error deleting product: ' + error.message, 'danger');
    }
}

// Show alert
function showAlert(message, type = 'info') {
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = createAlertContainer();
    }
    
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

function createAlertContainer() {
    // Check if alert container already exists
    let alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        return alertContainer;
    }
    
    // Create new alert container
    alertContainer = document.createElement('div');
    alertContainer.id = 'alertContainer';
    alertContainer.className = 'mb-3';
    
    // Find the content wrapper
    const contentWrapper = document.querySelector('.content-wrapper');
    if (contentWrapper) {
        // Insert at the beginning of content wrapper
        contentWrapper.insertBefore(alertContainer, contentWrapper.firstChild);
    } else {
        // Fallback: append to body
        document.body.insertBefore(alertContainer, document.body.firstChild);
    }
    
    return alertContainer;
}

// Setup sidebar toggle
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// Check login state and update header
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
            const userName = document.getElementById('userName');
            
            if (userAvatar) userAvatar.textContent = initials;
            if (userName) userName.textContent = displayName;
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

// Handle logout
async function handleLogout() {
    try {
        await window.adminAWSAuthService.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = 'admin-login.html';
    }
}

// Initialize custom page size dropdown
function initializePageSizeDropdown() {
    const pageSizeDropdown = document.getElementById('pageSizeDropdown');
    const pageSizeDropdownBtn = document.getElementById('pageSizeDropdownBtn');
    const pageSizeDropdownMenu = document.getElementById('pageSizeDropdownMenu');
    const pageSizeDropdownItems = document.getElementById('pageSizeDropdownItems');
    const pageSizeSelect = document.getElementById('pageSize');
    
    if (!pageSizeDropdown || !pageSizeDropdownBtn || !pageSizeDropdownMenu || !pageSizeDropdownItems) return;
    
    const pageSizeOptions = [
        { value: '10', text: '10 per page' },
        { value: '25', text: '25 per page' },
        { value: '50', text: '50 per page' },
        { value: '100', text: '100 per page' }
    ];
    
    pageSizeOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === '25') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function() {
            pageSizeDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');
            
            document.getElementById('pageSizeDropdownText').textContent = option.text;
            pageSizeSelect.value = option.value;
            
            pageSizeDropdown.classList.remove('active');
            pageSizeDropdownMenu.style.display = 'none';
            
            loadProducts();
        });
        pageSizeDropdownItems.appendChild(itemDiv);
    });
    
    pageSizeDropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = pageSizeDropdown.classList.contains('active');
        
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'pageSizeDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });
        
        if (isActive) {
            pageSizeDropdown.classList.remove('active');
            pageSizeDropdownMenu.style.display = 'none';
        } else {
            pageSizeDropdown.classList.add('active');
            pageSizeDropdownMenu.style.display = 'block';
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-dropdown')) {
            pageSizeDropdown.classList.remove('active');
            pageSizeDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();
    checkLoginState();
    
    // Initialize category and brand filters on page load
    initializeCategoryGrid();
    updateBrandFilter();
    
    // Enter key to search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadProducts();
        });
    }
    
    const brandFilterText = document.getElementById('brandFilterText');
    if (brandFilterText) {
        brandFilterText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadProducts();
        });
    }

    // Category change - update brand filter (for hidden select compatibility)
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            const category = categoryFilter.value;
            selectCategory(category);
        });
    }

    // Initialize page size dropdown
    initializePageSizeDropdown();

    // Filter button click handlers
    const categoryFilterBtn = document.getElementById('categoryFilterBtn');
    if (categoryFilterBtn) {
        categoryFilterBtn.addEventListener('click', () => {
            toggleFilterPanel('category');
        });
    }

    const brandFilterBtn = document.getElementById('brandFilterBtn');
    if (brandFilterBtn) {
        brandFilterBtn.addEventListener('click', () => {
            toggleFilterPanel('brand');
        });
    }

    // Filter action button handlers
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-apply')) {
            const filterType = e.target.dataset.filter;
            if (filterType === 'category') {
                applyCategoryFilter();
            } else if (filterType === 'brand') {
                applyBrandFilter();
            }
        } else if (e.target.classList.contains('btn-cancel')) {
            const filterType = e.target.dataset.filter;
            closeFilterPanel(filterType);
        } else if (e.target.classList.contains('btn-clear')) {
            const filterType = e.target.dataset.filter;
            if (filterType === 'category') {
                clearCategoryFilter();
            } else if (filterType === 'brand') {
                clearBrandFilter();
            }
        }
    });
    
    // Attach logout handler
    const userProfile = document.getElementById('userProfile');
    if (userProfile) {
        userProfile.addEventListener('click', handleLogout);
    }
});

// Restore state from sessionStorage when returning from view page
function restoreState() {
    const savedState = sessionStorage.getItem('productManagementState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            
            // Restore filters
            if (state.category) {
                // Restore category selection in grid (this will also update brand filter)
                selectCategory(state.category);
                
                // Restore brand after a small delay to ensure grid/inputs are updated
                setTimeout(() => {
                    if (state.category === 'smartphones') {
                        // Restore brand selection in grid
                        if (state.brand) {
                            // Find and activate the brand button
                            const brandLower = state.brand.toLowerCase();
                            const brandBtn = document.querySelector(`.brand-option[data-brand="${brandLower}"]`);
                            if (brandBtn) {
                                brandBtn.classList.add('active');
                                const brandFilter = document.getElementById('brandFilter');
                                if (brandFilter) brandFilter.value = brandLower;
                                // Update brand filter button active state
                                const brandFilterBtn = document.getElementById('brandFilterBtn');
                                if (brandFilterBtn) brandFilterBtn.classList.add('filter-active');
                            }
                        }
                    } else {
                        const brandFilterText = document.getElementById('brandFilterText');
                        if (brandFilterText) brandFilterText.value = state.brand || '';
                    }
                    
                    // Restore search
                    if (state.search) {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) searchInput.value = state.search;
                    }
                    
                    // Restore page size
                    if (state.pageSize) {
                        const pageSizeSelect = document.getElementById('pageSize');
                        const pageSizeDropdownText = document.getElementById('pageSizeDropdownText');
                        if (pageSizeSelect) {
                            pageSizeSelect.value = state.pageSize;
                            pageSize = parseInt(state.pageSize);
                            
                            // Update dropdown text
                            if (pageSizeDropdownText) {
                                const pageSizeOptions = {
                                    '10': '10 per page',
                                    '25': '25 per page',
                                    '50': '50 per page',
                                    '100': '100 per page'
                                };
                                pageSizeDropdownText.textContent = pageSizeOptions[state.pageSize] || '25 per page';
                            }
                            
                            // Update selected item in dropdown
                            const pageSizeDropdownItems = document.getElementById('pageSizeDropdownItems');
                            if (pageSizeDropdownItems) {
                                pageSizeDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                                    item.classList.remove('selected');
                                    if (item.dataset.value === state.pageSize) {
                                        item.classList.add('selected');
                                    }
                                });
                            }
                        }
                    }
                    
                    // Auto-load products if category is set
                    // Note: We reset to page 1 since DynamoDB doesn't support backward pagination easily
                    if (state.category) {
                        currentPage = 1;
                        lastKey = null;
                        loadProducts();
                    }
                }, 150);
            }
            
            // Clear saved state after restoring
            sessionStorage.removeItem('productManagementState');
        } catch (error) {
            console.error('Error restoring state:', error);
        }
    }
}

// Restore state on page load (before other initialization)
window.addEventListener('load', () => {
    restoreState();
});


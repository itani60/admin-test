// Configuration - API endpoints matching admin-product-management.html
const API_CONFIG = {
    BASE_URL: 'https://acc.comparehubprices.site/data',
    PRODUCTS_ENDPOINT: '/products',
    PRICE_UPDATE_ENDPOINT: '/products/prices',
    PRICE_HISTORY_ENDPOINT: '/products/price-history',
};

let currentProduct = null;
let originalOffers = [];
let searchSuggestionsTimeout = null;
let currentSuggestions = [];
let selectedSuggestionIndex = -1;

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show alert-custom" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Show loading spinner
 */
function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add('active');
        document.getElementById('productDisplay').classList.remove('active');
    } else {
        spinner.classList.remove('active');
    }
}

/**
 * Search for product (supports both model and product_id)
 */
async function searchProduct() {
    const searchQuery = document.getElementById('productSearch').value.trim();
    
    if (!searchQuery) {
        showAlert('Please enter a model name or product ID', 'warning');
        return;
    }

    showLoading(true);
    hideSuggestions();

    try {
        // Determine if search query looks like a product_id (contains hyphens and lowercase) or model name
        const looksLikeProductId = searchQuery.includes('-') && searchQuery === searchQuery.toLowerCase();
        
        // Use the dedicated search function
        await searchProductByModelOrId(
            looksLikeProductId ? null : searchQuery, // model
            looksLikeProductId ? searchQuery : null, // product_id
            null // category (will search all)
        );
    } catch (error) {
        console.error('Error fetching product:', error);
        showAlert(`Error loading product: ${error.message}. Please check the console for details.`, 'danger');
        showLoading(false);
    }
}

/**
 * Display product information
 */
function displayProduct(product) {
    // Set product image
    document.getElementById('productImage').src = product.imageUrl || 'assets/images/placeholder.jpg';
    
    // Set product info
    document.getElementById('productModel').textContent = product.model || 'N/A';
    document.getElementById('productBrand').textContent = product.brand || 'N/A';
    document.getElementById('productColor').textContent = product.color || 'N/A';
    document.getElementById('productCategory').textContent = product.category || 'N/A';
    document.getElementById('productDescription').textContent = product.description || 'No description available.';

    // Display specifications
    displaySpecs(product.specs || {});

    // Display offers
    displayOffers(product.offers || []);

    // Show product display
    document.getElementById('productDisplay').classList.add('active');
}

/**
 * Display specifications
 */
function displaySpecs(specs) {
    const specsGrid = document.getElementById('specsGrid');
    specsGrid.innerHTML = '';

    // Display key specs
    const keySpecs = [
        { label: 'Processor', value: specs.Performance?.Processor },
        { label: 'RAM', value: specs.Performance?.Ram },
        { label: 'Storage', value: specs.Performance?.Storage },
        { label: 'Display Size', value: specs.Display?.Main?.Size || specs.Display?.Size },
        { label: 'Battery', value: specs.Battery?.Capacity },
        { label: 'OS', value: specs.Os?.OperatingSystem },
    ];

    keySpecs.forEach(spec => {
        if (spec.value) {
            const specItem = document.createElement('div');
            specItem.className = 'spec-item';
            specItem.innerHTML = `
                <strong>${spec.label}</strong>
                <span>${spec.value}</span>
            `;
            specsGrid.appendChild(specItem);
        }
    });
}

/**
 * Display offers with edit functionality
 */
function displayOffers(offers) {
    const container = document.getElementById('offersContainer');
    container.innerHTML = '';

    if (offers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-store"></i><p>No offers available</p></div>';
        return;
    }

    offers.forEach((offer, index) => {
        const offerCard = document.createElement('div');
        offerCard.className = 'offer-card';
        offerCard.id = `offer-${index}`;
        
        const originalOffer = originalOffers.find(o => o.retailer === offer.retailer);
        const priceChanged = originalOffer && originalOffer.price !== offer.price;
        const priceChange = originalOffer ? offer.price - originalOffer.price : 0;
        const priceChangePercent = originalOffer && originalOffer.price > 0 
            ? ((priceChange / originalOffer.price) * 100).toFixed(2) 
            : 0;

        offerCard.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    ${offer.logoUrl ? `<img src="${offer.logoUrl}" alt="${offer.retailer}" class="retailer-logo">` : ''}
                    <h5>${offer.retailer}</h5>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="editOffer(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
            
            <div class="price-display">
                ${formatCurrency(offer.price)}
                ${priceChanged ? `
                    <span class="price-change ${priceChange < 0 ? 'decrease' : 'increase'}">
                        ${priceChange > 0 ? '+' : ''}${formatCurrency(priceChange)} (${priceChangePercent}%)
                    </span>
                ` : ''}
            </div>
            
            <div class="mt-2">
                <small class="text-muted">
                    Original: ${formatCurrency(offer.originalPrice || offer.price)}
                </small>
            </div>
            
            ${offer.saleEnds ? `
                <div class="mt-2">
                    <small class="text-warning">
                        <i class="fas fa-clock"></i> Sale ends: ${offer.saleEnds}
                    </small>
                </div>
            ` : ''}
            
            <div class="mt-2">
                <a href="${offer.url}" target="_blank" class="btn btn-sm btn-outline-secondary">
                    <i class="fas fa-external-link-alt"></i> View on Retailer
                </a>
            </div>
            
            <div class="edit-form mt-3" id="edit-form-${index}" style="display: none;">
                <div class="price-input-group">
                    <div class="form-group">
                        <label>Current Price (R)</label>
                        <input type="number" class="form-control" id="price-${index}" value="${offer.price}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Original Price (R)</label>
                        <input type="number" class="form-control" id="originalPrice-${index}" value="${offer.originalPrice || offer.price}" step="0.01">
                    </div>
                </div>
                <div class="form-group mt-2">
                    <label>Sale Ends (optional)</label>
                    <input type="text" class="form-control" id="saleEnds-${index}" value="${offer.saleEnds || ''}" placeholder="e.g., 15 December 2024">
                </div>
                <div class="form-group mt-2">
                    <label>Product URL</label>
                    <input type="url" class="form-control" id="url-${index}" value="${offer.url}">
                </div>
                <div class="mt-3">
                    <button class="btn btn-update" onclick="saveOffer(${index}, '${offer.retailer}')">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button class="btn btn-cancel ms-2" onclick="cancelEdit(${index})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(offerCard);
    });
}

/**
 * Edit offer
 */
function editOffer(index) {
    // Close other edit forms
    document.querySelectorAll('.offer-card.editing').forEach(card => {
        card.classList.remove('editing');
        const formId = card.id.replace('offer-', 'edit-form-');
        document.getElementById(formId).style.display = 'none';
    });

    // Open this edit form
    const offerCard = document.getElementById(`offer-${index}`);
    offerCard.classList.add('editing');
    document.getElementById(`edit-form-${index}`).style.display = 'block';
}

/**
 * Cancel edit
 */
function cancelEdit(index) {
    const offerCard = document.getElementById(`offer-${index}`);
    offerCard.classList.remove('editing');
    document.getElementById(`edit-form-${index}`).style.display = 'none';
    
    // Reset form values
    const offer = currentProduct.offers[index];
    document.getElementById(`price-${index}`).value = offer.price;
    document.getElementById(`originalPrice-${index}`).value = offer.originalPrice || offer.price;
    document.getElementById(`saleEnds-${index}`).value = offer.saleEnds || '';
    document.getElementById(`url-${index}`).value = offer.url;
}

/**
 * Save offer changes
 */
async function saveOffer(index, retailer) {
    const price = parseFloat(document.getElementById(`price-${index}`).value);
    const originalPrice = parseFloat(document.getElementById(`originalPrice-${index}`).value);
    const saleEnds = document.getElementById(`saleEnds-${index}`).value.trim();
    const url = document.getElementById(`url-${index}`).value.trim();

    if (!price || price <= 0) {
        showAlert('Please enter a valid price', 'warning');
        return;
    }

    if (!url) {
        showAlert('Please enter a product URL', 'warning');
        return;
    }

    showLoading(true);

    try {
        // Ensure we have category from the product
        if (!currentProduct.category) {
            showAlert('Product category is missing. Cannot update price.', 'danger');
            showLoading(false);
            return;
        }

        console.log('Updating price for:', {
            product_id: currentProduct.product_id,
            category: currentProduct.category,
            retailer: retailer,
            price: price
        });

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.PRICE_UPDATE_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: currentProduct.product_id,
                category: currentProduct.category,
                retailer: retailer,
                price: price,
                originalPrice: originalPrice,
                saleEnds: saleEnds || null,
                url: url,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        let result = data;
        if (data.body) {
            result = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        }

        // Check for success in various formats
        const isSuccess = result.success === true || 
                         (result.updated && result.updated.length > 0) ||
                         (result.statusCode === 200);

        if (isSuccess) {
            showAlert('Price updated successfully!', 'success');
            
            // Update local product data
            const offer = currentProduct.offers.find(o => o.retailer === retailer);
            if (offer) {
                offer.price = price;
                offer.originalPrice = originalPrice;
                offer.saleEnds = saleEnds || null;
                offer.url = url;
            }
            
            // Refresh display
            displayOffers(currentProduct.offers);
            
            // Reload price history
            await loadPriceHistory(currentProduct.product_id);
        } else {
            const errorMessage = result.message || result.error || 'Failed to update price';
            showAlert(errorMessage, 'danger');
        }
    } catch (error) {
        console.error('Error updating price:', error);
        showAlert('Error updating price. Please try again.', 'danger');
    }

    showLoading(false);
}

/**
 * Load price history
 */
async function loadPriceHistory(productId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.PRICE_HISTORY_ENDPOINT}?product_id=${productId}&limit=50`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats
        let result = data;
        if (data.body) {
            result = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        }

        const container = document.getElementById('priceHistoryContainer');
        
        // Check if we have history data
        const history = result.history || result.items || [];
        const historyByRetailer = result.historyByRetailer || {};
        
        if (history.length === 0 && Object.keys(historyByRetailer).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>No price history available yet</p>
                </div>
            `;
            return;
        }

        // Group by retailer if we have flat history array
        let groupedHistory = historyByRetailer;
        if (history.length > 0 && Object.keys(historyByRetailer).length === 0) {
            groupedHistory = {};
            history.forEach(item => {
                const retailer = item.retailer || 'Unknown';
                if (!groupedHistory[retailer]) {
                    groupedHistory[retailer] = [];
                }
                groupedHistory[retailer].push(item);
            });
        }

        let historyHTML = '';

        Object.keys(groupedHistory).forEach(retailer => {
            const retailerHistory = groupedHistory[retailer];
            historyHTML += `<h6 class="mt-3 mb-2"><strong>${retailer}</strong></h6>`;
            
            retailerHistory.forEach(item => {
                const priceChange = item.priceChange || (item.newPrice - item.oldPrice);
                const priceChangePercent = item.priceChangePercent || 
                    (item.oldPrice > 0 ? ((priceChange / item.oldPrice) * 100).toFixed(2) : 0);
                const changeClass = priceChange < 0 ? 'decrease' : 'increase';
                const changeIcon = priceChange < 0 ? 'fa-arrow-down' : 'fa-arrow-up';
                const createdAt = item.createdAt || item.timestamp || item.date;
                
                historyHTML += `
                    <div class="history-item">
                        <div>
                            <div class="date">${createdAt ? formatDate(createdAt) : 'Unknown date'}</div>
                            <div>
                                <span class="price-change ${changeClass}">
                                    <i class="fas ${changeIcon}"></i>
                                    ${priceChange > 0 ? '+' : ''}${formatCurrency(priceChange)} 
                                    (${priceChangePercent}%)
                                </span>
                            </div>
                        </div>
                        <div class="price-info">
                            <div><strong>${formatCurrency(item.oldPrice)}</strong> → <strong>${formatCurrency(item.newPrice)}</strong></div>
                        </div>
                    </div>
                `;
            });
        });

        container.innerHTML = historyHTML;
    } catch (error) {
        console.error('Error loading price history:', error);
        const container = document.getElementById('priceHistoryContainer');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading price history</p>
            </div>
        `;
    }
}

/**
 * Fetch search suggestions based on model or product_id
 */
async function fetchSearchSuggestions(query) {
    if (!query || query.length < 2) {
        hideSuggestions();
        return;
    }

    try {
        const categories = [
            'smartphones',
            'tablets',
            'windows-laptops',
            'macbooks-laptops',
            'chromebooks-laptops',
            'wearables',
            'televisions',
            'audio',
            'gaming',
            'appliances'
        ];

        const allSuggestions = [];
        const searchPromises = categories.map(async (category) => {
            try {
                const response = await fetch(
                    `${API_CONFIG.BASE_URL}${API_CONFIG.PRODUCTS_ENDPOINT}?category=${category}&limit=100`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    let productsData = data;
                    if (data.body) {
                        productsData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
                    }
                    const products = productsData.products || productsData.items || productsData;
                    
                    if (Array.isArray(products)) {
                        const queryLower = query.toLowerCase();
                        return products.filter(product => {
                            const model = (product.model || '').toLowerCase();
                            const productId = (product.product_id || '').toLowerCase();
                            const brand = (product.brand || '').toLowerCase();
                            
                            return model.includes(queryLower) || 
                                   productId.includes(queryLower) ||
                                   brand.includes(queryLower);
                        }).map(product => ({
                            ...product,
                            category: category
                        }));
                    }
                }
            } catch (e) {
                console.log(`Error fetching suggestions from ${category}:`, e);
            }
            return [];
        });

        const results = await Promise.all(searchPromises);
        const suggestions = results.flat().slice(0, 10); // Limit to 10 suggestions
        
        displaySuggestions(suggestions);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        hideSuggestions();
    }
}

/**
 * Display search suggestions
 */
function displaySuggestions(suggestions) {
    const container = document.getElementById('searchSuggestions');
    
    if (!suggestions || suggestions.length === 0) {
        hideSuggestions();
        return;
    }

    currentSuggestions = suggestions;
    selectedSuggestionIndex = -1;

    const html = suggestions.map((product, index) => {
        const model = product.model || 'Unknown Model';
        const brand = product.brand || 'Unknown Brand';
        const productId = product.product_id || '';
        const lowestPrice = getLowestPrice(product);
        const formattedPrice = lowestPrice ? formatCurrency(lowestPrice) : 'Price N/A';
        const category = product.category || '';

        return `
            <div class="suggestion-item" data-index="${index}" onclick="selectSuggestion(${index})">
                <div class="suggestion-model">${brand} ${model}</div>
                <div class="suggestion-details">
                    <span><i class="fas fa-tag"></i> ${category}</span>
                    <span class="suggestion-price"><i class="fas fa-money-bill"></i> ${formattedPrice}</span>
                    ${productId ? `<span><i class="fas fa-hashtag"></i> ${productId.substring(0, 30)}${productId.length > 30 ? '...' : ''}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    container.style.display = 'block';
}

/**
 * Hide search suggestions
 */
function hideSuggestions() {
    const container = document.getElementById('searchSuggestions');
    container.style.display = 'none';
    currentSuggestions = [];
    selectedSuggestionIndex = -1;
}

/**
 * Select a suggestion
 */
function selectSuggestion(index) {
    if (currentSuggestions[index]) {
        const product = currentSuggestions[index];
        document.getElementById('productSearch').value = product.model || product.product_id || '';
        hideSuggestions();
        searchProductByModelOrId(product.model, product.product_id, product.category);
    }
}

/**
 * Get lowest price from offers
 */
function getLowestPrice(product) {
    if (!product.offers || product.offers.length === 0) return 0;
    const prices = product.offers.map(offer => offer.price).filter(price => typeof price === 'number' && price > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
}

/**
 * Search product by model or product_id
 */
async function searchProductByModelOrId(model, productId, category) {
    showLoading(true);

    try {
        let product = null;

        // If we have category and product_id, try direct fetch first
        if (category && productId) {
            try {
                const response = await fetch(
                    `${API_CONFIG.BASE_URL}${API_CONFIG.PRODUCTS_ENDPOINT}/${productId}?category=${category}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    let productData = data;
                    if (data.body) {
                        productData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
                    }
                    product = productData.product || productData;
                }
            } catch (e) {
                console.log('Direct fetch failed, trying list search...');
            }
        }

        // If not found, search through list
        if (!product || !product.product_id) {
            const categories = category ? [category] : [
                'smartphones', 'tablets', 'windows-laptops', 'macbooks-laptops',
                'chromebooks-laptops', 'wearables', 'televisions', 'audio', 'gaming', 'appliances'
            ];

            for (const cat of categories) {
                try {
                    const response = await fetch(
                        `${API_CONFIG.BASE_URL}${API_CONFIG.PRODUCTS_ENDPOINT}?category=${cat}&limit=1000`
                    );
                    
                    if (response.ok) {
                        const data = await response.json();
                        let productsData = data;
                        if (data.body) {
                            productsData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
                        }
                        const products = productsData.products || productsData.items || productsData;
                        
                        if (Array.isArray(products)) {
                            // Try to find by product_id first (exact match), then by model (exact or partial match)
                            product = products.find(p => {
                                if (productId && p.product_id === productId) {
                                    return true;
                                }
                                if (model && p.model) {
                                    const pModel = p.model.toLowerCase();
                                    const searchModel = model.toLowerCase();
                                    // Exact match or contains match
                                    return pModel === searchModel || pModel.includes(searchModel) || searchModel.includes(pModel);
                                }
                                return false;
                            });
                            
                            if (product) {
                                product.category = cat;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        if (!product || !product.product_id) {
            showAlert('Product not found. Please try a different search term.', 'danger');
            showLoading(false);
            return;
        }

        // Ensure category is set
        if (!product.category && category) {
            product.category = category;
        }

        currentProduct = product;
        originalOffers = JSON.parse(JSON.stringify(product.offers || []));
        
        displayProduct(product);
        await loadPriceHistory(product.product_id);
        
        showLoading(false);
        showAlert('Product loaded successfully!', 'success');
    } catch (error) {
        console.error('Error fetching product:', error);
        showAlert(`Error loading product: ${error.message}`, 'danger');
        showLoading(false);
    }
}

// Initialize search input event listeners
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('productSearch');
    
    // Handle input for suggestions
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (searchSuggestionsTimeout) {
            clearTimeout(searchSuggestionsTimeout);
        }
        
        // Debounce suggestions (wait 300ms after user stops typing)
        searchSuggestionsTimeout = setTimeout(() => {
            fetchSearchSuggestions(query);
        }, 300);
    });

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        
        if (suggestionsContainer.style.display === 'none' || currentSuggestions.length === 0) {
            if (e.key === 'Enter') {
                searchProduct();
            }
            return;
        }

        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
            updateSuggestionHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
            updateSuggestionHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedSuggestionIndex >= 0 && currentSuggestions[selectedSuggestionIndex]) {
                selectSuggestion(selectedSuggestionIndex);
            } else {
                searchProduct();
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-input-wrapper')) {
            hideSuggestions();
        }
    });
});

/**
 * Update suggestion highlight
 */
function updateSuggestionHighlight(items) {
    items.forEach((item, index) => {
        if (index === selectedSuggestionIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('active');
        }
    });
}

// Allow Enter key to search (fallback)
document.getElementById('productSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && currentSuggestions.length === 0) {
        searchProduct();
    }
});


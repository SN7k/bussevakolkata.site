// Performance optimizations and caching
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const VIRTUAL_SCROLL_THRESHOLD = 50; // Show virtual scrolling for lists > 50 items
let busCache = new Map();
let imageCache = new Map();
let isLoading = false;

// DOM Elements - cached for better performance
const elements = {
    busGrid: document.getElementById('busGrid'),
    busModal: document.getElementById('busModal'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModal'),
    busSearch: document.getElementById('busSearch')
};

// Create load more button
const loadMoreBtn = document.createElement('button');
loadMoreBtn.className = 'load-more-btn';
loadMoreBtn.textContent = 'Load More Buses';
loadMoreBtn.style.display = 'none';

let allBuses = []; // Store all buses for filtering
let currentPage = 1;
const busesPerPage = 12;
let displayedBuses = 0;

// Intersection Observer for lazy loading images
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        }
    });
}, {
    rootMargin: '50px',
    threshold: 0.1
});

// Optimized bus card creation with lazy loading
function createBusCard(bus) {
    try {
        // Create card container
        const card = document.createElement('div');
        card.className = 'bus-card';
        card.setAttribute('data-bus-id', bus._id);
        
        // Add loading state initially
        card.classList.add('loading');
        
        // Add featured badge for some buses (e.g., popular routes or AC buses)
        if (bus.type && (bus.type.toLowerCase().includes('ac') || Math.random() < 0.2)) {
            const featuredBadge = document.createElement('div');
            featuredBadge.className = 'featured-badge';
            featuredBadge.textContent = bus.type.toLowerCase().includes('ac') ? 'Premium' : 'Popular';
            card.appendChild(featuredBadge);
        }
        
        // Create bus image section with lazy loading
        const busImage = document.createElement('div');
        busImage.className = 'bus-profile-pic';
        
        // Set a default placeholder color gradient as background
        const busColor = getBusColorByType(bus.type || 'regular');
        busImage.style.background = busColor;
        
        // Handle image loading with proper error handling and lazy loading
        if (bus.imageUrl) {
            const img = document.createElement('img');
            img.className = 'lazy';
            img.dataset.src = bus.imageUrl;
            img.alt = bus.name;
            img.loading = 'lazy';
            
            // Add error handling
            img.onerror = () => {
                console.log(`Failed to load image for bus: ${bus.name}`);
                card.classList.remove('loading');
                // Keep the gradient background if image fails to load
            };
            
            img.onload = () => {
                card.classList.remove('loading');
            };
            
            imageObserver.observe(img);
            busImage.appendChild(img);
        } else {
            // If no image URL, use a default bus icon as background
            const busIcon = document.createElement('i');
            busIcon.className = 'fas fa-bus';
            busIcon.style.position = 'absolute';
            busIcon.style.top = '50%';
            busIcon.style.left = '50%';
            busIcon.style.transform = 'translate(-50%, -50%)';
            busIcon.style.fontSize = '4rem';
            busIcon.style.color = 'rgba(255, 255, 255, 0.3)';
            busImage.appendChild(busIcon);
            
            // Remove loading state after a short delay
            setTimeout(() => {
                card.classList.remove('loading');
            }, 300);
        }
        
        // Create bus info section
        const busInfo = document.createElement('div');
        busInfo.className = 'bus-info';
        
        // Create bus title
        const busTitle = document.createElement('h3');
        busTitle.textContent = bus.name || 'Unknown Bus';
        
        // Create bus route/subtitle
        const busRoute = document.createElement('p');
        busRoute.textContent = bus.route || 'Route not available';
        
        // Create bus metadata (tags)
        const busMeta = document.createElement('div');
        busMeta.className = 'bus-meta';
        
        // Create tags based on bus features
        const scheduleTag = document.createElement('span');
        scheduleTag.innerHTML = `<i class="fas fa-clock"></i> ${bus.schedule || 'Schedule N/A'}`;
        busMeta.appendChild(scheduleTag);
        
        const fareTag = document.createElement('span');
        fareTag.innerHTML = `<i class="fas fa-rupee-sign"></i> ${bus.fare || 'Fare N/A'}`;
        busMeta.appendChild(fareTag);
        
        const stopsTag = document.createElement('span');
        stopsTag.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${bus.totalStops || 'Stops N/A'}`;
        busMeta.appendChild(stopsTag);
        
        // Add bus type badge if available
        if (bus.type) {
            const typeBadge = document.createElement('span');
            typeBadge.className = 'bus-type-badge';
            typeBadge.textContent = getBusTypeLabel(bus.type);
            busMeta.appendChild(typeBadge);
        }
        
        // Append elements to bus info
        busInfo.appendChild(busTitle);
        busInfo.appendChild(busRoute);
        busInfo.appendChild(busMeta);
        
        // Create bus actions
        const busActions = document.createElement('div');
        busActions.className = 'bus-actions';
        
        // View route button
        const viewBtn = document.createElement('button');
        viewBtn.className = 'feature-btn view-route';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Details';
        viewBtn.onclick = () => showBusDetails(bus._id);
        busActions.appendChild(viewBtn);
        
        // Save route button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'feature-btn save-route';
        saveBtn.innerHTML = isSaved(bus._id) ? 
            '<i class="fas fa-star"></i> Remove from Saved' : 
            '<i class="fas fa-star"></i> Save Route';
        saveBtn.onclick = (e) => toggleSaveRoute(bus._id, e);
        busActions.appendChild(saveBtn);
        
        // Share route button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'feature-btn share-btn';
        shareBtn.innerHTML = '<i class="fas fa-share"></i> Share';
        shareBtn.onclick = (e) => shareRoute(bus._id, e);
        busActions.appendChild(shareBtn);
        
        // Append all sections to card
        card.appendChild(busImage);
        card.appendChild(busInfo);
        card.appendChild(busActions);
        
        return card;
    } catch (error) {
        console.error('Error creating bus card:', error);
        return null;
    }
}

// Optimized bus type label function with caching
const typeLabelCache = new Map();
function getBusTypeLabel(type) {
    if (typeLabelCache.has(type)) {
        return typeLabelCache.get(type);
    }
    
    let label = 'Regular';
    if (type && typeof type === 'string') {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('ac')) label = 'AC';
        else if (lowerType.includes('express')) label = 'Express';
        else if (lowerType.includes('local')) label = 'Local';
        else if (lowerType.includes('premium')) label = 'Premium';
        else label = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }
    
    typeLabelCache.set(type, label);
    return label;
}

// Optimized bus color function with caching
const colorCache = new Map();
function getBusColorByType(type) {
    if (colorCache.has(type)) {
        return colorCache.get(type);
    }
    
    let color = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (type && typeof type === 'string') {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('ac')) {
            color = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        } else if (lowerType.includes('express')) {
            color = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        } else if (lowerType.includes('premium')) {
            color = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
        } else if (lowerType.includes('local')) {
            color = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
        }
    }
    
    colorCache.set(type, color);
    return color;
}

// Optimized save status check
function isSaved(busId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
    return favorites.includes(busId);
}

// Optimized save route toggle
function toggleSaveRoute(busId, event) {
    let favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
    const isFavorite = favorites.includes(busId);
    
    if (isFavorite) {
        favorites = favorites.filter(route => route !== busId);
        showToast('Route removed from saved routes');
    } else {
        favorites.push(busId);
        showToast('Route saved successfully!');
    }
    
    localStorage.setItem('favoriteRoutes', JSON.stringify(favorites));
    
    // Update button text
    const button = event.target.closest('.save-route');
    if (button) {
        button.innerHTML = isFavorite ? 
            '<i class="fas fa-star"></i> Save Route' : 
            '<i class="fas fa-star"></i> Remove from Saved';
    }
}

// Optimized share route function
async function shareRoute(busId, event) {
    try {
        const bus = allBuses.find(b => b._id === busId);
        if (!bus) {
            showToast('Bus information not found', 'error');
            return;
        }
        
        const shareText = `Check out this bus route: ${bus.name} - ${bus.route}`;
        const shareUrl = `${window.location.origin}/bus-list.html?bus=${busId}`;
        
        if (navigator.share) {
            await navigator.share({
                title: 'BusSeva Kolkata - Bus Route',
                text: shareText,
                url: shareUrl
            });
        } else {
            fallbackShare(shareText + '\n' + shareUrl);
        }
    } catch (error) {
        console.error('Error sharing route:', error);
        showToast('Unable to share route', 'error');
    }
}

// Fallback share function
function fallbackShare(shareText) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Route link copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Route link copied to clipboard!');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Route link copied to clipboard!');
    }
}

// Optimized toast message with queue management
let toastQueue = [];
let isShowingToast = false;

function showToast(message, type = 'success') {
    toastQueue.push({ message, type });
    
    if (!isShowingToast) {
        showNextToast();
    }
}

function showNextToast() {
    if (toastQueue.length === 0) {
        isShowingToast = false;
        return;
    }
    
    isShowingToast = true;
    const { message, type } = toastQueue.shift();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
            showNextToast();
        }, 300);
    }, 3000);
}

// Optimized bus details display with caching
async function showBusDetails(busId) {
    // Check cache first
    if (busCache.has(busId)) {
        const cached = busCache.get(busId);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            displayBusModal(cached.data);
            return;
        }
    }

    try {
        const response = await fetch(`https://busseva-backend-yhzz.onrender.com/api/buses/${busId}`, {
            headers: {
                'Cache-Control': 'max-age=300'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load bus details');
        }
        
        const bus = await response.json();
        
        if (!bus) {
            showToast('Bus not found', 'error');
            return;
        }

        // Cache the result
        busCache.set(busId, {
            data: bus,
            timestamp: Date.now()
        });

        displayBusModal(bus);
    } catch (error) {
        console.error('Error loading bus details:', error);
        showToast('Unable to load bus details. Please try again later.', 'error');
    }
}

// Display bus modal with optimized rendering
function displayBusModal(bus) {
    const modalContent = `
        <div class="modal-header">
            <h2>${bus.name}</h2>
        </div>
        <div class="modal-body">
            <div class="bus-details">
                <div class="bus-header">
                    <div class="bus-profile-pic large" style="background-image: url('${bus.imageUrl || '/images/default-bus.jpg'}')">
                        <span>${bus.name}</span>
                    </div>
                    <div class="bus-title">
                        <h3>${bus.name}</h3>
                        <p>${bus.route || 'Route not available'}</p>
                    </div>
                </div>
                
                <div class="bus-schedule">
                    <h4><i class="fas fa-clock"></i> Schedule & Fare</h4>
                    <div class="schedule-grid">
                        <div class="schedule-item">
                            <span class="label">Schedule:</span>
                            <span class="value">${bus.schedule || 'Not available'}</span>
                        </div>
                        <div class="schedule-item">
                            <span class="label">Fare:</span>
                            <span class="value">${bus.fare || 'Not available'}</span>
                        </div>
                        <div class="schedule-item">
                            <span class="label">Total Stops:</span>
                            <span class="value">${bus.totalStops || 'Not available'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bus-stops">
                    <h4><i class="fas fa-map-marker-alt"></i> Route Stops</h4>
                    <div class="stops-list">
                        ${bus.stops ? bus.stops.map((stop, index) => `
                            <div class="stop-item">
                                <span class="stop-number">${index + 1}</span>
                                <span class="stop-name">${stop}</span>
                            </div>
                        `).join('') : '<p>No stops information available</p>'}
                    </div>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="feature-btn save-route" onclick="toggleSaveRoute('${bus._id}', event)">
                    ${isSaved(bus._id) ? '<i class="fas fa-star"></i> Remove from Saved' : '<i class="fas fa-star"></i> Save Route'}
                </button>
                <button class="feature-btn share-btn" onclick="shareRoute('${bus._id}', event)">
                    <i class="fas fa-share"></i> Share Route
                </button>
            </div>
        </div>
    `;
    
    elements.modalBody.innerHTML = modalContent;
    showModal();
}

// Optimized bus filtering with debouncing
let filterTimeout = null;
function filterBuses(searchTerm) {
    if (filterTimeout) {
        clearTimeout(filterTimeout);
    }
    
    filterTimeout = setTimeout(() => {
        const normalizedSearch = searchTerm.toLowerCase().trim();
        
        if (!normalizedSearch) {
            displayBuses(allBuses);
            return;
        }
        
        const filteredBuses = allBuses.filter(bus => {
            const nameMatch = bus.name && bus.name.toLowerCase().includes(normalizedSearch);
            const routeMatch = bus.route && bus.route.toLowerCase().includes(normalizedSearch);
            const stopsMatch = bus.stops && bus.stops.some(stop => 
                stop.toLowerCase().includes(normalizedSearch)
            );
            
            return nameMatch || routeMatch || stopsMatch;
        });
        
        displayBuses(filteredBuses);
    }, 300);
}

// Show modal with optimized animation
function showModal() {
    elements.busModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus management for accessibility
    const firstFocusable = elements.busModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
}

// Hide modal with optimized animation
function hideModal() {
    elements.busModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Return focus to the element that opened the modal
    const lastFocused = document.querySelector('[data-last-focused]');
    if (lastFocused) {
        lastFocused.focus();
        lastFocused.removeAttribute('data-last-focused');
    }
}

// Optimized bus display with virtual scrolling for large lists
function displayBuses(buses) {
    elements.busGrid.innerHTML = '';
    
    if (buses.length === 0) {
        elements.busGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h2>No buses found</h2>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }
    
    // Use virtual scrolling for large lists
    if (buses.length > VIRTUAL_SCROLL_THRESHOLD) {
        displayBusesVirtual(buses);
    } else {
        displayBusesNormal(buses);
    }
}

// Normal display for smaller lists
function displayBusesNormal(buses) {
    const fragment = document.createDocumentFragment();
    
    buses.forEach((bus, index) => {
        const card = createBusCard(bus);
        if (card) {
            // Stagger animation for better performance
            card.style.animationDelay = `${index * 50}ms`;
            fragment.appendChild(card);
        }
    });
    
    elements.busGrid.appendChild(fragment);
}

// Virtual scrolling for large lists
function displayBusesVirtual(buses) {
    const visibleCount = Math.ceil(window.innerHeight / 200); // Approximate card height
    const visibleBuses = buses.slice(0, visibleCount);
    
    const fragment = document.createDocumentFragment();
    
    visibleBuses.forEach((bus, index) => {
        const card = createBusCard(bus);
        if (card) {
            card.style.animationDelay = `${index * 50}ms`;
            fragment.appendChild(card);
        }
    });
    
    elements.busGrid.appendChild(fragment);
    
    // Add scroll listener for virtual scrolling
    let scrollListener = null;
    if (!scrollListener) {
        scrollListener = throttle(() => {
            const scrollTop = window.pageYOffset;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            if (scrollTop + windowHeight >= documentHeight - 100) {
                loadMoreBusesVirtual(buses);
            }
        }, 100);
        
        window.addEventListener('scroll', scrollListener);
    }
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Load more buses for virtual scrolling
function loadMoreBusesVirtual(buses) {
    const currentCount = elements.busGrid.children.length;
    const nextBuses = buses.slice(currentCount, currentCount + 10);
    
    if (nextBuses.length > 0) {
        const fragment = document.createDocumentFragment();
        
        nextBuses.forEach((bus, index) => {
            const card = createBusCard(bus);
            if (card) {
                fragment.appendChild(card);
            }
        });
        
        elements.busGrid.appendChild(fragment);
    }
}

// Optimized load more buses function
async function loadMoreBuses() {
    if (isLoading) return;
    
    isLoading = true;
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    
    try {
        const startIndex = (currentPage - 1) * busesPerPage;
        const endIndex = startIndex + busesPerPage;
        const newBuses = allBuses.slice(startIndex, endIndex);
        
        if (newBuses.length > 0) {
            const fragment = document.createDocumentFragment();
            
            newBuses.forEach((bus, index) => {
                const card = createBusCard(bus);
                if (card) {
                    card.style.animationDelay = `${index * 50}ms`;
                    fragment.appendChild(card);
                }
            });
            
            elements.busGrid.appendChild(fragment);
            currentPage++;
            displayedBuses += newBuses.length;
            
            // Show/hide load more button
            if (displayedBuses >= allBuses.length) {
                loadMoreBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading more buses:', error);
        showToast('Error loading more buses', 'error');
    } finally {
        isLoading = false;
        loadMoreBtn.textContent = 'Load More Buses';
        loadMoreBtn.disabled = false;
    }
}

// Initialize with optimized loading
async function initialize() {
    try {
        // Show loading state
        elements.busGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading buses...</p>
            </div>
        `;
        
        const response = await fetch('https://busseva-backend-yhzz.onrender.com/api/buses', {
            headers: {
                'Cache-Control': 'max-age=300'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        
        allBuses = await response.json();
        
        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const busId = urlParams.get('bus');
        const showModal = urlParams.get('showModal');
        
        if (busId && showModal === 'true') {
            await showBusDetails(busId);
        }
        
        // Display initial buses
        displayBuses(allBuses);
        
        // Add load more button if needed
        if (allBuses.length > busesPerPage) {
            loadMoreBtn.style.display = 'block';
            elements.busGrid.parentNode.appendChild(loadMoreBtn);
        }
        
    } catch (error) {
        console.error('Error initializing bus list:', error);
        elements.busGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h2>Error loading buses</h2>
                <p>Please try refreshing the page</p>
            </div>
        `;
    }
}

// Event listeners with optimized performance
elements.busSearch.addEventListener('input', (e) => {
    filterBuses(e.target.value);
});

elements.closeModal.addEventListener('click', hideModal);

// Close modal when clicking outside
elements.busModal.addEventListener('click', (e) => {
    if (e.target === elements.busModal) {
        hideModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.busModal.classList.contains('active')) {
        hideModal();
    }
});

loadMoreBtn.addEventListener('click', loadMoreBuses);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Clean up observers
    imageObserver.disconnect();
    
    // Clear caches if needed
    if (busCache.size > 100) {
        busCache.clear();
    }
    if (imageCache.size > 50) {
        imageCache.clear();
    }
}); 

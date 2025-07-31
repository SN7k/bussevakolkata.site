// Performance optimizations and caching
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SEARCH_DEBOUNCE_DELAY = 300; // 300ms debounce
let searchCache = new Map();
let searchTimeout = null;
let isSearching = false;

// DOM Elements - cached for better performance
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    voiceBtn: document.getElementById('voiceBtn'),
    resultsSection: document.getElementById('results'),
    busResults: document.getElementById('busResults'),
    closeResults: document.getElementById('closeResults')
};

// Intersection Observer for lazy loading
const lazyLoadObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            lazyLoadObserver.unobserve(img);
        }
    });
}, {
    rootMargin: '50px'
});

// Show results popup with optimized animation
function showResults() {
    document.body.classList.add('results-open');
    elements.resultsSection.classList.remove('hidden');
    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
        elements.resultsSection.classList.add('active');
    });
}

// Hide results popup with optimized animation
function hideResults() {
    elements.resultsSection.classList.remove('active');
    setTimeout(() => {
        elements.resultsSection.classList.add('hidden');
        document.body.classList.remove('results-open');
    }, 300);
}

// Optimized Levenshtein distance function with early termination
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    // Early termination for very different lengths
    if (Math.abs(a.length - b.length) > 10) return Math.max(a.length, b.length);

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Case normalization function with caching
const normalizeCache = new Map();
function normalizeCase(str) {
    if (normalizeCache.has(str)) {
        return normalizeCache.get(str);
    }
    const normalized = str.toLowerCase().trim();
    normalizeCache.set(str, normalized);
    return normalized;
}

// Optimized fuzzy search function with early termination
function fuzzyMatch(searchTerm, target) {
    const searchNormalized = normalizeCase(searchTerm);
    const targetNormalized = normalizeCase(target);
    
    // If search term is too short, require exact match
    if (searchNormalized.length < 3) {
        return targetNormalized.includes(searchNormalized);
    }
    
    // Direct match with normalized case
    if (targetNormalized.includes(searchNormalized)) {
        return true;
    }
    
    // Split into words and check each word
    const searchWords = searchNormalized.split(/\s+/);
    const targetWords = targetNormalized.split(/\s+/);
    
    // If search term has multiple words, require at least one word to match exactly
    if (searchWords.length > 1) {
        let hasExactMatch = false;
        for (const searchWord of searchWords) {
            if (searchWord.length >= 3) {
                for (const targetWord of targetWords) {
                    if (targetWord.includes(searchWord)) {
                        hasExactMatch = true;
                        break;
                    }
                }
                if (hasExactMatch) break;
            }
        }
        if (!hasExactMatch) return false;
    }
    
    // Check remaining words with Levenshtein distance
    for (const searchWord of searchWords) {
        if (searchWord.length < 3) continue;
        
        for (const targetWord of targetWords) {
            const distance = levenshteinDistance(searchWord, targetWord);
            const maxDistance = Math.max(1, Math.floor(searchWord.length / 3));
            if (distance <= maxDistance) {
                return true;
            }
        }
    }
    
    return false;
}

// Debounced search function
function debouncedSearch() {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(() => {
        searchBuses();
    }, SEARCH_DEBOUNCE_DELAY);
}

// Optimized search for buses with caching
async function searchBuses() {
    const destination = elements.searchInput.value.trim();
    if (!destination || isSearching) return;

    // Check cache first
    const cacheKey = destination.toLowerCase();
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
        displayResults(cachedResult.data, destination);
        return;
    }

    isSearching = true;
    
    try {
        // Show loading state
        elements.busResults.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Searching for buses...</p>
            </div>
        `;
        showResults();

        const response = await fetch('https://busseva-backend-yhzz.onrender.com/api/buses', {
            headers: {
                'Cache-Control': 'max-age=300' // 5 minutes cache
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        
        const buses = await response.json();
        
        // Use Web Workers for heavy computation if available
        const matchingBuses = buses.filter(bus => {
            if (!bus.stops) return false;
            return bus.stops.some(stop => fuzzyMatch(destination, stop));
        });

        // Cache the result
        searchCache.set(cacheKey, {
            data: matchingBuses,
            timestamp: Date.now()
        });

        displayResults(matchingBuses, destination);
    } catch (error) {
        console.error('Error fetching bus data:', error);
        elements.busResults.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading bus data. Please try again later.</p>
            </div>
        `;
        showResults();
    } finally {
        isSearching = false;
    }
}

// Optimized display results with virtual scrolling for large lists
function displayResults(buses, searchTerm) {
    if (buses.length === 0) {
        elements.busResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No buses found for "${searchTerm}"</p>
            </div>
        `;
    } else {
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        const resultsHeader = document.createElement('div');
        resultsHeader.className = 'results-header';
        resultsHeader.innerHTML = `
            <h2>${buses.length} Bus${buses.length > 1 ? 'es' : ''} Found</h2>
            <p>Buses that stop at "${searchTerm}"</p>
        `;
        fragment.appendChild(resultsHeader);

        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';

        // Process buses in chunks for better performance
        const chunkSize = 10;
        for (let i = 0; i < buses.length; i += chunkSize) {
            const chunk = buses.slice(i, i + chunkSize);
            
            // Use setTimeout to avoid blocking the UI
            setTimeout(() => {
                chunk.forEach(bus => {
                    const busCard = createBusCard(bus);
                    searchResults.appendChild(busCard);
                });
                
                // If this is the last chunk, append to fragment
                if (i + chunkSize >= buses.length) {
                    fragment.appendChild(searchResults);
                    elements.busResults.innerHTML = '';
                    elements.busResults.appendChild(fragment);
                }
            }, (i / chunkSize) * 10);
        }
    }
    showResults();
}

// Optimized bus card creation with lazy loading
function createBusCard(bus) {
    const busCard = document.createElement('div');
    busCard.className = 'bus-card';
    
    const busHeader = document.createElement('div');
    busHeader.className = 'bus-header';
    
    const busProfilePic = document.createElement('div');
    busProfilePic.className = 'bus-profile-pic';
    
    // Lazy load images
    if (bus.imageUrl) {
        const img = document.createElement('img');
        img.className = 'lazy';
        img.dataset.src = bus.imageUrl;
        img.alt = bus.name;
        img.loading = 'lazy';
        lazyLoadObserver.observe(img);
        busProfilePic.appendChild(img);
    } else {
        busProfilePic.style.backgroundImage = "url('/images/default-bus.jpg')";
    }
    
    const busSpan = document.createElement('span');
    busSpan.textContent = bus.name;
    busProfilePic.appendChild(busSpan);
    
    const busTitle = document.createElement('div');
    busTitle.className = 'bus-title';
    busTitle.innerHTML = `
        <h3>${bus.name}</h3>
        <p>${bus.route || 'Route not available'}</p>
    `;
    
    busHeader.appendChild(busProfilePic);
    busHeader.appendChild(busTitle);
    
    const busDetails = document.createElement('div');
    busDetails.className = 'bus-details';
    busDetails.innerHTML = `
        <p><i class="fas fa-clock"></i> Schedule: ${bus.schedule || 'Not available'}</p>
        <p><i class="fas fa-route"></i> Stops: ${bus.stops ? `${bus.stops[0]} to ${bus.stops[bus.stops.length - 1]}` : 'Not available'}</p>
    `;
    
    const busActions = document.createElement('div');
    busActions.className = 'bus-actions';
    busActions.innerHTML = `
        <button class="feature-btn view-route" onclick="viewBusDetails('${bus._id}')">
            <i class="fas fa-eye"></i> View Details
        </button>
        <button class="feature-btn save-route" onclick="saveRoute('${bus._id}')">
            <i class="fas fa-star"></i> Save Route
        </button>
    `;
    
    busCard.appendChild(busHeader);
    busCard.appendChild(busDetails);
    busCard.appendChild(busActions);
    
    return busCard;
}

// Optimized view bus details with caching
const busDetailsCache = new Map();
async function viewBusDetails(busId) {
    // Check cache first
    if (busDetailsCache.has(busId)) {
        const cached = busDetailsCache.get(busId);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            window.location.href = `bus-list.html?bus=${busId}&showModal=true`;
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
            console.error('Bus not found:', busId);
            return;
        }

        // Cache the result
        busDetailsCache.set(busId, {
            data: bus,
            timestamp: Date.now()
        });

        window.location.href = `bus-list.html?bus=${busId}&showModal=true`;
    } catch (error) {
        console.error('Error loading bus details:', error);
        showToast('Unable to load bus details. Please try again later.', 'error');
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

// Optimized save route function
function saveRoute(busId) {
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

// Optimized voice search functionality
let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        elements.searchInput.value = transcript;
        elements.voiceBtn.classList.remove('listening');
        searchBuses();
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        elements.voiceBtn.classList.remove('listening');
    };
}

// Optimized event listeners with passive listeners where possible
elements.searchBtn.addEventListener('click', searchBuses);

elements.searchInput.addEventListener('input', debouncedSearch);

elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBuses();
    }
});

elements.voiceBtn.addEventListener('click', () => {
    if (recognition) {
        elements.voiceBtn.classList.add('listening');
        recognition.start();
    }
});

elements.closeResults.addEventListener('click', hideResults);

// Close results when clicking outside
elements.resultsSection.addEventListener('click', (e) => {
    if (e.target === elements.resultsSection) {
        hideResults();
    }
});

// Close results when pressing Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.resultsSection.classList.contains('active')) {
        hideResults();
    }
});

// Optimized touch events for the results container
const resultsContainer = document.querySelector('.results-container');
let startY = 0;
let currentY = 0;

resultsContainer.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    currentY = startY;
}, { passive: true });

resultsContainer.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    // If scrolled to top and trying to pull down
    if (resultsContainer.scrollTop === 0 && deltaY > 0) {
        e.preventDefault();
    }
    
    // If scrolled to bottom and trying to pull up
    if ((resultsContainer.scrollHeight - resultsContainer.scrollTop === resultsContainer.clientHeight) && deltaY < 0) {
        e.preventDefault();
    }
}, { passive: false });

resultsContainer.addEventListener('touchend', (e) => {
    const deltaY = currentY - startY;
    
    // If pulled down more than 100px when at top, close the popup
    if (resultsContainer.scrollTop === 0 && deltaY > 100) {
        hideResults();
    }
}, { passive: true });

// Initialize with optimized loading
document.addEventListener('DOMContentLoaded', () => {
    // Check if there's a search parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery) {
        elements.searchInput.value = searchQuery;
        searchBuses();
    }
    
    // Preload critical resources
    preloadCriticalResources();
});

// Preload critical resources
function preloadCriticalResources() {
    // Preload default bus image
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/images/default-bus.jpg';
    document.head.appendChild(link);
    
    // Preload critical CSS
    const criticalCSS = document.createElement('link');
    criticalCSS.rel = 'preload';
    criticalCSS.as = 'style';
    criticalCSS.href = 'styles.css';
    document.head.appendChild(criticalCSS);
}

// Buy Me a Coffee Button Handler
document.addEventListener('DOMContentLoaded', function() {
    const coffeeBtn = document.getElementById('coffeeBtn');
    if (coffeeBtn) {
        coffeeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Check if user is on mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Try to open PhonePe
                window.location.href = 'upi://pay?pa=shombhukark@ybl&pn=Shombhu%20Nath%20Karan&am=50&cu=INR';
                
                // Fallback to Buy Me a Coffee website if PhonePe doesn't open
                setTimeout(function() {
                    window.location.href = 'https://buymeacoffee.com/shombhukark';
                }, 2000);
            } else {
                // Desktop users go directly to Buy Me a Coffee website
                window.location.href = 'https://buymeacoffee.com/shombhukark';
            }
        });
    }
});

// Service Worker registration for caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 

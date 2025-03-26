// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const voiceBtn = document.getElementById('voiceBtn');
const resultsSection = document.getElementById('results');
const busResults = document.getElementById('busResults');
const closeResults = document.getElementById('closeResults');

// Show results popup
function showResults() {
    document.body.classList.add('results-open');
    resultsSection.classList.remove('hidden');
    setTimeout(() => {
        resultsSection.classList.add('active');
    }, 10);
}

// Hide results popup
function hideResults() {
    resultsSection.classList.remove('active');
    setTimeout(() => {
        resultsSection.classList.add('hidden');
        document.body.classList.remove('results-open');
    }, 300);
}

// Levenshtein distance function for fuzzy matching
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

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

// Case normalization function
function normalizeCase(str) {
    return str.toLowerCase().trim();
}

// Fuzzy search function
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
            if (searchWord.length >= 3) { // Only check words with 3 or more characters
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
        if (searchWord.length < 3) continue; // Skip short words
        
        for (const targetWord of targetWords) {
            // Calculate Levenshtein distance for each word
            const distance = levenshteinDistance(searchWord, targetWord);
            
            // Stricter threshold for word matching
            const maxDistance = Math.max(1, Math.floor(searchWord.length / 3));
            if (distance <= maxDistance) {
                return true;
            }
        }
    }
    
    return false;
}

// Search for buses
async function searchBuses() {
    const destination = searchInput.value.trim();
    if (!destination) return;

    try {
        const response = await fetch('https://busseva-backend.onrender.com/api/buses');
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        const buses = await response.json();
        
        const matchingBuses = buses.filter(bus => {
            if (!bus.stops) return false;
            
            // Check each stop
            return bus.stops.some(stop => {
                const matches = fuzzyMatch(destination, stop);
                return matches;
            });
        });

        displayResults(matchingBuses, destination);
    } catch (error) {
        console.error('Error fetching bus data:', error);
        busResults.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading bus data. Please try again later.</p>
            </div>
        `;
        showResults();
    }
}

// Display search results
function displayResults(buses, searchTerm) {
    if (buses.length === 0) {
        busResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No buses found for "${searchTerm}"</p>
            </div>
        `;
    } else {
        const busCardsHTML = buses.map(bus => `
            <div class="bus-card">
                <div class="bus-header">
                    <div class="bus-profile-pic" style="background-image: url('${bus.imageUrl || '/images/default-bus.jpg'}')">
                        <span>${bus.name}</span>
                    </div>
                    <div class="bus-title">
                        <h3>${bus.name}</h3>
                        <p>${bus.route || 'Route not available'}</p>
                    </div>
                </div>
                <div class="bus-details">
                    <p><i class="fas fa-clock"></i> Schedule: ${bus.schedule || 'Not available'}</p>
                    <p><i class="fas fa-route"></i> Stops: ${bus.stops ? `${bus.stops[0]} to ${bus.stops[bus.stops.length - 1]}` : 'Not available'}</p>
                </div>
                <div class="bus-actions">
                    <button class="feature-btn view-route" onclick="viewBusDetails('${bus._id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="feature-btn save-route" onclick="saveRoute('${bus._id}')">
                        <i class="fas fa-star"></i> Save Route
                    </button>
                </div>
            </div>
        `).join('');
        
        busResults.innerHTML = `
            <div class="results-header">
                <h2>${buses.length} Bus${buses.length > 1 ? 'es' : ''} Found</h2>
                <p>Buses that stop at "${searchTerm}"</p>
            </div>
            <div class="search-results">
                ${busCardsHTML}
            </div>
        `;
    }
    showResults();
}

// View bus details
async function viewBusDetails(busId) {
    try {
        const response = await fetch(`https://busseva-backend.onrender.com/api/buses/${busId}`);
        if (!response.ok) {
            throw new Error('Failed to load bus details');
        }
        const bus = await response.json();
        
        if (!bus) {
            console.error('Bus not found:', busId);
            return;
        }

        window.location.href = `bus-list.html?bus=${busId}&showModal=true`;
    } catch (error) {
        console.error('Error loading bus details:', error);
        alert('Unable to load bus details. Please try again later.');
    }
}

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Save route to favorites
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

// Voice search functionality
let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        voiceBtn.classList.remove('listening');
        searchBuses();
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        voiceBtn.classList.remove('listening');
    };
}

// Event Listeners
searchBtn.addEventListener('click', searchBuses);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBuses();
    }
});

voiceBtn.addEventListener('click', () => {
    if (recognition) {
        voiceBtn.classList.add('listening');
        recognition.start();
    }
});

closeResults.addEventListener('click', hideResults);

// Close results when clicking outside
resultsSection.addEventListener('click', (e) => {
    if (e.target === resultsSection) {
        hideResults();
    }
});

// Close results when pressing Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resultsSection.classList.contains('active')) {
        hideResults();
    }
});

// Handle touch events for the results container
const resultsContainer = document.querySelector('.results-container');
let startY = 0;
let currentY = 0;

resultsContainer.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    currentY = startY;
});

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
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if there's a search parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery) {
        searchInput.value = searchQuery;
        searchBuses();
    }
});

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
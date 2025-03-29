// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const voiceBtn = document.getElementById('voiceBtn');
const resultsSection = document.getElementById('results');
const busResults = document.getElementById('busResults');
const closeResults = document.getElementById('closeResults');
let recommendationsContainer = null;

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
    
    // Common words that should not match on their own
    const commonWords = ['college', 'school', 'hospital', 'station', 'market', 'road', 'street', 'park', 'mall', 'bus', 'stop'];
    
    // If the search term is a common word, require it to be part of a longer stop name
    // or an exact match to the full stop name
    if (commonWords.includes(searchNormalized) && targetNormalized !== searchNormalized) {
        // Check if it's a substring but not a standalone word
        const targetWords = targetNormalized.split(/\s+/);
        
        // If the common word is the only search term, it must be part of a compound word
        // or have additional qualifiers (like "BT College" not just "College")
        let isPartOfCompoundWord = false;
        for (const word of targetWords) {
            if (word.includes(searchNormalized) && word !== searchNormalized) {
                isPartOfCompoundWord = true;
                break;
            }
        }
        
        // If it's not part of a compound word, it must be qualified (e.g., "Medical College")
        if (!isPartOfCompoundWord) {
            // Check if the common word appears with qualifiers
            const index = targetWords.findIndex(word => word === searchNormalized);
            if (index === -1 || targetWords.length === 1) {
                return false;
            }
        }
    }
    
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
    
    // For single-word short search terms, be more strict
    if (searchWords.length === 1 && searchNormalized.length <= 4) {
        // For very short search terms (3-4 chars), require at least 75% character match
        const minMatchRatio = 0.75;
        let bestMatchRatio = 0;
        
        for (const targetWord of targetWords) {
            if (targetWord.includes(searchNormalized)) {
                return true; // Direct substring match
            }
            
            // Calculate character match ratio
            const distance = levenshteinDistance(searchNormalized, targetWord);
            const matchRatio = 1 - (distance / Math.max(searchNormalized.length, targetWord.length));
            bestMatchRatio = Math.max(bestMatchRatio, matchRatio);
        }
        
        return bestMatchRatio >= minMatchRatio;
    }
    
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
        
        let hasWordMatch = false;
        for (const targetWord of targetWords) {
            // Calculate Levenshtein distance for each word
            const distance = levenshteinDistance(searchWord, targetWord);
            
            // Stricter threshold for word matching - use a percentage-based approach
            const maxDistance = Math.min(2, Math.floor(searchWord.length * 0.3)); // Max 30% of word length can be different
            if (distance <= maxDistance) {
                hasWordMatch = true;
                break;
            }
        }
        
        if (!hasWordMatch) return false; // If any word doesn't match, return false
    }
    
    return true;
}

// Search for buses
async function searchBuses() {
    const destination = searchInput.value.trim();
    if (!destination) return;
    
    // Hide recommendations when search is performed
    hideRecommendations();

    try {
        const response = await fetch('https://busseva-backend.onrender.com/api/buses');
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        const buses = await response.json();
        
        // Extract all unique stops for validation
        const allStops = new Set();
        buses.forEach(bus => {
            if (bus.stops && Array.isArray(bus.stops)) {
                bus.stops.forEach(stop => allStops.add(normalizeCase(stop)));
            }
        });
        
        // Common words that should have more specific searches
        const commonWords = ['college', 'school', 'hospital', 'station', 'market', 'road', 'street', 'park', 'mall', 'bus', 'stop'];
        const searchNormalized = normalizeCase(destination);
        
        // If the search is just a common word, suggest being more specific
        if (commonWords.includes(searchNormalized)) {
            // Find stops that contain this common word to suggest
            const relatedStops = Array.from(allStops)
                .filter(stop => stop.includes(searchNormalized) && stop !== searchNormalized)
                .slice(0, 5);
                
            if (relatedStops.length > 0) {
                const suggestionsHTML = relatedStops.map(stop => 
                    `<button class="suggestion-btn" onclick="document.getElementById('searchInput').value='${stop}'; searchBuses();">${stop}</button>`
                ).join('');
                
                busResults.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-info-circle"></i>
                        <p>"${destination}" is too general. Did you mean one of these specific stops?</p>
                        <div class="suggestions">
                            ${suggestionsHTML}
                        </div>
                    </div>
                `;
                showResults();
                return;
            }
        }
        
        // Check if the search term is too short and not an exact match to any stop
        if (destination.length < 3) {
            const hasExactMatch = Array.from(allStops).some(stop => 
                stop.includes(normalizeCase(destination))
            );
            
            if (!hasExactMatch) {
                busResults.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-info-circle"></i>
                        <p>Search term "${destination}" is too short. Please enter at least 3 characters or an exact stop name.</p>
                    </div>
                `;
                showResults();
                return;
            }
        }
        
        // Check if the search term exactly matches a known stop
        const isExactStop = Array.from(allStops).includes(searchNormalized);
        
        const matchingBuses = buses.filter(bus => {
            if (!bus.stops) return false;
            
            // Check each stop
            return bus.stops.some(stop => {
                const matches = fuzzyMatch(destination, stop);
                return matches;
            });
        });
        
        // If no buses found, check if any stop names are similar to provide suggestions
        if (matchingBuses.length === 0) {
            // Find closest matching stops for suggestions
            const allStopsArray = Array.from(allStops);
            const suggestions = allStopsArray
                .map(stop => ({
                    stop: stop,
                    distance: levenshteinDistance(normalizeCase(destination), stop)
                }))
                .filter(item => item.distance <= Math.min(3, Math.ceil(destination.length / 2)))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3)
                .map(item => item.stop);
                
            if (suggestions.length > 0) {
                const suggestionsHTML = suggestions.map(stop => 
                    `<button class="suggestion-btn" onclick="document.getElementById('searchInput').value='${stop}'; searchBuses();">${stop}</button>`
                ).join('');
                
                busResults.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <p>No buses found for "${destination}"</p>
                        <div class="suggestions">
                            <p>Did you mean:</p>
                            ${suggestionsHTML}
                        </div>
                    </div>
                `;
            } else {
                busResults.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <p>No buses found for "${destination}"</p>
                        <p class="suggestion-text">Please try a different location.</p>
                    </div>
                `;
            }
        } else {
            // If we found buses but the search wasn't an exact stop, show a note
            let resultsHeader = `
                <div class="results-header">
                    <h2>${matchingBuses.length} Bus${matchingBuses.length > 1 ? 'es' : ''} Found</h2>
            `;
            
            if (!isExactStop && commonWords.includes(searchNormalized)) {
                resultsHeader += `
                    <p>Buses that have "${destination}" in their stop names</p>
                    <p class="search-note">For more accurate results, try searching for a specific stop name.</p>
                `;
            } else {
                resultsHeader += `
                    <p>Buses that stop at "${destination}"</p>
                `;
            }
            
            resultsHeader += `</div>`;
            
            const busCardsHTML = matchingBuses.map(bus => `
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
                ${resultsHeader}
                <div class="search-results">
                    ${busCardsHTML}
                </div>
            `;
        }
        showResults();
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

// Get and display stop recommendations as user types
async function getStopRecommendations() {
    const searchTerm = searchInput.value.trim();
    
    // Don't show recommendations for empty or very short search terms
    if (!searchTerm || searchTerm.length < 2) {
        hideRecommendations();
        return;
    }
    
    try {
        // Fetch all buses to extract stops
        const response = await fetch('https://busseva-backend.onrender.com/api/buses');
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        const buses = await response.json();
        
        // Extract all unique stops
        const allStops = new Set();
        buses.forEach(bus => {
            if (bus.stops && Array.isArray(bus.stops)) {
                bus.stops.forEach(stop => allStops.add(stop));
            }
        });
        
        // Filter stops based on search term with stricter matching for short queries
        const matchingStops = Array.from(allStops).filter(stop => {
            // For very short search terms (2-3 chars), require direct substring match
            if (searchTerm.length <= 3) {
                return normalizeCase(stop).includes(normalizeCase(searchTerm));
            }
            return fuzzyMatch(searchTerm, stop);
        });
        
        // Sort by relevance - exact matches first, then by similarity
        const sortedStops = matchingStops.sort((a, b) => {
            const aLower = normalizeCase(a);
            const bLower = normalizeCase(b);
            const termLower = normalizeCase(searchTerm);
            
            // Exact matches first
            const aExact = aLower.includes(termLower);
            const bExact = bLower.includes(termLower);
            
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            // Then sort by Levenshtein distance
            const aDist = levenshteinDistance(termLower, aLower);
            const bDist = levenshteinDistance(termLower, bLower);
            return aDist - bDist;
        }).slice(0, 5); // Limit to 5 recommendations
        
        // Display recommendations
        if (sortedStops.length > 0) {
            displayRecommendations(sortedStops);
        } else {
            hideRecommendations();
        }
    } catch (error) {
        console.error('Error fetching stop recommendations:', error);
        hideRecommendations();
    }
}

// Display the recommendations dropdown
function displayRecommendations(stops) {
    // Create recommendations container if it doesn't exist
    if (!recommendationsContainer) {
        recommendationsContainer = document.createElement('div');
        recommendationsContainer.className = 'recommendations-container';
        searchInput.parentNode.appendChild(recommendationsContainer);
    }
    
    // Clear previous recommendations
    recommendationsContainer.innerHTML = '';
    
    // Add recommendations
    stops.forEach(stop => {
        const recommendation = document.createElement('div');
        recommendation.className = 'recommendation-item';
        recommendation.textContent = stop;
        
        // Add click event to select recommendation
        recommendation.addEventListener('click', () => {
            searchInput.value = stop;
            hideRecommendations();
            searchBuses(); // Perform search with the selected stop
        });
        
        recommendationsContainer.appendChild(recommendation);
    });
    
    // Show the recommendations container
    recommendationsContainer.style.display = 'block';
}

// Hide recommendations dropdown
function hideRecommendations() {
    if (recommendationsContainer) {
        recommendationsContainer.style.display = 'none';
    }
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

// Add input event listener for real-time recommendations
searchInput.addEventListener('input', debounce(getStopRecommendations, 300));

// Hide recommendations when clicking outside
document.addEventListener('click', (event) => {
    if (event.target !== searchInput && recommendationsContainer) {
        hideRecommendations();
    }
});

// Debounce function to limit API calls
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

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

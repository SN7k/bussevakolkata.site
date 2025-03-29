// DOM Elements
const busGrid = document.getElementById('busGrid');
const busModal = document.getElementById('busModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const busSearch = document.getElementById('busSearch');
const searchButton = document.getElementById('searchButton');
const loadMoreBtn = document.createElement('button');
loadMoreBtn.className = 'load-more-btn';
loadMoreBtn.textContent = 'Load More Buses';
loadMoreBtn.style.display = 'none';

// Global variables
let allBuses = []; // Store all buses for filtering
let displayedBuses = []; // Track which buses are currently displayed
let currentPage = 1;
const busesPerPage = 12;
let isLoading = false;
let isSearchActive = false;
let currentSearchTerm = '';

// Fetch all buses at once
async function fetchAllBuses() {
    try {
        // Show loading state
        busGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';

        console.log('Fetching all buses');
        const response = await fetch('https://busseva-backend.onrender.com/api/buses');
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        
        const responseData = await response.json();
        console.log('Raw API response:', responseData);
        
        // Handle different API response formats
        let busData;
        if (Array.isArray(responseData)) {
            // API returns an array directly
            busData = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
            // API returns { data: [...] }
            busData = responseData.data;
        } else if (responseData.buses && Array.isArray(responseData.buses)) {
            // API returns { buses: [...] }
            busData = responseData.buses;
        } else if (responseData.results && Array.isArray(responseData.results)) {
            // API returns { results: [...] }
            busData = responseData.results;
        } else {
            console.error('Unexpected API response format:', responseData);
            busData = [];
        }
        
        console.log(`Processed ${busData.length} total buses`);
        return busData;
    } catch (error) {
        console.error('Error fetching bus data:', error);
        throw error;
    }
}

// Create bus card with optimized image loading
function createBusCard(bus) {
    try {
        const card = document.createElement('div');
        card.className = 'bus-card';
        card.setAttribute('data-bus-id', bus._id);
        
        // Add loading state initially
        card.classList.add('loading');
        
        // Create bus image section with lazy loading
        const busImage = document.createElement('div');
        busImage.className = 'bus-profile-pic';
        const busColor = getBusColorByType(bus.type || 'regular');
        busImage.style.background = busColor;
        
        if (bus.imageUrl) {
            // Create a new image to preload
            const img = new Image();
            
            // Set up event handlers
            img.onload = () => {
                busImage.style.backgroundImage = `url('${bus.imageUrl}')`;
                busImage.style.backgroundSize = 'cover';
                busImage.style.backgroundPosition = 'center';
                card.classList.remove('loading');
            };
            
            img.onerror = () => {
                console.log(`Failed to load image for bus: ${bus.name}`);
                // Use a default bus icon if image fails to load
                const busIcon = document.createElement('i');
                busIcon.className = 'fas fa-bus';
                busIcon.style.position = 'absolute';
                busIcon.style.top = '50%';
                busIcon.style.left = '50%';
                busIcon.style.transform = 'translate(-50%, -50%)';
                busIcon.style.fontSize = '4rem';
                busIcon.style.color = 'rgba(255, 255, 255, 0.3)';
                busImage.appendChild(busIcon);
                card.classList.remove('loading');
            };
            
            // Start loading the image immediately
            img.src = bus.imageUrl;
        } else {
            const busIcon = document.createElement('i');
            busIcon.className = 'fas fa-bus';
            busIcon.style.position = 'absolute';
            busIcon.style.top = '50%';
            busIcon.style.left = '50%';
            busIcon.style.transform = 'translate(-50%, -50%)';
            busIcon.style.fontSize = '4rem';
            busIcon.style.color = 'rgba(255, 255, 255, 0.3)';
            busImage.appendChild(busIcon);
            card.classList.remove('loading');
        }
        
        // Create bus info section
        const busInfo = document.createElement('div');
        busInfo.className = 'bus-info';
        
        // Add essential information first
        const busTitle = document.createElement('h3');
        busTitle.textContent = bus.name || 'Unknown Bus';
        busInfo.appendChild(busTitle);
        
        // Add route information
        const busRoute = document.createElement('p');
        busRoute.textContent = bus.route || 'Route not available';
        busInfo.appendChild(busRoute);
        
        // Add metadata
        const busMeta = document.createElement('div');
        busMeta.className = 'bus-meta';
        
        // Add essential tags first
        const scheduleTag = document.createElement('span');
        scheduleTag.textContent = bus.schedule || 'Every 15-20 minutes';
        busMeta.appendChild(scheduleTag);
        
        // Add other tags immediately
        const stopsTag = document.createElement('span');
        stopsTag.textContent = `${bus.stops ? bus.stops.length : 0} stops`;
        busMeta.appendChild(stopsTag);
        
        if (bus.type) {
            const typeTag = document.createElement('span');
            typeTag.textContent = getBusTypeLabel(bus.type);
            busMeta.appendChild(typeTag);
        }
        
        busInfo.appendChild(busMeta);
        
        // Add event listeners
        card.addEventListener('click', () => showBusDetails(bus._id));
        
        // Assemble the card
        card.appendChild(busImage);
        card.appendChild(busInfo);
        
        return card;
    } catch (error) {
        console.error('Error creating bus card:', error);
        return null;
    }
}

// Display buses with progressive loading
function displayBuses(buses, append = false) {
    console.log(`Displaying ${buses.length} buses, append=${append}`);
    
    // Skip if no buses to display
    if (!buses || buses.length === 0) {
        console.log('No buses to display');
        return;
    }
    
    // If not appending, clear the grid
    if (!append) {
        busGrid.innerHTML = '';
        displayedBuses = [];
    }
    
    // Track which buses are being displayed
    displayedBuses = [...displayedBuses, ...buses];
    
    // Create all cards first
    const cards = buses.map(bus => createBusCard(bus)).filter(card => card !== null);
    console.log(`Created ${cards.length} bus cards`);
    
    // Add cards to the grid with a small delay between each
    cards.forEach((card, index) => {
        setTimeout(() => {
            busGrid.appendChild(card);
        }, index * 50);
    });
}

// Filter buses based on search term
function filterBuses(searchTerm) {
    currentSearchTerm = searchTerm;
    
    if (!searchTerm.trim()) {
        // If search is cleared, reset to initial state
        isSearchActive = false;
        currentPage = 1;
        
        // Display first page of all buses
        const firstPageBuses = allBuses.slice(0, busesPerPage);
        displayBuses(firstPageBuses, false);
        
        // Show load more button if there are more buses
        if (allBuses.length > busesPerPage) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
        
        return;
    }
    
    isSearchActive = true;
    console.log("Searching for:", searchTerm);
    
    // Check if search term is a specific bus number (only digits)
    const isExactBusNumber = /^\d+$/.test(searchTerm.trim());
    
    // Create a map to track buses by ID to prevent duplicates
    const busMap = new Map();
    let filteredBuses = [];
    
    // Minimum length for search terms (to avoid random short words)
    const minSearchLength = 3;
    
    if (isExactBusNumber) {
        console.log("Exact bus number search for:", searchTerm);
        
        // First pass: Look for exact bus number matches
        allBuses.forEach(bus => {
            const busNameLower = bus.name.toLowerCase();
            const searchLower = searchTerm.toLowerCase().trim();
            
            // Extract bus number from bus name
            const busNumberMatch = busNameLower.match(/\b(\d+)\b/);
            const busNumber = busNumberMatch ? busNumberMatch[1] : null;
            
            // Check if the extracted bus number exactly matches the search term
            if (busNumber === searchLower && !busMap.has(bus._id)) {
                console.log("Found exact bus number match:", bus.name);
                busMap.set(bus._id, bus);
            }
        });
        
        // If no exact bus number matches, try pattern matching
        if (busMap.size === 0) {
            console.log("No exact bus number matches, trying pattern matching");
            allBuses.forEach(bus => {
                const busNameLower = bus.name.toLowerCase();
                const searchLower = searchTerm.toLowerCase().trim();
                
                // Check for exact match patterns like "44", "Bus 44", "44 Bus", etc.
                const exactMatchPatterns = [
                    `^${searchLower}$`,                  // Exactly "44"
                    `^${searchLower}\\s`,                // Starts with "44 "
                    `\\s${searchLower}$`,                // Ends with " 44"
                    `^bus\\s${searchLower}$`,            // Exactly "bus 44"
                    `^bus\\s${searchLower}\\s`,          // Starts with "bus 44 "
                    `^${searchLower}\\sbus`,             // Starts with "44 bus"
                    `\\bbus\\s${searchLower}\\b`,        // Contains "bus 44" as a word
                    `\\b${searchLower}\\b`               // Contains "44" as a standalone word
                ];
                
                const isExactMatch = exactMatchPatterns.some(pattern => 
                    new RegExp(pattern, 'i').test(busNameLower)
                );
                
                if (isExactMatch && !busMap.has(bus._id)) {
                    console.log("Found pattern match:", bus.name);
                    busMap.set(bus._id, bus);
                }
            });
        }
    } else {
        // Regular search for non-numeric terms
        console.log("Regular search for:", searchTerm);
        
        // Skip search if term is too short (unless it's a bus number)
        if (searchTerm.trim().length < minSearchLength) {
            console.log("Search term too short, showing no results");
            busGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Please enter at least ${minSearchLength} characters for text search</p>
                </div>
            `;
            loadMoreBtn.style.display = 'none';
            return;
        }
        
        // Split search terms for better matching
        const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/).filter(term => term.length >= 2);
        
        // If no valid search terms after filtering, show message
        if (searchTerms.length === 0) {
            console.log("No valid search terms after filtering");
            busGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Please enter more specific search terms</p>
                </div>
            `;
            loadMoreBtn.style.display = 'none';
            return;
        }
        
        // Common words to ignore in searches
        const commonWords = ['bus', 'route', 'the', 'and', 'for', 'from', 'to'];
        
        // Filter out common words from search terms
        const filteredSearchTerms = searchTerms.filter(term => !commonWords.includes(term));
        
        // If no terms left after filtering common words, use original terms
        const termsToUse = filteredSearchTerms.length > 0 ? filteredSearchTerms : searchTerms;
        
        console.log("Searching with terms:", termsToUse);
        
        allBuses.forEach(bus => {
            const busNameLower = bus.name.toLowerCase();
            const routeLower = bus.route ? bus.route.toLowerCase() : '';
            
            // Calculate how many terms match in the bus name or route
            let nameMatches = 0;
            let routeMatches = 0;
            let stopMatches = 0;
            
            termsToUse.forEach(term => {
                // Check exact word boundaries for more precise matching
                const nameRegex = new RegExp(`\\b${term}\\b`, 'i');
                const routeRegex = new RegExp(`\\b${term}\\b`, 'i');
                
                if (nameRegex.test(busNameLower)) {
                    nameMatches++;
                }
                
                if (routeLower && routeRegex.test(routeLower)) {
                    routeMatches++;
                }
                
                // Check stops for exact matches
                if (bus.stops) {
                    const hasStopMatch = bus.stops.some(stop => {
                        const stopLower = stop.toLowerCase();
                        const stopRegex = new RegExp(`\\b${term}\\b`, 'i');
                        return stopRegex.test(stopLower);
                    });
                    
                    if (hasStopMatch) {
                        stopMatches++;
                    }
                }
            });
            
            // Calculate match percentage (how many of the search terms matched)
            const totalMatches = nameMatches + routeMatches + stopMatches;
            const matchPercentage = totalMatches / termsToUse.length;
            
            // Only include buses with a good match percentage
            // At least 50% of search terms should match, or there should be at least 2 matches
            if ((matchPercentage >= 0.5 || totalMatches >= 2) && !busMap.has(bus._id)) {
                console.log(`Match for "${bus.name}": ${totalMatches}/${termsToUse.length} terms (${matchPercentage * 100}%)`);
                busMap.set(bus._id, bus);
            }
        });
    }
    
    // Convert map values to array
    filteredBuses = Array.from(busMap.values());
    console.log(`Found ${filteredBuses.length} unique buses:`, filteredBuses.map(b => b.name));

    // Reset page counter
    currentPage = 1;

    if (filteredBuses.length === 0) {
        busGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No buses found matching "${searchTerm}"</p>
            </div>
        `;
        loadMoreBtn.style.display = 'none';
        return;
    }

    // Display first page of filtered buses
    const firstPageBuses = filteredBuses.slice(0, busesPerPage);
    displayBuses(firstPageBuses, false);
    
    // Show/hide load more button based on filtered results
    if (filteredBuses.length > busesPerPage) {
        loadMoreBtn.style.display = 'block';
        // Store remaining filtered buses for pagination
        loadMoreBtn.setAttribute('data-filtered', JSON.stringify(filteredBuses));
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Load more buses
function loadMoreBuses() {
    if (isLoading) return;
    
    isLoading = true;
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    
    try {
        currentPage++;
        const startIndex = (currentPage - 1) * busesPerPage;
        const endIndex = startIndex + busesPerPage;
        
        if (isSearchActive) {
            // Get filtered buses
            const filteredBuses = JSON.parse(loadMoreBtn.getAttribute('data-filtered') || '[]');
            console.log(`Loading more filtered buses. Page ${currentPage}, showing ${startIndex}-${endIndex} of ${filteredBuses.length}`);
            
            // Get next batch
            const nextBatch = filteredBuses.slice(startIndex, endIndex);
            
            if (nextBatch.length > 0) {
                // Display next batch
                displayBuses(nextBatch, true);
                
                // Hide load more button if we've shown all buses
                if (endIndex >= filteredBuses.length) {
                    loadMoreBtn.style.display = 'none';
                }
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            // Get next batch from all buses
            console.log(`Loading more buses. Page ${currentPage}, showing ${startIndex}-${endIndex} of ${allBuses.length}`);
            const nextBatch = allBuses.slice(startIndex, endIndex);
            
            if (nextBatch.length > 0) {
                // Display next batch
                displayBuses(nextBatch, true);
                
                // Hide load more button if we've shown all buses
                if (endIndex >= allBuses.length) {
                    loadMoreBtn.style.display = 'none';
                }
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading more buses:', error);
        showToast('Failed to load more buses', 'error');
    } finally {
        isLoading = false;
        loadMoreBtn.textContent = 'Load More Buses';
        loadMoreBtn.disabled = false;
    }
}

// Initialize the bus list
async function initializeBusList() {
    try {
        // Fetch all buses at once
        const buses = await fetchAllBuses();
        
        // Store all buses for filtering and pagination
        allBuses = [...buses];
        
        // Display first page
        const firstPageBuses = allBuses.slice(0, busesPerPage);
        displayBuses(firstPageBuses, false);
        
        // Add load more button if needed
        if (allBuses.length > busesPerPage) {
            if (!busGrid.parentNode.contains(loadMoreBtn)) {
                busGrid.parentNode.appendChild(loadMoreBtn);
            }
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error initializing bus list:', error);
        busGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading bus data. Please try again later.</p>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeBusList();
        
        // Add event listener for load more button
        loadMoreBtn.removeEventListener('click', loadMoreBuses);
        loadMoreBtn.addEventListener('click', loadMoreBuses);
        
        // Add event listener for search button
        searchButton.addEventListener('click', () => {
            filterBuses(busSearch.value);
        });
        
        // Check URL parameters for bus details
        const urlParams = new URLSearchParams(window.location.search);
        const busId = urlParams.get('bus');
        const showModalParam = urlParams.get('showModal') === 'true';

        if (busId && showModalParam) {
            showBusDetails(busId);
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Search input event listener
busSearch.addEventListener('input', (e) => {
    filterBuses(e.target.value);
});

// Helper function to get bus type label
function getBusTypeLabel(type) {
    if (!type) return 'Regular';
    
    if (type.toLowerCase().includes('ac')) {
        return 'AC';
    } else if (type.toLowerCase().includes('mini')) {
        return 'Mini';
    } else if (type.toLowerCase().includes('express')) {
        return 'Express';
    } else {
        return 'Regular';
    }
}

// Helper function to get color based on bus type
function getBusColorByType(type) {
    if (!type) return 'linear-gradient(135deg, #4b6cb7, #182848)';
    
    if (type.toLowerCase().includes('ac')) {
        return 'linear-gradient(135deg, #1e3c72, #2a5298)'; // Blue gradient for AC
    } else if (type.toLowerCase().includes('mini')) {
        return 'linear-gradient(135deg, #8e44ad, #9b59b6)'; // Purple gradient for Mini
    } else if (type.toLowerCase().includes('express')) {
        return 'linear-gradient(135deg, #c0392b, #e74c3c)'; // Red gradient for Express
    } else {
        return 'linear-gradient(135deg, #2c3e50, #4ca1af)'; // Teal gradient for Regular
    }
}

// Check if a route is saved
function isSaved(busId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
    return favorites.includes(busId);
}

// Toggle save route
function toggleSaveRoute(busId, event) {
    if (event) {
        event.stopPropagation(); // Prevent card click event
    }
    
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

// Share route
async function shareRoute(busId, event) {
    if (event) {
        event.stopPropagation(); // Prevent card click event
    }
    
    try {
        const response = await fetch(`https://busseva-backend.onrender.com/api/buses/${busId}`);
        if (!response.ok) {
            throw new Error('Failed to load bus details');
        }
        const bus = await response.json();
        
        if (!bus) {
            console.error('Bus not found:', busId);
            showToast('Unable to find bus information', 'error');
            return;
        }

        // Create share text
        const shareText = `${bus.name}\n\n` +
            `Route: ${bus.route || 'Not available'}\n` +
            `Schedule: ${bus.schedule || 'Not available'}\n` +
            `Fare: ${bus.fare || 'Not available'}\n` +
            `Stops: ${bus.stops ? bus.stops.join(' → ') : 'Not available'}\n\n` +
            `View more details at: ${window.location.origin}/bus-list.html?bus=${bus._id}`;

        // Check if Web Share API is available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${bus.name} Route Details`,
                    text: shareText,
                    url: `${window.location.origin}/bus-list.html?bus=${bus._id}`
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    fallbackShare(shareText);
                }
            }
        } else {
            fallbackShare(shareText);
        }
    } catch (error) {
        console.error('Error sharing route:', error);
        showToast('Unable to share route', 'error');
    }
}

// Fallback share method
function fallbackShare(shareText) {
    const textarea = document.createElement('textarea');
    textarea.value = shareText;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('Route details copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy route details', 'error');
    }
    
    document.body.removeChild(textarea);
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

// Show bus details
async function showBusDetails(busId) {
    try {
        const response = await fetch(`https://busseva-backend.onrender.com/api/buses/${busId}`);
        if (!response.ok) {
            throw new Error('Failed to load bus details');
        }
        const bus = await response.json();
        
        if (!bus) {
            showToast('Bus not found', 'error');
            return;
        }

        // Get the appropriate background color based on bus type
        const busColor = getBusColorByType(bus.type || 'regular');
        
        // Prepare the profile pic style
        let profilePicStyle = `background: ${busColor};`;
        
        // Add background image if available
        if (bus.imageUrl) {
            profilePicStyle += ` background-image: url('${bus.imageUrl}'); background-size: 110%; background-position: center;`;
        }

        modalBody.innerHTML = `
            <div class="bus-details">
                <div class="bus-thumbnail full-width" style="${profilePicStyle}">
                    ${!bus.imageUrl ? `<i class="fas fa-bus"></i>` : ''}
                    <div class="bus-type-badge">${getBusTypeLabel(bus.type || 'regular')}</div>
                </div>
                
                <div class="bus-info-container">
                    <div class="bus-title">
                        <h3>${bus.name}</h3>
                        <p>${bus.route}</p>
                    </div>
                    
                    <div class="bus-schedule">
                        <h4><i class="fas fa-clock"></i> Schedule</h4>
                        <div class="schedule-grid">
                            <div class="schedule-item">
                                <span class="label">Schedule</span>
                                <span class="value">${bus.schedule || 'Not available'}</span>
                            </div>
                            <div class="schedule-item">
                                <span class="label">Fare</span>
                                <span class="value">${bus.fare || 'Not available'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bus-stops">
                        <h4><i class="fas fa-map-marker-alt"></i> Bus Stops</h4>
                        <div class="stops-list">
                            ${bus.stops ? bus.stops.map((stop, index) => `
                                <div class="stop-item">
                                    <div class="stop-number">${index + 1}</div>
                                    <div class="stop-name">${stop}</div>
                                </div>
                            `).join('') : '<p>No stops information available</p>'}
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="feature-btn save-route" onclick="toggleSaveRoute('${bus._id}', event)">
                            <i class="fas fa-star"></i> ${isSaved(bus._id) ? 'Remove from Saved' : 'Save Route'}
                        </button>
                        <button class="feature-btn share-btn" onclick="shareRoute('${bus._id}', event)">
                            <i class="fas fa-share"></i> Share Route
                        </button>
                    </div>
                </div>
            </div>
        `;
        showModal();
    } catch (error) {
        console.error('Error loading bus details:', error);
        showToast('Unable to load bus details', 'error');
    }
}

// Show modal
function showModal() {
    busModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal() {
    busModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal when clicking close button
closeModal.addEventListener('click', hideModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === busModal) {
        hideModal();
    }
});
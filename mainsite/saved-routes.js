// DOM Elements
const savedRoutesGrid = document.getElementById('savedRoutesGrid');
const noSavedRoutes = document.getElementById('noSavedRoutes');
const busModal = document.getElementById('busModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

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

// Event Listeners
closeModal.addEventListener('click', hideModal);

busModal.addEventListener('click', (e) => {
    if (e.target === busModal) {
        hideModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && busModal.classList.contains('active')) {
        hideModal();
    }
});

// Fetch bus data
async function fetchBusData() {
    try {
        const response = await fetch('https://busseva-backend-yhzz.onrender.com/api/buses');
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching bus data:', error);
        showToast('Failed to load bus data', 'error');
        return [];
    }
}

// Get saved routes from localStorage
function getSavedRoutes() {
    return JSON.parse(localStorage.getItem('favoriteRoutes') || '[]');
}

// Create saved route card
function createSavedRouteCard(bus) {
    if (!bus || typeof bus !== 'object') {
        console.error('Invalid bus data:', bus);
        return null;
    }

    try {
        // Create card container
        const card = document.createElement('div');
        card.className = 'bus-card';
        card.setAttribute('data-bus-id', bus._id);
        
        // Create bus image section
        const busImage = document.createElement('div');
        busImage.className = 'bus-profile-pic';
        
        // Set a default placeholder color gradient as background
        const busColor = getBusColorByType(bus.type || 'regular');
        busImage.style.background = busColor;
        
        // Handle image loading with proper error handling
        if (bus.imageUrl) {
            // Create a new image to test loading
            const img = new Image();
            
            // Set up event handlers
            img.onload = () => {
                busImage.style.backgroundImage = `url('${bus.imageUrl}')`;
                busImage.style.backgroundSize = 'cover';
                busImage.style.backgroundPosition = 'center';
            };
            
            img.onerror = () => {
                // Keep the gradient background if image fails to load
                console.log(`Failed to load image for bus: ${bus.name}`);
            };
            
            // Start loading the image
            img.src = bus.imageUrl;
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
        scheduleTag.textContent = bus.schedule || 'Every 15-20 minutes';
        busMeta.appendChild(scheduleTag);
        
        const stopsTag = document.createElement('span');
        stopsTag.textContent = `${bus.stops ? bus.stops.length : 0} stops`;
        busMeta.appendChild(stopsTag);
        
        if (bus.type) {
            const typeTag = document.createElement('span');
            typeTag.textContent = getBusTypeLabel(bus.type);
            busMeta.appendChild(typeTag);
        }
        
        // Assemble the bus info section
        busInfo.appendChild(busTitle);
        busInfo.appendChild(busRoute);
        busInfo.appendChild(busMeta);
        
        // Add click event to the entire card to view details
        card.addEventListener('click', () => {
            showBusDetails(bus._id);
        });
        
        // Add hover effect class for better UX
        card.addEventListener('mouseenter', () => {
            card.classList.add('hover');
        });
        
        card.addEventListener('mouseleave', () => {
            card.classList.remove('hover');
        });
        
        // Add animation delay for staggered appearance
        const savedRoutes = JSON.parse(localStorage.getItem('savedRoutes')) || [];
        const index = savedRoutes.findIndex(route => route._id === bus._id);
        if (index !== -1) {
            card.style.animationDelay = `${index * 0.1}s`;
        }
        
        // Assemble the card
        card.appendChild(busImage);
        card.appendChild(busInfo);
        
        return card;
    } catch (error) {
        console.error('Error creating bus card:', error, bus);
        return null;
    }
}

// Helper function to get a color gradient based on bus type
function getBusColorByType(type) {
    type = type.toLowerCase();
    
    if (type.includes('ac')) {
        return 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'; // Blue gradient for AC buses
    } else if (type.includes('mini')) {
        return 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)'; // Green gradient for mini buses
    } else if (type.includes('express')) {
        return 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)'; // Red gradient for express buses
    } else if (type.includes('local')) {
        return 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)'; // Orange gradient for local buses
    } else {
        return 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)'; // Default blue-purple gradient
    }
}

// Helper function to get a formatted bus type label
function getBusTypeLabel(type) {
    type = type.toLowerCase();
    
    if (type.includes('ac')) {
        return 'AC';
    } else if (type.includes('mini')) {
        return 'Mini';
    } else if (type.includes('express')) {
        return 'Express';
    } else if (type.includes('local')) {
        return 'Local';
    } else {
        return 'Regular';
    }
}

// Display saved routes
async function displaySavedRoutes() {
    try {
        // Get saved routes from localStorage
        const savedRoutes = getSavedRoutes();
        
        // If no saved routes, show empty state
        if (savedRoutes.length === 0) {
            savedRoutesGrid.classList.add('hidden');
            noSavedRoutes.classList.remove('hidden');
            return;
        }
        
        // Show a subtle loading indicator
        savedRoutesGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
        
        // Fetch all buses data
        const allBuses = await fetchBusData();
        
        if (!allBuses || !Array.isArray(allBuses)) {
            throw new Error('Failed to fetch bus data');
        }
        
        // Filter buses that are in saved routes
        const savedBuses = allBuses.filter(bus => savedRoutes.includes(bus._id));
        
        // If no saved buses found after filtering, show empty state
        if (savedBuses.length === 0) {
            savedRoutesGrid.classList.add('hidden');
            noSavedRoutes.classList.remove('hidden');
            return;
        }
        
        // Show the grid and hide empty state
        savedRoutesGrid.classList.remove('hidden');
        noSavedRoutes.classList.add('hidden');
        
        // Clear existing content
        savedRoutesGrid.innerHTML = '';
        
        // Add saved bus cards
        savedBuses.forEach(bus => {
            const card = createSavedRouteCard(bus);
            if (card) {
                savedRoutesGrid.appendChild(card);
            }
        });
        
        // Add animation for better UX
        const cards = savedRoutesGrid.querySelectorAll('.bus-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fade-in');
            }, index * 100);
        });
        
    } catch (error) {
        console.error('Error displaying saved routes:', error);
        savedRoutesGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Oops! Something went wrong</h3>
                <p>We couldn't load your saved routes. Please try again later.</p>
                <button class="feature-btn" onclick="displaySavedRoutes()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        showToast('Failed to load saved routes', 'error');
    }
}

// Remove route from favorites
async function removeRoute(busId) {
    try {
        let favorites = getSavedRoutes();
        
        // Check if busId exists in favorites
        if (!favorites.includes(busId)) {
            console.warn('Bus ID not found in favorites:', busId);
            showToast('This route is not in your saved routes');
            return;
        }
        
        // Remove the busId from favorites
        favorites = favorites.filter(route => route !== busId);
        
        // Save updated favorites to localStorage
        localStorage.setItem('favoriteRoutes', JSON.stringify(favorites));
        
        // Show success message
        showToast('Route removed from saved routes');
        
        // If this was the last card, show empty state immediately
        if (favorites.length === 0) {
            savedRoutesGrid.innerHTML = '';
            savedRoutesGrid.classList.add('hidden');
            noSavedRoutes.classList.remove('hidden');
        } else {
            // Otherwise update the display normally
            await displaySavedRoutes();
        }
        
        // If modal is open, close it
        if (busModal.classList.contains('active')) {
            hideModal();
        }
    } catch (error) {
        console.error('Error removing route:', error);
        showToast('Failed to remove route', 'error');
    }
}

// Share route
async function shareRoute(busId) {
    try {
        const response = await fetch(`https://busseva-backend-yhzz.onrender.com/api/buses/${busId}`);
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

// Show bus details
async function showBusDetails(busId) {
    try {
        const response = await fetch(`https://busseva-backend-yhzz.onrender.com/api/buses/${busId}`);
        if (!response.ok) {
            throw new Error('Failed to load bus details');
        }
        const bus = await response.json();
        
        if (!bus) {
            showToast('Bus not found', 'error');
            return;
        }

        modalBody.innerHTML = `
            <div class="bus-details">
                <div class="bus-header">
                    <div class="bus-profile-pic large" style="background-image: url('${bus.imageUrl || '/images/default-bus.jpg'}')">
                        <span>${bus.name}</span>
                    </div>
                    <div class="bus-title">
                        <h3>${bus.name}</h3>
                        <p>${bus.route}</p>
                    </div>
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
                    <button class="feature-btn remove-btn" data-bus-id="${bus._id}">
                        <i class="fas fa-trash"></i> Remove from Saved Routes
                    </button>
                    <button class="feature-btn share-btn" data-bus-id="${bus._id}">
                        <i class="fas fa-share"></i> Share Route
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners to modal buttons
        const modalRemoveBtn = modalBody.querySelector('.remove-btn');
        modalRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeRoute(bus._id);
        });
        
        const modalShareBtn = modalBody.querySelector('.share-btn');
        modalShareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareRoute(bus._id);
        });
        
        showModal();
    } catch (error) {
        console.error('Error loading bus details:', error);
        showToast('Unable to load bus details', 'error');
    }
}

// Initial display
displaySavedRoutes();

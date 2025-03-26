// DOM Elements
const busGrid = document.getElementById('busGrid');
const busModal = document.getElementById('busModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const busSearch = document.getElementById('busSearch');
const loadMoreBtn = document.createElement('button');
loadMoreBtn.className = 'load-more-btn';
loadMoreBtn.textContent = 'Load More Buses';
loadMoreBtn.style.display = 'none';

let allBuses = []; // Store all buses for filtering
let currentPage = 1;
const busesPerPage = 12;
let isLoading = false;

// Create bus card
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
                card.classList.remove('loading'); // Remove loading state when image loads
            };
            
            img.onerror = () => {
                // Keep the gradient background if image fails to load
                console.log(`Failed to load image for bus: ${bus.name}`);
                card.classList.remove('loading');
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
        const index = Array.from(busGrid.children).length;
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Assemble the card
        card.appendChild(busImage);
        card.appendChild(busInfo);
        
        return card;
    } catch (error) {
        console.error('Error creating bus card:', error, bus);
        return null;
    }
}

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
                    <button class="feature-btn save-route" onclick="toggleSaveRoute('${bus._id}', event)">
                        <i class="fas fa-star"></i> ${isSaved(bus._id) ? 'Remove from Saved' : 'Save Route'}
                    </button>
                    <button class="feature-btn share-btn" onclick="shareRoute('${bus._id}', event)">
                        <i class="fas fa-share"></i> Share Route
                    </button>
                </div>
            </div>
        `;
        showModal();
    } catch (error) {
        console.error('Error loading bus details:', error);
        showToast('Unable to load bus details', 'error');
    }
}

// Filter buses based on search term
function filterBuses(searchTerm) {
    const filteredBuses = allBuses.filter(bus => {
        const searchLower = searchTerm.toLowerCase();
        return (
            bus.name.toLowerCase().includes(searchLower) ||
            (bus.route && bus.route.toLowerCase().includes(searchLower)) ||
            (bus.stops && bus.stops.some(stop => stop.toLowerCase().includes(searchLower)))
        );
    });

    // Clear existing content
    busGrid.innerHTML = '';
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

    // Add filtered bus cards
    displayBuses();
    
    // Show/hide load more button based on filtered results
    if (filteredBuses.length > busesPerPage) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
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

// Search input event listener
busSearch.addEventListener('input', (e) => {
    filterBuses(e.target.value);
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show loading state
        busGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
        
        const response = await fetch('https://busseva-backend.onrender.com/api/buses');
        if (!response.ok) {
            throw new Error('Failed to fetch bus data');
        }
        const buses = await response.json();
        
        // Store all buses for filtering
        allBuses = buses;
        
        // Clear loading state
        busGrid.innerHTML = '';
        
        // Add initial bus cards
        displayBuses();
        
        // Add load more button if there are more buses
        if (allBuses.length > busesPerPage) {
            busGrid.parentNode.appendChild(loadMoreBtn);
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.addEventListener('click', loadMoreBuses);
        }
        
        // Check URL parameters for bus details
        const urlParams = new URLSearchParams(window.location.search);
        const busId = urlParams.get('bus');
        const showModalParam = urlParams.get('showModal') === 'true';

        if (busId && showModalParam) {
            showBusDetails(busId);
        }
    } catch (error) {
        console.error('Error loading bus data:', error);
        busGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading bus data. Please try again later.</p>
            </div>
        `;
    }
});

// Display buses with pagination
function displayBuses() {
    const startIndex = 0;
    const endIndex = currentPage * busesPerPage;
    const busesToShow = allBuses.slice(startIndex, endIndex);
    
    busesToShow.forEach(bus => {
        const card = createBusCard(bus);
        if (card) {
            busGrid.appendChild(card);
        }
    });
    
    // Hide load more button if all buses are displayed
    if (endIndex >= allBuses.length) {
        loadMoreBtn.style.display = 'none';
    }
}

// Load more buses
async function loadMoreBuses() {
    if (isLoading) return;
    
    isLoading = true;
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    
    // Simulate network delay for smooth loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    currentPage++;
    displayBuses();
    
    isLoading = false;
    loadMoreBtn.textContent = 'Load More Buses';
    loadMoreBtn.disabled = false;
} 
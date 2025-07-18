// API Configuration
const API_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('sakaya_token');
let currentUser = null;

// API Helper Functions
const api = {
    get: async (endpoint) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        if (!response.ok) throw await response.json();
        return response.json();
    },
    
    post: async (endpoint, data) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw await response.json();
        return response.json();
    },
    
    put: async (endpoint, data) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw await response.json();
        return response.json();
    },
    
    delete: async (endpoint) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        if (!response.ok) throw await response.json();
        return response.json();
    },
    
    postFormData: async (endpoint, formData) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            body: formData
        });
        if (!response.ok) throw await response.json();
        return response.json();
    },
    
    putFormData: async (endpoint, formData) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            body: formData
        });
        if (!response.ok) throw await response.json();
        return response.json();
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
    await loadCars();
    if (currentUser && !currentUser.isAdmin) {
        updateCartBadge();
    }
});

// Check login status
async function checkLoginStatus() {
    if (authToken) {
        try {
            currentUser = await api.get('/auth/me');
            updateNavigation();
        } catch (error) {
            logout();
        }
    }
}

// Load cars from API
async function loadCars() {
    try {
        const cars = await api.get('/cars');
        const grid = document.getElementById('carsGrid');
        grid.innerHTML = '';
        
        cars.forEach(car => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-4';
            col.dataset.category = car.category;
            
            col.innerHTML = `
                <div class="card car-card h-100">
                    <img src="${API_URL}${car.image}" class="card-img-top" alt="${car.name}" 
                         style="height: 200px; object-fit: cover;" onerror="this.src='./assets/default-car.jpg'">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${car.name}</h5>
                        <p class="card-text">${car.description || 'No description available'}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="h5 text-primary">$${car.price}/day</span>
                                ${!car.isAvailable ? '<span class="badge bg-danger">Not Available</span>' : ''}
                                <button class="btn btn-primary" onclick="showRentModal(${car.id})" 
                                    ${!currentUser || currentUser.isAdmin || !car.isAvailable ? 'disabled' : ''}>
                                    ${!currentUser ? 'Login to Rent' : currentUser.isAdmin ? 'Admin Mode' : !car.isAvailable ? 'Not Available' : 'Rent Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            grid.appendChild(col);
        });
    } catch (error) {
        showErrorMessage('Failed to load cars');
    }
}

// Filter cars
function filterCars(category) {
    const cards = document.querySelectorAll('[data-category]');
    const buttons = document.querySelectorAll('.btn-group .btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    cards.forEach(card => {
        card.style.display = (category === 'all' || card.dataset.category === category) ? 'block' : 'none';
    });
}

// Authentication Functions
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await api.post('/auth/login', { email, password });
        authToken = response.token;
        currentUser = response.user;
        localStorage.setItem('sakaya_token', authToken);
        
        updateNavigation();
        await loadCars();
        if (!currentUser.isAdmin) {
            updateCartBadge();
        }
        
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        showSuccessMessage(`Welcome back, ${currentUser.name}!`);
    } catch (error) {
        showErrorMessage(error.error || 'Login failed');
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showErrorMessage('Passwords do not match');
        return;
    }
    
    try {
        const response = await api.post('/auth/register', { name, email, password });
        authToken = response.token;
        currentUser = response.user;
        localStorage.setItem('sakaya_token', authToken);
        
        updateNavigation();
        await loadCars();
        updateCartBadge();
        
        bootstrap.Modal.getInstance(document.getElementById('signupModal')).hide();
        showSuccessMessage(`Welcome to SaKaya, ${currentUser.name}!`);
    } catch (error) {
        showErrorMessage(error.error || 'Registration failed');
    }
});

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('sakaya_token');
    updateNavigation();
    loadCars();
    showSuccessMessage('Logged out successfully!');
}

// Navigation
function updateNavigation() {
    document.getElementById('loginNav').style.display = currentUser ? 'none' : 'block';
    document.getElementById('logoutNav').style.display = currentUser ? 'block' : 'none';
    document.getElementById('profileNav').style.display = currentUser && !currentUser.isAdmin ? 'block' : 'none';
    document.getElementById('cartNav').style.display = currentUser && !currentUser.isAdmin ? 'block' : 'none';
    document.getElementById('adminNav').style.display = currentUser && currentUser.isAdmin ? 'block' : 'none';
}

// Rental Modal
function showRentModal(carId) {
    if (!currentUser || currentUser.isAdmin) return;
    
    const modal = new bootstrap.Modal(document.getElementById('rentModal'));
    document.getElementById('rentCarId').value = carId;
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('rentStartDate').min = today;
    document.getElementById('rentStartDate').value = today;
    
    // Set end date to tomorrow by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('rentEndDate').min = tomorrow.toISOString().split('T')[0];
    document.getElementById('rentEndDate').value = tomorrow.toISOString().split('T')[0];
    
    // Update end date min when start date changes
    document.getElementById('rentStartDate').addEventListener('change', function() {
        const startDate = new Date(this.value);
        const minEndDate = new Date(startDate);
        minEndDate.setDate(minEndDate.getDate() + 1);
        document.getElementById('rentEndDate').min = minEndDate.toISOString().split('T')[0];
        
        if (new Date(document.getElementById('rentEndDate').value) <= startDate) {
            document.getElementById('rentEndDate').value = minEndDate.toISOString().split('T')[0];
        }
    });
    
    modal.show();
}

// Add to cart
async function addToCart() {
    const carId = document.getElementById('rentCarId').value;
    const startDate = document.getElementById('rentStartDate').value;
    const endDate = document.getElementById('rentEndDate').value;
    
    if (!startDate || !endDate) {
        showErrorMessage('Please select dates');
        return;
    }
    
    if (new Date(endDate) <= new Date(startDate)) {
        showErrorMessage('End date must be after start date');
        return;
    }
    
    try {
        await api.post('/rentals/cart', { carId: parseInt(carId), startDate, endDate });
        showSuccessMessage('Added to cart!');
        updateCartBadge();
        bootstrap.Modal.getInstance(document.getElementById('rentModal')).hide();
    } catch (error) {
        showErrorMessage(error.error || 'Failed to add to cart');
    }
}

// Update cart badge
async function updateCartBadge() {
    if (!currentUser || currentUser.isAdmin) return;
    
    try {
        const cartItems = await api.get('/rentals/cart');
        document.getElementById('cartCount').textContent = cartItems.length;
    } catch (error) {
        console.error('Failed to update cart badge');
    }
}

// Show cart
async function showCart() {
    if (!currentUser || currentUser.isAdmin) return;
    
    try {
        const cartItems = await api.get('/rentals/cart');
        const cartItemsDiv = document.getElementById('cartItems');
        const cartTotalSpan = document.getElementById('cartTotal');
        const checkoutBtn = document.getElementById('checkoutBtn');
        
        if (cartItems.length === 0) {
            cartItemsDiv.innerHTML = '<p class="text-center py-4">Your cart is empty.</p>';
            cartTotalSpan.textContent = '0';
            checkoutBtn.disabled = true;
        } else {
            checkoutBtn.disabled = false;
            let total = 0;
            cartItemsDiv.innerHTML = cartItems.map(item => {
                const days = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
                const itemTotal = days * item.price;
                total += itemTotal;
                
                return `
                    <div class="cart-item mb-3 p-3 border rounded">
                        <div class="row align-items-center">
                            <div class="col-md-3">
                                <img src="${API_URL}${item.image}" class="img-fluid rounded" alt="${item.name}"
                                     onerror="this.src='./assets/default-car.jpg'">
                            </div>
                            <div class="col-md-6">
                                <h5>${item.name}</h5>
                                <p class="mb-1"><i class="fas fa-calendar"></i> From: ${new Date(item.startDate).toLocaleDateString()}</p>
                                <p class="mb-1"><i class="fas fa-calendar-check"></i> To: ${new Date(item.endDate).toLocaleDateString()}</p>
                                <p class="mb-0">${days} days × ${item.price}/day = <strong>${itemTotal}</strong></p>
                            </div>
                            <div class="col-md-3 text-end">
                                <button class="btn btn-danger btn-sm" onclick="removeFromCart(${item.id})">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            cartTotalSpan.textContent = total;
        }
        
        new bootstrap.Modal(document.getElementById('cartModal')).show();
    } catch (error) {
        showErrorMessage('Failed to load cart');
    }
}

// Remove from cart
async function removeFromCart(cartItemId) {
    try {
        await api.delete(`/rentals/cart/${cartItemId}`);
        showSuccessMessage('Removed from cart');
        updateCartBadge();
        showCart(); // Refresh cart display
    } catch (error) {
        showErrorMessage('Failed to remove from cart');
    }
}

// Checkout
async function checkout() {
    if (confirm('Are you ready to confirm your rentals?')) {
        try {
            await api.post('/rentals/checkout');
            showSuccessMessage('Checkout successful! Your rentals have been confirmed.');
            updateCartBadge();
            bootstrap.Modal.getInstance(document.getElementById('cartModal')).hide();
        } catch (error) {
            showErrorMessage(error.error || 'Checkout failed');
        }
    }
}

// Profile
async function showProfile() {
    if (!currentUser) return;
    
    try {
        const rentals = await api.get('/rentals/my-rentals');
        const profileContent = document.getElementById('profileContent');
        
        profileContent.innerHTML = `
            <div class="mb-4">
                <h5>User Information</h5>
                <p><strong>Name:</strong> ${currentUser.name}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <button class="btn btn-primary btn-sm" onclick="showUpdateProfile()">Update Profile</button>
            </div>
            <hr>
            <h5>Rental History</h5>
            ${rentals.length === 0 ? '<p class="text-center py-4">No rental history</p>' : 
                rentals.map(rental => {
                    const days = Math.ceil((new Date(rental.endDate) - new Date(rental.startDate)) / (1000 * 60 * 60 * 24));
                    return `
                        <div class="rental-item mb-3 p-3 border rounded">
                            <div class="row">
                                <div class="col-md-2">
                                    <img src="${API_URL}${rental.image}" class="img-fluid rounded" alt="${rental.name}"
                                         onerror="this.src='./assets/default-car.jpg'">
                                </div>
                                <div class="col-md-7">
                                    <h6>${rental.name}</h6>
                                    <p class="mb-1"><i class="fas fa-calendar"></i> From: ${new Date(rental.startDate).toLocaleDateString()} 
                                       To: ${new Date(rental.endDate).toLocaleDateString()}</p>
                                    <p class="mb-0">Total: ${rental.totalPrice} (${days} days)</p>
                                </div>
                                <div class="col-md-3 text-end">
                                    <span class="badge bg-${getStatusColor(rental.status)}">${rental.status.toUpperCase()}</span>
                                    ${rental.status === 'confirmed' ? 
                                        `<br><button class="btn btn-danger btn-sm mt-2" onclick="cancelRental(${rental.id})">Cancel</button>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
        `;
        
        new bootstrap.Modal(document.getElementById('profileModal')).show();
    } catch (error) {
        showErrorMessage('Failed to load profile');
    }
}

// Show update profile form
function showUpdateProfile() {
    document.getElementById('updateName').value = currentUser.name;
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
    new bootstrap.Modal(document.getElementById('updateProfileModal')).show();
}

// Update profile
document.getElementById('updateProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('updateName').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    
    const updateData = { name };
    
    if (currentPassword && newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
    }
    
    try {
        await api.put('/auth/profile', updateData);
        currentUser.name = name;
        showSuccessMessage('Profile updated successfully');
        bootstrap.Modal.getInstance(document.getElementById('updateProfileModal')).hide();
        showProfile();
    } catch (error) {
        showErrorMessage(error.error || 'Failed to update profile');
    }
});

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'confirmed': 'success',
        'active': 'primary',
        'completed': 'secondary',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

// Cancel rental
async function cancelRental(rentalId) {
    if (confirm('Are you sure you want to cancel this rental?')) {
        try {
            await api.post(`/rentals/${rentalId}/cancel`);
            showSuccessMessage('Rental cancelled successfully');
            showProfile(); // Refresh profile
        } catch (error) {
            showErrorMessage(error.error || 'Failed to cancel rental');
        }
    }
}

// Admin Functions
async function showAdmin() {
    await renderAdminCars();
    await renderUserRentals();
    new bootstrap.Modal(document.getElementById('adminModal')).show();
}

async function renderAdminCars() {
    try {
        const cars = await api.get('/cars');
        const grid = document.getElementById('adminCarsGrid');
        
        grid.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cars.map(car => `
                            <tr>
                                <td><img src="${API_URL}${car.image}" style="width: 50px; height: 50px; object-fit: cover;" 
                                     onerror="this.src='./assets/default-car.jpg'"></td>
                                <td>${car.name}</td>
                                <td><span class="badge bg-primary">${car.category}</span></td>
                                <td>${car.price}/day</td>
                                <td>
                                    <span class="badge bg-${car.isAvailable ? 'success' : 'danger'}">
                                        ${car.isAvailable ? 'Available' : 'Not Available'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="editCar(${car.id})">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteCar(${car.id})">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showErrorMessage('Failed to load cars');
    }
}

async function renderUserRentals() {
    try {
        const rentals = await api.get('/rentals/all');
        const grid = document.getElementById('userRentalsGrid');
        
        if (rentals.length === 0) {
            grid.innerHTML = '<p class="text-center py-4">No rentals found</p>';
            return;
        }
        
        grid.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Car</th>
                            <th>Period</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rentals.map(rental => `
                            <tr>
                                <td>${rental.userName}<br><small class="text-muted">${rental.email}</small></td>
                                <td>${rental.carName}</td>
                                <td>${new Date(rental.startDate).toLocaleDateString()} - ${new Date(rental.endDate).toLocaleDateString()}</td>
                                <td>${rental.totalPrice}</td>
                                <td>
                                    <span class="badge bg-${getStatusColor(rental.status)}">${rental.status.toUpperCase()}</span>
                                </td>
                                <td>
                                    <select class="form-select form-select-sm" onchange="updateRentalStatus(${rental.id}, this.value)">
                                        <option value="">Update Status</option>
                                        <option value="confirmed" ${rental.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                        <option value="active" ${rental.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="completed" ${rental.status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="cancelled" ${rental.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showErrorMessage('Failed to load rentals');
    }
}

// Update rental status
async function updateRentalStatus(rentalId, status) {
    if (!status) return;
    
    try {
        await api.put(`/rentals/${rentalId}/status`, { status });
        showSuccessMessage('Status updated successfully');
        renderUserRentals();
    } catch (error) {
        showErrorMessage('Failed to update status');
    }
}

// Show add car form
function showAddCarForm() {
    document.getElementById('carModalTitle').textContent = 'Add New Car';
    document.getElementById('addCarForm').reset();
    document.getElementById('editCarId').value = '';
    document.getElementById('availabilityGroup').style.display = 'none';
    new bootstrap.Modal(document.getElementById('addCarModal')).show();
}

// Edit car
async function editCar(carId) {
    try {
        const car = await api.get(`/cars/${carId}`);
        
        document.getElementById('carModalTitle').textContent = 'Edit Car';
        document.getElementById('editCarId').value = car.id;
        document.getElementById('carName').value = car.name;
        document.getElementById('carCategory').value = car.category;
        document.getElementById('carPrice').value = car.price;
        document.getElementById('carDescription').value = car.description || '';
        document.getElementById('carAvailability').value = car.isAvailable ? 'true' : 'false';
        document.getElementById('availabilityGroup').style.display = 'block';
        
        new bootstrap.Modal(document.getElementById('addCarModal')).show();
    } catch (error) {
        showErrorMessage('Failed to load car details');
    }
}

// Add/Edit car form submission
document.getElementById('addCarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const editCarId = document.getElementById('editCarId').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('carName').value);
    formData.append('category', document.getElementById('carCategory').value);
    formData.append('price', document.getElementById('carPrice').value);
    formData.append('description', document.getElementById('carDescription').value);
    
    const imageFile = document.getElementById('carImageFile').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    if (editCarId) {
        formData.append('isAvailable', document.getElementById('carAvailability').value);
    }
    
    try {
        if (editCarId) {
            await api.putFormData(`/cars/${editCarId}`, formData);
            showSuccessMessage('Car updated successfully');
        } else {
            await api.postFormData('/cars', formData);
            showSuccessMessage('Car added successfully');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('addCarModal')).hide();
        await renderAdminCars();
        await loadCars();
    } catch (error) {
        showErrorMessage(error.error || 'Failed to save car');
    }
});

// Delete car
async function deleteCar(carId) {
    if (confirm('Are you sure you want to delete this car?')) {
        try {
            await api.delete(`/cars/${carId}`);
            showSuccessMessage('Car deleted successfully');
            await renderAdminCars();
            await loadCars();
        } catch (error) {
            showErrorMessage(error.error || 'Failed to delete car');
        }
    }
}

// Helper functions
function showSuccessMessage(msg) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alert.style.top = '80px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        <i class="fas fa-check-circle"></i> ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

function showErrorMessage(msg) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alert.style.top = '80px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        <i class="fas fa-exclamation-circle"></i> ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

function showLogin() {
    new bootstrap.Modal(document.getElementById('loginModal')).show();
}

function showSignup() {
    bootstrap.Modal.getInstance(document.getElementById('loginModal'))?.hide();
    new bootstrap.Modal(document.getElementById('signupModal')).show();
}
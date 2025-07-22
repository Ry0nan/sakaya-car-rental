
// Global variables
let currentUser = null;
let isAdmin = false;

// API utility functions
const API_URL = '/api';

const api = {
    async get(endpoint) {
        console.log('Making GET request to:', API_URL + endpoint);
        const response = await fetch(API_URL + endpoint, {
            headers: {
                'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
            }
        });
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('API Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        return data;
    },

    async post(endpoint, data) {
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    },

    async postFormData(endpoint, formData) {
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: {
                'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    },

    async put(endpoint, data) {
        const response = await fetch(API_URL + endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    },

    async putFormData(endpoint, formData) {
        const response = await fetch(API_URL + endpoint, {
            method: 'PUT',
            headers: {
                'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    },

    async delete(endpoint) {
        const response = await fetch(API_URL + endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    }
};

// Utility functions
function showErrorMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Authentication functions
function checkAuth() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        currentUser = JSON.parse(userData);
        isAdmin = currentUser.role === 'admin';
        updateUIForAuth();
    } else {
        updateUIForNoAuth();
    }
}

function updateUIForAuth() {
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (userSection) userSection.style.display = 'block';
    
    if (adminSection) {
        adminSection.style.display = isAdmin ? 'block' : 'none';
    }
    
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan && currentUser) {
        userNameSpan.textContent = currentUser.username;
    }
}

function updateUIForNoAuth() {
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
}

// Car management functions
async function loadCars() {
    try {
        const cars = await api.get('/cars');
        displayCars(cars);
    } catch (error) {
        console.error('API GET Error:', error);
        showErrorMessage('Failed to load cars');
    }
}

function displayCars(cars) {
    const carsContainer = document.getElementById('carsContainer');
    if (!carsContainer) return;

    carsContainer.innerHTML = '';

    if (cars.length === 0) {
        carsContainer.innerHTML = '<p class="text-center">No cars available</p>';
        return;
    }

    cars.forEach(car => {
        const carCard = document.createElement('div');
        carCard.className = 'col-md-6 col-lg-4 mb-4';
        carCard.innerHTML = `
            <div class="card h-100">
                <img src="${car.image.startsWith('/uploads/') ? '/api' + car.image : car.image || '/assets/car-example.avif'}" class="card-img-top" alt="${car.name}" style="height: 200px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${car.name}</h5>
                    <p class="card-text"><strong>Category:</strong> ${car.category}</p>
                    <p class="card-text"><strong>Price:</strong> $${car.price}/day</p>
                    <p class="card-text"><strong>Seats:</strong> ${car.seats}</p>
                    <p class="card-text flex-grow-1">${car.description || 'No description available'}</p>
                    <div class="mt-auto">
                        <span class="badge ${car.isAvailable ? 'bg-success' : 'bg-danger'} mb-2">
                            ${car.isAvailable ? 'Available' : 'Not Available'}
                        </span>
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-sm flex-fill" onclick="rentCar(${car.id})">Rent</button>
                            ${isAdmin ? `
                                <button class="btn btn-warning btn-sm" onclick="editCar(${car.id})">Edit</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteCar(${car.id})">Delete</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        carsContainer.appendChild(carCard);
    });
}

// Admin functions
function addNewCar() {
    document.getElementById('carModalTitle').textContent = 'Add New Car';
    document.getElementById('addCarForm').reset();
    document.getElementById('editCarId').value = '';
    document.getElementById('availabilityGroup').style.display = 'none';
    new bootstrap.Modal(document.getElementById('addCarModal')).show();
}

async function editCar(carId) {
    try {
        const car = await api.get(`/cars/${carId}`);
        
        document.getElementById('carModalTitle').textContent = 'Edit Car';
        document.getElementById('editCarId').value = car.id;
        document.getElementById('carName').value = car.name;
        document.getElementById('carCategory').value = car.category;
        document.getElementById('carPrice').value = car.price;
        document.getElementById('carSeats').value = car.seats;
        document.getElementById('carDescription').value = car.description || '';
        document.getElementById('carAvailability').value = car.isAvailable ? 'true' : 'false';
        document.getElementById('availabilityGroup').style.display = 'block';
        
        new bootstrap.Modal(document.getElementById('addCarModal')).show();
    } catch (error) {
        showErrorMessage('Failed to load car details');
    }
}

async function deleteCar(carId) {
    if (!confirm('Are you sure you want to delete this car?')) {
        return;
    }

    try {
        await api.delete(`/cars/${carId}`);
        showSuccessMessage('Car deleted successfully');
        loadCars();
    } catch (error) {
        showErrorMessage('Failed to delete car');
    }
}

async function rentCar(carId) {
    if (!currentUser) {
        showErrorMessage('Please login to rent a car');
        return;
    }

    // For now, just show a message. You can implement rental logic later
    showSuccessMessage('Rental functionality coming soon!');
}

// Login functions
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await api.post('/auth/login', loginData);
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('userData', JSON.stringify(response.user));
        
        currentUser = response.user;
        isAdmin = currentUser.role === 'admin';
        
        updateUIForAuth();
        showSuccessMessage('Login successful!');
        
        // Close login modal if it exists
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) loginModal.hide();
        
        loadCars();
    } catch (error) {
        showErrorMessage('Login failed: ' + error.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const registerData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        await api.post('/auth/register', registerData);
        showSuccessMessage('Registration successful! Please login.');
        
        // Close register modal if it exists
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        if (registerModal) registerModal.hide();
        
        // Clear form
        event.target.reset();
    } catch (error) {
        showErrorMessage('Registration failed: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    currentUser = null;
    isAdmin = false;
    updateUIForNoAuth();
    showSuccessMessage('Logged out successfully');
    loadCars();
}

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing app...');
    console.log('API_URL:', API_URL);
    
    // Test API connection
    try {
        console.log('Testing API connection...');
        const testResponse = await fetch(API_URL + '/test');
        console.log('API response status:', testResponse.status);
        const testData = await testResponse.json();
        console.log('API response data:', testData);
    } catch (error) {
        console.error('API connection test failed:', error);
    }
    
    // Check authentication
    checkAuth();
    
    // Load cars
    await loadCars();
    
    // Set up event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Add/Edit car form submission
    const addCarForm = document.getElementById('addCarForm');
    if (addCarForm) {
        addCarForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editCarId = document.getElementById('editCarId').value;
            const formData = new FormData();
            
            formData.append('name', document.getElementById('carName').value);
            formData.append('category', document.getElementById('carCategory').value);
            formData.append('price', document.getElementById('carPrice').value);
            formData.append('seats', document.getElementById('carSeats').value);
            formData.append('description', document.getElementById('carDescription').value);
            
            if (editCarId) {
                formData.append('isAvailable', document.getElementById('carAvailability').value);
            }
            
            const imageFile = document.getElementById('carImageFile').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            try {
                if (editCarId) {
                    await api.putFormData(`/cars/${editCarId}`, formData);
                    showSuccessMessage('Car updated successfully');
                } else {
                    await api.postFormData('/cars', formData);
                    showSuccessMessage('Car added successfully');
                }
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('addCarModal'));
                modal.hide();
                
                loadCars();
            } catch (error) {
                showErrorMessage(`Failed to ${editCarId ? 'update' : 'add'} car: ` + error.message);
            }
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', async function() {
            const category = this.value;
            try {
                const endpoint = category ? `/cars?category=${category}` : '/cars';
                const cars = await api.get(endpoint);
                displayCars(cars);
            } catch (error) {
                showErrorMessage('Failed to filter cars');
            }
        });
    }
});

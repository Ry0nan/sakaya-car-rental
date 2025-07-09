        // Application State
        let currentUser = null;
        let cars = [];
        let users = [];
        let rentals = [];
        let cart = [];

        // Initialize Application
        document.addEventListener('DOMContentLoaded', function() {
            initializeData();
            loadCars();
            checkLoginStatus();
        });

        // Initialize sample data
        function initializeData() {
            // Sample cars data
            const sampleCars = [
                {
                    id: 1,
                    name: "Toyota RAV4",
                    category: "suv",
                    price: 75,
                    image: "https://via.placeholder.com/300x200/343a40/ffffff?text=Toyota+RAV4",
                    description: "Spacious and reliable SUV perfect for family trips"
                },
                {
                    id: 2,
                    name: "Honda Pilot",
                    category: "suv",
                    price: 85,
                    image: "https://via.placeholder.com/300x200/343a40/ffffff?text=Honda+Pilot",
                    description: "Premium 8-seater SUV with advanced safety features"
                },
                {
                    id: 3,
                    name: "Ford Transit",
                    category: "van",
                    price: 95,
                    image: "https://via.placeholder.com/300x200/343a40/ffffff?text=Ford+Transit",
                    description: "Spacious van ideal for group travel and cargo"
                },
                {
                    id: 4,
                    name: "Chevrolet Express",
                    category: "van",
                    price: 90,
                    image: "https://via.placeholder.com/300x200/343a40/ffffff?text=Chevrolet+Express",
                    description: "Reliable passenger van with comfortable seating"
                },
                {
                    id: 5,
                    name: "Toyota Camry",
                    category: "sedan",
                    price: 55,
                    image: "https://via.placeholder.com/300x200/343a40/ffffff?text=Toyota+Camry",
                    description: "Elegant sedan with excellent fuel efficiency"
                },
                {
                    id: 6,
                    name: "Honda Accord",
                    category: "sedan",
                    price: 60,
                    image: "https://via.placeholder.com/300x200/343a40/ffffff?text=Honda+Accord",
                    description: "Luxury sedan with premium interior and smooth ride"
                }
            ];

            // Load from localStorage or use sample data
            cars = JSON.parse(localStorage.getItem('sakaya_cars')) || sampleCars;
            users = JSON.parse(localStorage.getItem('sakaya_users')) || [];
            rentals = JSON.parse(localStorage.getItem('sakaya_rentals')) || [];
            cart = JSON.parse(localStorage.getItem('sakaya_cart')) || [];

            // Save sample data to localStorage if not exists
            if (!localStorage.getItem('sakaya_cars')) {
                localStorage.setItem('sakaya_cars', JSON.stringify(sampleCars));
            }
        }

        // Load cars into grid
        function loadCars() {
            const grid = document.getElementById('carsGrid');
            grid.innerHTML = '';

            cars.forEach(car => {
                const carCard = createCarCard(car);
                grid.appendChild(carCard);
            });
        }

        // Create car card element
        function createCarCard(car) {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-4';
            col.dataset.category = car.category;

            col.innerHTML = `
                <div class="card car-card h-100">
                    <img src="${car.image}" class="card-img-top" alt="${car.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${car.name}</h5>
                        <p class="card-text">${car.description}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="h5 text-primary">$${car.price}/day</span>
                                <button class="btn btn-primary" onclick="addToCart(${car.id})" ${!currentUser || currentUser.isAdmin ? 'disabled' : ''}>
                                    ${!currentUser ? 'Login to Rent' : currentUser.isAdmin ? 'Admin Mode' : 'Add to Cart'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            return col;
        }

        // Filter cars by category
        function filterCars(category) {
            const cards = document.querySelectorAll('[data-category]');
            const buttons = document.querySelectorAll('.btn-group .btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            cards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Authentication functions
        function showLogin() {
            document.getElementById('loginModal').querySelector('.modal-title').textContent = 'Login to SaKaya';
            document.getElementById('loginForm').reset();
            new bootstrap.Modal(document.getElementById('loginModal')).show();
        }

        function showSignup() {
            new bootstrap.Modal(document.getElementById('loginModal')).hide();
            new bootstrap.Modal(document.getElementById('signupModal')).show();
        }

        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const isAdmin = document.getElementById('adminLogin').checked;

            if (isAdmin) {
                // Admin login (hardcoded for demo)
                if (email === 'admin@sakaya.com' && password === 'admin123') {
                    currentUser = { email: 'admin@sakaya.com', name: 'Admin', isAdmin: true };
                    updateNavigation();
                    new bootstrap.Modal(document.getElementById('loginModal')).hide();
                    showSuccessMessage('Admin login successful!');
                } else {
                    showErrorMessage('Invalid admin credentials');
                }
            } else {
                // User login
                const user = users.find(u => u.email === email && u.password === password);
                if (user) {
                    currentUser = user;
                    updateNavigation();
                    new bootstrap.Modal(document.getElementById('loginModal')).hide();
                    showSuccessMessage('Login successful!');
                    loadCars(); // Refresh cars to show rent buttons
                } else {
                    showErrorMessage('Invalid email or password');
                }
            }
        });

        // Signup form handler
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;

            if (password !== confirmPassword) {
                showErrorMessage('Passwords do not match');
                return;
            }

            if (users.find(u => u.email === email)) {
                showErrorMessage('Email already exists');
                return;
            }

            const newUser = {
                id: Date.now(),
                name: name,
                email: email,
                password: password,
                isAdmin: false
            };

            users.push(newUser);
            localStorage.setItem('sakaya_users', JSON.stringify(users));
            
            new bootstrap.Modal(document.getElementById('signupModal')).hide();
            showSuccessMessage('Account created successfully! Please login.');
            showLogin();
        });

        // Update navigation based on login status
        function updateNavigation() {
            const loginNav = document.getElementById('loginNav');
            const logoutNav = document.getElementById('logoutNav');
            const profileNav = document.getElementById('profileNav');
            const adminNav = document.getElementById('adminNav');
            const cartNav = document.getElementById('cartNav');

            if (currentUser) {
                loginNav.style.display = 'none';
                logoutNav.style.display = 'block';
                
                if (currentUser.isAdmin) {
                    adminNav.style.display = 'block';
                    profileNav.style.display = 'none';
                    cartNav.style.display = 'none';
                } else {
                    profileNav.style.display = 'block';
                    cartNav.style.display = 'block';
                    adminNav.style.display = 'none';
                    updateCartCount();
                }
            } else {
                loginNav.style.display = 'block';
                logoutNav.style.display = 'none';
                profileNav.style.display = 'none';
                adminNav.style.display = 'none';
                cartNav.style.display = 'none';
            }
        }

        // Check login status on page load
        function checkLoginStatus() {
            const savedUser = localStorage.getItem('sakaya_currentUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                updateNavigation();
            }
        }

        // Logout function
        function logout() {
            currentUser = null;
            cart = [];
            localStorage.removeItem('sakaya_currentUser');
            localStorage.removeItem('sakaya_cart');
            updateNavigation();
            loadCars();
            showSuccessMessage('Logged out successfully!');
        }

        // Cart functions
        function addToCart(carId) {
            if (!currentUser || currentUser.isAdmin) return;

            const car = cars.find(c => c.id === carId);
            if (car) {
                cart.push({
                    id: Date.now(),
                    carId: carId,
                    car: car,
                    userId: currentUser.id,
                    dateAdded: new Date()
                });
                localStorage.setItem('sakaya_cart', JSON.stringify(cart));
                updateCartCount();
                showSuccessMessage('Car added to cart!');
            }
        }

        function updateCartCount() {
            const cartCount = document.getElementById('cartCount');
            if (cartCount) {
                cartCount.textContent = cart.length;
            }
        }

        function showCart() {
            const cartItems = document.getElementById('cartItems');
            const cartTotal = document.getElementById('cartTotal');
            
            if (cart.length === 0) {
                cartItems.innerHTML = '<p class="text-center">Your cart is empty</p>';
                cartTotal.textContent = '0';
            } else {
                let total = 0;
                cartItems.innerHTML = cart.map(item => {
                    total += item.car.price;
                    return `
                        <div class="card mb-3">
                            <div class="row g-0">
                                <div class="col-md-4">
                                    <img src="${item.car.image}" class="img-fluid rounded-start h-100" style="object-fit: cover;">
                                </div>
                                <div class="col-md-8">
                                    <div class="card-body">
                                        <h5 class="card-title">${item.car.name}</h5>
                                        <p class="card-text">${item.car.description}</p>
                                        <p class="card-text"><strong>$${item.car.price}/day</strong></p>
                                        <button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.id})">Remove</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                cartTotal.textContent = total;
            }
            
            new bootstrap.Modal(document.getElementById('cartModal')).show();
        }

        function removeFromCart(itemId) {
            cart = cart.filter(item => item.id !== itemId);
            localStorage.setItem('sakaya_cart', JSON.stringify(cart));
            updateCartCount();
            showCart(); // Refresh cart display
        }

        function checkout() {
            if (cart.length === 0) return;

            cart.forEach(item => {
                rentals.push({
                    id: Date.now() + Math.random(),
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    carId: item.carId,
                    carName: item.car.name,
                    carCategory: item.car.category,
                    price: item.car.price,
                    rentalDate: new Date(),
                    status: 'Active'
                });
            });

            localStorage.setItem('sakaya_rentals', JSON.stringify(rentals));
            cart = [];
            localStorage.setItem('sakaya_cart', JSON.stringify(cart));
            updateCartCount();
            
            new bootstrap.Modal(document.getElementById('cartModal')).hide();
            showSuccessMessage('Checkout successful! Your rentals are now active.');
        }

        // Profile functions
        function showProfile() {
            const profileContent = document.getElementById('profileContent');
            const userRentals = rentals.filter(r => r.userId === currentUser.id);
            
            profileContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h5>Profile Information</h5>
                        <p><strong>Name:</strong> ${currentUser.name}</p>
                        <p><strong>Email:</strong> ${currentUser.email}</p>
                    </div>
                    <div class="col-md-6">
                        <h5>My Rentals</h5>
                        ${userRentals.length > 0 ? userRentals.map(rental => `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <h6>${rental.carName}</h6>
                                    <p class="mb-1">Category: ${rental.carCategory}</p>
                                    <p class="mb-1">Price: $${rental.price}/day</p>
                                    <p class="mb-1">Status: <span class="badge bg-success">${rental.status}</span></p>
                                    <small class="text-muted">Rented: ${new Date(rental.rentalDate).toLocaleDateString()}</small>
                                </div>
                            </div>
                        `).join('') : '<p>No rentals yet</p>'}
                    </div>
                </div>
            `;
            
            new bootstrap.Modal(document.getElementById('profileModal')).show();
        }

        // Admin functions
        function showAdmin() {
            loadAdminCars();
            loadUserRentals();
            new bootstrap.Modal(document.getElementById('adminModal')).show();
        }

        function loadAdminCars() {
            const grid = document.getElementById('adminCarsGrid');
            grid.innerHTML = cars.map(car => `
                <div class="card mb-3">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${car.image}" class="img-fluid rounded-start h-100" style="object-fit: cover;">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <h5 class="card-title">${car.name}</h5>
                                <p class="card-text">${car.description}</p>
                                <p class="card-text"><strong>Category:</strong> ${car.category}</p>
                                <p class="card-text"><strong>Price:</strong> $${car.price}/day</p>
                                <button class="btn btn-sm btn-warning me-2" onclick="editCar(${car.id})">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteCar(${car.id})">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function loadUserRentals() {
            const grid = document.getElementById('userRentalsGrid');
            if (rentals.length === 0) {
                grid.innerHTML = '<p class="text-center">No rentals yet</p>';
                return;
            }

            grid.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Car</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Rental Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rentals.map(rental => `
                                <tr>
                                    <td>${rental.userName}</td>
                                    <td>${rental.userEmail}</td>
                                    <td>${rental.carName}</td>
                                    <td>${rental.carCategory}</td>
                                    <td>${rental.price}/day</td>
                                    <td>${new Date(rental.rentalDate).toLocaleDateString()}</td>
                                    <td><span class="badge bg-success">${rental.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function showAddCarForm() {
            document.getElementById('addCarForm').reset();
            new bootstrap.Modal(document.getElementById('addCarModal')).show();
        }

        // Add car form handler
        document.getElementById('addCarForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newCar = {
                id: Date.now(),
                name: document.getElementById('carName').value,
                category: document.getElementById('carCategory').value,
                price: parseInt(document.getElementById('carPrice').value),
                image: document.getElementById('carImage').value || `https://via.placeholder.com/300x200/343a40/ffffff?text=${encodeURIComponent(document.getElementById('carName').value)}`,
                description: document.getElementById('carDescription').value
            };

            cars.push(newCar);
            localStorage.setItem('sakaya_cars', JSON.stringify(cars));
            
            new bootstrap.Modal(document.getElementById('addCarModal')).hide();
            loadCars();
            loadAdminCars();
            showSuccessMessage('Car added successfully!');
        });

        function editCar(carId) {
            const car = cars.find(c => c.id === carId);
            if (!car) return;

            // Fill form with existing data
            document.getElementById('carName').value = car.name;
            document.getElementById('carCategory').value = car.category;
            document.getElementById('carPrice').value = car.price;
            document.getElementById('carImage').value = car.image;
            document.getElementById('carDescription').value = car.description;

            // Change form to edit mode
            const form = document.getElementById('addCarForm');
            const modal = document.getElementById('addCarModal');
            modal.querySelector('.modal-title').textContent = 'Edit Car';
            
            // Remove existing event listeners and add new one for editing
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Update car data
                car.name = document.getElementById('carName').value;
                car.category = document.getElementById('carCategory').value;
                car.price = parseInt(document.getElementById('carPrice').value);
                car.image = document.getElementById('carImage').value;
                car.description = document.getElementById('carDescription').value;

                localStorage.setItem('sakaya_cars', JSON.stringify(cars));
                
                new bootstrap.Modal(modal).hide();
                loadCars();
                loadAdminCars();
                showSuccessMessage('Car updated successfully!');
                
                // Reset form back to add mode
                modal.querySelector('.modal-title').textContent = 'Add New Car';
                const resetForm = newForm.cloneNode(true);
                newForm.parentNode.replaceChild(resetForm, newForm);
                resetForm.addEventListener('submit', document.getElementById('addCarForm').addEventListener);
            });

            new bootstrap.Modal(modal).show();
        }

        function deleteCar(carId) {
            if (confirm('Are you sure you want to delete this car?')) {
                cars = cars.filter(c => c.id !== carId);
                localStorage.setItem('sakaya_cars', JSON.stringify(cars));
                loadCars();
                loadAdminCars();
                showSuccessMessage('Car deleted successfully!');
            }
        }

        // Utility functions
        function showSuccessMessage(message) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
            alert.style.top = '80px';
            alert.style.right = '20px';
            alert.style.zIndex = '9999';
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(alert);
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 3000);
        }

        function showErrorMessage(message) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
            alert.style.top = '80px';
            alert.style.right = '20px';
            alert.style.zIndex = '9999';
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(alert);
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 3000);
        }

        // Save current user to localStorage when logging in
        function saveCurrentUser() {
            if (currentUser) {
                localStorage.setItem('sakaya_currentUser', JSON.stringify(currentUser));
            }
        }

        // Update the login handlers to save current user
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            // ... existing login code ...
            // Add this after successful login:
            saveCurrentUser();
        });
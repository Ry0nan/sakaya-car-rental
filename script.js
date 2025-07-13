let currentUser = null;
let cars = [];
let users = [];
let rentals = [];

// Initialize Data and UI
document.addEventListener("DOMContentLoaded", () => {
  initializeData();
  loadCars();
  checkLoginStatus();
});

function initializeData() {
  const sampleCars = [
    { id: 1, name: "Toyota RAV4", category: "suv", price: 75, image: "assets/car-rental-cover-page.webp", description: "Spacious and reliable SUV." },
    { id: 2, name: "Honda Pilot", category: "suv", price: 85, image: ".assets/car-rental-cover-page.webp", description: "Premium 8-seater SUV." },
    { id: 3, name: "Ford Transit", category: "van", price: 95, image: ".assets/car-rental-cover-page.webp", description: "Spacious van for groups." },
    { id: 4, name: "Chevrolet Express", category: "van", price: 90, image: ".assets/car-rental-cover-page.webp", description: "Reliable passenger van." },
    { id: 5, name: "Toyota Camry", category: "sedan", price: 55, image: ".assets/car-rental-cover-page.webp", description: "Elegant sedan with great fuel efficiency." },
    { id: 6, name: "Honda Accord", category: "sedan", price: 60, image: ".assets/car-rental-cover-page.webp", description: "Luxury sedan with smooth ride." },
  ];

  cars = JSON.parse(localStorage.getItem("sakaya_cars")) || sampleCars;
  users = JSON.parse(localStorage.getItem("sakaya_users")) || [];
  rentals = JSON.parse(localStorage.getItem("sakaya_rentals")) || [];

  if (!localStorage.getItem("sakaya_cars")) {
    localStorage.setItem("sakaya_cars", JSON.stringify(sampleCars));
  }
}

function loadCars() {
  const grid = document.getElementById("carsGrid");
  grid.innerHTML = "";

  cars.forEach((car) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 mb-4";
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

    grid.appendChild(col);
  });
}

function filterCars(category) {
  const cards = document.querySelectorAll("[data-category]");
  const buttons = document.querySelectorAll(".btn-group .btn");
  buttons.forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  cards.forEach((card) => {
    card.style.display = category === "all" || card.dataset.category === category ? "block" : "none";
  });
}

function showCart() {
  if (!currentUser) return;
  const cartItems = rentals.filter(item => item.userId === currentUser.id && item.status === "cart");
  const cartItemsDiv = document.getElementById("cartItems");
  const cartTotalSpan = document.getElementById("cartTotal");

  if (cartItems.length === 0) {
    cartItemsDiv.innerHTML = '<p>Your cart is empty.</p>';
    cartTotalSpan.textContent = '0';
  } else {
    let total = 0;
    cartItemsDiv.innerHTML = cartItems.map(item => {
      total += item.car.price;
      return `<div class="mb-2 border-bottom pb-2">
                <strong>${item.car.name}</strong> - $${item.car.price}/day
              </div>`;
    }).join("");
    cartTotalSpan.textContent = total;
  }

  new bootstrap.Modal(document.getElementById("cartModal")).show();
}

function checkout() {
  rentals.forEach(item => {
    if (item.userId === currentUser.id && item.status === "cart") {
      item.status = "checked_out";
    }
  });
  localStorage.setItem("sakaya_rentals", JSON.stringify(rentals));
  showSuccessMessage("Checkout successful!");
  new bootstrap.Modal(document.getElementById("cartModal")).hide();
}

function showAdmin() {
  renderAdminCars();
  renderUserRentals();
  new bootstrap.Modal(document.getElementById("adminModal")).show();
}

function renderUserRentals() {
  const grid = document.getElementById("userRentalsGrid");
  grid.innerHTML = "";

  const userGroups = {};
  rentals.forEach(item => {
    if (item.status === "checked_out") {
      if (!userGroups[item.userId]) userGroups[item.userId] = [];
      userGroups[item.userId].push(item);
    }
  });

  Object.keys(userGroups).forEach(userId => {
    const user = users.find(u => u.id == userId);
    const rentalItems = userGroups[userId].map(rental => {
      return `<li>${rental.car.name} - $${rental.car.price}/day</li>`;
    }).join("");

    const section = document.createElement("div");
    section.innerHTML = `<h6>${user ? user.name : "Unknown User"}</h6><ul>${rentalItems}</ul><hr>`;
    grid.appendChild(section);
  });
}

function addToCart(carId) {
  if (!currentUser || currentUser.isAdmin) return;
  const car = cars.find(c => c.id === carId);
  if (car) {
    rentals.push({ id: Date.now(), carId, car, userId: currentUser.id, status: "cart" });
    localStorage.setItem("sakaya_rentals", JSON.stringify(rentals));
    showSuccessMessage("Car added to cart!");
  }
}

function showLogin() {
  new bootstrap.Modal(document.getElementById("loginModal")).show();
}

function showSignup() {
  bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
  new bootstrap.Modal(document.getElementById("signupModal")).show();
}

// Login & Signup

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const isAdmin = document.getElementById("adminLogin").checked;

  if (isAdmin) {
    if (email === "admin@sakaya.com" && password === "admin123") {
      currentUser = { email, name: "Admin", isAdmin: true };
      saveCurrentUser();
      updateNavigation();
      bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
      showSuccessMessage("Admin login successful!");
    } else {
      showErrorMessage("Invalid admin credentials");
    }
  } else {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      currentUser = user;
      saveCurrentUser();
      updateNavigation();
      bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
      showSuccessMessage("Login successful!");
      loadCars();
    } else {
      showErrorMessage("Invalid email or password");
    }
  }
});

document.getElementById("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;

  if (password !== confirmPassword) {
    showErrorMessage("Passwords do not match");
    return;
  }

  if (users.find(u => u.email === email)) {
    showErrorMessage("Email already exists");
    return;
  }

  const newUser = { id: Date.now(), name, email, password, isAdmin: false };
  users.push(newUser);
  localStorage.setItem("sakaya_users", JSON.stringify(users));

  bootstrap.Modal.getInstance(document.getElementById("signupModal")).hide();
  showSuccessMessage("Account created successfully! Please login.");
  showLogin();
});

function updateNavigation() {
  document.getElementById("loginNav").style.display = currentUser ? "none" : "block";
  document.getElementById("logoutNav").style.display = currentUser ? "block" : "none";
  document.getElementById("profileNav").style.display = currentUser && !currentUser.isAdmin ? "block" : "none";
  document.getElementById("cartNav").style.display = currentUser && !currentUser.isAdmin ? "block" : "none";
  document.getElementById("adminNav").style.display = currentUser && currentUser.isAdmin ? "block" : "none";
}

function checkLoginStatus() {
  const saved = localStorage.getItem("sakaya_currentUser");
  if (saved) {
    currentUser = JSON.parse(saved);
    updateNavigation();
    loadCars();
  }
}

function saveCurrentUser() {
  localStorage.setItem("sakaya_currentUser", JSON.stringify(currentUser));
}

function logout() {
  currentUser = null;
  localStorage.removeItem("sakaya_currentUser");
  updateNavigation();
  loadCars();
  showSuccessMessage("Logged out successfully!");
}

// Alerts
function showSuccessMessage(msg) {
  const alert = document.createElement("div");
  alert.className = "alert alert-success alert-dismissible fade show position-fixed";
  alert.style.top = "80px";
  alert.style.right = "20px";
  alert.style.zIndex = "9999";
  alert.innerHTML = `${msg} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}

function showErrorMessage(msg) {
  const alert = document.createElement("div");
  alert.className = "alert alert-danger alert-dismissible fade show position-fixed";
  alert.style.top = "80px";
  alert.style.right = "20px";
  alert.style.zIndex = "9999";
  alert.innerHTML = `${msg} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}

function renderAdminCars() {
  const grid = document.getElementById("adminCarsGrid");
  grid.innerHTML = cars.map(car => `<div class='mb-2'>${car.name} - $${car.price}/day</div>`).join('');
}

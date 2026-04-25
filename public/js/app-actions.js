function render() {
  renderNav();
  topbar.style.display = state.user ? "none" : "flex";

  if (!state.user && !["auth", "authForm", "about"].includes(state.currentView)) {
    state.currentView = "auth";
  }

  const viewMap = {
    auth: authWelcomeView,
    authForm: () => authFormView(state.authScreenMode),
    about: aboutView,
    home:
      state.user && isCustomer()
        ? customerHomeView
        : state.user?.role === "vendor"
        ? vendorView
        : state.user?.role === "admin"
        ? adminView
        : authWelcomeView,
    storefront: state.user ? storefrontView : authWelcomeView,
    detail: productDetailView,
    wishlist: wishlistView,
    cart: cartView,
    orders: ordersView,
    profile: profileView,
    vendor: vendorView,
    admin: adminView,
  };

  app.innerHTML = `${(viewMap[state.currentView] || authWelcomeView)()}${checkoutModalMarkup()}`;
  syncOverlayState();
  initHeroSlider();

  const authForm = document.getElementById("authForm");
  if (authForm) {
    authForm.addEventListener("submit", handleAuth);
  }
}

function toggleAuthTab(mode) {
  state.authScreenMode = mode;
  document.getElementById("authMode").value = mode;
  document.getElementById("nameField").style.display = mode === "signup" ? "grid" : "none";
  document.getElementById("roleField").style.display = mode === "signup" ? "grid" : "none";
  document.getElementById("storeNameField").style.display = mode === "signup" ? "grid" : "none";
  document.getElementById("loginTabBtn").classList.toggle("tab-active", mode === "login");
  document.getElementById("signupTabBtn").classList.toggle("tab-active", mode === "signup");
}

async function handleAuth(event) {
  event.preventDefault();
  const mode = document.getElementById("authMode").value;
  const payload = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };

  if (mode === "signup") {
    payload.name = document.getElementById("name").value;
    payload.role = document.getElementById("role").value;
    payload.storeName = document.getElementById("storeName").value;
  }

  try {
    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const data = await api(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    persistAuth(data.data);
    await refreshProfile();
    state.currentView = state.user.role === "customer" ? "home" : state.user.role;
    render();
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function resetPasswordPrompt() {
  const email = window.prompt("Enter your registered email");
  if (!email) {
    return;
  }

  const password = window.prompt("Enter new password");
  if (!password) {
    return;
  }

  try {
    const data = await api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    toggleAuthTab("login");
    document.getElementById("email").value = email.trim().toLowerCase();
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function updateFilter(key, value) {
  state.filters[key] = value;
  if (key === "category") {
    state.filters.search = "";
    if (value !== "Fashion") {
      state.filters.segment = "";
    }
  }
  if (key === "segment") {
    state.filters.category = "Fashion";
    state.filters.search = "";
  }
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
}

function setDraftPrice(key, value) {
  state.filters[key] = value;
}

async function applyPriceFilters() {
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
}

async function clearSearchFilters() {
  state.filters = {
    category: "All",
    segment: "",
    minPrice: "",
    maxPrice: "",
    rating: "",
    sortBy: "latest",
    search: "",
  };
  await loadProducts();
  state.currentView = defaultLandingView();
  render();
}

async function submitSearch(event) {
  event.preventDefault();
  state.filters.search = document.getElementById("headerSearch").value.trim();
  state.filters.category = "All";
  state.filters.segment = "";
  if (!state.filters.search && state.filters.category === "All") {
    showToast("Type something to search");
    return;
  }
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
}

async function selectCategory(category) {
  state.filters.category = category;
  state.filters.segment = category === "Fashion" ? state.filters.segment : "";
  state.filters.search = "";
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function goHome() {
  await clearSearchFilters();
}

function openDashboard() {
  const dashboardView = dashboardViewForRole();
  if (dashboardView === "home") {
    setView("home");
    return;
  }

  setView(dashboardView);
}

function openProduct(productId) {
  setView("detail", productId);
}

async function requireCustomerAction(action) {
  if (!state.user) {
    setView("auth");
    showToast("Please login to continue");
    return false;
  }

  if (!isCustomer()) {
    showToast(`${action} is available for customer accounts`);
    return false;
  }

  return true;
}

async function quickAddToCart(productId) {
  if (!(await requireCustomerAction("Add to cart"))) {
    return;
  }

  const product = findProductById(productId);
  if (product && !getInventoryState(product).purchasable) {
    showToast(`${product.name} is currently out of stock`);
    return;
  }

  try {
    await api("/api/users/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    await refreshProfile();
    render();
    showToast("Added to cart");
  } catch (error) {
    showToast(error.message);
  }
}

async function toggleWishlist(productId) {
  if (!(await requireCustomerAction("Wishlist"))) {
    return;
  }

  try {
    await api(`/api/users/wishlist/${productId}`, { method: "POST" });
    await refreshProfile();
    render();
    showToast("Wishlist updated");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateCartQuantity(productId, quantity) {
  try {
    await api(`/api/users/cart/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
    await refreshProfile();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function removeFromCart(productId) {
  try {
    await api(`/api/users/cart/${productId}`, { method: "DELETE" });
    await refreshProfile();
    render();
    showToast("Removed from cart");
  } catch (error) {
    showToast(error.message);
  }
}

function handlePaymentMethodChange(value) {
  state.checkout.paymentMethod = value;
  state.paymentAuthorization = null;
  state.checkout.upiModalOpen = false;
  state.checkout.upiQrVisible = false;
  render();
}

async function authorizePayment() {
  if (!(await requireCustomerAction("Payment authorization"))) {
    return;
  }

  try {
    const data = await api("/api/orders/authorize", {
      method: "POST",
      body: JSON.stringify({
        cardHolder: document.getElementById("cardHolder")?.value || "",
        cardNumber: document.getElementById("cardNumber")?.value || "",
        expiry: document.getElementById("cardExpiry")?.value || "",
        cvv: document.getElementById("cardCvv")?.value || "",
      }),
    });

    state.paymentAuthorization = data.data;
    render();
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function placeOrder(event) {
  event.preventDefault();

  try {
    const shippingAddress = currentShippingAddress();
    const unavailableItem = safeCartItems().find((item) => !getInventoryState(item.product).purchasable);
    if (unavailableItem) {
      showToast(`${unavailableItem.product.name} is out of stock. Remove it before checkout.`);
      return;
    }

    const quantityIssue = safeCartItems().find((item) => item.quantity > getProductStock(item.product));
    if (quantityIssue) {
      showToast(`Reduce quantity for ${quantityIssue.product.name}. Only ${getProductStock(quantityIssue.product)} left.`);
      return;
    }

    if (!shippingAddress) {
      showToast("Enter the shipping address");
      return;
    }

    if (isUpiPayment()) {
      openUpiPaymentModal();
      return;
    }

    await submitOrderRequest({
      shippingAddress,
      paymentMethod: document.getElementById("paymentMethod").value,
      paymentAuthorization: state.paymentAuthorization,
    });
  } catch (error) {
    showToast(error.message);
  }
}

async function submitOrderRequest(payload) {
  await api("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await refreshProfile();
  state.paymentAuthorization = null;
  state.checkout.paymentMethod = "Cash on Delivery";
  state.checkout.shippingAddress = "";
  state.checkout.upiModalOpen = false;
  state.checkout.upiQrVisible = false;
  state.currentView = "orders";
  render();
  showToast("Order placed successfully");
}

async function confirmUpiPaymentAndPlaceOrder() {
  try {
    const shippingAddress = currentShippingAddress();

    if (!shippingAddress) {
      showToast("Enter the shipping address");
      return;
    }

    await submitOrderRequest({
      shippingAddress,
      paymentMethod: "UPI Payment",
      paymentAuthorization: state.paymentAuthorization,
    });
  } catch (error) {
    showToast(error.message);
  }
}

async function saveProfile(event) {
  event.preventDefault();

  try {
    await api("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: document.getElementById("profileName").value,
        phone: document.getElementById("profilePhone").value,
        address: document.getElementById("profileAddress").value,
        storeName: document.getElementById("profileStoreName")?.value || "",
      }),
    });
    await refreshProfile();
    render();
    showToast("Profile updated");
  } catch (error) {
    showToast(error.message);
  }
}

function editProduct(productId) {
  const product = state.vendorDashboard?.products.find((item) => item._id === productId);
  if (!product) {
    showToast("Product not found");
    return;
  }

  setView("vendor");
  document.getElementById("productId").value = product._id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productDescription").value = product.description;
  document.getElementById("productImage").value = product.image;
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productRating").value = product.rating;
  document.getElementById("productStock").value = product.stock;
  document.getElementById("productFeatures").value = (product.features || []).join(", ");
}

async function submitProduct(event) {
  event.preventDefault();

  const productId = document.getElementById("productId").value;
  const payload = {
    name: document.getElementById("productName").value,
    description: document.getElementById("productDescription").value,
    image: document.getElementById("productImage").value,
    category: document.getElementById("productCategory").value,
    price: Number(document.getElementById("productPrice").value),
    rating: Number(document.getElementById("productRating").value),
    stock: Number(document.getElementById("productStock").value),
    features: document
      .getElementById("productFeatures")
      .value.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };

  try {
    const response = await api(productId ? `/api/products/${productId}` : "/api/products", {
      method: productId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    await Promise.all([loadProducts(), refreshProfile()]);
    event.target.reset();
    render();
    const inventory = getInventoryState(response.data);
    showToast(
      productId
        ? `${response.data.name} updated. ${inventory.detail}.`
        : `${response.data.name} added successfully. ${inventory.detail}.`
    );
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteProduct(productId) {
  if (!window.confirm("Kya aap is product ko delete karna chahte ho?")) {
    return;
  }

  try {
    await api(`/api/products/${productId}`, { method: "DELETE" });
    await Promise.all([loadProducts(), refreshProfile()]);
    render();
    showToast("Product deleted");
  } catch (error) {
    showToast(error.message);
  }
}

async function changeOrderStatus(orderId, orderStatus) {
  try {
    await api(`/api/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ orderStatus }),
    });
    await refreshProfile();
    render();
    showToast("Order status updated");
  } catch (error) {
    showToast(error.message);
  }
}

async function cancelOrder(orderId) {
  try {
    await api(`/api/orders/${orderId}/cancel`, {
      method: "PUT",
    });
    await Promise.all([loadProducts(), refreshProfile()]);
    render();
    showToast("Order cancelled");
  } catch (error) {
    showToast(error.message);
  }
}

async function changeUserRole(userId, role) {
  try {
    await api(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    await refreshProfile();
    render();
    showToast("User role updated");
  } catch (error) {
    showToast(error.message);
  }
}

bootstrap();


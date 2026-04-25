function customerHomeView() {
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        ${shouldShowSearchResults() ? catalogView() : `
          ${heroMarkup()}
          ${standardsMarkup()}
          ${realImageGalleryMarkup()}
          ${railSection("featuredProducts", "Featured Products", "Most celebrated picks reserved exclusively for our community.", "Shop The Collection", favoriteProducts(4))}
          ${bannerSection()}
          ${featureCards()}
          ${railSection("exclusiveProducts", "UrbanKart Exclusives", "Assembled by our experts so the storefront feels curated, not cluttered.", "Shop The Collection", exclusiveProducts(4))}
          ${partnersMarkup()}
          ${journalMarkup()}
        `}
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function storefrontView() {
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        ${catalogView()}
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function filterSidebar() {
  return `
    <aside class="catalog-sidebar">
      <div class="filter-group">
        <strong>Category</strong>
        ${state.categories
          .slice(1)
          .map(
            (category) => `
              <label class="filter-option">
                <input type="radio" name="category" ${state.filters.category === category ? "checked" : ""} onchange="updateFilter('category', '${escapeText(category)}')" />
                <span>${escapeText(category)}</span>
              </label>
            `
          )
          .join("")}
        <button class="btn btn-ghost" onclick="clearSearchFilters()">Clear All</button>
      </div>
      ${
        isFashionCategory()
          ? `
            <div class="filter-group">
              <strong>Fashion For</strong>
              <label class="filter-option">
                <input type="radio" name="segment" ${!state.filters.segment ? "checked" : ""} onchange="updateFilter('segment', '')" />
                <span>All Fashion</span>
              </label>
              ${fashionSegments
                .map(
                  (segment) => `
                    <label class="filter-option">
                      <input type="radio" name="segment" ${state.filters.segment === segment ? "checked" : ""} onchange="updateFilter('segment', '${segment}')" />
                      <span>${segment}</span>
                    </label>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
      <div class="filter-group">
        <strong>Customer Reviews</strong>
        <label class="filter-option"><input type="radio" name="rating" ${state.filters.rating === "4" ? "checked" : ""} onchange="updateFilter('rating', '4')" />4 stars & up</label>
        <label class="filter-option"><input type="radio" name="rating" ${state.filters.rating === "4.5" ? "checked" : ""} onchange="updateFilter('rating', '4.5')" />4.5 stars & up</label>
      </div>
      <div class="filter-group">
        <strong>Price</strong>
        <input class="search-input" type="number" placeholder="Min" value="${escapeText(state.filters.minPrice)}" oninput="setDraftPrice('minPrice', this.value)" />
        <input class="search-input" type="number" placeholder="Max" value="${escapeText(state.filters.maxPrice)}" oninput="setDraftPrice('maxPrice', this.value)" />
        ${isFashionCategory() ? `<span class="filter-note">Fashion pricing is curated between ${formatCurrency(300)} and ${formatCurrency(5000)}.</span>` : ""}
        <div class="filter-actions">
          <button class="btn btn-secondary" onclick="applyPriceFilters()">Apply</button>
        </div>
      </div>
      <div class="filter-group">
        <strong>Sort By</strong>
        <select onchange="updateFilter('sortBy', this.value)">
          <option value="latest" ${state.filters.sortBy === "latest" ? "selected" : ""}>Latest</option>
          <option value="price_asc" ${state.filters.sortBy === "price_asc" ? "selected" : ""}>Price low to high</option>
          <option value="price_desc" ${state.filters.sortBy === "price_desc" ? "selected" : ""}>Price high to low</option>
          <option value="rating_desc" ${state.filters.sortBy === "rating_desc" ? "selected" : ""}>Top rated</option>
        </select>
      </div>
    </aside>
  `;
}

function catalogCard(product) {
  const inventory = getInventoryState(product);

  return `
    <article class="catalog-card">
      <div class="catalog-image">
        <button class="wish-button ${isWishlisted(product._id) ? "active" : ""}" type="button" onclick="toggleWishlist('${product._id}')">&#9825;</button>
        <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
      </div>
      <div class="product-card-topline">
        <div class="brand-tag">${escapeText(productBadge(product))}</div>
        ${stockBadgeMarkup(product, { compact: true })}
      </div>
      <h3>${escapeText(product.name)}</h3>
      <div class="product-submeta">${escapeText(product.vendorName || "UrbanKart")}</div>
      <p>${escapeText(product.description).slice(0, 92)}...</p>
      <div>${ratingStars(product.rating)}</div>
      <div class="meta">${escapeText(inventory.detail)}</div>
      <div class="price-tag">${formatCurrency(product.price)}</div>
      <div class="toolbar">
        <button class="btn btn-secondary" onclick="openProduct('${product._id}')">View</button>
        <button class="btn btn-primary" onclick="quickAddToCart('${product._id}')" ${
          inventory.purchasable ? "" : "disabled"
        }>${inventory.buttonLabel}</button>
      </div>
    </article>
  `;
}

async function openRailCollection(sectionId) {
  if (sectionId === "featuredProducts") {
    state.filters.category = "All";
    state.filters.segment = "";
    state.filters.search = "";
    state.filters.sortBy = "rating_desc";
  } else if (sectionId === "exclusiveProducts") {
    state.filters.category = "All";
    state.filters.segment = "";
    state.filters.search = "";
    state.filters.sortBy = "latest";
  }

  await loadProducts();
  state.currentView = "home";
  render();
  scrollToSection(sectionId === "featuredProducts" ? "featuredProducts" : "exclusiveProducts");
}

function catalogView() {
  const label = catalogViewLabel();
  return `
    <section class="catalog-layout">
      ${filterSidebar()}
      <div>
        <div class="catalog-toolbar">
          <div>
            <h2 class="section-title" style="font-size:3rem;">${escapeText(label)}</h2>
            <p class="section-kicker">${state.products.length} products found</p>
          </div>
          <button class="btn btn-secondary" onclick="goHome()">Back Home</button>
        </div>
        ${
          isFashionCategory()
            ? `
              <div class="segment-strip">
                <button class="segment-pill ${!state.filters.segment ? "active" : ""}" type="button" onclick="updateFilter('segment', '')">All</button>
                ${fashionSegments
                  .map(
                    (segment) => `
                      <button class="segment-pill ${state.filters.segment === segment ? "active" : ""}" type="button" onclick="updateFilter('segment', '${segment}')">${segment}</button>
                    `
                  )
                  .join("")}
              </div>
            `
            : ""
        }
        <div class="catalog-grid">
          ${state.products.length ? state.products.map(catalogCard).join("") : `<div class="empty-state">No products matched your search yet.</div>`}
        </div>
      </div>
    </section>
  `;
}

function productDetailView() {
  const product = findProductById(state.selectedProduct);
  if (!product) {
    return `${customerHeader()}<div class="commerce-shell"><div class="page-shell"><div class="empty-state">Product not found.</div></div>${footerMarkup()}</div>`;
  }

  const inventory = getInventoryState(product);

  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="detail-layout">
          <div class="product-detail">
            <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
          </div>
          <aside class="summary-panel">
            <p class="eyebrow">${escapeText(productMetaTrail(product) || product.category)}</p>
            <h2 class="section-title" style="font-size:3rem;">${escapeText(product.name)}</h2>
            <p class="product-submeta">${escapeText(product.vendorName || "UrbanKart")}</p>
            <div class="detail-status-row">
              ${stockBadgeMarkup(product)}
              ${storefrontBadgeMarkup(product)}
            </div>
            <div>${ratingStars(product.rating)}</div>
            <p>${escapeText(product.description)}</p>
            <div class="summary-total">${formatCurrency(product.price)}</div>
            <p class="meta">${escapeText(inventory.detail)}</p>
            <div>${(product.features || []).map((feature) => `<span class="feature-chip">${escapeText(feature)}</span>`).join("")}</div>
            <div class="toolbar">
              <button class="btn btn-primary" onclick="quickAddToCart('${product._id}')" ${
                inventory.purchasable ? "" : "disabled"
              }>${inventory.buttonLabel}</button>
              <button class="btn btn-secondary" onclick="toggleWishlist('${product._id}')">Wishlist</button>
              <button class="btn btn-ghost" onclick="goHome()">Continue shopping</button>
            </div>
          </aside>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function wishlistView() {
  const wishlist = safeWishlistItems();
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="section-block">
          <div class="section-head">
            <div>
              <h2 class="section-title">Your Wishlist</h2>
              <p class="section-kicker">${wishlist.length} saved products</p>
            </div>
          </div>
          <div class="catalog-grid">
            ${wishlist.length ? wishlist.map(catalogCard).join("") : `<div class="empty-state">Wishlist is empty.</div>`}
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function cartView() {
  const cart = safeCartItems();
  const paymentMethod = state.checkout.paymentMethod;
  const showUpiPanel = isUpiPayment(paymentMethod);
  const submitLabel = showUpiPanel ? "Pay Now & Place Order" : "Place Order";
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="cart-layout">
          <div class="cart-panel panel">
            <h2 class="section-title">Shopping Cart</h2>
            ${
              cart.length
                ? cart
                    .map(
                      (item) => {
                        const inventory = getInventoryState(item.product);
                        const maxQuantity = Math.max(1, getProductStock(item.product));

                        return `
                        <article class="cart-item">
                          <img ${fallbackImageAttrs(item.product)} alt="${escapeText(item.product.name)}" />
                          <div>
                            <h3>${escapeText(item.product.name)}</h3>
                            <p class="meta">${escapeText(item.product.vendorName)}</p>
                            <div class="cart-item-status">
                              ${stockBadgeMarkup(item.product)}
                              ${storefrontBadgeMarkup(item.product)}
                            </div>
                            <p class="price-tag">${formatCurrency(item.product.price)}</p>
                            <div class="toolbar">
                              <div class="qty-box">
                                <label>Qty</label>
                                <input class="qty-input" type="number" min="1" max="${maxQuantity}" value="${item.quantity}" onchange="updateCartQuantity('${item.product._id}', this.value)" ${
                                  inventory.purchasable ? "" : "disabled"
                                } />
                              </div>
                              <button class="btn btn-ghost" onclick="removeFromCart('${item.product._id}')">Remove</button>
                              <button class="btn btn-secondary" onclick="openProduct('${item.product._id}')">View details</button>
                            </div>
                          </div>
                        </article>
                      `;
                      }
                    )
                    .join("")
                : `<div class="empty-state">Your cart is empty.</div>`
            }
          </div>
          <aside class="summary-panel">
            <p class="eyebrow">Checkout</p>
            <h2 class="section-title" style="font-size:2.6rem;">Order Summary</h2>
            <p>Subtotal (${getCartCount()} items)</p>
            <div class="summary-total">${formatCurrency(getCartSubtotal())}</div>
            <form onsubmit="placeOrder(event)">
              <div class="field">
                <label for="shippingAddress">Shipping Address</label>
                <textarea id="shippingAddress" oninput="updateCheckoutAddress(this.value)" required>${escapeText(
                  state.checkout.shippingAddress || state.profile?.address || ""
                )}</textarea>
              </div>
              <div class="field">
                <label for="paymentMethod">Payment</label>
                <select id="paymentMethod" onchange="handlePaymentMethodChange(this.value)">
                  <option value="Cash on Delivery" ${paymentMethod === "Cash on Delivery" ? "selected" : ""}>Cash on Delivery</option>
                  <option value="UPI Payment" ${paymentMethod === "UPI Payment" ? "selected" : ""}>UPI Payment</option>
                </select>
              </div>
              ${
                showUpiPanel
                  ? `<p class="payment-note">Tap <strong>Pay Now & Place Order</strong> to open the UPI QR screen.</p>`
                  : `<p class="payment-note">Pay when the order arrives using ${escapeText(paymentMethod)}.</p>`
              }
              <button class="btn btn-primary" type="submit">${submitLabel}</button>
            </form>
          </aside>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

const orderTrackingStages = [
  { status: "processing", label: "Order Placed", icon: "bag" },
  { status: "confirmed", label: "Shipped", icon: "box" },
  { status: "shipped", label: "In Transit", icon: "truck" },
  { status: "delivered", label: "Delivered", icon: "check" },
];

const cancellableOrderStatuses = new Set(["processing", "confirmed"]);

const orderTrackingCopy = {
  processing: "Your order has been received and is being prepared.",
  confirmed: "Your package has been handed over for shipping.",
  shipped: "Your package is on the way.",
  delivered: "Your order has been delivered.",
  cancelled: "This order has been cancelled.",
};

const orderStatusLabels = {
  processing: "Order Placed",
  confirmed: "Shipped",
  shipped: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function titleCaseLabel(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function orderStatusLabel(status = "") {
  return orderStatusLabels[status] || titleCaseLabel(status);
}

function visibleOrderItems(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];

  if (state.user?.role !== "vendor") {
    return items;
  }

  return items.filter(
    (item) => String(item?.vendor?._id || item?.vendor || "") === String(state.user?._id || "")
  );
}

function visibleOrderTotal(order = {}) {
  if (state.user?.role !== "vendor") {
    return Number(order.totalAmount) || 0;
  }

  return visibleOrderItems(order).reduce(
    (sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
    0
  );
}

function orderItemDisplayProduct(item = {}) {
  const productId = item?.product?._id || item?.product;
  const sourceProduct = productId ? findProductById(productId) : null;

  return {
    ...(sourceProduct || {}),
    ...item,
    _id: productId || sourceProduct?._id || "",
    image: item?.image || sourceProduct?.image || "",
    name: item?.name || sourceProduct?.name || "Product",
    vendorName: item?.vendorName || sourceProduct?.vendorName || "",
  };
}

function trackingCode(order = {}) {
  return `UK-${String(order?._id || "").slice(-8).toUpperCase()}`;
}

function orderTrackingSteps(order = {}) {
  const activeIndex = Math.max(
    orderTrackingStages.findIndex((step) => step.status === order?.orderStatus),
    0
  );

  return orderTrackingStages.map((step, index) => ({
    ...step,
    state: index < activeIndex ? "completed" : index === activeIndex ? "current" : "upcoming",
  }));
}

function orderTrackingIcon(icon = "bag") {
  const iconMarkup = {
    bag: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 8V6a5 5 0 0 1 10 0v2" />
        <path d="M5 8h14l-1 11H6L5 8Z" />
      </svg>
    `,
    box: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 20 7 12 11 4 7 12 3Z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </svg>
    `,
    truck: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 6h11v9H2z" />
        <path d="M13 9h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    `,
    check: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5 10 17l9-10" />
      </svg>
    `,
    cancel: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 8.5 15.5 15.5" />
        <path d="M15.5 8.5 8.5 15.5" />
      </svg>
    `,
  };

  return iconMarkup[icon] || iconMarkup.bag;
}

function canCancelOrder(order = {}) {
  return state.user?.role === "customer" && cancellableOrderStatuses.has(order?.orderStatus);
}

function isTrackingExpanded(orderId = "") {
  return state.expandedTrackingOrders.includes(orderId);
}

function toggleOrderTracking(orderId = "") {
  state.expandedTrackingOrders = isTrackingExpanded(orderId)
    ? state.expandedTrackingOrders.filter((id) => id !== orderId)
    : [...state.expandedTrackingOrders, orderId];
  render();
}

function orderTrackingMarkup(order = {}) {
  const currentStatus = order?.orderStatus || "processing";

  if (currentStatus === "cancelled") {
    return `
      <section class="order-tracking-card cancelled">
        <div class="order-tracking-topline">
          <div>
            <p class="eyebrow">Order Tracking</p>
            <strong>${orderStatusLabel(currentStatus)}</strong>
          </div>
          <span class="tracking-code">${trackingCode(order)}</span>
        </div>
        <div class="tracking-cancelled">
          <span class="tracking-node cancelled">${orderTrackingIcon("cancel")}</span>
          <div>
            <strong>Order Cancelled</strong>
            <p class="meta">${escapeText(orderTrackingCopy.cancelled)}</p>
          </div>
        </div>
        <p class="meta">Cancelled on: ${formatDateTime(order?.cancelledAt || order?.updatedAt || order?.createdAt)}</p>
      </section>
    `;
  }

  const steps = orderTrackingSteps(order);

  return `
    <section class="order-tracking-card">
      <div class="order-tracking-topline">
        <div>
          <p class="eyebrow">Track Your Order</p>
          <strong>${orderStatusLabel(currentStatus)}</strong>
        </div>
        <span class="tracking-code">${trackingCode(order)}</span>
      </div>
      <div class="tracking-strip">
        <div class="tracking-line" aria-hidden="true"></div>
        ${steps
          .map(
            (step) => `
              <div class="tracking-step ${step.state}">
                <span class="tracking-node">${orderTrackingIcon(step.icon)}</span>
                <span class="tracking-label">${step.label}</span>
              </div>
            `
          )
          .join("")}
      </div>
      <p class="meta">${escapeText(orderTrackingCopy[currentStatus] || orderTrackingCopy.processing)}</p>
      <p class="meta">Last update: ${formatDateTime(order?.updatedAt || order?.createdAt)}</p>
    </section>
  `;
}

function orderItemsMarkup(order = {}) {
  const items = visibleOrderItems(order);

  if (!items.length) {
    return `<div class="empty-state">No visible items are available for this order.</div>`;
  }

  return `
    <div class="order-item-grid">
      ${items
        .map((item) => {
          const product = orderItemDisplayProduct(item);
          return `
            <article class="order-item-card">
              <div class="order-item-thumb">
                <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
              </div>
              <div class="order-item-copy">
                <strong>${escapeText(product.name)}</strong>
                <p class="meta">${escapeText(product.vendorName || "UrbanKart")}</p>
                <div class="order-item-meta">
                  <span>Qty: ${item.quantity}</span>
                  <span>${formatCurrency(item.price)}</span>
                </div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function ordersView() {
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="section-block">
          <div class="section-head">
            <div>
              <h2 class="section-title">Orders</h2>
              <p class="section-kicker">${state.orders.length} order records</p>
            </div>
          </div>
          <div class="results-stack">
            ${
              state.orders.length
                ? state.orders
                    .map((order) => {
                      const items = visibleOrderItems(order);
                      const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

                      return `
                        <article class="order-card">
                          <div class="section-head">
                            <div>
                              <strong>Order #${order._id.slice(-6).toUpperCase()}</strong>
                              <p class="meta">${new Date(order.createdAt).toLocaleString()}</p>
                              ${
                                order.customer && state.user.role !== "customer"
                                  ? `<p class="meta">${escapeText(order.customer.name || "Customer")} | ${escapeText(
                                      order.customer.email || ""
                                    )}</p>`
                                  : ""
                              }
                            </div>
                            <div>
                              <div class="status ${order.orderStatus}">${orderStatusLabel(order.orderStatus)}</div>
                              <strong>${formatCurrency(visibleOrderTotal(order))}</strong>
                            </div>
                          </div>
                          ${orderItemsMarkup(order)}
                          <div class="order-actions">
                            <button class="btn btn-secondary" type="button" onclick="toggleOrderTracking('${order._id}')">
                              ${isTrackingExpanded(order._id) ? "Hide Tracking" : "Track Order"}
                            </button>
                            ${
                              state.user.role !== "customer"
                                ? `<select onchange="changeOrderStatus('${order._id}', this.value)" ${
                                    order.orderStatus === "cancelled" ? "disabled" : ""
                                  }>
                                    ${["processing", "confirmed", "shipped", "delivered", "cancelled"]
                                      .map(
                                        (status) =>
                                          `<option value="${status}" ${order.orderStatus === status ? "selected" : ""}>${orderStatusLabel(
                                            status
                                          )}</option>`
                                      )
                                      .join("")}
                                  </select>`
                                : ""
                            }
                            ${
                              canCancelOrder(order)
                                ? `<button class="btn btn-ghost" type="button" onclick="cancelOrder('${order._id}')">Cancel Order</button>`
                                : ""
                            }
                          </div>
                          ${isTrackingExpanded(order._id) ? orderTrackingMarkup(order) : ""}
                          <div class="order-meta-footer">
                            <span>Payment: ${escapeText(order.paymentMethod || "Cash on Delivery")}</span>
                            <span>Payment Status: ${escapeText(order.paymentStatus || "pending")}</span>
                            <span>Items: ${itemCount}</span>
                            <span>Address: ${escapeText(order.shippingAddress || "Default address")}</span>
                            ${order.paymentReference ? `<span>Reference: ${escapeText(order.paymentReference)}</span>` : ""}
                            ${order.maskedCard ? `<span>${escapeText(order.maskedCard)}</span>` : ""}
                          </div>
                          ${
                            order.orderStatus === "cancelled"
                              ? `<p class="order-cancel-note">This order has been cancelled.</p>`
                              : state.user.role === "customer"
                              ? `<p class="order-cancel-note">Orders can only be cancelled before they move into transit.</p>`
                              : ""
                          }
                        </article>
                      `;
                    })
                    .join("")
                : `<div class="empty-state">No orders yet.</div>`
            }
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function profileView() {
  const user = state.profile || state.user;
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="profile-panel">
          <p class="eyebrow">Account</p>
          <h2 class="section-title">Profile Settings</h2>
          <form onsubmit="saveProfile(event)">
            <div class="field">
              <label for="profileName">Name</label>
              <input id="profileName" value="${escapeText(user.name || "")}" />
            </div>
            <div class="field">
              <label for="profilePhone">Phone</label>
              <input id="profilePhone" value="${escapeText(user.phone || "")}" />
            </div>
            <div class="field">
              <label for="profileAddress">Address</label>
              <textarea id="profileAddress">${escapeText(user.address || "")}</textarea>
            </div>
            ${
              state.user.role === "vendor"
                ? `<div class="field">
                    <label for="profileStoreName">Store Name</label>
                    <input id="profileStoreName" value="${escapeText(user.storeName || "")}" />
                  </div>`
                : ""
            }
            <div class="toolbar">
              <button class="btn btn-primary" type="submit">Save Changes</button>
              <button class="btn btn-secondary" type="button" onclick="logout()">Logout</button>
            </div>
          </form>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function vendorView() {
  const dashboard = state.vendorDashboard;
  if (!dashboard) {
    return `${customerHeader()}<div class="commerce-shell"><div class="page-shell"><div class="empty-state">Vendor access required.</div></div>${footerMarkup()}</div>`;
  }

  const recentProducts = recentProductCount(dashboard.products || []);

  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="vendor-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Vendor Hub</h2>
              <p class="section-kicker">Manage products, inventory, and what customers can see on the live store.</p>
            </div>
          </div>
          <div class="stats-grid">
            <div class="feature-card"><p>Products</p><h3>${dashboard.stats.totalProducts}</h3></div>
            <div class="feature-card"><p>Live on Site</p><h3>${dashboard.stats.liveProducts}</h3></div>
            <div class="feature-card"><p>Out of Stock</p><h3>${dashboard.stats.outOfStockProducts}</h3></div>
            <div class="feature-card"><p>Low Stock</p><h3>${dashboard.stats.lowStockProducts}</h3></div>
            <div class="feature-card"><p>Orders</p><h3>${dashboard.stats.totalOrders}</h3></div>
            <div class="feature-card"><p>New 7 Days</p><h3>${dashboard.stats.newProductsThisWeek ?? recentProducts}</h3></div>
            <div class="feature-card"><p>Revenue</p><h3>${formatCurrency(dashboard.stats.totalRevenue)}</h3></div>
          </div>
        </section>
        <section class="vendor-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Manage Products</h2>
              <p class="section-kicker">Save karte hi product niche list me aa jayega aur customer site par uska live status bhi dikhega.</p>
            </div>
          </div>
          <form onsubmit="submitProduct(event)">
            <input type="hidden" id="productId" />
            <div class="field"><label>Name</label><input id="productName" required /></div>
            <div class="field"><label>Description</label><textarea id="productDescription" required></textarea></div>
            <div class="field"><label>Image URL</label><input id="productImage" required /></div>
            <div class="field"><label>Category</label><select id="productCategory">${state.categories.slice(1).map((category) => `<option value="${escapeText(category)}">${escapeText(category)}</option>`).join("")}</select></div>
            <div class="field"><label>Price</label><input id="productPrice" type="number" min="0" required /></div>
            <div class="field"><label>Rating</label><input id="productRating" type="number" min="0" max="5" step="0.1" value="4" required /></div>
            <div class="field"><label>Stock</label><input id="productStock" type="number" min="0" required /></div>
            <div class="field"><label>Features</label><input id="productFeatures" placeholder="Comma separated" /></div>
            <p class="form-hint">Stock 0 karoge to customer, vendor, aur admin tino dashboards me product out of stock ke label ke saath dikhega.</p>
            <button class="btn btn-primary" type="submit">Save Product</button>
          </form>
        </section>
        <section class="vendor-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Product Visibility</h2>
              <p class="section-kicker">Naya product sabse upar dikh raha hoga. Customer site column se turant pata chalega ki product live hai ya out of stock.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Inventory</th><th>Customer Site</th><th>Added</th><th>Actions</th></tr></thead>
              <tbody>
                ${
                  dashboard.products?.length
                    ? dashboard.products
                        .map((product) => {
                          const inventory = getInventoryState(product);

                          return `
                      <tr>
                        <td>
                          <div class="table-stack">
                            <strong>${escapeText(product.name)}</strong>
                            <div class="meta">${escapeText([product.vendorName, formatCurrency(product.price)].filter(Boolean).join(" • "))}</div>
                          </div>
                        </td>
                        <td>${escapeText(product.category)}</td>
                        <td>
                          <div class="table-stack">
                            ${stockBadgeMarkup(product)}
                            <div class="meta">${product.stock} units available</div>
                          </div>
                        </td>
                        <td>
                          <div class="table-stack">
                            ${storefrontBadgeMarkup(product)}
                            <div class="meta">${escapeText(inventory.detail)}</div>
                          </div>
                        </td>
                        <td>${formatDateTime(product.createdAt)}</td>
                        <td><div class="toolbar"><button class="btn btn-secondary" onclick="editProduct('${product._id}')">Edit</button><button class="btn btn-ghost" onclick="deleteProduct('${product._id}')">Delete</button></div></td>
                      </tr>
                    `;
                        })
                        .join("")
                    : `<tr><td colspan="6">Aapka koi product abhi tak add nahi hua.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function adminView() {
  const dashboard = state.adminDashboard;
  if (!dashboard) {
    return `${customerHeader()}<div class="commerce-shell"><div class="page-shell"><div class="empty-state">Admin access required.</div></div>${footerMarkup()}</div>`;
  }

  const recentProducts = recentProductCount(dashboard.products || []);

  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="admin-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Admin Panel</h2>
              <p class="section-kicker">Monitor users, vendors, orders, and what the real customer storefront is showing right now.</p>
            </div>
          </div>
          <div class="stats-grid">
            <div class="feature-card"><p>Users</p><h3>${dashboard.metrics.totalUsers}</h3></div>
            <div class="feature-card"><p>Vendors</p><h3>${dashboard.metrics.totalVendors}</h3></div>
            <div class="feature-card"><p>Products</p><h3>${dashboard.metrics.totalProducts}</h3></div>
            <div class="feature-card"><p>Orders</p><h3>${dashboard.metrics.totalOrders}</h3></div>
            <div class="feature-card"><p>Live on Site</p><h3>${dashboard.metrics.liveProducts}</h3></div>
            <div class="feature-card"><p>Out of Stock</p><h3>${dashboard.metrics.outOfStockProducts}</h3></div>
            <div class="feature-card"><p>Low Stock</p><h3>${dashboard.metrics.lowStockProducts}</h3></div>
            <div class="feature-card"><p>New 7 Days</p><h3>${dashboard.metrics.newProductsThisWeek ?? recentProducts}</h3></div>
          </div>
        </section>
        <section class="admin-panel">
          <div class="dashboard-callout">
            Customer storefront snapshot: ${dashboard.metrics.liveProducts} products abhi buyable hain, ${dashboard.metrics.outOfStockProducts} products out of stock label ke saath visible hain, aur pichhle 7 din me ${dashboard.metrics.newProductsThisWeek ?? recentProducts} naye products add hue hain.
          </div>
        </section>
        <section class="admin-panel">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Change Role</th></tr></thead>
              <tbody>
                ${dashboard.users
                  .map(
                    (user) => `
                      <tr>
                        <td>${escapeText(user.name)}</td>
                        <td>${escapeText(user.email)}</td>
                        <td>${escapeText(user.role)}</td>
                        <td>
                          <select onchange="changeUserRole('${user._id}', this.value)">
                            ${["customer", "vendor", "admin"]
                              .map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`)
                              .join("")}
                          </select>
                        </td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>
        <section class="admin-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Vendor Products</h2>
              <p class="section-kicker">Yahan se dekh sakte ho kis vendor ne kaunsa product add kiya hai, kab add kiya hai, aur customer site par wo live hai ya out of stock.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Vendor</th><th>Store</th><th>Inventory</th><th>Customer Site</th><th>Added</th><th>Action</th></tr></thead>
              <tbody>
                ${
                  dashboard.products?.length
                    ? dashboard.products
                        .map((product) => `
                            <tr>
                              <td>
                                <div class="table-stack">
                                  <strong>${escapeText(product.name)}</strong>
                                  <div class="meta">${escapeText([product.category, formatCurrency(product.price)].join(" • "))}</div>
                                </div>
                              </td>
                              <td>${escapeText(product.vendor?.name || product.vendorName || "-")}</td>
                              <td>${escapeText(product.vendor?.storeName || product.vendorName || "-")}</td>
                              <td>
                                <div class="table-stack">
                                  ${stockBadgeMarkup(product)}
                                  <div class="meta">${product.stock} units available</div>
                                </div>
                              </td>
                              <td>
                                <div class="table-stack">
                                  ${storefrontBadgeMarkup(product)}
                                  <div class="meta">${escapeText(getInventoryState(product).detail)}</div>
                                </div>
                              </td>
                              <td>${formatDateTime(product.createdAt)}</td>
                              <td><button class="btn btn-ghost" type="button" onclick="deleteProduct('${product._id}')">Delete</button></td>
                            </tr>
                          `)
                        .join("")
                    : `<tr><td colspan="7">No vendor products found.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}


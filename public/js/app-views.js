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
    <article class="catalog-card" ondblclick="openProductFromCard(event, '${product._id}')" title="Double-click to view product details">
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

function reviewCountLabel(product = {}) {
  const count = Math.max(0, Number(product.reviewCount) || (product.reviews || []).length || 0);
  return `${count} review${count === 1 ? "" : "s"}`;
}

function reviewFormMarkup(product = {}) {
  if (!state.user) {
    return `<p class="meta">Login with a customer account to add a review or comment.</p>`;
  }

  if (!isCustomer()) {
    return `<p class="meta">Reviews and comments can be posted from customer accounts.</p>`;
  }

  const existingReview = (product.reviews || []).find(
    (review) => String(review.customer?._id || review.customer || "") === String(state.user?._id || "")
  );

  return `
    <form class="review-form" onsubmit="submitProductReview(event, '${product._id}')">
      <div class="field">
        <label for="reviewRating">Your rating</label>
        <select id="reviewRating">
          ${[5, 4, 3, 2, 1]
            .map(
              (rating) => `
                <option value="${rating}" ${
                  Number(existingReview?.rating || 5) === rating ? "selected" : ""
                }>${rating} star${rating === 1 ? "" : "s"}</option>
              `
            )
            .join("")}
        </select>
      </div>
      <div class="field">
        <label for="reviewComment">Review / Comment</label>
        <textarea id="reviewComment" rows="4" placeholder="Share what you liked, sizing notes, quality, or delivery experience." required>${escapeText(
          existingReview?.comment || ""
        )}</textarea>
      </div>
      <button class="btn btn-primary" type="submit">${existingReview ? "Update Review" : "Post Review"}</button>
    </form>
  `;
}

function productReviewsMarkup(product = {}) {
  const reviews = [...(product.reviews || [])].sort(
    (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

  return `
    <section class="panel review-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Customer Reviews</p>
          <h3 class="section-title">${reviewCountLabel(product)}</h3>
        </div>
        <div class="review-summary-chip">${ratingStars(Number(product.rating) || 0)}</div>
      </div>
      <div class="review-layout">
        <div class="review-list">
          ${
            reviews.length
              ? reviews
                  .map(
                    (review) => `
                      <article class="review-card">
                        <div class="review-card-head">
                          <strong>${escapeText(review.customerName || "Customer")}</strong>
                          <span class="meta">${formatDateTime(review.createdAt)}</span>
                        </div>
                        <div>${ratingStars(Number(review.rating) || 0)}</div>
                        <p>${escapeText(review.comment || "")}</p>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state">No reviews yet. Be the first customer to leave a comment.</div>`
          }
        </div>
        <aside class="review-side-panel">
          <p class="eyebrow">Write A Review</p>
          <h4>Help the next customer shop confidently</h4>
          ${reviewFormMarkup(product)}
        </aside>
      </div>
    </section>
  `;
}

function quantityOptionsMarkup(currentQuantity = 1, maxQuantity = 1) {
  const safeCurrent = Math.max(1, Number(currentQuantity) || 1);
  const safeMax = Math.max(1, Number(maxQuantity) || 1);
  const values = new Set(Array.from({ length: Math.min(safeMax, 10) }, (_, index) => index + 1));

  values.add(safeCurrent);
  values.add(safeMax);

  return [...values]
    .sort((left, right) => left - right)
    .map(
      (value) => `
        <option value="${value}" ${value === safeCurrent ? "selected" : ""}>${value}</option>
      `
    )
    .join("");
}

function couponOfferMarkup() {
  return `
    <div class="field coupon-field">
      <label for="couponSelector">Coupons</label>
      <select id="couponSelector" class="coupon-select" onchange="selectCheckoutCoupon(this.value)">
        <option value="">See all coupons</option>
        ${COUPON_DEFINITIONS.map(
          (coupon) => `
            <option value="${coupon.code}" ${state.checkout.couponCode === coupon.code ? "selected" : ""}>
              ${coupon.code} - ${escapeText(coupon.label)}
            </option>
          `
        ).join("")}
      </select>
    </div>
  `;
}

function checkoutSummaryItemsMarkup(bill = {}) {
  return `
    <div class="summary-item-stack">
      ${(bill.items || [])
        .map((item) => {
          const product =
            item?.product && typeof item.product === "object"
              ? item.product
              : {
                  name: item.name,
                  image: item.image,
                  category: item.category,
                  vendorName: item.vendorName,
                };

          return `
            <article class="summary-line-item">
              <div class="summary-line-media">
                <img ${fallbackImageAttrs(product)} alt="${escapeText(item.name)}" />
              </div>
              <div class="summary-line-copy">
                <strong>${escapeText(item.name)}</strong>
                <span>${escapeText(item.vendorName || product.vendorName || "UrbanKart")}</span>
                <small>Qty ${item.quantity}</small>
              </div>
              <div class="summary-line-values">
                <strong>${formatCurrency(item.lineTotal)}</strong>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function checkoutItemCardMarkup(item, options = {}) {
  const { direct = false, showBuyNow = false } = options;
  const product = item.product;
  const inventory = getInventoryState(product);
  const maxQuantity = Math.max(1, getProductStock(product));

  return `
    <article class="cart-item checkout-item-card">
      <div class="cart-item-media">
        <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
      </div>
      <div class="cart-item-copy">
        <div class="checkout-item-head">
          <div>
            <h3>${escapeText(product.name)}</h3>
            <p class="meta">${escapeText(product.vendorName || "UrbanKart")}</p>
            <div class="cart-item-status">
              ${stockBadgeMarkup(product)}
              ${storefrontBadgeMarkup(product)}
            </div>
          </div>
          <div class="checkout-item-price">${formatCurrency((Number(item.quantity) || 1) * (Number(product.price) || 0))}</div>
        </div>
        <p class="checkout-item-copyline">${escapeText(product.description || "").slice(0, 124)}</p>
        <p class="price-tag">${formatCurrency(product.price)}</p>
        <div class="toolbar checkout-item-actions">
          <div class="qty-box qty-box-select">
            <label>Qty</label>
            <select
              class="qty-select"
              onchange="${direct ? "updateDirectCheckoutQuantity(this.value)" : `updateCartQuantity('${product._id}', this.value)`}"
              ${inventory.purchasable ? "" : "disabled"}
            >
              ${quantityOptionsMarkup(item.quantity, maxQuantity)}
            </select>
          </div>
           ${
            direct
              ? `<button class="btn btn-secondary" type="button" onclick="openProduct('${product._id}')">View product</button>`
              : `${showBuyNow ? `<button class="btn btn-primary" type="button" onclick="startBuyNow('${product._id}', ${item.quantity})" ${
                  inventory.purchasable ? "" : "disabled"
                }>Buy Now</button>` : ""}
                 <button class="btn btn-ghost" type="button" onclick="removeFromCart('${product._id}')">Remove</button>
                 <button class="btn btn-secondary" type="button" onclick="openProduct('${product._id}')">View details</button>`
          }
        </div>
      </div>
    </article>
  `;
}

function billItemsMarkup(bill = {}, options = {}) {
  const { compact = false } = options;

  return `
    <div class="bill-item-list ${compact ? "compact" : ""}">
      ${(bill.items || [])
        .map(
          (item) => `
            <div class="bill-item-row">
              <div>
                <strong>${escapeText(item.name)}</strong>
                <p class="meta">Qty ${item.quantity}</p>
              </div>
              <div class="bill-item-values">
                <span>${formatCurrency(item.lineTotal)}</span>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function billItemsTotalAmount(bill = {}) {
  return Math.max(0, Number(bill.totalAmount || 0) - Number(bill.deliveryCharge || 0));
}

function billSummaryMarkup(bill = {}, options = {}) {
  const { title = "Order Bill", note = "" } = options;

  return `
    <section class="bill-card">
      <div class="bill-card-head">
        <div>
          <p class="eyebrow">Invoice</p>
          <h4>${escapeText(title)}</h4>
        </div>
        <span class="bill-total-pill">${formatCurrency(bill.totalAmount || 0)}</span>
      </div>
      ${billItemsMarkup(bill)}
      <div class="bill-summary-table">
        <div><span>Items</span><strong>${formatCurrency(billItemsTotalAmount(bill))}</strong></div>
        <div><span>Delivery</span><strong>${bill.deliveryCharge ? formatCurrency(bill.deliveryCharge) : "Free"}</strong></div>
        <div class="grand-total"><span>Total</span><strong>${formatCurrency(bill.totalAmount || 0)}</strong></div>
      </div>
      ${
        bill.coupon
          ? `<p class="meta">Coupon applied: <strong>${escapeText(bill.coupon.code)}</strong> - ${escapeText(
              bill.coupon.label || "discount"
            )}</p>`
          : ""
      }
      <p class="meta">${escapeText(
        note ||
          (bill.deliveryCharge === 0
            ? `Free delivery applied on orders of ${formatCurrency(
                bill.freeDeliveryThreshold || FREE_DELIVERY_THRESHOLD
              )} or more.`
            : `Add products worth ${formatCurrency(
                Math.max(0, (bill.freeDeliveryThreshold || FREE_DELIVERY_THRESHOLD) - (bill.discountedSubtotal || 0))
              )} more to unlock free delivery.`)
      )}</p>
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
            <div>${ratingStars(product.rating)} <span class="meta">| ${reviewCountLabel(product)}</span></div>
            <p>${escapeText(product.description)}</p>
            <div class="summary-total">${formatCurrency(product.price)}</div>
            <p class="meta">${escapeText(inventory.detail)}</p>
            <div>${(product.features || []).map((feature) => `<span class="feature-chip">${escapeText(feature)}</span>`).join("")}</div>
            <div class="toolbar detail-action-row">
              <button class="btn btn-primary" type="button" onclick="startBuyNow('${product._id}')" ${
                inventory.purchasable ? "" : "disabled"
              }>Buy Now</button>
              <button class="btn btn-secondary" type="button" onclick="quickAddToCart('${product._id}')" ${
                inventory.purchasable ? "" : "disabled"
              }>Add to cart</button>
              <button class="btn btn-secondary" onclick="toggleWishlist('${product._id}')">Wishlist</button>
              <button class="btn btn-ghost" onclick="goHome()">Continue shopping</button>
            </div>
          </aside>
        </section>
        ${productReviewsMarkup(product)}
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
  const itemCount = getCartCount();

  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="section-block">
          <div class="cart-page-panel panel checkout-panel">
            <div class="checkout-panel-head">
              <div>
                <p class="eyebrow">Your Bag</p>
                <h2 class="section-title">Shopping Cart</h2>
                <p class="section-kicker">${itemCount} item${itemCount === 1 ? "" : "s"} in your cart.</p>
              </div>
              <div class="toolbar checkout-panel-actions">
                <button class="btn btn-ghost" type="button" onclick="goHome()">Continue shopping</button>
                ${
                  cart.length
                    ? `<button class="btn btn-primary" type="button" onclick="openOrderSummary()">Go To Order Summary</button>`
                    : ""
                }
              </div>
            </div>
            ${
              cart.length
                ? `<div class="checkout-item-stack">${cart
                    .map((item) => checkoutItemCardMarkup(item, { showBuyNow: true }))
                    .join("")}</div>
                   <div class="cart-page-footer">
                     <button class="btn btn-primary" type="button" onclick="openOrderSummary()">Proceed To Order Summary</button>
                   </div>`
                : `<div class="empty-state">Your cart is empty.</div>`
            }
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function orderSummaryCardMarkup() {
  const checkoutItems = currentCheckoutItems();
  const bill = currentCheckoutBill();
  const paymentMethod = state.checkout.paymentMethod;
  const showUpiPanel = isUpiPayment(paymentMethod);
  const isDirectCheckout = isDirectCheckoutActive();
  const itemCount = currentCheckoutCount();
  const directItem = currentDirectCheckoutItem();
  const submitLabel = isDirectCheckout
    ? showUpiPanel
      ? "Pay Now & Buy Now"
      : "Buy Now"
    : showUpiPanel
    ? "Pay Now & Place Order"
    : "Place Order";

  if (!checkoutItems.length) {
    return `
      <section class="summary-panel checkout-summary-panel order-summary-page">
        <div class="empty-state">No items available for checkout.</div>
        <div class="toolbar order-summary-actions">
          <button class="btn btn-secondary" type="button" onclick="openCart()">Back to cart</button>
          <button class="btn btn-ghost" type="button" onclick="goHome()">Continue shopping</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="summary-panel checkout-summary-panel order-summary-page">
      <div class="summary-header">
        <div>
          <p class="eyebrow">${isDirectCheckout ? "Quick Order" : "Checkout"}</p>
          <h2 class="section-title" style="font-size:2.8rem;">Order Summary</h2>
          <p>Bill preview for ${itemCount} item${itemCount === 1 ? "" : "s"}</p>
        </div>
        <span class="summary-item-pill">${itemCount} item${itemCount === 1 ? "" : "s"}</span>
      </div>
      <div class="toolbar order-summary-actions">
        ${
          isDirectCheckout && directItem
            ? `<button class="btn btn-secondary" type="button" onclick="openProduct('${directItem.product._id}')">Back to product</button>`
            : `<button class="btn btn-secondary" type="button" onclick="openCart()">Back to cart</button>`
        }
        <button class="btn btn-ghost" type="button" onclick="goHome()">Continue shopping</button>
      </div>
      ${checkoutSummaryItemsMarkup(bill)}
      ${couponOfferMarkup()}
      ${
        bill.invalidCoupon
          ? `<p class="coupon-error">${escapeText(bill.invalidCoupon.message)}</p>`
          : bill.coupon
          ? `<p class="coupon-success">Coupon applied!</p>`
          : ""
      }
      ${
        bill.coupon
          ? `<p class="coupon-chip selected-coupon"><strong>${escapeText(bill.coupon.code)}</strong><span>${escapeText(
              bill.coupon.label
            )}</span></p>`
          : ""
      }
      <div class="bill-summary-table compact">
        <div><span>Items</span><strong>${formatCurrency(billItemsTotalAmount(bill))}</strong></div>
        <div><span>Shipping</span><strong>${bill.deliveryCharge ? formatCurrency(bill.deliveryCharge) : "Free"}</strong></div>
        <div class="grand-total"><span>Payable</span><strong>${formatCurrency(bill.totalAmount)}</strong></div>
      </div>
      <form class="summary-form" onsubmit="placeOrder(event)">
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
            ? `<p class="payment-note">Tap <strong>${escapeText(submitLabel)}</strong> to open the UPI QR screen for ${formatCurrency(
                bill.totalAmount
              )}.</p>`
            : `<p class="payment-note">Pay when the order arrives using ${escapeText(
                paymentMethod
              )}. Free delivery applies at ${formatCurrency(FREE_DELIVERY_THRESHOLD)} and above.</p>`
        }
        <button class="btn btn-primary checkout-submit" type="submit">${submitLabel}</button>
      </form>
    </section>
  `;
}

function orderSummaryView() {
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="order-summary-layout">
          ${orderSummaryCardMarkup()}
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
    (sum, item) =>
      sum +
      (Number(item?.lineTotal) ||
        Number(item?.discountedTaxableAmount) + Number(item?.gstAmount) ||
        (Number(item?.price) || 0) * (Number(item?.quantity) || 0)),
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

function isBillExpanded(orderId = "") {
  return state.expandedBillOrders.includes(orderId);
}

function toggleOrderBill(orderId = "") {
  state.expandedBillOrders = isBillExpanded(orderId)
    ? state.expandedBillOrders.filter((id) => id !== orderId)
    : [...state.expandedBillOrders, orderId];
  render();
}

function toggleOrderTracking(orderId = "") {
  state.expandedTrackingOrders = isTrackingExpanded(orderId)
    ? state.expandedTrackingOrders.filter((id) => id !== orderId)
    : [...state.expandedTrackingOrders, orderId];
  render();
}

function visibleOrderBill(order = {}) {
  const baseBill = orderBillDetails(order);

  if (state.user?.role !== "vendor") {
    return baseBill;
  }

  const items = visibleOrderItems(order).map((item) => ({
    product: item.product,
    productId: item?.product?._id || item?.product || "",
    name: item.name || item?.product?.name || "Product",
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.price) || 0,
    taxableAmount: Number(item.taxableAmount) || roundCurrency((Number(item.price) || 0) * (Number(item.quantity) || 1)),
    gstRate: Number(item.gstRate) || productGstRate(item.product || item),
    discountAmount: Number(item.discountAmount) || 0,
    discountedTaxableAmount:
      Number(item.discountedTaxableAmount) ||
      Math.max(0, roundCurrency((Number(item.price) || 0) * (Number(item.quantity) || 1)) - (Number(item.discountAmount) || 0)),
    gstAmount: Number(item.gstAmount) || 0,
    lineTotal:
      Number(item.lineTotal) ||
      roundCurrency(
        (Number(item.discountedTaxableAmount) ||
          Math.max(
            0,
            roundCurrency((Number(item.price) || 0) * (Number(item.quantity) || 1)) - (Number(item.discountAmount) || 0)
          )) + (Number(item.gstAmount) || 0)
      ),
  }));

  return {
    ...baseBill,
    items,
    subtotal: items.reduce((sum, item) => sum + item.taxableAmount, 0),
    discountedSubtotal: items.reduce((sum, item) => sum + item.discountedTaxableAmount, 0),
    discountAmount: items.reduce((sum, item) => sum + item.discountAmount, 0),
    gstAmount: items.reduce((sum, item) => sum + item.gstAmount, 0),
    deliveryCharge: 0,
    totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

function orderBillMarkup(order = {}) {
  const bill = visibleOrderBill(order);
  const note =
    state.user?.role === "vendor"
      ? "Vendor view shows only the billed value for your visible order items."
      : "";

  return billSummaryMarkup(bill, { title: "Order Bill", note });
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
                            <button class="btn btn-secondary" type="button" onclick="toggleOrderBill('${order._id}')">
                              ${isBillExpanded(order._id) ? "Hide Order Bill" : "Order Bill"}
                            </button>
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
                          ${isBillExpanded(order._id) ? orderBillMarkup(order) : ""}
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
            <button class="btn btn-primary" type="submit">Save Product</button>
          </form>
        </section>
        <section class="vendor-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Product Visibility</h2>
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


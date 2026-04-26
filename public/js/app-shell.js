function authWelcomeView() {
  return `
    <section class="welcome-auth">
      <div class="welcome-auth-media">
        <img src="/images/welcome-auth.jpg" alt="UrbanKart welcome shopping visual" />
      </div>
      <div class="welcome-auth-card">
        <p class="eyebrow">Welcome To UrbanKart</p>
        <h2 class="display-title">Find your daily favorites, fashion picks, and smart essentials in one place.</h2>
        <p class="muted">Shop fresh, live better, and discover something worth adding to your cart every time.</p>
        <p class="muted">Simple browsing, trusted sellers, and a cleaner shopping experience start right here.</p>
        <div class="welcome-auth-actions">
          <button class="btn btn-primary" type="button" onclick="openAuthForm('login')">Login</button>
          <button class="btn btn-secondary" type="button" onclick="openAuthForm('signup')">Signup</button>
        </div>
      </div>
    </section>
  `;
}

function authFormView(mode = "login") {
  const isSignup = mode === "signup";
  return `
    <section class="auth-form-page">
      <div class="auth-form-card">
        <p class="eyebrow">${isSignup ? "Create An Account" : "Welcome Back"}</p>
        <h2>${isSignup ? "Signup to continue with UrbanKart" : "Login to continue with UrbanKart"}</h2>
        <div class="auth-tabs">
          <button class="btn btn-secondary ${!isSignup ? "tab-active" : ""}" id="loginTabBtn" onclick="toggleAuthTab('login')">Login</button>
          <button class="btn btn-secondary ${isSignup ? "tab-active" : ""}" id="signupTabBtn" onclick="toggleAuthTab('signup')">Signup</button>
        </div>
        <form id="authForm">
          <input type="hidden" id="authMode" value="${isSignup ? "signup" : "login"}" />
          <div class="field" id="nameField" style="display:${isSignup ? "grid" : "none"};">
            <label for="name">Full Name</label>
            <input id="name" placeholder="Jane Smith" />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" placeholder="Minimum 6 characters" required />
          </div>
          <div class="field" id="roleField" style="display:${isSignup ? "grid" : "none"};">
            <label for="role">Role</label>
            <select id="role">
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          <div class="field" id="storeNameField" style="display:${isSignup ? "grid" : "none"};">
            <label for="storeName">Store Name</label>
            <input id="storeName" placeholder="Your Shop Name" />
          </div>
          <button class="btn btn-primary" type="submit">${isSignup ? "Create Account" : "Login"}</button>
        </form>
        <div class="toolbar auth-form-footer">
          <button class="btn btn-ghost" type="button" onclick="resetPasswordPrompt()">Reset password</button>
        </div>
        <p class="auth-switch-copy">
          ${
            isSignup
              ? `Already have an account? <a href="#" onclick="openAuthForm('login'); return false;">Login here</a>`
              : `If you don't have an account, <a href="#" onclick="openAuthForm('signup'); return false;">create an account</a>`
          }
        </p>
      </div>
    </section>
  `;
}

function openAuthForm(mode = "login") {
  state.currentView = "authForm";
  state.authScreenMode = mode;
  render();
}

function announcementMarkup() {
  return `<div class="announcement-strip">${announcements
    .map((item) => `<span>${item}</span>`)
    .join("")}</div>`;
}

function customerHeader() {
  const searchValue = escapeText(state.filters.search);

  return `
    <header class="store-header">
      ${announcementMarkup()}
      <div class="store-topbar">
        <div class="brand-mark" onclick="goHome()" style="cursor:pointer;">URBANKART<small>&bull;</small></div>
        <form class="search-shell" onsubmit="submitSearch(event)">
          <input id="headerSearch" value="${searchValue}" placeholder="Search products, brands, categories" />
          <button type="submit">Find</button>
        </form>
        <div class="utility-links">
          <span class="utility-link" onclick="goHome()">Home</span>
          <span class="utility-link" onclick="setView('about')">About</span>
          <span class="utility-link" onclick="setView('profile')">Account</span>
          <span class="utility-icon" onclick="setView('wishlist')" title="Wishlist">&#9825;</span>
          <span class="utility-icon" onclick="setView('orders')" title="Orders">ORD</span>
      <span class="utility-icon utility-icon-cart" onclick="openCart()" title="Cart"><span class="cart-icon">&#128722;</span><span class="cart-count">${getCartCount()}</span></span>
        </div>
      </div>
      <div class="category-nav-wrap">
        <div class="category-nav">
          ${state.categories
            .slice(1)
            .map(
              (category) =>
                `<span class="category-link ${state.filters.category === category ? "active" : ""}" onclick="selectCategory('${escapeText(
                  category
                )}')">${escapeText(category)}</span>`
            )
            .join("")}
        </div>
      </div>
    </header>
  `;
}

function heroMarkup() {
  return `
    <section class="hero-stage" onmouseenter="stopHeroRotation()" onmouseleave="startHeroRotation()">
      ${heroSlides
        .map(
          (slide, index) => `
            <div
              class="hero-slide ${index === activeHeroSlideIndex ? "is-active" : ""}"
              style="background-image:url('${slide.image}');"
              data-hero-index="${index}"
              aria-hidden="${index === activeHeroSlideIndex ? "false" : "true"}"
            >
              <div class="hero-content">
                <h2 class="hero-title">${slide.title}</h2>
                <p class="hero-copy">${slide.copy}</p>
                <div class="toolbar">
                  <button class="btn btn-secondary hero-cta" onclick="selectCategory('${escapeText(
                    slide.category || "All"
                  )}')">${slide.cta}</button>
                </div>
              </div>
            </div>
          `
        )
        .join("")}
      <div class="hero-dots">
        ${heroSlides
          .map(
            (_, index) => `
              <button
                class="hero-dot ${index === activeHeroSlideIndex ? "active" : ""}"
                type="button"
                aria-label="Show slide ${index + 1}"
                onclick="setHeroSlide(${index}, true)"
              ></button>
            `
          )
          .join("")}
      </div>
      <div class="hero-arrows">
        <button class="hero-arrow" type="button" aria-label="Previous slide" onclick="shiftHeroSlide(-1)">&#8592;</button>
        <button class="hero-arrow" type="button" aria-label="Next slide" onclick="shiftHeroSlide(1)">&#8594;</button>
      </div>
    </section>
  `;
}

function syncHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");

  slides.forEach((slide, index) => {
    const isActive = index === activeHeroSlideIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  dots.forEach((dot, index) => {
    const isActive = index === activeHeroSlideIndex;
    dot.classList.toggle("active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
}

function setHeroSlide(index, restartTimer = false) {
  activeHeroSlideIndex = (index + heroSlides.length) % heroSlides.length;
  syncHeroSlider();

  if (restartTimer) {
    startHeroRotation();
  }
}

function shiftHeroSlide(direction) {
  setHeroSlide(activeHeroSlideIndex + direction, true);
}

function stopHeroRotation() {
  if (heroRotationTimer) {
    clearInterval(heroRotationTimer);
    heroRotationTimer = null;
  }
}

function startHeroRotation() {
  stopHeroRotation();

  if (!document.querySelector(".hero-stage")) {
    return;
  }

  heroRotationTimer = window.setInterval(() => {
    setHeroSlide(activeHeroSlideIndex + 1);
  }, 4500);
}

function initHeroSlider() {
  if (!document.querySelector(".hero-stage")) {
    stopHeroRotation();
    return;
  }

  syncHeroSlider();
  startHeroRotation();
}

function standardBadge(title) {
  const badgeMap = {
    "Clean & Organic": "PURE",
    "Delivered Across India": "SWIFT",
    "Personally Curated": "CURATED",
    "Feel Gloriously Well": "WELL",
  };

  return badgeMap[title] || "SELECT";
}

function standardsMarkup() {
  return `
    <section class="standards-section">
      <div class="standards-grid">
        <div class="standard-lead">
          <h2 class="editorial-title">The UrbanKart Standard</h2>
          <p class="section-kicker">Provenance and purity, no compromise</p>
        </div>
        ${standards
          .map(
            (item) => `
              <div class="standard-item">
                <div class="standard-icon">${standardBadge(item.title)}</div>
                <strong>${item.title}</strong>
                <span>${item.copy}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function productCard(product) {
  const inventory = getInventoryState(product);

  return `
    <article class="rail-card">
      <div class="rail-image">
        <button class="wish-button ${isWishlisted(product._id) ? "active" : ""}" type="button" onclick="toggleWishlist('${product._id}')" title="Wishlist">&#9825;</button>
        <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
      </div>
      <div class="product-card-topline">
        <div class="brand-tag">${escapeText(productBadge(product))}</div>
        ${stockBadgeMarkup(product, { compact: true })}
      </div>
      <h4>${escapeText(product.name)}</h4>
      <div class="product-submeta">${escapeText(product.vendorName || "UrbanKart")}</div>
      <div class="meta">${escapeText(product.description).slice(0, 72)}...</div>
      <div class="meta">${escapeText(inventory.detail)}</div>
      <div class="price-tag">${formatCurrency(product.price)}</div>
      <div class="toolbar">
        <button class="btn btn-secondary" onclick="openProduct('${product._id}')">View details</button>
        <button class="btn btn-primary" onclick="quickAddToCart('${product._id}')" ${
          inventory.purchasable ? "" : "disabled"
        }>${inventory.buttonLabel}</button>
      </div>
    </article>
  `;
}

function railSection(sectionId, title, copy, buttonLabel, products) {
  return `
    <section class="section-block" id="${sectionId}">
      <div class="rail-layout">
        <div class="rail-sidebar">
          <h2 class="section-title">${title}</h2>
          <p class="section-kicker">${copy}</p>
          <div class="toolbar">
            <button class="btn btn-primary" onclick="openRailCollection('${sectionId}')">${buttonLabel}</button>
          </div>
          <div class="rail-controls">
            <button class="btn btn-secondary" type="button" onclick="scrollRail('${sectionId}', 'prev')">&#8592;</button>
            <button class="btn btn-secondary" type="button" onclick="scrollRail('${sectionId}', 'next')">&#8594;</button>
          </div>
        </div>
        <div class="rail-track" id="${sectionId}Track">
          ${products.map(productCard).join("")}
        </div>
      </div>
    </section>
  `;
}

function bannerSection() {
  const product = featuredProducts("Decoration Items", 1)[0] || state.products[0];
  if (!product) {
    return "";
  }

  return `
    <section class="section-block">
      <div class="banner-card">
        <div class="banner-copy">
          <h2 class="section-title">Happy House</h2>
          <p class="section-kicker">Discover the household essentials that help make your space calmer, cleaner, and better arranged.</p>
          <div class="toolbar">
            <button class="btn btn-primary" onclick="openProduct('${product._id}')">Shop now</button>
          </div>
        </div>
        <div class="banner-media" style="background-image:url('${productImageUrl(product)}');"></div>
      </div>
    </section>
  `;
}

function featureCards() {
  const picks = favoriteProducts(3);
  return `
    <section class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">UrbanKart Favourites</h2>
          <p class="section-kicker">Curated bundles and product stories designed to support your daily goals.</p>
        </div>
      </div>
      <div class="feature-grid">
        ${picks
          .map(
            (product) => `
              <article class="feature-card">
                <div class="feature-media">
                  <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
                </div>
                <h3>${escapeText(product.name)}</h3>
                <p>${escapeText(product.description)}</p>
                <a href="#" class="link-inline" onclick="openProduct('${product._id}'); return false;">Shop The Collection</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function realImageGalleryMarkup() {
  const products = marketGalleryProducts(20);
  if (!products.length) {
    return "";
  }

  return `
    <section class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">New Arrivals</h2>
        </div>
        <div class="toolbar">
          <button class="btn btn-secondary" type="button" onclick="selectCategory('Fashion')">Shop Fashion</button>
          <button class="btn btn-primary" type="button" onclick="selectCategory('Grocery')">Shop Grocery</button>
        </div>
      </div>
      <div class="lookbook-grid">
        ${products
          .map(
            (product) => `
              <button class="lookbook-card" type="button" onclick="openProduct('${product._id}')">
                <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
                <span class="lookbook-copy">
                  <span class="lookbook-meta">${escapeText(productMetaTrail(product) || product.category || "UrbanKart")}</span>
                  <span class="lookbook-title">${escapeText(product.name)}</span>
                  <span class="lookbook-price">${formatCurrency(product.price)}</span>
                </span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function partnersMarkup() {
  return `
    <section class="partner-section">
      <div class="section-head">
        <div>
          <h2 class="section-title">Our Partners</h2>
        </div>
      </div>
      <div class="partner-logos">
        ${partnerNames.map((name) => `<span class="partner-logo">${name}</span>`).join("")}
      </div>
    </section>
  `;
}

function journalMarkup() {
  const images = [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1000&q=80",
  ];

  return `
    <section class="journal-section">
      <div class="section-head">
        <div>
          <h2 class="section-title">UrbanKart Journal</h2>
        </div>
      </div>
      <div class="journal-grid">
        ${journalTopics
          .map(
            (topic, index) => `
              <article class="article-card">
                <img src="${images[index]}" alt="${escapeText(topic.title)}" />
                <h3>${topic.title}</h3>
                <p>${topic.copy}</p>
                <a href="#" class="link-inline" onclick="scrollToSection('featuredProducts'); return false;">Read More</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function footerMarkup() {
  return `
    <footer class="footer-section" id="footerSection">
      <div class="footer-inner">
        <div>
          <div class="footer-display">UrbanKart</div>
          <p class="footer-copy">A calmer multi-vendor marketplace for daily essentials, fashion, beauty, decor, and personal tech.</p>
          <div class="newsletter-box">
            <input placeholder="Email" />
            <button type="button">&#8594;</button>
          </div>
        </div>
        <div>
          <strong>Discover</strong>
          <ul class="footer-links">
            <li class="footer-action" onclick="openRailCollection('exclusiveProducts')">Elevare Exclusives</li>
            <li class="footer-action" onclick="openRailCollection('featuredProducts')">Featured Products</li>
            <li class="footer-action" onclick="showFeatureToast('Curated Bundles')">Curated Bundles</li>
          </ul>
        </div>
        <div>
          <strong>Customer Support</strong>
          <ul class="footer-links">
            <li class="footer-action" onclick="showFeatureToast('Delivery & Returns')">Delivery & Returns</li>
            <li class="footer-action" onclick="showFeatureToast('Contact Us')">Contact Us</li>
            <li class="footer-action" onclick="showFeatureToast('FAQs')">FAQs</li>
          </ul>
        </div>
        <div>
          <strong>Explore</strong>
          <ul class="footer-links">
            <li class="footer-action" onclick="setView('about')">Our Story</li>
            <li class="footer-action" onclick="setView('about')">About UrbanKart</li>
            <li class="footer-action" onclick="showFeatureToast('Our Brands')">Our Brands</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 UrbanKart. Multi-vendor shopping made simple.</span>
        <div class="toolbar">
          <a href="#" onclick="showFeatureToast('Terms & Conditions'); return false;">Terms & Conditions</a>
          <a href="#" onclick="showFeatureToast('Privacy Policy'); return false;">Privacy Policy</a>
          <a href="#" onclick="showFeatureToast('Cookie Policy'); return false;">Cookie Policy</a>
        </div>
      </div>
    </footer>
  `;
}

function aboutView() {
  const categoryCount = Math.max(
    state.categories.length - 1,
    new Set(state.products.map((product) => product.category).filter(Boolean)).size
  );
  const vendorCount = Math.max(1, new Set(state.products.map((product) => product.vendorName || "UrbanKart")).size);
  const priceValues = state.products.map((product) => Number(product.price || 0)).filter(Boolean);
  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const primaryAction = state.user ? "goHome()" : "setView('authForm')";
  const primaryLabel = state.user ? "Back to shopping" : "Explore UrbanKart";

  return `
    ${state.user ? customerHeader() : ""}
    <div class="commerce-shell">
      <div class="page-shell about-page">
        <section class="about-hero panel">
          <p class="eyebrow">About UrbanKart</p>
          <h2 class="section-title">UrbanKart is a multi-vendor marketplace built to make everyday shopping feel curated, calm, and dependable.</h2>
          <p class="muted">We bring together trusted sellers across essentials, fashion, beauty, decor, and technology so customers can shop from multiple vendors without the clutter of a generic marketplace.</p>
          <p class="muted">Our goal is simple: real products, sensible pricing, polished discovery, and a storefront that feels easy to return to.</p>
          <div class="toolbar">
            <button class="btn btn-primary" type="button" onclick="${primaryAction}">${primaryLabel}</button>
            <button class="btn btn-secondary" type="button" onclick="scrollToSection('aboutStory')">Why people choose us</button>
          </div>
        </section>

        <section class="section-block">
          <div class="section-head">
            <div>
              <h2 class="section-title">Marketplace At A Glance</h2>
              <p class="section-kicker">A balanced mix of categories, practical price points, and curated discovery.</p>
            </div>
          </div>
          <div class="stats-grid">
            <article class="feature-card about-metric">
              <p>Categories</p>
              <h3>${categoryCount}</h3>
              <span class="meta">From grocery staples to premium tech and occasion wear.</span>
            </article>
            <article class="feature-card about-metric">
              <p>Products</p>
              <h3>${state.products.length}</h3>
              <span class="meta">A growing catalog designed for discovery without overload.</span>
            </article>
            <article class="feature-card about-metric">
              <p>Vendors</p>
              <h3>${vendorCount}</h3>
              <span class="meta">Multiple sellers supported by one consistent storefront experience.</span>
            </article>
            <article class="feature-card about-metric">
              <p>Price range</p>
              <h3>${priceValues.length ? formatCurrency(minPrice) : "Value-led"}</h3>
              <span class="meta">${priceValues.length ? `Thoughtful options that scale up to ${formatCurrency(maxPrice)}.` : "Smart pricing across everyday and premium categories."}</span>
            </article>
          </div>
        </section>

        <section class="section-block" id="aboutStory">
          <div class="section-head">
            <div>
              <h2 class="section-title">What Makes UrbanKart Different</h2>
              <p class="section-kicker">A more intentional marketplace experience for both shoppers and sellers.</p>
            </div>
          </div>
          <div class="about-story-grid">
            ${aboutHighlights
              .map(
                (item) => `
                  <article class="feature-card about-story-card">
                    <p class="eyebrow">UrbanKart Promise</p>
                    <h3>${item.title}</h3>
                    <p>${item.copy}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="about-note panel">
          <p class="eyebrow">Our Vision</p>
          <h2 class="section-title">We want UrbanKart to feel like a modern marketplace with the clarity of a well-designed boutique.</h2>
          <p class="muted">That means better product presentation, realistic pricing, easier browsing, and enough warmth in the experience that customers feel confident buying from different vendors in one place.</p>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}


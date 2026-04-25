(function () {
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

  function authFormView(ctx, mode = "login") {
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

  window.AuthTemplates = {
    authView: authWelcomeView,
    authWelcomeView,
    authFormView,
  };
})();

// Protección del Panel de Administración usando Supabase Auth.
// Requiere que el usuario admin exista en Supabase:
// Dashboard → Authentication → Users → Add user (con email y contraseña).

(function () {
  const overlay = document.getElementById("admin-login-overlay");
  const protectedContent = document.getElementById("admin-protected-content");
  const loginForm = document.getElementById("admin-login-form");
  const emailInput = document.getElementById("admin-email-input");
  const passwordInput = document.getElementById("admin-password-input");
  const loginError = document.getElementById("admin-login-error");
  const logoutBtn = document.getElementById("admin-logout-btn");

  function unlock() {
    overlay.style.display = "none";
    protectedContent.style.display = "block";
  }

  function lock() {
    protectedContent.style.display = "none";
    overlay.style.display = "flex";
  }

  // Si ya hay una sesión activa (el usuario ya inició sesión antes), no vuelve a pedir credenciales.
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
      unlock();
    } else {
      lock();
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.style.display = "none";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    if (error) {
      loginError.textContent = "Email o contraseña incorrectos.";
      loginError.style.display = "block";
      passwordInput.value = "";
      passwordInput.focus();
    } else {
      unlock();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      lock();
    });
  }

  // Si la sesión expira o se cierra desde otra pestaña, bloqueamos el panel.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") lock();
  });
})();

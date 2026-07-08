// Lógica principal de la Tienda Ingenio cv

// Animación de aparición al hacer scroll (para tarjetas, títulos de sección, etc.)
function setupScrollReveal(selector = ".reveal-up") {
  const items = document.querySelectorAll(`${selector}:not(.is-visible)`);
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

  items.forEach(el => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", async () => {
  // Revela de entrada los elementos estáticos (títulos de sección, filtros, etc.)
  setupScrollReveal();

  let products = await getProducts();
  let brands = await getBrands();
  let categories = await getCategories();
  let cart = loadCart();
  let selectedBrand = "Todos";
  let selectedCategory = "Todas";
  let searchQuery = "";
  
  const getVendorPhone = async () => await getSetting("vendor_phone", "54923200342399");

  const productsGrid = document.getElementById("products-grid");
  const searchInput = document.getElementById("search-input");
  const brandFilters = document.getElementById("brand-filters");
  const categoryFilters = document.getElementById("category-filters");
  const cartIconBtn = document.getElementById("cart-icon-btn");
  const cartBadge = document.getElementById("cart-badge");
  const cartDrawer = document.getElementById("cart-drawer");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const cartItemsList = document.getElementById("cart-items-list");
  const cartTotalVal = document.getElementById("cart-total-val");
  const checkoutBtn = document.getElementById("checkout-btn");
  
  const checkoutModal = document.getElementById("checkout-modal");
  const detailModal = document.getElementById("detail-modal");
  const successModal = document.getElementById("success-modal");
  const paymentPdfModal = document.getElementById("payment-pdf-modal");
  const paymentPdfLinks = [
    document.getElementById("nav-payment-pdf-link"),
    document.getElementById("footer-payment-pdf-link")
  ].filter(Boolean);
  const paymentPdfEmptyState = document.getElementById("payment-pdf-empty-state");
  const paymentPdfDownloadBtn = document.getElementById("payment-pdf-download-btn");

  const contactModal = document.getElementById("contact-modal");
  const contactLink = document.getElementById("nav-contact-link");

  // --- MENÚ: resaltar la opción activa al hacer clic ---
  const headerNavLinks = document.querySelectorAll(".nav-links a");
  headerNavLinks.forEach(link => {
    link.addEventListener("click", () => {
      headerNavLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // --- MENÚ DESPLEGABLE (hamburguesa) ---
  const menuToggleBtn = document.getElementById("menu-toggle-btn");
  const headerNavDropdown = document.getElementById("ml-header-nav");
  if (menuToggleBtn && headerNavDropdown) {
    menuToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = headerNavDropdown.classList.toggle("open");
      menuToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    // Cerrar al elegir una opción del menú
    headerNavLinks.forEach(link => {
      link.addEventListener("click", () => {
        headerNavDropdown.classList.remove("open");
        menuToggleBtn.setAttribute("aria-expanded", "false");
      });
    });
    // Cerrar al hacer clic afuera
    document.addEventListener("click", (e) => {
      if (!headerNavDropdown.contains(e.target) && !menuToggleBtn.contains(e.target)) {
        headerNavDropdown.classList.remove("open");
        menuToggleBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // --- RENDERIZADO DEL CATÁLOGO ---
  let catalogRenderId = 0; // evita que búsquedas/filtros viejos (que tardan más en responder) pisen el resultado más reciente
  async function renderCatalog() {
    const renderId = ++catalogRenderId;
    products = await getProducts();
    brands = await getBrands();
    if (renderId !== catalogRenderId) return; // llegó una búsqueda más nueva mientras esperábamos esta; descartamos el resultado viejo

    productsGrid.innerHTML = "";

    const filtered = products.filter(product => {
      const matchesBrand = selectedBrand === "Todos" || product.brand.toLowerCase() === selectedBrand.toLowerCase();
      const matchesCategory = selectedCategory === "Todas" || (product.category || "").toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBrand && matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 1rem;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No se encontraron calcomanías que coincidan con tu búsqueda.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((product, idx) => {
      const card = document.createElement("div");
      card.className = "product-card reveal-up";
      card.style.setProperty("--reveal-index", idx % 8);
      
      const formattedPrice = new Intl.NumberFormat("es-AR", {
        style: "currency", currency: "ARS", minimumFractionDigits: 0
      }).format(product.price);

      const img1 = product.image1 || "assets/logo.png";
      const img2 = product.image2;
      const hasSecondary = img2 ? "has-secondary" : "";

      let imageHtml = `<img src="${img1}" alt="${product.name}" class="product-image-primary ${hasSecondary}" onerror="this.src='assets/logo.png'; this.style.objectFit='contain';">`;
      if (img2) {
        imageHtml += `<img src="${img2}" alt="${product.name} alternativa" class="product-image-secondary" onerror="this.style.display='none';">`;
      }

      card.innerHTML = `
        <div class="product-image-wrap">
          ${imageHtml}
          <span class="product-brand-tag">${product.brand}</span>
        </div>
        <div class="product-body">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="product-meta">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              Cantidad de calcos: ${product.quantity}
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Material: ${product.material}
            </span>
          </div>
          <div class="product-footer">
            <div>
              <span class="product-price">${formattedPrice}</span>
            </div>
            <button class="add-to-cart-btn" data-id="${product.id}" title="Añadir al carrito">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (!e.target.closest(".add-to-cart-btn")) openDetailModal(product);
      });
      productsGrid.appendChild(card);
    });

    setupScrollReveal();

    document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const product = products.find(p => p.id === btn.getAttribute("data-id"));
        if (product) openDetailModal(product);
      });
    });
  }

  // --- FILTROS DE MARCAS DINÁMICOS ---
  async function renderFilters() {
    brands = await getBrands();
    brandFilters.innerHTML = "";
    ["Todos", ...brands].forEach(brand => {
      const btn = document.createElement("button");
      btn.className = `filter-btn ${brand === selectedBrand ? 'active' : ''}`;
      btn.textContent = brand;
      btn.addEventListener("click", () => {
        brandFilters.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedBrand = brand;
        renderCatalog();
      });
      brandFilters.appendChild(btn);
    });
  }

  // --- FILTROS DE CATEGORÍAS DINÁMICOS ---
  async function renderCategoryFilters() {
    categories = await getCategories();
    categoryFilters.innerHTML = "";
    ["Todas", ...categories].forEach(category => {
      const btn = document.createElement("button");
      btn.className = `filter-btn ${category === selectedCategory ? 'active' : ''}`;
      btn.textContent = category;
      btn.addEventListener("click", () => {
        categoryFilters.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedCategory = category;
        renderCatalog();
      });
      categoryFilters.appendChild(btn);
    });
  }

  let searchDebounceTimer;
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => renderCatalog(), 250);
  });

  // --- DETALLE DE PRODUCTO ---
  function openDetailModal(product) {
    const modalContent = document.getElementById("detail-modal-content");
    const formattedPrice = new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 0
    }).format(product.price);

    const img1 = product.image1 || "assets/logo.png";
    const img2 = product.image2;

    let galleryHtml = `
      <div class="detail-gallery-container">
        <div class="detail-main-img-wrap">
          <img src="${img1}" alt="${product.name}" class="detail-main-img" id="detail-main-img" onerror="this.src='assets/logo.png'; this.style.objectFit='contain';">
        </div>
    `;
    if (img2) {
      galleryHtml += `
        <div class="detail-thumbs-list">
          <img src="${img1}" class="detail-thumb-item active" onclick="changeDetailImage('${img1}', this)" alt="Vista 1">
          <img src="${img2}" class="detail-thumb-item" onclick="changeDetailImage('${img2}', this)" alt="Vista 2" onerror="this.style.display='none';">
        </div>
      `;
    }
    galleryHtml += `</div>`;

    modalContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 2rem; align-items: start;">
        ${galleryHtml}
        <div>
          <span style="background: rgba(84,190,204,0.15); color: var(--primary-cyan); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; display: inline-block; margin-bottom: 1rem;">${product.brand}</span>
          <h2 style="font-size: 1.8rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem;">${product.name}</h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${product.description}</p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 2rem;">
            <p style="font-size: 0.9rem; display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Cantidad de calcos:</span>
              <strong>${product.quantity}</strong>
            </p>
            <p style="font-size: 0.9rem; display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Material:</span>
              <strong>${product.material}</strong>
            </p>
            <p style="font-size: 0.9rem; display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Garantía:</span>
              <strong style="color: var(--primary-green);">Alta resistencia al sol y agua</strong>
            </p>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 2rem; font-weight: 800; color: var(--primary-orange);">${formattedPrice}</span>
            <button class="btn btn-primary" id="modal-add-btn" style="padding: 0.8rem 2.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.5rem;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              Añadir al Carrito
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-add-btn").addEventListener("click", () => {
      addToCart(product.id);
      closeModal(detailModal);
      openCart();
    });
    openModal(detailModal);
  }

  window.changeDetailImage = function(src, thumbElement) {
    const mainImg = document.getElementById("detail-main-img");
    if (mainImg) mainImg.src = src;
    document.querySelectorAll(".detail-thumb-item").forEach(el => el.classList.remove("active"));
    thumbElement.classList.add("active");
  };

  // --- CARRITO DE COMPRAS ---
  function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const existing = cart.find(item => item.product.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ product, quantity: 1 });
    }
    saveCart(cart);
    updateCartUI();
    bumpCartIcon();
  }

  // Pequeño "salto" del ícono del carrito y del badge al agregar un producto.
  function bumpCartIcon() {
    if (!cartIconBtn || !cartBadge) return;
    cartIconBtn.classList.remove("cart-bump");
    cartBadge.classList.remove("cart-bump");
    // Forzamos reflow para poder re-disparar la animación aunque se agregue rápido varias veces.
    void cartIconBtn.offsetWidth;
    cartIconBtn.classList.add("cart-bump");
    cartBadge.classList.add("cart-bump");
  }

  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalCount;
    cartBadge.style.display = totalCount > 0 ? "flex" : "none";
    cartItemsList.innerHTML = "";

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="cart-empty-msg">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <p>Tu carrito está vacío</p>
          <button class="btn btn-secondary" id="cart-start-shopping" style="font-size:0.9rem;padding:0.5rem 1rem;margin-top:1rem;">Ver catálogo</button>
        </div>
      `;
      const startBtn = document.getElementById("cart-start-shopping");
      if (startBtn) startBtn.addEventListener("click", closeCart);
      cartTotalVal.textContent = "$0";
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = "0.5";
      checkoutBtn.style.cursor = "not-allowed";
      return;
    }

    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = "1";
    checkoutBtn.style.cursor = "pointer";

    let total = 0;
    cart.forEach(item => {
      const itemSubtotal = item.product.price * item.quantity;
      total += itemSubtotal;
      const formattedSubtotal = new Intl.NumberFormat("es-AR", {
        style: "currency", currency: "ARS", minimumFractionDigits: 0
      }).format(itemSubtotal);

      const cartItem = document.createElement("div");
      cartItem.className = "cart-item";
      cartItem.innerHTML = `
        <img src="${item.product.image1 || 'assets/logo.png'}" alt="${item.product.name}" class="cart-item-img" onerror="this.src='assets/logo.png';this.style.objectFit='contain';">
        <div class="cart-item-details">
          <h4 class="cart-item-name">${item.product.name}</h4>
          <span class="cart-item-price">${formattedSubtotal}</span>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn minus-qty" data-id="${item.product.id}">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn plus-qty" data-id="${item.product.id}">+</button>
          <button class="remove-item-btn" data-id="${item.product.id}" title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      cartItemsList.appendChild(cartItem);
    });

    cartTotalVal.textContent = new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 0
    }).format(total);

    document.querySelectorAll(".minus-qty").forEach(btn => {
      btn.addEventListener("click", () => changeQuantity(btn.getAttribute("data-id"), -1));
    });
    document.querySelectorAll(".plus-qty").forEach(btn => {
      btn.addEventListener("click", () => changeQuantity(btn.getAttribute("data-id"), 1));
    });
    document.querySelectorAll(".remove-item-btn").forEach(btn => {
      btn.addEventListener("click", () => removeFromCart(btn.getAttribute("data-id")));
    });
  }

  function changeQuantity(id, amount) {
    const item = cart.find(item => item.product.id === id);
    if (!item) return;
    item.quantity += amount;
    if (item.quantity <= 0) {
      removeFromCart(id);
    } else {
      saveCart(cart);
      updateCartUI();
    }
  }

  function removeFromCart(id) {
    cart = cart.filter(item => item.product.id !== id);
    saveCart(cart);
    updateCartUI();
  }

  function openCart() {
    cartDrawer.classList.add("open");
    drawerBackdrop.classList.add("open");
  }

  function closeCart() {
    cartDrawer.classList.remove("open");
    drawerBackdrop.classList.remove("open");
  }

  cartIconBtn.addEventListener("click", openCart);
  closeDrawerBtn.addEventListener("click", closeCart);
  drawerBackdrop.addEventListener("click", closeCart);

  // --- COPIAR AL PORTAPAPELES ---
  window.copyToClipboard = function(text, btnId) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById(btnId);
      const originalText = btn.textContent;
      btn.textContent = "¡Copiado!";
      btn.style.background = "var(--primary-green)";
      btn.style.color = "var(--bg-dark)";
      btn.style.borderColor = "var(--primary-green)";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = "";
        btn.style.color = "";
        btn.style.borderColor = "";
      }, 1500);
    });
  };

  // --- CHECKOUT Y GUARDADO DE PEDIDO ---
  const checkoutForm = document.getElementById("checkout-form");
  const shippingHomeOption = document.getElementById("shipping-home");
  const shippingStoreOption = document.getElementById("shipping-store");
  const addressGroup = document.getElementById("address-group");
  const shippingStreet = document.getElementById("shipping-street");
  const shippingNumber = document.getElementById("shipping-number");
  const shippingCity = document.getElementById("shipping-city");
  const shippingZip = document.getElementById("shipping-zip");
  const shippingProvince = document.getElementById("shipping-province");
  const addressFields = [shippingStreet, shippingNumber, shippingCity, shippingZip, shippingProvince];

  shippingHomeOption.addEventListener("change", () => {
    addressGroup.style.display = "block";
    addressFields.forEach(field => field.required = true);
  });
  shippingStoreOption.addEventListener("change", () => {
    addressGroup.style.display = "none";
    addressFields.forEach(field => field.required = false);
  });

  checkoutBtn.addEventListener("click", () => {
    closeCart();
    const checkoutTotalVal = document.getElementById("checkout-total-val");
    if (checkoutTotalVal) checkoutTotalVal.textContent = cartTotalVal.textContent;
    openModal(checkoutModal);
  });

  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("customer-name").value;
    const phone = document.getElementById("customer-phone").value;
    const notes = document.getElementById("order-notes").value;
    const shippingMethod = shippingHomeOption.checked ? "Envío a domicilio" : "Retiro por local (Ingenio cv)";
    const address = shippingHomeOption.checked
      ? `${shippingStreet.value} ${shippingNumber.value}, ${shippingCity.value}, CP ${shippingZip.value}, ${shippingProvince.value}`
      : "";

    let total = 0;
    let orderDetailsText = "";
    const orderItems = [];

    cart.forEach(item => {
      const subtotal = item.product.price * item.quantity;
      total += subtotal;
      const formattedSubtotal = new Intl.NumberFormat("es-AR").format(subtotal);
      orderDetailsText += `- *${item.quantity}x* ${item.product.name} ($${formattedSubtotal})\n`;
      orderItems.push({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: subtotal
      });
    });

    const formattedTotal = new Intl.NumberFormat("es-AR").format(total);

    // --- GUARDAR PEDIDO EN LOCALSTORAGE ---
    const now = new Date();
    const deliveryDate = addBusinessDays(now, 5);
    const newOrder = {
      id: "PED-" + now.getTime(),
      date: now.toLocaleString("es-AR"),
      deliveryDate: formatDeliveryDate(deliveryDate),
      customer: { name, phone, shippingMethod, address, notes },
      items: orderItems,
      total: total,
      status: "Pendiente"
    };

    try {
      await createOrder(newOrder);
    } catch (err) {
      console.error("Error guardando el pedido:", err);
      alert("Hubo un problema guardando tu pedido. Por favor, intentá de nuevo.");
      return;
    }

    // --- ARMAR MENSAJE WHATSAPP ---
    let whatsappText = `*PEDIDO NUEVO - INGENIO CV*\n`;
    whatsappText += `--------------------------------------\n`;
    whatsappText += `*Cliente:* ${name}\n`;
    whatsappText += `*Teléfono:* ${phone}\n`;
    whatsappText += `*Método de Entrega:* ${shippingMethod}\n`;
    whatsappText += `*Fecha Estimada de Entrega:* ${newOrder.deliveryDate}\n`;
    if (address) whatsappText += `*Dirección de Envío:* ${address}\n`;
    if (notes) whatsappText += `*Notas:* ${notes}\n`;
    whatsappText += `--------------------------------------\n`;
    whatsappText += `*Detalle del Pedido:*\n${orderDetailsText}`;
    whatsappText += `--------------------------------------\n`;
    whatsappText += `*TOTAL DEL PEDIDO: $${formattedTotal}*\n\n`;
    whatsappText += `*Método de Pago:* Transferencia Bancaria\n`;
    whatsappText += `_Por favor, confirmá la recepción para pasarte los datos de la cuenta y coordinar el envío del comprobante._`;

    const encodedText = encodeURIComponent(whatsappText);
    const vendorPhone = await getVendorPhone();
    const whatsappUrl = `https://wa.me/${vendorPhone}?text=${encodedText}`;

    closeModal(checkoutModal);
    document.getElementById("success-total-val").textContent = `$${formattedTotal}`;
    openModal(successModal);

    document.getElementById("success-whatsapp-btn").onclick = () => {
      window.open(whatsappUrl, "_blank");
      cart = [];
      saveCart(cart);
      updateCartUI();
      closeModal(successModal);
    };
  });

  // --- MODAL FORMA DE PEGAR (HTML + PDF) ---
  const paymentPdfContent = document.getElementById("payment-pdf-content");
  const paymentPdfCloseBtn = document.getElementById("payment-pdf-close-btn");
  let currentPaymentPdfData = null;

  // Contenido HTML de la guía de pegado
  const pegarGuideHTML = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #3483fa;">
        <h1 style="color: #3483fa; margin: 0 0 0.5rem 0; font-size: 2rem;">Guía rápida de ¿Cómo pegar las calcas vinilo</h1>
        <p style="color: #666; margin: 0; font-size: 0.95rem;">Ingenio - Comunicación Visual</p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h2 style="color: #e8792a; font-size: 1.3rem; margin: 1.5rem 0 1rem 0;">Materiales utilizados:</h2>
        <p>Además del ploteo en vinilo se necesitara: <strong>cinta de papel, rociador con agua, alcohol, papel de cocina, espátula (Tarjeta de Credito).</strong></p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h2 style="color: #e8792a; font-size: 1.3rem; margin: 1.5rem 0 1rem 0;">1. Limpieza:</h2>
        <p>Es fundamental que la superficie esté completamente limpia. Sin restos de polvo, grasa o algún otro producto que impida la correcta instalación de la gráfica. Para esto se aconseja usar papel con alcohol isopropilico para eliminar cualquier impureza o restos de limpiadores abrasivos que puedan existir sobre la superficie a instalar.</p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h2 style="color: #e8792a; font-size: 1.3rem; margin: 1.5rem 0 1rem 0;">2. Presentar la gráfica:</h2>
        <p>Presentar la gráfica en el lugar deseado, tomando medidas. Pegar tiritas con cinta de pintor en la parte superior para sujetar la gráfica. Volver a tomar medidas y si es necesario corregir.</p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h2 style="color: #e8792a; font-size: 1.3rem; margin: 1.5rem 0 1rem 0;">3. Retirar la Calco del papel:</h2>
      </div>

      <div style="margin-bottom: 2rem;">
        <h2 style="color: #e8792a; font-size: 1.3rem; margin: 1.5rem 0 1rem 0;">4. Pegado en Húmedo:</h2>
        <p>Es necesario contar con un rociador el cual se deberá llenar con agua. Humedecer la superficie incluso puede humedeserce la gráfica del lado del pegamento. Con este método es mucho menos probable que queden globos de aire incluso permite corregir si algo quedó torcido.</p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h2 style="color: #e8792a; font-size: 1.3rem; margin: 1.5rem 0 1rem 0;">5. Espatulado:</h2>
        <p>Espatular siempre de arriba hacia abajo y del centro hacia los costados. Hacerlo firmemente haciendo presión de forma pareja y uniforme. Si no posee una espátula se puede utilizar una tarjeta de crédito o cualquier otro elemento que sirva para tal fin para sacar cualquier resto de agua.</p>
      </div>

      <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0; color: #555;"><strong>Finalmente</strong> para terminar el proceso de pegado dejar secar la calco al sol hasta que termine de evaporar el agua o bien ayudarlo con una pistola de calor para acelerar el proceso.</p>
      </div>

      <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd;">
        <p style="font-size: 0.85rem; color: #666; margin: 0;">
          <strong>Ingenio</strong> - Comunicación Visual<br>
          Av. Mitre 2317 - Tel: 02317-522217 | Cel: 2317-486251<br>
          9 de Julio - Buenos Aires<br>
          Email: ingeniocv@ceystel.com.ar
        </p>
      </div>
    </div>
  `;

  // Función para abrir el modal de forma de pegar
  async function openPaymentPdfModal() {
    const pdf = await getPaymentPdf();
    if (pdf && pdf.data) {
      // Mostrar el contenido HTML de la guía
      paymentPdfContent.innerHTML = pegarGuideHTML;
      paymentPdfContent.style.display = "block";
      paymentPdfEmptyState.style.display = "none";
      paymentPdfDownloadBtn.style.display = "inline-flex";
      if (paymentPdfCloseBtn) paymentPdfCloseBtn.style.display = "inline-block";
      currentPaymentPdfData = pdf;
    } else {
      paymentPdfContent.style.display = "none";
      paymentPdfEmptyState.style.display = "block";
      paymentPdfDownloadBtn.style.display = "none";
      if (paymentPdfCloseBtn) paymentPdfCloseBtn.style.display = "none";
      currentPaymentPdfData = null;
    }
    openModal(paymentPdfModal);
  }

  // Agregar event listeners a todos los links de "Forma de Pegar"
  paymentPdfLinks.forEach(link => {
    if (link) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        openPaymentPdfModal();
      });
    }
  });

  // Botón para descargar como PDF
  if (paymentPdfDownloadBtn) {
    paymentPdfDownloadBtn.addEventListener("click", async () => {
      if (!currentPaymentPdfData || !currentPaymentPdfData.data) return;
      
      // Descargar el PDF original desde Supabase
      const link = document.createElement("a");
      link.href = currentPaymentPdfData.data;
      link.download = currentPaymentPdfData.name || "forma-de-pegar.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  if (paymentPdfCloseBtn) {
    paymentPdfCloseBtn.addEventListener("click", () => {
      closeModal(paymentPdfModal);
    });
  }

  // Hacer openPaymentPdfModal disponible globalmente para debugging
  window.openPaymentPdfModal = openPaymentPdfModal;

  // --- HELPERS MODALES ---
  function openModal(modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal(modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (contactLink && contactModal) {
    contactLink.addEventListener("click", async (e) => {
      e.preventDefault();
      openModal(contactModal);
      const phoneTextEl = document.getElementById("contact-phone-text");
      const whatsappLinkEl = document.getElementById("contact-whatsapp-link");
      if (phoneTextEl && whatsappLinkEl) {
        const rawPhone = await getVendorPhone();
        // Formateamos un poco el número para que se lea mejor (ej. +54 9 2320 034239 9)
        const displayPhone = rawPhone.startsWith("54") ? `+${rawPhone}` : rawPhone;
        phoneTextEl.textContent = displayPhone;
        whatsappLinkEl.href = `https://wa.me/${rawPhone}`;
      }
    });
  }

  document.querySelectorAll(".close-modal-btn").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.closest(".modal-overlay")));
  });
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // --- LOCAL STORAGE HELPERS ---
  function loadCart() {
    const stored = localStorage.getItem("ingenio_cv_cart");
    try { return stored ? JSON.parse(stored) : []; } catch (e) { return []; }
  }
  function saveCart(cartData) {
    localStorage.setItem("ingenio_cv_cart", JSON.stringify(cartData));
  }

  // Inicialización
  await renderFilters();
  await renderCategoryFilters();
  await renderCatalog();
  updateCartUI();
});

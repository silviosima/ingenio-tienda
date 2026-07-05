// Lógica de Administración para Ingenio cv

document.addEventListener("DOMContentLoaded", async () => {
  let products = await getProducts();
  let brands = await getBrands();
  let categories = await getCategories();

  // DOM
  const tableBody = document.getElementById("admin-table-body");
  const productForm = document.getElementById("product-form");
  const settingsForm = document.getElementById("settings-form");
  const vendorPhoneInput = document.getElementById("vendor-phone");
  const productIdField = document.getElementById("product-id-field");
  const nameInput = document.getElementById("p-name");
  const brandSelect = document.getElementById("p-brand");
  const categorySelect = document.getElementById("p-category");
  const priceInput = document.getElementById("p-price");
  const quantityInput = document.getElementById("p-quantity");
  const materialInput = document.getElementById("p-material");
  const descInput = document.getElementById("p-desc");
  const image1Input = document.getElementById("p-image1");
  const image1CustomInput = document.getElementById("p-image1-custom");
  const image2Input = document.getElementById("p-image2");
  const image2CustomInput = document.getElementById("p-image2-custom");
  const submitBtn = document.getElementById("submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const formTitle = document.getElementById("form-title");
  const resetCatalogBtn = document.getElementById("reset-catalog-btn");
  const addBrandForm = document.getElementById("add-brand-form");
  const newBrandInput = document.getElementById("new-brand-input");
  const brandsListContainer = document.getElementById("brands-list-container");
  const addCategoryForm = document.getElementById("add-category-form");
  const newCategoryInput = document.getElementById("new-category-input");
  const categoriesListContainer = document.getElementById("categories-list-container");
  const ordersListContainer = document.getElementById("orders-list-container");
  const clearOrdersBtn = document.getElementById("clear-orders-btn");
  const compressCanvas = document.getElementById("compress-canvas");
  const decalsSearchInput = document.getElementById("decals-search-input");
  const ordersSearchInput = document.getElementById("orders-search-input");
  const filePaymentPdfInput = document.getElementById("file-payment-pdf");
  const paymentPdfStatusText = document.getElementById("payment-pdf-status-text");
  const paymentPdfViewBtn = document.getElementById("payment-pdf-view-btn");
  const paymentPdfDownloadAdminBtn = document.getElementById("payment-pdf-download-admin-btn");
  const paymentPdfDeleteBtn = document.getElementById("payment-pdf-delete-btn");

  // Vista previa de imágenes locales
  const img1Preview = document.getElementById("img1-preview");
  const img1PreviewBox = document.getElementById("img1-preview-box");
  const img2Preview = document.getElementById("img2-preview");
  const img2PreviewBox = document.getElementById("img2-preview-box");

  // --- TABS ---
  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  const tabContents = document.querySelectorAll(".admin-tab-content");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const targetTab = btn.getAttribute("data-tab");
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
      // Refrescar pedidos cuando se abre esa pestaña
      if (targetTab === "tab-orders") await renderOrders("Todos");
    });
  });

  // --- CONFIGURACIÓN GENERAL ---
  async function loadSettings() {
    vendorPhoneInput.value = await getSetting("vendor_phone", "54923200342399");
  }

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveSetting("vendor_phone", vendorPhoneInput.value.replace(/[^0-9]/g, ""));
    alert("¡Configuración guardada con éxito!");
  });

  // --- DOCUMENTO DE FORMA DE PAGO (PDF) ---
  const PAYMENT_PDF_MAX_MB = 8;

  async function refreshPaymentPdfStatus() {
    const pdf = await getPaymentPdf();
    if (pdf && pdf.data) {
      paymentPdfStatusText.textContent = `Documento cargado: ${pdf.name || "forma-de-pago.pdf"}`;
      paymentPdfViewBtn.href = pdf.data;
      paymentPdfViewBtn.style.display = "inline-block";
      paymentPdfDownloadAdminBtn.href = pdf.data;
      paymentPdfDownloadAdminBtn.download = pdf.name || "forma-de-pago.pdf";
      paymentPdfDownloadAdminBtn.style.display = "inline-block";
      paymentPdfDeleteBtn.style.display = "inline-block";
    } else {
      paymentPdfStatusText.textContent = "No hay ningún PDF cargado todavía.";
      paymentPdfViewBtn.style.display = "none";
      paymentPdfDownloadAdminBtn.style.display = "none";
      paymentPdfDeleteBtn.style.display = "none";
    }
  }

  if (filePaymentPdfInput) {
    filePaymentPdfInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.type !== "application/pdf") {
        alert("Por favor, seleccioná un archivo PDF válido.");
        filePaymentPdfInput.value = "";
        return;
      }
      if (file.size > PAYMENT_PDF_MAX_MB * 1024 * 1024) {
        alert(`El archivo es demasiado grande. El tamaño máximo permitido es ${PAYMENT_PDF_MAX_MB}MB.`);
        filePaymentPdfInput.value = "";
        return;
      }
      try {
        await savePaymentPdf(file);
        await refreshPaymentPdfStatus();
        filePaymentPdfInput.value = "";
        alert("¡PDF de forma de pago cargado con éxito!");
      } catch (err) {
        console.error("Error subiendo el PDF:", err);
        alert("Hubo un problema subiendo el PDF. Intentá de nuevo.");
      }
    });
  }

  if (paymentPdfDeleteBtn) {
    paymentPdfDeleteBtn.addEventListener("click", async () => {
      if (confirm("¿Eliminar el PDF de forma de pago actual?")) {
        await deletePaymentPdf();
        await refreshPaymentPdfStatus();
      }
    });
  }

  // --- COMPRESIÓN DE IMAGEN LOCAL A BASE64 ---
  function compressImageFile(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        if (h > maxHeight) { w = Math.round(w * maxHeight / h); h = maxHeight; }
        compressCanvas.width = w;
        compressCanvas.height = h;
        const ctx = compressCanvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = compressCanvas.toDataURL("image/jpeg", quality);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function setImagePreview(previewImgEl, previewBoxEl, placeholderText, src) {
    if (src) {
      previewImgEl.src = src;
      previewImgEl.style.display = "block";
      const placeholder = previewBoxEl.querySelector(".preview-placeholder");
      if (placeholder) placeholder.style.display = "none";
    } else {
      previewImgEl.style.display = "none";
      const placeholder = previewBoxEl.querySelector(".preview-placeholder");
      if (placeholder) placeholder.style.display = "block";
    }
  }

  // Convierte un dataURL (resultado de la compresión) en un File para poder subirlo a Supabase Storage
  function dataURLtoFile(dataUrl, filename) {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  // File input Imagen 1
  document.getElementById("file-img1").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    compressImageFile(file, 800, 800, 0.82, async function(dataUrl) {
      setImagePreview(img1Preview, img1PreviewBox, "", dataUrl);
      try {
        const compressed = dataURLtoFile(dataUrl, "img1.jpg");
        const url = await uploadProductImage(compressed);
        image1Input.value = url;
        image1CustomInput.value = "";
        document.querySelectorAll("#image1-select-grid .image-option").forEach(o => o.classList.remove("selected"));
      } catch (err) {
        console.error("Error subiendo imagen:", err);
        alert("Hubo un problema subiendo la imagen. Intentá de nuevo.");
      }
    });
  });

  // File input Imagen 2
  document.getElementById("file-img2").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    compressImageFile(file, 800, 800, 0.82, async function(dataUrl) {
      setImagePreview(img2Preview, img2PreviewBox, "", dataUrl);
      try {
        const compressed = dataURLtoFile(dataUrl, "img2.jpg");
        const url = await uploadProductImage(compressed);
        image2Input.value = url;
        image2CustomInput.value = "";
        document.querySelectorAll("#image2-select-grid .image-option").forEach(o => o.classList.remove("selected"));
      } catch (err) {
        console.error("Error subiendo imagen:", err);
        alert("Hubo un problema subiendo la imagen. Intentá de nuevo.");
      }
    });
  });

  // --- SELECTORES DE PLANTILLAS ---
  const image1Options = document.querySelectorAll("#image1-select-grid .image-option");
  image1Options.forEach(opt => {
    opt.addEventListener("click", () => {
      image1Options.forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      const val = opt.getAttribute("data-val");
      image1Input.value = val;
      image1CustomInput.value = "";
      document.getElementById("file-img1").value = "";
      setImagePreview(img1Preview, img1PreviewBox, "", val || "");
    });
  });

  const image2Options = document.querySelectorAll("#image2-select-grid .image-option");
  image2Options.forEach(opt => {
    opt.addEventListener("click", () => {
      image2Options.forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      const val = opt.getAttribute("data-val");
      image2Input.value = val;
      image2CustomInput.value = "";
      document.getElementById("file-img2").value = "";
      setImagePreview(img2Preview, img2PreviewBox, "", val || "");
    });
  });

  // --- POBLAR SELECTORES DEL FORMULARIO ---
  async function populateFormSelectors() {
    brands = await getBrands();
    categories = await getCategories();
    const currentBrand = brandSelect.value;
    const currentCat = categorySelect.value;
    brandSelect.innerHTML = brands.map(b => `<option value="${b}">${b}</option>`).join("");
    categorySelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");
    if (brands.includes(currentBrand)) brandSelect.value = currentBrand;
    if (categories.includes(currentCat)) categorySelect.value = currentCat;
  }

  // --- TABLA DE PRODUCTOS ---
  let decalsSearchQuery = "";

  if (decalsSearchInput) {
    decalsSearchInput.addEventListener("input", async (e) => {
      decalsSearchQuery = e.target.value;
      await renderAdminTable();
    });
  }

  async function renderAdminTable() {
    tableBody.innerHTML = "";
    products = await getProducts();

    const query = decalsSearchQuery.trim().toLowerCase();
    const filteredProducts = query
      ? products.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        )
      : products;

    if (filteredProducts.length === 0) {
      const emptyMsg = query ? "No se encontraron calcomanías que coincidan con la búsqueda." : "No hay productos cargados.";
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">${emptyMsg}</td></tr>`;
      return;
    }
    filteredProducts.forEach(product => {
      const formattedPrice = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(product.price);
      let imagesHtml = `<img src="${product.image1 || 'assets/logo.png'}" class="td-img" onerror="this.src='assets/logo.png';this.style.objectFit='contain';">`;
      if (product.image2) {
        imagesHtml += `<img src="${product.image2}" class="td-img" style="margin-left:0.25rem;" onerror="this.style.display='none';">`;
      }
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><div style="display:flex;align-items:center;">${imagesHtml}</div></td>
        <td>
          <strong style="color:var(--text-main);">${product.name}</strong><br>
          <span style="font-size:0.8rem;color:var(--primary-cyan);font-weight:600;">${product.brand}</span>
        </td>
        <td><span style="font-weight:700;color:var(--primary-green);">${formattedPrice}</span></td>
        <td><span style="font-size:0.85rem;color:var(--text-muted);">${product.category}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm btn-warning edit-btn" data-id="${product.id}">Editar</button>
            <button class="btn btn-secondary btn-sm btn-danger delete-btn" data-id="${product.id}">Eliminar</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => await deleteProduct(btn.getAttribute("data-id")));
    });
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => startEditProduct(btn.getAttribute("data-id")));
    });
  }

  // --- CRM DE PEDIDOS ---
  // getOrders() ahora viene de products.js y consulta la tabla "orders" de Supabase.

  let ordersFilterStatus = "Todos";
  let ordersSearchQuery = "";

  // Filtros de pedido
  document.querySelectorAll("#orders-filters .filter-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("#orders-filters .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      ordersFilterStatus = btn.getAttribute("data-status");
      await renderOrders(ordersFilterStatus);
    });
  });

  // Búsqueda de pedidos por cliente, teléfono o N° de pedido
  if (ordersSearchInput) {
    ordersSearchInput.addEventListener("input", async (e) => {
      ordersSearchQuery = e.target.value;
      await renderOrders(ordersFilterStatus);
    });
  }

  clearOrdersBtn.addEventListener("click", async () => {
    if (confirm("¿Estás seguro de que querés borrar TODOS los pedidos? Esta acción no se puede deshacer.")) {
      await clearAllOrders();
      await renderOrders("Todos");
    }
  });

  function getStatusBadgeClass(status) {
    if (status === "Pendiente") return "status-pendiente";
    if (status === "Pagado") return "status-pagado";
    if (status === "En proceso") return "status-proceso";
    if (status === "Enviado") return "status-enviado";
    if (status === "Entregado") return "status-entregado";
    return "";
  }

  async function renderOrders(filterStatus) {
    const orders = await getOrders();
    ordersListContainer.innerHTML = "";

    let filtered = filterStatus === "Todos" ? orders : orders.filter(o => o.status === filterStatus);

    const query = ordersSearchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(o =>
        (o.customer?.name || "").toLowerCase().includes(query) ||
        (o.customer?.phone || "").toLowerCase().includes(query) ||
        o.id.toLowerCase().includes(query)
      );
    }

    if (filtered.length === 0) {
      ordersListContainer.innerHTML = `<div class="orders-empty"><p>No hay pedidos que coincidan con el filtro y/o la búsqueda seleccionados.</p></div>`;
      return;
    }

    filtered.forEach(order => {
      const formattedTotal = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(order.total);
      const badgeClass = getStatusBadgeClass(order.status);
      const detailId = `detail-${order.id}`;

      // Fecha de entrega estimada (compra + 5 días hábiles). Si el pedido es antiguo
      // y no la tiene guardada, se calcula al vuelo a partir del ID (timestamp).
      let deliveryDateText = order.deliveryDate;
      if (!deliveryDateText) {
        const purchaseTimestamp = parseInt(order.id.replace("PED-", ""), 10);
        if (!isNaN(purchaseTimestamp)) {
          deliveryDateText = formatDeliveryDate(addBusinessDays(new Date(purchaseTimestamp), 5));
        }
      }

      // Armar tabla de ítems
      let itemsRows = (order.items || []).map(item => {
        const fmtSubtotal = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(item.subtotal);
        return `<tr><td>${item.name}</td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right;">${fmtSubtotal}</td></tr>`;
      }).join("");

      const isPaidOrBeyond = order.status !== "Pendiente";

      // Acciones de estado: mientras está "Pendiente" solo se puede marcar como Pagado.
      // Una vez pagado, aparecen los botones para avanzar el pedido (En proceso / Enviado / Entregado).
      const statusActionsHtml = !isPaidOrBeyond
        ? `<button class="btn btn-success btn-sm mark-paid-btn" data-order-id="${order.id}">💰 Marcar Pagado</button>`
        : `
          <div class="order-status-buttons" data-order-id="${order.id}">
            <button class="status-action-btn ${order.status === "En proceso" ? "active" : ""}" data-status="En proceso">⚙️ En proceso</button>
            <button class="status-action-btn ${order.status === "Enviado" ? "active" : ""}" data-status="Enviado">🚚 Enviado</button>
            <button class="status-action-btn ${order.status === "Entregado" ? "active" : ""}" data-status="Entregado">✅ Entregado</button>
          </div>
          <button type="button" class="revert-paid-link revert-to-pending-btn" data-order-id="${order.id}">¿Fue un error? Revertir a pendiente</button>
        `;

      const card = document.createElement("div");
      card.className = "order-card";
      card.innerHTML = `
        <div class="order-card-header">
          <div style="flex:1;">
            <div class="order-id">${order.id} · ${order.date}</div>
            <div class="order-customer">${order.customer?.name || "Sin nombre"}</div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.2rem;">${order.customer?.phone || ""} — ${order.customer?.shippingMethod || ""}</div>
            ${deliveryDateText ? `<div style="font-size:0.85rem;color:var(--primary-cyan);font-weight:600;margin-top:0.3rem;">📅 Entrega estimada: ${deliveryDateText}</div>` : ""}
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;">
              <button class="toggle-details-btn" onclick="toggleOrderDetail('${detailId}')">Ver detalle de productos</button>
              <button type="button" class="btn btn-pdf btn-sm generate-pdf-btn" data-order-id="${order.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Generar PDF
              </button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">
            <span class="order-total">${formattedTotal}</span>
            <span class="status-badge ${badgeClass}">${order.status}</span>
            ${statusActionsHtml}
            <button class="btn btn-danger btn-sm delete-order-btn" data-order-id="${order.id}">Eliminar</button>
          </div>
        </div>
        <div class="order-items-detail" id="${detailId}">
          <table>
            <thead><tr><th>Producto</th><th style="text-align:center;">Cant.</th><th style="text-align:right;">Subtotal</th></tr></thead>
            <tbody>${itemsRows}</tbody>
            <tfoot><tr><td colspan="2" style="text-align:right;color:var(--text-muted);padding-top:0.5rem;">TOTAL:</td><td style="text-align:right;font-weight:800;color:var(--primary-cyan);padding-top:0.5rem;">${formattedTotal}</td></tr></tfoot>
          </table>
          ${order.customer?.notes ? `<p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-muted);">📝 Notas: ${order.customer.notes}</p>` : ""}
          ${order.customer?.address ? `<p style="font-size:0.85rem;color:var(--text-muted);">📍 Dirección: ${order.customer.address}</p>` : ""}
        </div>
      `;
      ordersListContainer.appendChild(card);

      // Marcar como Pagado
      const markPaidBtn = card.querySelector(".mark-paid-btn");
      if (markPaidBtn) {
        markPaidBtn.addEventListener("click", async () => {
          try {
            await updateOrderStatus(order.id, "Pagado");
            await renderOrders(ordersFilterStatus);
          } catch (err) {
            console.error("Error marcando el pedido como pagado:", err);
            alert("No se pudo marcar el pedido como pagado.");
          }
        });
      }

      // Avanzar el pedido a En proceso / Enviado / Entregado
      card.querySelectorAll(".status-action-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          try {
            await updateOrderStatus(order.id, btn.getAttribute("data-status"));
            await renderOrders(ordersFilterStatus);
          } catch (err) {
            console.error("Error actualizando el estado del pedido:", err);
            alert("No se pudo actualizar el estado del pedido.");
          }
        });
      });

      // Revertir un pedido pagado por error, de vuelta a Pendiente
      const revertBtn = card.querySelector(".revert-to-pending-btn");
      if (revertBtn) {
        revertBtn.addEventListener("click", async () => {
          if (confirm("¿Revertir este pedido a Pendiente? Se ocultarán los botones de avance de estado.")) {
            try {
              await updateOrderStatus(order.id, "Pendiente");
              await renderOrders(ordersFilterStatus);
            } catch (err) {
              console.error("Error revirtiendo el pedido a pendiente:", err);
              alert("No se pudo revertir el pedido.");
            }
          }
        });
      }

      // Generar y descargar el PDF del pedido
      const pdfBtn = card.querySelector(".generate-pdf-btn");
      if (pdfBtn) {
        pdfBtn.addEventListener("click", () => generateOrderPdf(order));
      }
    });

    // Eliminar pedido individual
    document.querySelectorAll(".delete-order-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const orderId = btn.getAttribute("data-order-id");
        if (confirm("¿Eliminar este pedido del historial?")) {
          await deleteOrder(orderId);
          await renderOrders(ordersFilterStatus);
        }
      });
    });
  }

  // --- GENERAR PDF DE PEDIDO ---
  function generateOrderPdf(order) {
    if (!window.jspdf) {
      alert("No se pudo cargar el generador de PDF. Verificá tu conexión a internet e intentá de nuevo.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const currencyFmt = (val) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(val || 0);

    let deliveryDateText = order.deliveryDate;
    if (!deliveryDateText) {
      const purchaseTimestamp = parseInt(String(order.id).replace("PED-", ""), 10);
      if (!isNaN(purchaseTimestamp)) {
        deliveryDateText = formatDeliveryDate(addBusinessDays(new Date(purchaseTimestamp), 5));
      }
    }

    // Encabezado
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Ingenio cv - Comunicación Visual", 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(90, 90, 90);
    doc.text("Comprobante de Pedido", 14, 25);

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 29, 196, 29);

    // Datos del pedido
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    let y = 38;
    doc.setFont(undefined, "bold");
    doc.text(`Pedido: ${order.id}`, 14, y);
    doc.setFont(undefined, "normal");
    doc.text(`Fecha de compra: ${order.date || "-"}`, 110, y);

    y += 7;
    doc.setFont(undefined, "bold");
    doc.text(`Estado: ${order.status || "-"}`, 14, y);
    doc.setFont(undefined, "normal");
    if (deliveryDateText) doc.text(`Entrega estimada: ${deliveryDateText}`, 110, y);

    // Datos del cliente
    y += 12;
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, "bold");
    doc.text("Datos del Cliente", 14, y);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);

    y += 7;
    doc.text(`Nombre: ${order.customer?.name || "-"}`, 14, y);
    y += 6;
    doc.text(`Teléfono: ${order.customer?.phone || "-"}`, 14, y);
    y += 6;
    doc.text(`Método de entrega: ${order.customer?.shippingMethod || "-"}`, 14, y);

    if (order.customer?.address) {
      y += 6;
      const addressLines = doc.splitTextToSize(`Dirección: ${order.customer.address}`, 180);
      doc.text(addressLines, 14, y);
      y += (addressLines.length - 1) * 5;
    }
    if (order.customer?.notes) {
      y += 6;
      const noteLines = doc.splitTextToSize(`Notas: ${order.customer.notes}`, 180);
      doc.text(noteLines, 14, y);
      y += (noteLines.length - 1) * 5;
    }

    // Detalle de productos
    y += 10;
    const rows = (order.items || []).map(item => [
      item.name || "-",
      String(item.quantity ?? "-"),
      currencyFmt(item.subtotal)
    ]);

    doc.autoTable({
      startY: y,
      head: [["Producto", "Cantidad", "Subtotal"]],
      body: rows,
      foot: [["", "TOTAL", currencyFmt(order.total)]],
      theme: "grid",
      headStyles: { fillColor: [52, 131, 250], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } }
    });

    doc.save(`Pedido-${order.id}.pdf`);
  }

  window.toggleOrderDetail = function(detailId) {
    const box = document.getElementById(detailId);
    if (box) box.classList.toggle("open");
  };

  // --- MARCAS ---
  async function renderBrandsList() {
    brandsListContainer.innerHTML = "";
    brands = await getBrands();
    brands.forEach(brand => {
      const div = document.createElement("div");
      div.className = "tax-item";
      div.innerHTML = `<span class="tax-name">${brand}</span>
        <div class="actions-cell" style="gap:0.4rem;">
          <button class="btn btn-warning btn-sm edit-brand-btn" data-val="${brand}">Editar</button>
          <button class="btn btn-danger btn-sm delete-brand-btn" data-val="${brand}">Eliminar</button>
        </div>`;
      brandsListContainer.appendChild(div);
    });
    document.querySelectorAll(".delete-brand-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm(`¿Eliminar la marca "${btn.getAttribute("data-val")}"?`)) {
          await deleteBrand(btn.getAttribute("data-val"));
          await renderBrandsList();
          await populateFormSelectors();
        }
      });
    });
    document.querySelectorAll(".edit-brand-btn").forEach(btn => {
      btn.addEventListener("click", () => startEditBrand(btn.getAttribute("data-val"), btn.closest(".tax-item")));
    });
  }

  // Cambia una fila de marca a modo edición inline (input + Guardar/Cancelar)
  function startEditBrand(oldName, itemEl) {
    itemEl.innerHTML = `
      <input type="text" class="form-control tax-edit-input" value="${oldName}" style="flex:1;margin-right:0.5rem;padding:0.4rem 0.7rem;">
      <div class="actions-cell" style="gap:0.4rem;">
        <button class="btn btn-success btn-sm save-brand-btn">Guardar</button>
        <button class="btn btn-secondary btn-sm cancel-brand-edit-btn">Cancelar</button>
      </div>
    `;
    const input = itemEl.querySelector(".tax-edit-input");
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (!newName) return;
      if (newName === oldName) { await renderBrandsList(); return; }
      const currentBrands = await getBrands();
      if (currentBrands.some(b => b.toLowerCase() === newName.toLowerCase())) {
        alert("Ya existe una marca con ese nombre.");
        return;
      }
      try {
        await renameBrand(oldName, newName);
        await renderBrandsList();
        await renderAdminTable();
        await populateFormSelectors();
      } catch (err) {
        console.error("Error renombrando la marca:", err);
        alert("No se pudo renombrar la marca.");
      }
    };

    itemEl.querySelector(".save-brand-btn").addEventListener("click", save);
    itemEl.querySelector(".cancel-brand-edit-btn").addEventListener("click", () => renderBrandsList());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); save(); }
      if (e.key === "Escape") renderBrandsList();
    });
  }

  addBrandForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = newBrandInput.value.trim();
    if (!val) return;
    brands = await getBrands();
    if (brands.some(b => b.toLowerCase() === val.toLowerCase())) { alert("La marca ya existe."); return; }
    try {
      await addBrand(val);
      newBrandInput.value = "";
      await renderBrandsList();
      await populateFormSelectors();
      alert("¡Marca agregada!");
    } catch (err) {
      console.error("Error agregando la marca:", err);
      alert("No se pudo agregar la marca.");
    }
  });

  // --- CATEGORÍAS ---
  async function renderCategoriesList() {
    categoriesListContainer.innerHTML = "";
    categories = await getCategories();
    categories.forEach(category => {
      const div = document.createElement("div");
      div.className = "tax-item";
      div.innerHTML = `<span class="tax-name">${category}</span>
        <div class="actions-cell" style="gap:0.4rem;">
          <button class="btn btn-warning btn-sm edit-category-btn" data-val="${category}">Editar</button>
          <button class="btn btn-danger btn-sm delete-category-btn" data-val="${category}">Eliminar</button>
        </div>`;
      categoriesListContainer.appendChild(div);
    });
    document.querySelectorAll(".delete-category-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm(`¿Eliminar la categoría "${btn.getAttribute("data-val")}"?`)) {
          await deleteCategory(btn.getAttribute("data-val"));
          await renderCategoriesList();
          await populateFormSelectors();
        }
      });
    });
    document.querySelectorAll(".edit-category-btn").forEach(btn => {
      btn.addEventListener("click", () => startEditCategory(btn.getAttribute("data-val"), btn.closest(".tax-item")));
    });
  }

  // Cambia una fila de categoría a modo edición inline (input + Guardar/Cancelar)
  function startEditCategory(oldName, itemEl) {
    itemEl.innerHTML = `
      <input type="text" class="form-control tax-edit-input" value="${oldName}" style="flex:1;margin-right:0.5rem;padding:0.4rem 0.7rem;">
      <div class="actions-cell" style="gap:0.4rem;">
        <button class="btn btn-success btn-sm save-category-btn">Guardar</button>
        <button class="btn btn-secondary btn-sm cancel-category-edit-btn">Cancelar</button>
      </div>
    `;
    const input = itemEl.querySelector(".tax-edit-input");
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (!newName) return;
      if (newName === oldName) { await renderCategoriesList(); return; }
      const currentCategories = await getCategories();
      if (currentCategories.some(c => c.toLowerCase() === newName.toLowerCase())) {
        alert("Ya existe una categoría con ese nombre.");
        return;
      }
      try {
        await renameCategory(oldName, newName);
        await renderCategoriesList();
        await renderAdminTable();
        await populateFormSelectors();
      } catch (err) {
        console.error("Error renombrando la categoría:", err);
        alert("No se pudo renombrar la categoría.");
      }
    };

    itemEl.querySelector(".save-category-btn").addEventListener("click", save);
    itemEl.querySelector(".cancel-category-edit-btn").addEventListener("click", () => renderCategoriesList());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); save(); }
      if (e.key === "Escape") renderCategoriesList();
    });
  }

  addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = newCategoryInput.value.trim();
    if (!val) return;
    categories = await getCategories();
    if (categories.some(c => c.toLowerCase() === val.toLowerCase())) { alert("La categoría ya existe."); return; }
    try {
      await addCategory(val);
      newCategoryInput.value = "";
      await renderCategoriesList();
      await populateFormSelectors();
      alert("¡Categoría agregada!");
    } catch (err) {
      console.error("Error agregando la categoría:", err);
      alert("No se pudo agregar la categoría.");
    }
  });

  // --- CRUD PRODUCTOS ---
  async function deleteProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    if (confirm(`¿Eliminar "${product.name}"?`)) {
      await deleteProductById(id);
      await renderAdminTable();
      if (productIdField.value === id) resetProductForm();
    }
  }

  function startEditProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    productIdField.value = product.id;
    nameInput.value = product.name;
    brandSelect.value = product.brand;
    categorySelect.value = product.category;
    priceInput.value = product.price;
    quantityInput.value = product.quantity;
    materialInput.value = product.material;
    descInput.value = product.description;

    // Imagen 1
    const img1 = product.image1 || "";
    image1CustomInput.value = "";
    document.getElementById("file-img1").value = "";
    let matched1 = false;
    image1Options.forEach(opt => {
      opt.classList.remove("selected");
      if (opt.getAttribute("data-val") === img1) { opt.classList.add("selected"); image1Input.value = img1; matched1 = true; }
    });
    if (!matched1) { image1CustomInput.value = img1.startsWith("data:") ? "" : img1; image1Input.value = img1; }
    setImagePreview(img1Preview, img1PreviewBox, "", img1);

    // Imagen 2
    const img2 = product.image2 || "";
    image2CustomInput.value = "";
    document.getElementById("file-img2").value = "";
    let matched2 = false;
    image2Options.forEach(opt => {
      opt.classList.remove("selected");
      if (opt.getAttribute("data-val") === img2) { opt.classList.add("selected"); image2Input.value = img2; matched2 = true; }
    });
    if (!matched2) {
      if (img2 === "") { image2Options[0].classList.add("selected"); image2Input.value = ""; }
      else { image2CustomInput.value = img2.startsWith("data:") ? "" : img2; image2Input.value = img2; }
    }
    setImagePreview(img2Preview, img2PreviewBox, "", img2);

    formTitle.textContent = "Editar Calcomanía";
    submitBtn.textContent = "Actualizar Producto";
    cancelEditBtn.style.display = "inline-block";
    productForm.scrollIntoView({ behavior: "smooth" });
  }

  cancelEditBtn.addEventListener("click", resetProductForm);

  function resetProductForm() {
    productIdField.value = "";
    productForm.reset();
    formTitle.textContent = "Agregar Calcomanía";
    submitBtn.textContent = "Guardar Producto";
    cancelEditBtn.style.display = "none";
    image1Options.forEach(o => o.classList.remove("selected"));
    image1Options[0].classList.add("selected");
    image1Input.value = image1Options[0].getAttribute("data-val");
    image2Options.forEach(o => o.classList.remove("selected"));
    image2Options[0].classList.add("selected");
    image2Input.value = "";
    document.getElementById("file-img1").value = "";
    document.getElementById("file-img2").value = "";
    setImagePreview(img1Preview, img1PreviewBox, "", image1Input.value);
    setImagePreview(img2Preview, img2PreviewBox, "", "");
  }

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = productIdField.value;
    const name = nameInput.value;
    const brand = brandSelect.value;
    const category = categorySelect.value;
    const price = parseFloat(priceInput.value);
    const quantity = parseInt(quantityInput.value, 10);
    const material = materialInput.value;
    const description = descInput.value;

    let image1 = image1Input.value;
    if (image1CustomInput.value.trim()) image1 = image1CustomInput.value.trim();

    let image2 = image2Input.value;
    if (image2CustomInput.value.trim()) image2 = image2CustomInput.value.trim();

    const productData = { name, brand, category, price, quantity, material, description, image1, image2 };

    try {
      if (id) {
        await updateProduct(id, productData);
      } else {
        await createProduct({ id: "prod-" + Date.now(), ...productData });
      }
      await renderAdminTable();
      resetProductForm();
      alert("¡Producto guardado exitosamente!");
    } catch (err) {
      console.error("Error guardando el producto:", err);
      alert("No se pudo guardar el producto. Revisá los datos e intentá de nuevo.");
    }
  });

  resetCatalogBtn.addEventListener("click", async () => {
    if (confirm("¿Vaciar todo el catálogo (productos, marcas y categorías)? Esta acción no se puede deshacer. Si necesitás los datos de ejemplo originales, volvé a correr el script SQL de semilla en Supabase.")) {
      await resetCatalog();
      products = await getProducts();
      brands = await getBrands();
      categories = await getCategories();
      await populateFormSelectors();
      await renderAdminTable();
      await renderBrandsList();
      await renderCategoriesList();
      resetProductForm();
    }
  });

  // Inicializar
  await loadSettings();
  await populateFormSelectors();
  await renderAdminTable();
  await renderBrandsList();
  await renderCategoriesList();
  await renderOrders("Todos");
  await refreshPaymentPdfStatus();

  // Pre-vista de la imagen 1 por defecto (plantilla seleccionada)
  setImagePreview(img1Preview, img1PreviewBox, "", image1Input.value);
});

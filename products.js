// Capa de datos de Ingenio cv — ahora conectada a Supabase
// (antes usaba localStorage; las funciones se mantienen con nombres
// parecidos para no romper el resto del código, pero ahora son async
// y hay que usarlas con "await").

// --- PRODUCTOS ---
async function getProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Error cargando productos:", error);
    return [];
  }
  return data;
}

async function createProduct(product) {
  const { error } = await supabaseClient.from("products").insert(product);
  if (error) throw error;
}

async function updateProduct(id, product) {
  const { error } = await supabaseClient.from("products").update(product).eq("id", id);
  if (error) throw error;
}

async function deleteProductById(id) {
  const { error } = await supabaseClient.from("products").delete().eq("id", id);
  if (error) throw error;
}

async function resetCatalog() {
  // Borra todos los productos, marcas y categorías actuales.
  await supabaseClient.from("products").delete().neq("id", "");
  await supabaseClient.from("brands").delete().neq("name", "");
  await supabaseClient.from("categories").delete().neq("name", "");
}

// --- MARCAS ---
async function getBrands() {
  const { data, error } = await supabaseClient.from("brands").select("name").order("name");
  if (error) {
    console.error("Error cargando marcas:", error);
    return [];
  }
  return data.map(b => b.name);
}

async function addBrand(name) {
  const { error } = await supabaseClient.from("brands").insert({ name });
  if (error) throw error;
}

async function deleteBrand(name) {
  const { error } = await supabaseClient.from("brands").delete().eq("name", name);
  if (error) throw error;
}

// --- CATEGORÍAS ---
async function getCategories() {
  const { data, error } = await supabaseClient.from("categories").select("name").order("name");
  if (error) {
    console.error("Error cargando categorías:", error);
    return [];
  }
  return data.map(c => c.name);
}

async function addCategory(name) {
  const { error } = await supabaseClient.from("categories").insert({ name });
  if (error) throw error;
}

async function deleteCategory(name) {
  const { error } = await supabaseClient.from("categories").delete().eq("name", name);
  if (error) throw error;
}

// --- CONFIGURACIÓN (settings genéricos: teléfono del vendedor, etc.) ---
async function getSetting(key, fallback = "") {
  const { data, error } = await supabaseClient
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return fallback;
  return data.value;
}

async function saveSetting(key, value) {
  const { error } = await supabaseClient
    .from("settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

// --- PEDIDOS ---
async function getOrders() {
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error cargando pedidos:", error);
    return [];
  }
  // Adaptamos los nombres de columnas de la base al formato que usa el resto del código
  return data.map(o => ({
    id: o.id,
    date: o.order_date,
    deliveryDate: o.delivery_date,
    customer: o.customer,
    items: o.items,
    total: o.total,
    status: o.status
  }));
}

async function createOrder(order) {
  const { error } = await supabaseClient.from("orders").insert({
    id: order.id,
    order_date: order.date,
    delivery_date: order.deliveryDate,
    customer: order.customer,
    items: order.items,
    total: order.total,
    status: order.status
  });
  if (error) throw error;
}

async function updateOrderStatus(id, status) {
  const { error } = await supabaseClient.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteOrder(id) {
  const { error } = await supabaseClient.from("orders").delete().eq("id", id);
  if (error) throw error;
}

async function clearAllOrders() {
  const { error } = await supabaseClient.from("orders").delete().neq("id", "");
  if (error) throw error;
}

// --- ALMACENAMIENTO DE ARCHIVOS (Supabase Storage) ---
// Sube una imagen (File) al bucket "product-images" y devuelve la URL pública.
async function uploadProductImage(file) {
  const ext = (file.name && file.name.split(".").pop()) || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabaseClient.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

// Sube el PDF de forma de pago al bucket "payment-docs" y guarda su URL/nombre en settings.
async function savePaymentPdf(file) {
  const path = `forma-de-pago-${Date.now()}.pdf`;
  const { error } = await supabaseClient.storage.from("payment-docs").upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from("payment-docs").getPublicUrl(path);
  await saveSetting("payment_pdf_url", data.publicUrl);
  await saveSetting("payment_pdf_name", file.name);
  await saveSetting("payment_pdf_path", path);
  return { name: file.name, data: data.publicUrl };
}

async function getPaymentPdf() {
  const url = await getSetting("payment_pdf_url", "");
  if (!url) return null;
  const name = await getSetting("payment_pdf_name", "forma-de-pago.pdf");
  return { name, data: url };
}

async function deletePaymentPdf() {
  const path = await getSetting("payment_pdf_path", "");
  if (path) {
    await supabaseClient.storage.from("payment-docs").remove([path]);
  }
  await supabaseClient.from("settings").delete().in("key", ["payment_pdf_url", "payment_pdf_name", "payment_pdf_path"]);
}

// --- FECHA DE ENTREGA (fecha de compra + N días hábiles) ---
// Suma días hábiles (Lun-Vie) a una fecha, salteando sábados y domingos.
function addBusinessDays(startDate, days) {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay(); // 0 = domingo, 6 = sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

function formatDeliveryDate(date) {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

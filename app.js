const starterProducts = [
  {id:1,name:"Audífonos inalámbricos",price:799,category:"Electrónica",description:"Sonido nítido y conexión Bluetooth.",emoji:"🎧"},
  {id:2,name:"Reloj inteligente",price:1199,category:"Electrónica",description:"Consulta tus notificaciones y actividad.",emoji:"⌚"},
  {id:3,name:"Mochila urbana",price:549,category:"Accesorios",description:"Diseño práctico para escuela o trabajo.",emoji:"🎒"},
  {id:4,name:"Lámpara de escritorio",price:399,category:"Hogar",description:"Iluminación cómoda para estudiar.",emoji:"💡"},
  {id:5,name:"Botella deportiva",price:189,category:"Deportes",description:"Lleva tu bebida a todas partes.",emoji:"🧴"},
  {id:6,name:"Bocina portátil",price:649,category:"Electrónica",description:"Música para acompañarte durante el día.",emoji:"🔊"}
];
const STORAGE_KEY = "novastore-products-v1";
const FAVORITES_KEY = "novastore-favorites-v1";
const CART_KEY = "novastore-cart-v1";
const REVIEWS_KEY = "novastore-reviews-v1";
const PENDING_PRODUCTS_KEY = "novastore-pending-products-v1";
const PRODUCTS_API = "./api/products";
const NOTIFICATION_PREF_KEY = "novastore-notifications-enabled-v1";
const productGrid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const productCount = document.querySelector("#productCount");
const emptyState = document.querySelector("#emptyState");
const statusMessage = document.querySelector("#statusMessage");
const favoritesGrid = document.querySelector("#favoritesGrid");
const cartItems = document.querySelector("#cartItems");
const reviewProduct = document.querySelector("#reviewProduct");
const productDetailDialog = document.querySelector("#productDetailDialog");
let detailProductId = null;
let products = loadProducts();
let pendingProducts = loadCollection(PENDING_PRODUCTS_KEY, value =>
  Array.isArray(value) && value.every(isProduct)
);
let favorites = loadCollection(FAVORITES_KEY, value => Array.isArray(value) && value.every(id => Number.isSafeInteger(id)));
let cart = loadCollection(CART_KEY, value => Array.isArray(value) && value.every(item =>
  item && Number.isSafeInteger(item.id) && Number.isSafeInteger(item.quantity) && item.quantity > 0
));
let reviews = loadCollection(REVIEWS_KEY, value => Array.isArray(value) && value.every(review =>
  review && Number.isSafeInteger(review.productId) && Number.isInteger(review.rating) &&
  review.rating >= 1 && review.rating <= 5 && typeof review.comment === "string" &&
  typeof review.createdAt === "string"
));

function loadProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return starterProducts;
    const value = JSON.parse(saved);
    if (Array.isArray(value) && value.every(isProduct)) return value;
    statusMessage.textContent = "Los productos guardados tienen un formato no válido; se mostrará el catálogo inicial.";
    return starterProducts;
  } catch (error) {
    statusMessage.textContent = "No fue posible leer los productos guardados; se mostrará el catálogo inicial.";
    return starterProducts;
  }
}
function isProduct(value) {
  return value && Number.isSafeInteger(value.id) && typeof value.name === "string" &&
    Number.isFinite(value.price) && value.price > 0 && typeof value.category === "string" &&
    typeof value.description === "string" && typeof value.emoji === "string";
}
function compressProductPhoto(file) {
  return new Promise((resolve,reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("Selecciona un archivo de imagen válido."));
    if (file.size > 12 * 1024 * 1024) return reject(new Error("La imagen debe pesar menos de 12 MB."));
    const image = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => { image.src = reader.result; };
    image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
    image.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(image.naturalWidth,image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL("image/jpeg",0.72));
    };
    reader.readAsDataURL(file);
  });
}
async function showSyncNotification() {
  if (!("Notification" in window) || localStorage.getItem(NOTIFICATION_PREF_KEY) !== "enabled" || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("NovaStore", {body:"Tus productos pendientes se sincronizaron correctamente.",icon:"icons/icon.svg",tag:"novastore-sync",data:{url:"./#agregar"}});
  } catch (error) {
    console.warn("No se pudo mostrar la notificación de sincronización:",error);
  }
}
function loadCollection(key, isValid) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const value = JSON.parse(saved);
    if (isValid(value)) return value;
    statusMessage.textContent = "Se encontraron datos guardados con un formato no válido.";
    return [];
  } catch (error) {
    statusMessage.textContent = "No fue posible leer los datos guardados en este navegador.";
    return [];
  }
}
function saveCollection(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    statusMessage.textContent = "No fue posible guardar los cambios en este navegador.";
    return false;
  }
}
function saveProducts(value = products) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch (error) {
    statusMessage.textContent = "No fue posible guardar los cambios en este navegador.";
    return false;
  }
}
function updateSyncStatus() {
  const count = pendingProducts.length;
  document.querySelector("#pendingCount").textContent =
    `${count} ${count === 1 ? "producto pendiente" : "productos pendientes"}`;
  document.querySelector("#syncButton").disabled = count === 0;
  document.querySelector("#syncButton").textContent = count
    ? `Enviar pendientes (${count})`
    : "Enviar pendientes";
  document.querySelector("#connectivityStatus").textContent = navigator.onLine
    ? "Con conexión a internet"
    : "Sin conexión: los cambios se guardan en este dispositivo";
}
async function loadProductsFromServer() {
  const response = await fetch(PRODUCTS_API, {cache:"no-store"});
  if (!response.ok) throw new Error(`El servidor respondió con estado ${response.status}.`);
  const result = await response.json();
  if (!result || !Array.isArray(result.products) || !result.products.every(isProduct)) {
    throw new Error("El servidor devolvió una lista de productos no válida.");
  }
  const merged = new Map(products.map(product => [product.id,product]));
  result.products.forEach(product => {
    const localProduct = merged.get(product.id);
    merged.set(product.id,localProduct?.photo ? {...product,photo:localProduct.photo} : product);
  });
  const updatedProducts = [...merged.values()];
  if (!saveProducts(updatedProducts)) return false;
  products = updatedProducts;
  renderAll();
  return true;
}
async function syncPendingProducts() {
  if (!navigator.onLine) {
    updateSyncStatus();
    statusMessage.textContent = "Sin conexión. El producto permanece guardado y se enviará cuando vuelvas a estar en línea.";
    return false;
  }
  if (!pendingProducts.length) {
    updateSyncStatus();
    statusMessage.textContent = "No hay productos pendientes de envío.";
    return true;
  }

  while (pendingProducts.length) {
    const product = pendingProducts[0];
    try {
      const response = await fetch(PRODUCTS_API, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:product.id,name:product.name,price:product.price,category:product.category,description:product.description,emoji:product.emoji})
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `El servidor respondió con estado ${response.status}.`);
      }
      const result = await response.json();
      if (!result || !isProduct(result.product) || result.product.id !== product.id) {
        throw new Error("El servidor no confirmó el producto enviado.");
      }
      const remaining = pendingProducts.slice(1);
      if (!saveCollection(PENDING_PRODUCTS_KEY,remaining)) return false;
      pendingProducts = remaining;
      updateSyncStatus();
    } catch (error) {
      updateSyncStatus();
      statusMessage.textContent = `No se pudo enviar "${product.name}". Se conserva en este dispositivo para reintentar: ${error.message}`;
      return false;
    }
  }
  statusMessage.textContent = "Todos los productos pendientes se enviaron al servidor.";
  await showSyncNotification();
  return true;
}
function money(value) {
  return new Intl.NumberFormat("es-MX", {style:"currency",currency:"MXN"}).format(value);
}
function inferProductEmoji(name, category) {
  const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");
  const productIcons = [
    {terms:["xbox","playstation","nintendo","consola","videojuego","gaming"],emoji:"🎮",label:"Icono sugerido: videojuegos"},
    {terms:["audifono","auricular","headphone"],emoji:"🎧",label:"Icono sugerido: audífonos"},
    {terms:["reloj","smartwatch"],emoji:"⌚",label:"Icono sugerido: reloj"},
    {terms:["mochila","bolsa"],emoji:"🎒",label:"Icono sugerido: mochila"},
    {terms:["lampara","foco","luz"],emoji:"💡",label:"Icono sugerido: iluminación"},
    {terms:["botella","termo"],emoji:"🧴",label:"Icono sugerido: botella"},
    {terms:["bocina","altavoz","parlante"],emoji:"🔊",label:"Icono sugerido: bocina"},
    {terms:["telefono","celular","iphone","samsung","movil"],emoji:"📱",label:"Icono sugerido: teléfono"},
    {terms:["laptop","computadora","portatil","pc"],emoji:"💻",label:"Icono sugerido: computadora"},
    {terms:["television","pantalla","monitor"],emoji:"📺",label:"Icono sugerido: pantalla"},
    {terms:["camara","fotograf"],emoji:"📷",label:"Icono sugerido: cámara"},
    {terms:["zapato","tenis","sneaker"],emoji:"👟",label:"Icono sugerido: calzado"},
    {terms:["pelota","balon","futbol"],emoji:"⚽",label:"Icono sugerido: deporte"},
    {terms:["silla","mesa","sofa","mueble"],emoji:"🪑",label:"Icono sugerido: mueble"},
    {terms:["libro","novela"],emoji:"📚",label:"Icono sugerido: libro"}
  ];
  const match = productIcons.find(icon => icon.terms.some(term => normalizedName.includes(term)));
  if (match) return match;
  const categoryIcons = {Electrónica:"🎧",Accesorios:"🎒",Hogar:"💡",Deportes:"⚽"};
  return {emoji:categoryIcons[category] || "📦",label:"Icono sugerido por categoría"};
}
function updateProductIconPreview() {
  const name = document.querySelector('#productForm [name="name"]').value.trim();
  const category = document.querySelector('#productForm [name="category"]').value;
  const suggestion = inferProductEmoji(name,category);
  const preview = document.querySelector("#productIconPreview");
  preview.textContent = suggestion.emoji;
  preview.setAttribute("aria-label",suggestion.label);
  document.querySelector("#productIconHint").textContent = name
    ? `${suggestion.label}. Se guardará con el producto.`
    : "El icono se sugiere según el nombre del producto.";
}
function getAverageRating(productId) {
  const productReviews = reviews.filter(review => review.productId === productId);
  if (!productReviews.length) return "Sin reseñas";
  const average = productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length;
  return `★ ${average.toFixed(1)} (${productReviews.length})`;
}
function addProductToCart(product) {
  const updatedCart = cart.map(entry => ({...entry}));
  const item = updatedCart.find(entry => entry.id === product.id);
  if (item) item.quantity += 1;
  else updatedCart.push({id:product.id,quantity:1});
  if (!saveCollection(CART_KEY, updatedCart)) return false;
  cart = updatedCart;
  renderAll();
  statusMessage.textContent = `${product.name} agregado al carrito.`;
  return true;
}
function openProductDetails(product) {
  detailProductId = product.id;
  const detailIcon = document.querySelector("#detailIcon");
  detailIcon.replaceChildren();
  if (product.photo) {
    const photo = document.createElement("img");
    photo.src = product.photo;
    photo.alt = `Foto de ${product.name}`;
    detailIcon.append(photo);
  } else detailIcon.textContent = product.emoji || "📦";
  document.querySelector("#detailCategory").textContent = product.category;
  document.querySelector("#detailName").textContent = product.name;
  document.querySelector("#detailRating").textContent = getAverageRating(product.id);
  document.querySelector("#detailDescription").textContent = product.description;
  document.querySelector("#detailPrice").textContent = money(product.price);
  const productReviews = reviews.filter(review => review.productId === product.id)
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const reviewList = document.querySelector("#detailReviewList");
  if (productReviews.length) {
    reviewList.replaceChildren(...productReviews.slice(0,3).map(review => {
      const item = document.createElement("article");
      item.className = "detail-review-item";
      const stars = document.createElement("strong");
      stars.className = "review-stars";
      stars.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}`;
      const comment = document.createElement("p");
      comment.textContent = review.comment;
      item.append(stars,comment);
      return item;
    }));
  } else {
    const noReviews = document.createElement("p");
    noReviews.className = "muted";
    noReviews.textContent = "Este producto todavía no tiene reseñas.";
    reviewList.replaceChildren(noReviews);
  }
  productDetailDialog.showModal();
}
function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  const visual = document.createElement("div");
  visual.className = "product-visual";
  visual.setAttribute("aria-hidden","true");
  if (product.photo) {
    const photo = document.createElement("img");
    photo.src = product.photo;
    photo.alt = `Foto de ${product.name}`;
    visual.append(photo);
  } else visual.textContent = product.emoji || "📦";
  const info = document.createElement("div");
  info.className = "product-info";
  const tag = document.createElement("span");
  tag.className = "category-tag";
  tag.textContent = product.category;
  const title = document.createElement("h3");
  title.textContent = product.name;
  const desc = document.createElement("p");
  desc.textContent = product.description;
  const rating = document.createElement("p");
  rating.className = "product-rating";
  rating.textContent = getAverageRating(product.id);
  const bottom = document.createElement("div");
  bottom.className = "product-bottom";
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = money(product.price);
  const actions = document.createElement("div");
  actions.className = "product-actions";
  const favoriteButton = document.createElement("button");
  const isFavorite = favorites.includes(product.id);
  favoriteButton.className = "small-button favorite-button";
  favoriteButton.type = "button";
  favoriteButton.textContent = isFavorite ? "♥ Guardado" : "♡ Favorito";
  favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  favoriteButton.setAttribute("aria-label", `${isFavorite ? "Quitar de" : "Agregar a"} favoritos: ${product.name}`);
  favoriteButton.addEventListener("click", () => {
    const updatedFavorites = isFavorite ? favorites.filter(id => id !== product.id) : [...favorites, product.id];
    if (saveCollection(FAVORITES_KEY, updatedFavorites)) favorites = updatedFavorites;
    renderAll();
  });
  const addButton = document.createElement("button");
  addButton.className = "small-button";
  addButton.type = "button";
  addButton.textContent = "＋ Carrito";
  addButton.addEventListener("click", () => addProductToCart(product));
  const detailButton = document.createElement("button");
  detailButton.className = "small-button";
  detailButton.type = "button";
  detailButton.textContent = "Ver detalle";
  detailButton.addEventListener("click", () => openProductDetails(product));
  actions.append(favoriteButton, addButton, detailButton);
  bottom.append(price,actions);
  info.append(tag,title,desc,rating,bottom);
  card.append(visual,info);
  return card;
}
function renderProducts() {
  const term = searchInput.value.trim().toLocaleLowerCase("es");
  const category = categoryFilter.value;
  const filtered = products.filter(product =>
    (product.name.toLocaleLowerCase("es").includes(term) || product.description.toLocaleLowerCase("es").includes(term)) &&
    (category === "Todas" || product.category === category)
  );
  productGrid.replaceChildren(...filtered.map(createProductCard));
  productCount.textContent = `${filtered.length} ${filtered.length === 1 ? "producto" : "productos"}`;
  emptyState.hidden = filtered.length !== 0;
}
function renderFavorites() {
  const favoriteProducts = products.filter(product => favorites.includes(product.id));
  favoritesGrid.replaceChildren(...favoriteProducts.map(createProductCard));
  document.querySelector("#favoriteCount").textContent = `${favoriteProducts.length} ${favoriteProducts.length === 1 ? "favorito" : "favoritos"}`;
  document.querySelector("#favoritesEmpty").hidden = favoriteProducts.length !== 0;
}
function renderCart() {
  const availableItems = cart.map(item => ({...item,product:products.find(product => product.id === item.id)}))
    .filter(item => item.product);
  const itemCount = availableItems.reduce((sum,item) => sum + item.quantity,0);
  const total = availableItems.reduce((sum,item) => sum + item.product.price * item.quantity,0);
  document.querySelector("#cartCount").textContent = `${itemCount} ${itemCount === 1 ? "artículo" : "artículos"}`;
  document.querySelector("#cartBadge").textContent = String(itemCount);
  document.querySelector("#cartEmpty").hidden = availableItems.length !== 0;
  document.querySelector("#cartSummary").hidden = availableItems.length === 0;
  document.querySelector("#cartTotal").textContent = money(total);
  cartItems.replaceChildren(...availableItems.map(item => {
    const row = document.createElement("article");
    row.className = "cart-item";
    const details = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = item.product.name;
    const linePrice = document.createElement("p");
    linePrice.textContent = `${money(item.product.price)} c/u · ${money(item.product.price * item.quantity)}`;
    details.append(name,linePrice);
    const quantity = document.createElement("div");
    quantity.className = "quantity-controls";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.className = "small-button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label",`Quitar una unidad de ${item.product.name}`);
    decrease.addEventListener("click",() => updateCartQuantity(item.id,-1));
    const quantityValue = document.createElement("span");
    quantityValue.textContent = String(item.quantity);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.className = "small-button";
    increase.textContent = "+";
    increase.setAttribute("aria-label",`Agregar una unidad de ${item.product.name}`);
    increase.addEventListener("click",() => updateCartQuantity(item.id,1));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "Quitar";
    remove.addEventListener("click",() => {
      const updatedCart = cart.filter(cartItem => cartItem.id !== item.id);
      if (!saveCollection(CART_KEY,updatedCart)) return;
      cart = updatedCart;
      renderAll();
    });
    quantity.append(decrease,quantityValue,increase,remove);
    row.append(details,quantity);
    return row;
  }));
}
function updateCartQuantity(productId, difference) {
  const updatedCart = cart.map(entry => ({...entry}));
  const item = updatedCart.find(entry => entry.id === productId);
  if (!item) return;
  item.quantity += difference;
  const nextCart = item.quantity <= 0 ? updatedCart.filter(entry => entry.id !== productId) : updatedCart;
  if (!saveCollection(CART_KEY,nextCart)) return;
  cart = nextCart;
  renderAll();
}
function renderReviews() {
  const previousValue = reviewProduct.value;
  reviewProduct.replaceChildren();
  products.forEach(product => {
    const option = document.createElement("option");
    option.value = String(product.id);
    option.textContent = product.name;
    reviewProduct.append(option);
  });
  if (products.some(product => String(product.id) === previousValue)) reviewProduct.value = previousValue;
  reviewProduct.disabled = products.length === 0;
  document.querySelector("#reviewForm").querySelector('button[type="submit"]').disabled = products.length === 0;
  const sortedReviews = [...reviews].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  document.querySelector("#reviewsEmpty").hidden = sortedReviews.length !== 0;
  document.querySelector("#reviewList").replaceChildren(...sortedReviews.slice(0,12).map(review => {
    const card = document.createElement("article");
    card.className = "review-card";
    const product = products.find(item => item.id === review.productId);
    const heading = document.createElement("div");
    heading.className = "review-heading";
    const productName = document.createElement("h3");
    productName.textContent = product ? product.name : "Producto";
    const stars = document.createElement("span");
    stars.className = "review-stars";
    stars.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}`;
    const comment = document.createElement("p");
    comment.textContent = review.comment;
    const date = document.createElement("time");
    date.dateTime = review.createdAt;
    date.textContent = new Date(review.createdAt).toLocaleDateString("es-MX");
    heading.append(productName,stars);
    card.append(heading,comment,date);
    return card;
  }));
}
function renderAll() {
  renderProducts();
  renderFavorites();
  renderCart();
  renderReviews();
}
function closeProductDetails() {
  productDetailDialog.close();
  detailProductId = null;
}
document.querySelector("#closeProductDetail").addEventListener("click",closeProductDetails);
document.querySelector("#closeProductDetailSecondary").addEventListener("click",closeProductDetails);
document.querySelector("#detailAddToCart").addEventListener("click",() => {
  const product = products.find(item => item.id === detailProductId);
  if (product && addProductToCart(product)) closeProductDetails();
});
searchInput.addEventListener("input",renderProducts);
categoryFilter.addEventListener("change",renderProducts);
document.querySelector('#productForm [name="name"]').addEventListener("input",updateProductIconPreview);
document.querySelector('#productForm [name="category"]').addEventListener("change",updateProductIconPreview);
document.querySelector("#productForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name")).trim();
  const price = Number(form.get("price"));
  const category = String(form.get("category"));
  const description = String(form.get("description")).trim();
  if (!name || !description || !Number.isFinite(price) || price <= 0) {
    statusMessage.textContent = "Revisa los datos: el precio debe ser mayor que cero.";
    return;
  }
  const {emoji} = inferProductEmoji(name,category);
  const productId = Math.max(Date.now(),...products.map(item => item.id + 1));
  const photoFile = document.querySelector("#productPhoto").files[0];
  let photo;
  if (photoFile) {
    try { photo = await compressProductPhoto(photoFile); }
    catch (error) { statusMessage.textContent = error.message; return; }
  }
  const product = {id:productId,name,price,category,description,emoji,...(photo ? {photo} : {})};
  const updatedProducts = [product,...products];
  if (!saveProducts(updatedProducts)) {
    return;
  }
  products = updatedProducts;
  const updatedQueue = [...pendingProducts,product];
  if (!saveCollection(PENDING_PRODUCTS_KEY,updatedQueue)) {
    products = products.filter(item => item.id !== product.id);
    saveProducts(products);
    renderAll();
    return;
  }
  pendingProducts = updatedQueue;
  event.currentTarget.reset();
  document.querySelector("#photoPreview").hidden = true;
  document.querySelector("#photoPreview").removeAttribute("src");
  updateProductIconPreview();
  searchInput.value = "";
  categoryFilter.value = "Todas";
  renderAll();
  updateSyncStatus();
  statusMessage.textContent = navigator.onLine
    ? `Producto "${name}" guardado. Se enviará al servidor.`
    : `Producto "${name}" guardado sin conexión. Se enviará al recuperar la conectividad.`;
  if (navigator.onLine) syncPendingProducts();
});
document.querySelector("#reviewForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const productId = Number(form.get("productId"));
  const rating = Number(form.get("rating"));
  const comment = String(form.get("comment")).trim();
  if (!products.some(product => product.id === productId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
    statusMessage.textContent = "Selecciona un producto, una calificación y escribe tu reseña.";
    return;
  }
  const updatedReviews = [{productId,rating,comment,createdAt:new Date().toISOString()},...reviews];
  if (!saveCollection(REVIEWS_KEY,updatedReviews)) return;
  reviews = updatedReviews;
  event.currentTarget.reset();
  renderAll();
  statusMessage.textContent = "Tu reseña se publicó correctamente.";
});
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");
document.querySelector("#syncButton").addEventListener("click",syncPendingProducts);
window.addEventListener("online",async()=>{
  updateSyncStatus();
  window.setTimeout(async()=>{
    try {
      await loadProductsFromServer();
    } catch (error) {
      console.error("No se pudo actualizar el catálogo desde el servidor:",error);
    }
    await syncPendingProducts();
  },500);
});
window.addEventListener("offline",updateSyncStatus);
menuToggle.addEventListener("click",()=>{
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded",String(open));
});
mainNav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded","false");
}));

document.querySelector("#productPhoto").addEventListener("change",async event=>{
  const file = event.currentTarget.files[0];
  const preview = document.querySelector("#photoPreview");
  if (!file) { preview.hidden = true; preview.removeAttribute("src"); return; }
  try {
    preview.src = await compressProductPhoto(file);
    preview.hidden = false;
  } catch (error) {
    event.currentTarget.value = "";
    preview.hidden = true;
    statusMessage.textContent = error.message;
  }
});
document.querySelector("#locationButton").addEventListener("click",()=>{
  const result = document.querySelector("#locationResult");
  if (!("geolocation" in navigator)) {
    result.textContent = "Este navegador no admite geolocalización.";
    return;
  }
  result.textContent = "Solicitando ubicación; acepta el permiso del navegador para continuar…";
  navigator.geolocation.getCurrentPosition(position=>{
    const {latitude,longitude,accuracy} = position.coords;
    result.textContent = `Ubicación: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (precisión aproximada: ${Math.round(accuracy)} m).`;
  },error=>{
    const messages = {
      1:"Permiso de ubicación denegado. Puedes habilitarlo en los ajustes del sitio del navegador.",
      2:"El dispositivo no pudo determinar la ubicación. Comprueba los servicios de ubicación.",
      3:"La solicitud de ubicación tardó demasiado. Inténtalo de nuevo."
    };
    result.textContent = messages[error.code] || "No se pudo obtener la ubicación.";
  },{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
});
document.querySelector("#notifyButton").addEventListener("click",async()=>{
  if (!("Notification" in window)) {
    statusMessage.textContent = "Este navegador no admite la API de notificaciones.";
    return;
  }
  if (!("serviceWorker" in navigator)) {
    statusMessage.textContent = "Este navegador no admite Service Worker.";
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      statusMessage.textContent = permission === "denied" ? "Permiso denegado. Puedes cambiarlo desde los ajustes del navegador." : "No se concedió permiso para notificaciones.";
      return;
    }
    localStorage.setItem(NOTIFICATION_PREF_KEY,"enabled");
    document.querySelector("#notifyButton").textContent = "Notificaciones activadas";
    statusMessage.textContent = "Notificaciones activadas. Recibirás un aviso al completar una sincronización.";
  } catch (error) {
    statusMessage.textContent = "No se pudo mostrar la notificación. Comprueba que uses localhost o HTTPS.";
  }
});

if (location.protocol === "file:") {
  document.querySelector("#localFileNotice").hidden = false;
} else if ("serviceWorker" in navigator) {
  window.addEventListener("load", async()=>{
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      registration.update();
      if (registration.waiting) registration.waiting.postMessage("SKIP_WAITING");
      registration.addEventListener("updatefound",()=>{
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange",()=>{
          if (installing.state === "installed" && navigator.serviceWorker.controller) installing.postMessage("SKIP_WAITING");
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange",()=>{
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      console.info("Service Worker registrado correctamente.");
    } catch (error) {
      console.error("Error al registrar el Service Worker:",error);
    }
  });
}
renderAll();
updateSyncStatus();
if (location.protocol !== "file:" && navigator.onLine) {
  loadProductsFromServer().catch(error => {
    console.error("No se pudo cargar el catálogo del servidor:",error);
    statusMessage.textContent = "No se pudo conectar con el servidor. El catálogo local sigue disponible; los productos pendientes se conservarán para reintentar.";
  }).then(() => syncPendingProducts());
}

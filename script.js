// ---------------- API HELPERS (no login per test) ----------------
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Errore API");
  }
  return res.json();
}

const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: "DELETE" })
};


// ---------------- NAV ----------------
window.showPage = function(page) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(page).style.display = "block";
};

// ---------------- STATE ----------------
let categories = [];
let products   = [];
let cart       = [];
let barName    = "San Luigi";
let pollInterval = null;

// ---------------- REFS ----------------
const productsButtons       = document.getElementById("products-buttons");
const cartList              = document.getElementById("cart-list");
const cartTotalEl           = document.getElementById("cart-total");
const printBtn              = document.getElementById("print-order");
const categoriesList        = document.getElementById("categories-list");
const productsList          = document.getElementById("products-list");
const productCategorySelect = document.getElementById("product-category");
const historyForm           = document.getElementById("history-form");
const historyBody           = document.getElementById("history-table");
const historyTotalEl        = document.getElementById("history-total");
const exportBtnCSV          = document.getElementById("export-csv");
const exportBtnPDF          = document.getElementById("export-pdf");
const exportBtnXSLX         = document.getElementById("export-xslx");
const modalCategory         = document.getElementById("modal-category");
const modalProduct          = document.getElementById("modal-product");

// ---------------- UTILS ----------------
const EUR = v => `€${Number(v).toFixed(2)}`;
function todayKeyInRome(d = new Date()) {
  const tzOffsetMin = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffsetMin * 60 * 1000);
  return local.toISOString().slice(0, 10);
}
function byOrder(a, b) { return (a.order ?? 0) - (b.order ?? 0); }
function findProduct(id) { return products.find(p => p.id === id); }

// ---------------- INIT APP ----------------
async function initApp() {
  await loadBarName();
  await loadCategories();
  await loadProducts();
  renderCart();
  showPage("home");
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadProducts, 10000);
}

// ---------------- CONFIG ----------------
async function loadBarName() {
  try {
    const data = await api.get("/api/config");
    barName = data.name || "San Luigi";
  } catch { /* usa default */ }
  document.querySelector("header h1").textContent = barName;
}

// ---------------- CATEGORIES ----------------
async function loadCategories() {
  try {
    categories = (await api.get("/api/categories")).sort(byOrder);
    renderSettingsCategories();
    renderProductSelects();
    renderHome();
  } catch (err) { console.error("Errore categorie:", err); }
}

function renderProductSelects() {
  productCategorySelect.innerHTML = "";
  const selEdit = document.getElementById("edit-prod-category");
  selEdit.innerHTML = "";
  categories.forEach(c => {
    productCategorySelect.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`);
    selEdit.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`);
  });
}

function renderSettingsCategories() {
  categoriesList.innerHTML = "";
  categories.forEach(cat => {
    categoriesList.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${cat.name}</td>
        <td><span style="font-weight:700;color:${cat.color}">${cat.color}</span></td>
        <td>${cat.order ?? 0}</td>
        <td>
          <button class="edit-cat" data-id="${cat.id}">✏️</button>
          <button class="delete-cat" data-id="${cat.id}">🗑️</button>
        </td>
      </tr>`);
  });
}

document.getElementById("category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name  = document.getElementById("category-name").value.trim();
  const color = document.getElementById("category-color").value;
  const order = parseInt(document.getElementById("category-order").value || "0", 10);
  if (!name) return alert("Inserisci un nome categoria");
  await api.post("/api/categories", { name, color, order });
  e.target.reset();
  await loadCategories();
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-cat")) {
    if (!confirm("Eliminare la categoria?")) return;
    await api.delete(`/api/categories?id=${e.target.dataset.id}`);
    await loadCategories();
  }
  if (e.target.classList.contains("edit-cat")) openCategoryModal(e.target.dataset.id);
  if (e.target.classList.contains("delete-prod")) {
    if (!confirm("Eliminare il prodotto?")) return;
    await api.delete(`/api/products?id=${e.target.dataset.id}`);
    await loadProducts();
  }
  if (e.target.classList.contains("edit-prod")) openProductModal(e.target.dataset.id);
});

async function openCategoryModal(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;
  const form = document.getElementById("form-edit-category");
  form.dataset.id = id;
  document.getElementById("edit-cat-name").value  = cat.name  || "";
  document.getElementById("edit-cat-color").value = cat.color || "#004aad";
  document.getElementById("edit-cat-order").value = cat.order ?? 0;
  modalCategory.style.display = "flex";
}

document.getElementById("form-edit-category").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = e.target.dataset.id;
  const payload = {
    name:  document.getElementById("edit-cat-name").value.trim(),
    color: document.getElementById("edit-cat-color").value,
    order: parseInt(document.getElementById("edit-cat-order").value || "0", 10)
  };
  if (!payload.name) return alert("Nome categoria obbligatorio");
  await api.put(`/api/categories?id=${id}`, payload);
  modalCategory.style.display = "none";
  await loadCategories();
});

// ---------------- PRODUCTS ----------------
async function loadProducts() {
  try {
    products = await api.get("/api/products");
    renderSettingsProducts();
    renderHome();
  } catch (err) { console.error("Errore prodotti:", err); }
}

function renderHome() {
  productsButtons.innerHTML = "";
  categories.forEach(cat => {
    products.filter(p => p.category === cat.id && p.active).forEach(prod => {
      const btn = document.createElement("button");
      btn.className = "product-btn";
      btn.style.background = cat.color;
      const stockStr = (prod.stock === null || prod.stock === undefined) ? "" : ` [${prod.stock}]`;
      btn.textContent = `${prod.name}\n${EUR(prod.price)}${stockStr}`;
      if (prod.stock === 0) {
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
      } else {
        btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
      }
      btn.onclick = () => addToCart(prod.id);
      productsButtons.appendChild(btn);
    });
  });
}

function renderSettingsProducts() {
  productsList.innerHTML = "";
  products.slice().sort((a, b) => {
    const catA = categories.find(c => c.id === a.category)?.order ?? 0;
    const catB = categories.find(c => c.id === b.category)?.order ?? 0;
    return catA !== catB ? catA - catB : a.name.localeCompare(b.name, "it");
  }).forEach(prod => {
    const catName = categories.find(c => c.id === prod.category)?.name || "–";
    productsList.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${prod.name}</td>
        <td>€${Number(prod.price).toFixed(2)}</td>
        <td>${prod.stock ?? "∞"}</td>
        <td>${prod.active ? "✅" : "❌"}</td>
        <td>${catName}</td>
        <td>
          <button class="edit-prod" data-id="${prod.id}">✏️</button>
          <button class="delete-prod" data-id="${prod.id}">🗑️</button>
        </td>
      </tr>`);
  });
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name     = document.getElementById("product-name").value.trim();
  const price    = parseFloat(document.getElementById("product-price").value);
  const stockVal = document.getElementById("product-stock").value;
  const stock    = stockVal === "" ? null : parseInt(stockVal, 10);
  const category = document.getElementById("product-category").value;
  const active   = document.getElementById("product-active").checked;
  if (!name || isNaN(price)) return alert("Nome e prezzo sono obbligatori");
  await api.post("/api/products", { name, price, stock, category, active });
  e.target.reset();
  await loadProducts();
});

async function openProductModal(id) {
  const p = products.find(pr => pr.id === id);
  if (!p) return;
  const form = document.getElementById("form-edit-product");
  form.dataset.id = id;
  document.getElementById("edit-prod-name").value     = p.name  ?? "";
  document.getElementById("edit-prod-price").value    = p.price ?? 0;
  document.getElementById("edit-prod-stock").value    = (p.stock === null || p.stock === undefined) ? "" : p.stock;
  document.getElementById("edit-prod-category").value = p.category ?? (categories[0]?.id || "");
  document.getElementById("edit-prod-active").checked = !!p.active;
  modalProduct.style.display = "flex";
}

document.getElementById("form-edit-product").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id       = e.target.dataset.id;
  const name     = document.getElementById("edit-prod-name").value.trim();
  const price    = parseFloat(document.getElementById("edit-prod-price").value);
  const stockVal = document.getElementById("edit-prod-stock").value;
  const stock    = stockVal === "" ? null : parseInt(stockVal, 10);
  const category = document.getElementById("edit-prod-category").value;
  const active   = document.getElementById("edit-prod-active").checked;
  if (!name || isNaN(price)) return alert("Nome e prezzo sono obbligatori");
  await api.put(`/api/products?id=${id}`, { name, price, stock, category, active });
  modalProduct.style.display = "none";
  await loadProducts();
});

// ---------------- CARRELLO ----------------
async function addToCart(productId) {
  const prod = findProduct(productId);
  if (!prod) return;
  try {
    if (prod.stock !== null && prod.stock !== undefined) {
      const updated = await api.put(`/api/products?id=${productId}&action=stock-decrement`, {});
      prod.stock = updated.stock;
    }
    const existing = cart.find(i => i.productId === productId);
    if (existing) existing.qty++;
    else cart.push({ productId, name: prod.name, price: Number(prod.price), qty: 1 });
    renderCart();
    renderHome();
  } catch (err) { alert(err.message); }
}

async function removeOneFromCart(productId) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  try {
    const prod = findProduct(productId);
    if (prod && prod.stock !== null && prod.stock !== undefined) {
      const updated = await api.put(`/api/products?id=${productId}&action=stock-increment`, {});
      prod.stock = updated.stock;
    }
    item.qty--;
    if (item.qty <= 0) cart = cart.filter(i => i.productId !== productId);
    renderCart();
    renderHome();
  } catch (err) { alert(err.message); }
}

function renderCart() {
  cartList.innerHTML = "";
  let total = 0;
  cart.forEach(i => {
    const li = document.createElement("li");
    li.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;";
    const left = document.createElement("span");
    left.textContent = `${i.name} × ${i.qty}`;
    const right = document.createElement("span");
    right.textContent = EUR(i.price * i.qty);
    const del = document.createElement("img");
    del.src = "https://github.com/giovannigrimoldi93-glitch/bar-sl-files/blob/b47ccbd638e8f3c1d32a02bcbe9bcaf17b8f150a/IMG_1206.png?raw=1";
    del.alt = "rimuovi"; del.style.cssText = "height:18px;cursor:pointer;";
    del.onclick = () => removeOneFromCart(i.productId);
    const wrapRight = document.createElement("div");
    wrapRight.style.cssText = "display:flex;align-items:center;gap:8px;";
    wrapRight.append(right, del);
    li.append(left, wrapRight);
    cartList.appendChild(li);
    total += i.price * i.qty;
  });
  cartTotalEl.innerHTML = `<strong style="color:#004aad;font-size:18px;">Totale: €${total.toFixed(2)}</strong>`;
}

document.getElementById("clear-cart").addEventListener("click", async () => {
  if (cart.length === 0) return;
  if (!confirm("Vuoi davvero svuotare il carrello?")) return;
  for (const item of cart) {
    const prod = findProduct(item.productId);
    if (prod && prod.stock !== null && prod.stock !== undefined) {
      await api.put(`/api/products?id=${item.productId}&action=stock-increment-bulk`, { qty: item.qty });
      prod.stock += item.qty;
    }
  }
  cart = [];
  renderCart();
  renderHome();
});

// ---------------- STAMPA ----------------
printBtn.addEventListener("click", async () => {
  if (cart.length === 0) return alert("Carrello vuoto!");
  try {
    const now    = new Date();
    const dayKey = todayKeyInRome(now);
    const total  = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const result = await api.post("/api/orders", { items: cart, total, dayKey });
    const orderNumber = result.order_number;
    const dateStr = now.toLocaleDateString("it-IT");
    const timeStr = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const w = window.open("", "Stampa", "width=400,height=600");
    w.document.write(`<html><head><style>
      body{font-family:monospace;font-size:16px;text-align:center;}
      h2{margin:4px 0;}.line{margin:8px 0;border-top:1px dashed #000;}
      .item{display:flex;justify-content:space-between;font-size:18px;font-weight:bold;}
      .totale{margin-top:8px;font-size:20px;font-weight:bold;}
      .small{font-size:12px;margin-top:4px;}
    </style></head><body>
      <h2>${barName}</h2>
      <img src="https://raw.githubusercontent.com/giovannigrimoldi93-glitch/bar-sl-files/refs/heads/main/Logo-parrocchia-2.svg" width="80"/>
      <div>${dateStr} ${timeStr}</div><div>Ordine #${orderNumber}</div>
      <div class="line"></div>
      ${cart.map(i=>`<div class="item"><span>${i.name} x${i.qty}</span><span>${EUR(i.price*i.qty)}</span></div>`).join("")}
      <div class="line"></div>
      <div class="totale">TOTALE: ${EUR(total)}</div>
      <div class="line"></div>
      <div style="margin-top:8px;">Grazie!</div>
      <div class="small">NON FISCALE</div>
    </body></html>`);
    w.document.close(); w.print();
    cart = []; renderCart(); renderHome();
  } catch (err) { console.error(err); alert("Errore durante la stampa."); }
});

// ---------------- STORICO ----------------
function todayStr() { return todayKeyInRome(new Date()); }
function offsetDay(n) { const d = new Date(); d.setDate(d.getDate()+n); return todayKeyInRome(d); }
function firstDayOfMonth() { const d = new Date(); d.setDate(1); return todayKeyInRome(d); }

document.getElementById("history-presets").addEventListener("click", (e) => {
  const btn = e.target.closest(".preset-btn");
  if (!btn) return;
  const from  = document.getElementById("history-date-from");
  const to    = document.getElementById("history-date-to");
  const today = todayStr();
  const p     = btn.dataset.preset;
  if (p === "today")     { from.value = today;             to.value = today; }
  if (p === "yesterday") { from.value = offsetDay(-1);     to.value = offsetDay(-1); }
  if (p === "week")      { from.value = offsetDay(-6);     to.value = today; }
  if (p === "month")     { from.value = firstDayOfMonth(); to.value = today; }
  if (p === "all")       { from.value = "2000-01-01";      to.value = today; }
  loadHistory(from.value, to.value);
});

historyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const from = document.getElementById("history-date-from").value;
  const to   = document.getElementById("history-date-to").value;
  if (!from || !to) return;
  if (from > to) return alert("La data 'Dal' deve essere precedente o uguale a 'Al'");
  loadHistory(from, to);
});

async function loadHistory(from, to) {
  try {
    const orders = await api.get(`/api/orders?from=${from}&to=${to}`);
    const totals = new Map();
    let totalRevenue = 0;
    orders.forEach(order => {
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      (items || []).forEach(it => {
        const prev = totals.get(it.name) || { qty: 0, revenue: 0 };
        const qty  = it.qty || 1;
        totals.set(it.name, { qty: prev.qty + qty, revenue: prev.revenue + (it.price||0)*qty });
        totalRevenue += (it.price||0)*qty;
      });
    });
    let topProduct = "—", topQty = 0;
    totals.forEach((v, name) => { if (v.qty > topQty) { topQty = v.qty; topProduct = name; } });

    document.getElementById("history-summary").style.display = "flex";
    document.getElementById("summary-total").textContent  = EUR(totalRevenue);
    document.getElementById("summary-orders").textContent = orders.length;
    document.getElementById("summary-top").textContent    = topProduct + (topQty > 0 ? ` (${topQty})` : "");

    historyBody.innerHTML = "";
    [...totals.entries()].sort((a,b) => b[1].qty - a[1].qty).forEach(([name, v]) => {
      historyBody.insertAdjacentHTML("beforeend",
        `<tr><td>${name}</td><td>${v.qty}</td><td>${EUR(v.revenue)}</td></tr>`);
    });
    historyTotalEl.innerHTML = `<strong style="font-size:18px;color:#004aad;">Totale periodo: ${EUR(totalRevenue)}</strong>`;
  } catch (err) { console.error(err); alert("Errore nel caricamento dello storico."); }
}

// ---------------- EXPORT ----------------
exportBtnCSV.addEventListener("click", () => {
  const from = document.getElementById("history-date-from").value || "nd";
  const to   = document.getElementById("history-date-to").value   || "nd";
  const rows = [["Prodotto","Quantità","Ricavo"]];
  document.querySelectorAll("#history-table tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length === 3) rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText]);
  });
  rows.push(["TOTALE","",document.getElementById("summary-total").textContent]);
  const blob = new Blob([rows.map(r=>r.join(",")).join("\n")], {type:"text/csv;charset=utf-8"});
  const a = Object.assign(document.createElement("a"), {href:URL.createObjectURL(blob), download:`storico_${from}_${to}.csv`});
  a.click(); URL.revokeObjectURL(a.href);
});

exportBtnPDF.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();
  const from = document.getElementById("history-date-from").value || "—";
  const to   = document.getElementById("history-date-to").value   || "—";
  docPdf.setFontSize(16);
  docPdf.text(`Storico Ordini: ${from} → ${to}`, 14, 20);
  const rows = [];
  document.querySelectorAll("#history-table tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length === 3) rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText]);
  });
  rows.push(["TOTALE","",document.getElementById("summary-total").textContent]);
  docPdf.autoTable({ startY:30, head:[["Prodotto","Quantità","Ricavo"]], body:rows, theme:"grid", headStyles:{fillColor:[0,74,173],textColor:255}, styles:{fontSize:12} });
  docPdf.save(`storico_${from}_${to}.pdf`);
});

exportBtnXSLX.addEventListener("click", () => {
  const from = document.getElementById("history-date-from").value || "nd";
  const to   = document.getElementById("history-date-to").value   || "nd";
  const rows = [["Prodotto","Quantità","Ricavo"]];
  document.querySelectorAll("#history-table tr").forEach(tr => {
    const [c1,c2,c3] = tr.querySelectorAll("td");
    if (c1&&c2&&c3) rows.push([c1.innerText.trim(),c2.innerText.trim(),c3.innerText.trim()]);
  });
  rows.push(["TOTALE","",document.getElementById("summary-total").textContent]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Storico");
  XLSX.writeFile(wb, `storico_${from}_${to}.xlsx`);
});

// ---------------- MODALI ----------------
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => { if (e.target.classList.contains("modal")) m.style.display = "none"; });
});

// ---------------- AVVIO ----------------
// Avvio diretto (no login)
document.getElementById("login-box").style.display = "none";
document.getElementById("app").style.display = "block";
initApp();

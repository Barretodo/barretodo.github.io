(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const cfg = window.BT_CONFIG;
  const scriptUrl = document.currentScript ? document.currentScript.src : window.location.href;
  const dataUrl = file => new URL(`../data/${file}`, scriptUrl).href;

  let categories = [];
  let products = [];
  let extraProducts = [];
  let cachedLogoImage = null;
  let loadError = "";

  const state = {
    screen: "inicio",
    category: "todos",
    search: "",
    quote: {},
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    quoteNotes: "",
    deliveryMode: "delivery",
    discountPercent: 0,
    adminUnlocked: false,
    extraCounter: 0,
    lastWhatsappMessage: "",
    lastPdfUrl: "",
    lastPdfName: "",
    pendingPdfBlob: null,
    pendingPdfName: ""
  };

  const screens = {
    inicio: $("#screenHome"),
    catalogo: $("#screenCatalog")
  };

  function safe(text){
    return String(text || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function cleanText(value){
    if(value === null || value === undefined) return "";
    const text = String(value).trim();
    return text === "undefined" || text === "null" ? "" : text;
  }

  function productDetail(product){
    return cleanText(product && product.presentation);
  }

  function productDescription(product){
    const name = cleanText(product && product.name);
    const detail = productDetail(product);
    return detail ? `${name} - ${detail}` : name;
  }

  function plain(text){
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
  }

  function money(value){
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: cfg.currency || "ARS",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function parseMoney(value){
    if(value === null || value === undefined || value === "") return null;
    const clean = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
    const number = Number(clean);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeKey(value){
    return String(value || "")
      .trim()
      .replace(/^\uFEFF/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function csvDelimiter(text){
    const firstLine = String(text || "").split(/\r?\n/)[0] || "";
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    return semicolons >= commas ? ";" : ",";
  }

  function parseCsv(text){
    const delimiter = csvDelimiter(text);
    const rows = [];
    let row = [], cell = "", quoted = false;
    for(let i = 0; i < text.length; i++){
      const char = text[i], next = text[i + 1];
      if(char === '"' && quoted && next === '"'){ cell += '"'; i++; continue; }
      if(char === '"'){ quoted = !quoted; continue; }
      if(char === delimiter && !quoted){ row.push(cell); cell = ""; continue; }
      if((char === "\n" || char === "\r") && !quoted){
        if(char === "\r" && next === "\n") i++;
        row.push(cell);
        if(row.some(v => String(v).trim() !== "")) rows.push(row);
        row = []; cell = "";
        continue;
      }
      cell += char;
    }
    row.push(cell);
    if(row.some(v => String(v).trim() !== "")) rows.push(row);
    const headers = (rows.shift() || []).map(normalizeKey);
    return rows.map(values => {
      const item = {};
      headers.forEach((header, index) => item[header] = (values[index] || "").trim());
      return item;
    });
  }

  async function loadCsv(path){
    const url = new URL(path);
    url.searchParams.set("_", String(Date.now()));
    const response = await fetch(url.href, { cache: "no-store" });
    if(!response.ok) throw new Error(`No se pudo cargar ${url.pathname}`);
    return parseCsv(await response.text());
  }

  async function loadData(){
    const [catRows, productRows] = await Promise.all([
      loadCsv(dataUrl("categorias.csv")),
      loadCsv(dataUrl("productos.csv"))
    ]);

    categories = catRows
      .filter(cat => !["no", "false", "0"].includes(normalizeKey(cat.activo || "si")))
      .map(cat => ({ id: cat.id, name: cat.nombre || cat.name || cat.id, prefix: cat.prefijo || "" }));
    if(!categories.some(cat => cat.id === "todos")){
      categories.unshift({ id: "todos", name: "Todo", prefix: "TOD" });
    }
    const activeCategoryIds = new Set(categories.map(cat => cat.id));
    const codeCounters = {};
    products = productRows
      .filter(product => !["no", "false", "0"].includes(normalizeKey(product.activo || "si")))
      .map(product => {
        const category = product.categoria || product.category;
        const categoryData = categories.find(cat => cat.id === category);
        codeCounters[category] = (codeCounters[category] || 0) + 1;
        const generatedCode = `${(categoryData && categoryData.prefix) || prefixForCategory(category, 0)}${String(codeCounters[category]).padStart(3, "0")}`;
        const code = product.codigo || product.cod || product.id || generatedCode;
        return {
          code,
          id: code,
          category,
          name: cleanText(product.nombre || product.name),
          presentation: cleanText(product.presentacion || product.presentation || product.descripcion || product.description),
          price: parseMoney(product.precio),
          image: product.imagen || product.image
        };
      })
      .filter(product => product.category === "todos" || activeCategoryIds.has(product.category))
      .filter(product => product.id && product.category && product.name);

    if(products.length === 0){
      throw new Error("El CSV de productos no tiene productos activos validos.");
    }
  }

  function prefixForCategory(id, index){
    const map = {
      todos: "TOD",
      papeles: "PAP",
      bolsas: "BOL",
      quimicos: "QUI",
      herramientas: "HER",
      trapos: "TRA",
      aerosoles: "AER",
      accesorios: "ACC",
      dispensers: "DIS"
    };
    return map[id] || String(id || `CAT${index}`).slice(0, 3).toUpperCase();
  }

  function icon(name){
    const paths = {
      grid: '<path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/>',
      paper: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5"/><path d="M10 13h6"/><path d="M10 17h6"/>',
      bag: '<path d="M6 8h12l1 13H5z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
      cloth: '<path d="M7 4h10l3 6-4 10H8L4 10z"/><path d="M8 10h8"/><path d="M9 15h6"/>',
      spray: '<path d="M10 4h5"/><path d="M12 4v4"/><path d="M9 8h7v13H8V11z"/><path d="M16 10h4"/><path d="M19 7l2-2"/><path d="M20 13l2 1"/>',
      accessory: '<path d="M7 5h10v5H7z"/><path d="M9 10v9"/><path d="M15 10v9"/><path d="M6 19h12"/>',
      broom: '<path d="M15 3l-5 5"/><path d="M9 9l6 6"/><path d="M4 20l5-11 6 6z"/><path d="M6.5 15.5l2 2"/><path d="M8.5 12.5l3 3"/>',
      box: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
      plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      minus: '<path d="M5 12h14"/>',
      close: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>'
    };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
  }

  function categoryIcon(id){
    return {
      todos: "grid", papeles: "paper", bolsas: "bag", quimicos: "drop", trapos: "cloth",
      aerosoles: "spray", accesorios: "accessory", herramientas: "broom", dispensers: "box"
    }[id] || "grid";
  }

  function showScreen(name){
    Object.values(screens).forEach(screen => screen.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    state.screen = name;
    $("#backBtn").classList.toggle("is-hidden", name === "inicio");
    window.scrollTo({ top: 0, behavior: "auto" });
    updateCounts();
  }

  function categoryName(id){
    return (categories.find(cat => cat.id === id) || categories[0] || { name: "Productos" }).name;
  }

  function renderCategoryButtons(container){
    container.innerHTML = "";
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `cat-tab ${state.category === cat.id ? "is-active" : ""}`;
      btn.innerHTML = `${icon(categoryIcon(cat.id))}<span>${safe(cat.name)}</span>`;
      btn.addEventListener("click", () => {
        state.category = cat.id;
        renderCatalog();
      });
      container.appendChild(btn);
    });
  }

  function filteredProducts(){
    const term = state.search.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return products.filter(product => {
      const byCategory = state.category === "todos" || product.category === state.category;
      if(!byCategory) return false;
      if(!term) return true;
      const haystack = `${product.code} ${product.name} ${product.presentation} ${categoryName(product.category)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(term);
    });
  }

  function qty(id){ return state.quote[id] || 0; }

  function setQty(id, value){
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    if(amount === 0) delete state.quote[id];
    else state.quote[id] = amount;
    markQuoteChanged();
    renderProducts();
    renderQuote();
    updateCounts();
  }

  function renderCatalog(){
    if(loadError){
      renderDataError();
      return;
    }
    renderCategoryButtons($("#categoryTabs"));
    renderCategoryButtons($("#categoryChips"));
    $("#catalogTitle").textContent = state.category === "todos" ? "Todos los productos" : categoryName(state.category);
    $("#catalogNotice").textContent = cfg.catalogNotice;
    $("#infoText").textContent = cfg.catalogNotice;
    renderProducts();
    renderQuote();
    updateCounts();
  }

  function renderDataError(){
    $("#categoryTabs").innerHTML = "";
    $("#categoryChips").innerHTML = "";
    $("#catalogTitle").textContent = "Productos no cargados";
    $("#catalogNotice").textContent = cfg.catalogNotice;
    $("#infoText").textContent = loadError;
    $("#productsGrid").innerHTML = `
      <div class="no-results">
        <strong>No se pudo cargar la base CSV.</strong><br>
        ${safe(loadError)}
      </div>
    `;
    updateCounts();
  }

  function renderProducts(){
    const grid = $("#productsGrid");
    const list = filteredProducts();
    grid.innerHTML = "";
    if(list.length === 0){
      grid.innerHTML = '<div class="no-results">No encontramos productos con ese filtro.</div>';
      return;
    }
    list.forEach(product => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        <div class="product-img">
          <img src="${safe(product.image)}" alt="${safe(product.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='Imagen no disponible';" />
        </div>
        <div class="product-body">
          <div class="product-code">${safe(product.code)}</div>
          <div class="product-name">${safe(product.name)}</div>
          <div class="product-pres">${safe(product.presentation)}</div>
          <div class="prices">
            ${product.price == null ? '<div class="consultar">Precio: consultar</div>' : `<div class="price-wholesale">Precio <b>${money(product.price)}</b></div>`}
          </div>
          <div class="qty-row">
            <button type="button" data-minus="${safe(product.id)}" aria-label="Restar ${safe(product.name)}">${icon("minus")}</button>
            <span>${qty(product.id)}</span>
            <button type="button" data-plus="${safe(product.id)}" aria-label="Sumar ${safe(product.name)}">${icon("plus")}</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
    $$("[data-plus]", grid).forEach(btn => btn.addEventListener("click", () => setQty(btn.dataset.plus, qty(btn.dataset.plus) + 1)));
    $$("[data-minus]", grid).forEach(btn => btn.addEventListener("click", () => setQty(btn.dataset.minus, qty(btn.dataset.minus) - 1)));
  }

  function quoteList(){
    const availableProducts = products.concat(extraProducts);
    return Object.entries(state.quote)
      .map(([id, amount]) => ({ product: availableProducts.find(product => product.id === id), qty: amount }))
      .filter(item => item.product);
  }

  function totals(){
    const subtotal = quoteList().reduce((sum, item) => sum + ((item.product.price || 0) * item.qty), 0);
    const discountPercent = Math.max(0, Math.min(100, Number(state.discountPercent) || 0));
    const discountAmount = Math.round(subtotal * discountPercent / 100);
    return { subtotal, discountPercent, discountAmount, total: Math.max(0, subtotal - discountAmount) };
  }

  function selectedCount(){
    return quoteList().reduce((sum, item) => sum + item.qty, 0);
  }

  function renderSummary(container){
    const t = totals();
    container.innerHTML = `
      <div><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div>
      <div><span>Descuento ${t.discountPercent}%</span><strong>-${money(t.discountAmount)}</strong></div>
      <div class="summary-total"><span>Total</span><strong>${money(t.total)}</strong></div>
    `;
  }

  function renderQuoteInto(container){
    const list = quoteList();
    container.innerHTML = "";
    if(list.length === 0){
      container.innerHTML = '<div class="empty-list">Todavia no agregaste productos.</div>';
      return;
    }
    list.forEach(({ product, qty: amount }) => {
      const item = document.createElement("div");
      item.className = "quote-item";
      const detail = productDetail(product);
      const unitPrice = product.price == null ? "Consultar" : money(product.price);
      const lineTotal = product.price == null ? "Consultar" : money(product.price * amount);
      const media = product.image
        ? `<img src="${safe(product.image)}" alt="" loading="lazy" />`
        : `<div class="quote-item-placeholder">${safe(product.code)}</div>`;
      item.innerHTML = `
        ${media}
        <div class="quote-item-info">
          <strong>${safe(product.code)} - ${safe(product.name)}</strong>
          ${detail ? `<span>${safe(detail)}</span>` : ""}
          <div class="quote-price-lines">
            <span>Unitario: ${safe(unitPrice)}</span>
            <strong>Importe: ${safe(lineTotal)}</strong>
          </div>
          <div class="quote-item-controls">
            <div class="mini-qty" aria-label="Cantidad">
              <button type="button" data-quote-minus="${safe(product.id)}" aria-label="Restar ${safe(product.name)}">${icon("minus")}</button>
              <input data-quote-qty="${safe(product.id)}" type="number" min="0" step="1" value="${amount}" inputmode="numeric" aria-label="Cantidad de ${safe(product.name)}" />
              <button type="button" data-quote-plus="${safe(product.id)}" aria-label="Sumar ${safe(product.name)}">${icon("plus")}</button>
            </div>
            <button class="quote-remove" type="button" data-remove="${safe(product.id)}" aria-label="Quitar">${icon("close")}</button>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
    $$("[data-quote-plus]", container).forEach(btn => btn.addEventListener("click", () => setQty(btn.dataset.quotePlus, qty(btn.dataset.quotePlus) + 1)));
    $$("[data-quote-minus]", container).forEach(btn => btn.addEventListener("click", () => setQty(btn.dataset.quoteMinus, qty(btn.dataset.quoteMinus) - 1)));
    $$("[data-quote-qty]", container).forEach(input => {
      input.addEventListener("change", () => setQty(input.dataset.quoteQty, input.value));
      input.addEventListener("keydown", event => {
        if(event.key === "Enter") input.blur();
      });
    });
    $$("[data-remove]", container).forEach(btn => btn.addEventListener("click", () => setQty(btn.dataset.remove, 0)));
  }

  function renderQuote(){
    renderQuoteInto($("#quoteItems"));
    renderQuoteInto($("#desktopQuoteItems"));
    renderSummary($("#mobileSummary"));
    renderSummary($("#desktopSummary"));
  }

  function updateCounts(){
    const count = selectedCount();
    const label = count === 1 ? "1 producto seleccionado" : `${count} productos seleccionados`;
    $("#topListCount").textContent = count;
    $("#bottomCount").textContent = count;
    $("#bottomLabel").textContent = count === 1 ? "producto seleccionado" : "productos seleccionados";
    $("#drawerSubtitle").textContent = count ? label : "Sin productos seleccionados";
    $("#desktopSubtitle").textContent = count ? label : "Sin productos seleccionados";
    $("#openListTop").classList.toggle("is-hidden", !(state.screen === "catalogo" && count > 0));
    $("#openListDesktop").classList.toggle("is-hidden", !(state.screen === "catalogo" && count > 0));
    $("#bottomBar").classList.toggle("is-hidden", !(state.screen === "catalogo" && count > 0));
  }

  function syncCustomerFrom(source){
    const desktop = source === "desktop";
    const name = $(desktop ? "#customerNameDesktop" : "#customerName").value.trim();
    const phone = $(desktop ? "#customerPhoneDesktop" : "#customerPhone").value.trim();
    const address = $(desktop ? "#deliveryAddressDesktop" : "#deliveryAddress").value.trim();
    const notes = $(desktop ? "#quoteNotesDesktop" : "#quoteNotes").value.trim();
    const changed = name !== state.customerName || phone !== state.customerPhone || address !== state.deliveryAddress || notes !== state.quoteNotes;
    state.customerName = name;
    state.customerPhone = phone;
    state.deliveryAddress = address;
    state.quoteNotes = notes;
    if(changed) markQuoteChanged();
    $(desktop ? "#customerName" : "#customerNameDesktop").value = name;
    $(desktop ? "#customerPhone" : "#customerPhoneDesktop").value = phone;
    $(desktop ? "#deliveryAddress" : "#deliveryAddressDesktop").value = address;
    $(desktop ? "#quoteNotes" : "#quoteNotesDesktop").value = notes;
  }

  function setPickup(){
    state.deliveryMode = "pickup";
    state.deliveryAddress = cfg.address;
    $("#deliveryAddress").value = cfg.address;
    $("#deliveryAddressDesktop").value = cfg.address;
    $("#deliveryNote").textContent = `Retira por ${cfg.address}.`;
    $("#deliveryNoteDesktop").textContent = `Retira por ${cfg.address}.`;
    markQuoteChanged();
  }

  function refreshBodyLock(){
    const locked = ["#quoteDrawer", "#infoModal", "#adminModal", "#saveModal"].some(selector => {
      const el = $(selector);
      return el && el.classList.contains("is-open");
    });
    document.body.classList.toggle("no-scroll", locked);
  }

  function openAdminPin(){
    if(state.adminUnlocked){
      showAdminPanels();
      return;
    }
    $("#adminPinInput").value = "";
    $("#adminPinError").textContent = "";
    $("#adminModal").classList.add("is-open");
    $("#adminModal").setAttribute("aria-hidden", "false");
    refreshBodyLock();
    setTimeout(() => $("#adminPinInput").focus(), 80);
  }

  function closeAdminPin(){
    $("#adminModal").classList.remove("is-open");
    $("#adminModal").setAttribute("aria-hidden", "true");
    refreshBodyLock();
  }

  function showAdminPanels(){
    state.adminUnlocked = true;
    $("#adminPanelMobile").classList.remove("is-hidden");
    $("#adminPanelDesktop").classList.remove("is-hidden");
    $("#adminAccessMobile").classList.add("is-hidden");
    $("#adminAccessDesktop").classList.add("is-hidden");
    requestAnimationFrame(() => {
      const panel = window.matchMedia("(min-width: 980px)").matches ? $("#adminPanelDesktop") : $("#adminPanelMobile");
      panel.scrollIntoView({ block: "nearest" });
    });
  }

  function unlockAdmin(){
    const pin = $("#adminPinInput").value.trim();
    if(pin !== String(cfg.discountPin || "")){
      $("#adminPinError").textContent = "PIN incorrecto.";
      $("#adminPinInput").select();
      return false;
    }
    showAdminPanels();
    closeAdminPin();
    return true;
  }

  function keepMobileAdminButtonVisible(){
    if(window.matchMedia("(min-width: 980px)").matches) return;
    setTimeout(() => {
      $("#addExtraMobile").scrollIntoView({ block: "center" });
    }, 280);
  }

  function setDiscount(value){
    state.discountPercent = Math.max(0, Math.min(100, Number(value) || 0));
    $("#discountPercent").value = state.discountPercent;
    $("#discountPercentDesktop").value = state.discountPercent;
    markQuoteChanged();
    renderQuote();
  }

  function markQuoteChanged(){
    state.lastWhatsappMessage = "";
    if(state.lastPdfUrl){
      URL.revokeObjectURL(state.lastPdfUrl);
      state.lastPdfUrl = "";
      state.lastPdfName = "";
    }
    state.pendingPdfBlob = null;
    state.pendingPdfName = "";
    $("#whatsappMobile").classList.add("is-hidden");
    $("#whatsappDesktop").classList.add("is-hidden");
    $("#downloadLinkMobile").classList.add("is-hidden");
    $("#downloadLinkDesktop").classList.add("is-hidden");
  }

  function validateQuote(){
    syncCustomerFrom(window.matchMedia("(min-width: 980px)").matches ? "desktop" : "mobile");
    if(quoteList().length === 0){
      alert("Agrega al menos un producto para generar el presupuesto.");
      return false;
    }
    if(!state.customerName){
      alert("Completa el nombre del cliente o empresa.");
      return false;
    }
    if(!state.customerPhone){
      alert("Completa el telefono de contacto del cliente.");
      return false;
    }
    if(!state.deliveryAddress){
      alert("Indica direccion de entrega o selecciona retiro por el local.");
      return false;
    }
    return true;
  }

  function extraField(name, source){
    return $(`#${name}${source === "desktop" ? "Desktop" : ""}`);
  }

  function clearExtraForm(source){
    extraField("extraName", source).value = "";
    extraField("extraPresentation", source).value = "";
    extraField("extraPrice", source).value = "";
    extraField("extraQty", source).value = "1";
  }

  function addExtraProduct(source){
    if(!state.adminUnlocked){
      openAdminPin();
      return;
    }
    const name = extraField("extraName", source).value.trim();
    const presentation = extraField("extraPresentation", source).value.trim();
    const price = parseMoney(extraField("extraPrice", source).value);
    const amount = Math.max(1, Math.floor(Number(extraField("extraQty", source).value) || 1));
    if(!name || !presentation || price == null){
      alert("Completa nombre, presentacion, precio y cantidad del producto extra.");
      return;
    }
    state.extraCounter += 1;
    const code = `EXT${String(state.extraCounter).padStart(3, "0")}`;
    extraProducts.push({
      code,
      id: code,
      category: "extra",
      name,
      presentation,
      price,
      image: "",
      isExtra: true
    });
    state.quote[code] = (state.quote[code] || 0) + amount;
    clearExtraForm(source);
    markQuoteChanged();
    renderQuote();
    updateCounts();
  }

  function dateText(date){
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function addDays(date, days){
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function pdfEscape(text){
    return plain(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function pdfText(x, y, size, text, bold){
    return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET\n`;
  }

  function pdfTextRight(x, y, size, text, bold){
    const value = plain(text);
    const estimatedWidth = value.length * size * .5;
    return pdfText(x - estimatedWidth, y, size, value, bold);
  }

  function pdfLine(x1, y1, x2, y2){
    return `${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  function pdfSoftLine(x1, y1, x2, y2){
    return `0.84 0.87 0.91 RG\n${pdfLine(x1, y1, x2, y2)}0.06 0.16 0.29 RG\n`;
  }

  function wrapText(text, maxLength){
    const words = plain(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if(candidate.length > maxLength && line){
        lines.push(line);
        line = word;
      }else{
        line = candidate;
      }
    });
    if(line) lines.push(line);
    return lines;
  }

  function filenameSafe(text){
    const clean = plain(text || "CLIENTE")
      .replace(/[^A-Za-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    return clean || "CLIENTE";
  }

  function quoteFilename(){
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    return `PRESUPUESTO BARRETODO ${filenameSafe(state.customerName)} ${date}.pdf`;
  }

  function normalizePdfFilename(filename){
    const clean = filenameSafe(String(filename || "").replace(/\.pdf$/i, ""));
    return `${clean}.pdf`;
  }

  function preloadLogo(){
    const img = new Image();
    img.onload = () => {
      try{
        const canvas = document.createElement("canvas");
        canvas.width = 220;
        canvas.height = 220;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cachedLogoImage = { data: canvas.toDataURL("image/jpeg", .88), width: canvas.width, height: canvas.height };
      }catch(error){
        cachedLogoImage = null;
      }
    };
    img.onerror = () => {
      cachedLogoImage = null;
    };
    img.src = "img/brand/logo.png";
  }

  function base64Bytes(dataUrl){
    const raw = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(raw.length);
    for(let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  function buildPdfBytes(pages, image){
    const encoder = new TextEncoder();
    const objects = [];
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    objects.push("<< /Type /Catalog /Pages 4 0 R >>");
    const imageId = image ? 5 : null;
    const firstPageId = image ? 6 : 5;
    const pageIds = pages.map((_, index) => firstPageId + index * 2);
    objects.push(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
    if(image){
      const imgBytes = base64Bytes(image.data);
      objects.push({ header: `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>`, stream: imgBytes });
    }
    pages.forEach((content, index) => {
      const pageId = firstPageId + index * 2;
      const contentId = pageId + 1;
      const resources = image
        ? `<< /Font << /F1 1 0 R /F2 2 0 R >> /XObject << /Logo ${imageId} 0 R >> >>`
        : "<< /Font << /F1 1 0 R /F2 2 0 R >> >>";
      objects.push(`<< /Type /Page /Parent 4 0 R /MediaBox [0 0 595 842] /Resources ${resources} /Contents ${contentId} 0 R >>`);
      objects.push({ header: `<< /Length ${encoder.encode(content).length} >>`, stream: encoder.encode(content) });
    });

    const parts = [encoder.encode("%PDF-1.4\n")];
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(parts.reduce((sum, part) => sum + part.length, 0));
      parts.push(encoder.encode(`${index + 1} 0 obj\n`));
      if(typeof object === "string"){
        parts.push(encoder.encode(`${object}\nendobj\n`));
      }else{
        parts.push(encoder.encode(`${object.header}\nstream\n`));
        parts.push(object.stream);
        parts.push(encoder.encode("\nendstream\nendobj\n"));
      }
    });
    const xref = parts.reduce((sum, part) => sum + part.length, 0);
    let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => trailer += `${String(offset).padStart(10, "0")} 00000 n \n`);
    trailer += `trailer\n<< /Size ${objects.length + 1} /Root 3 0 R >>\nstartxref\n${xref}\n%%EOF`;
    parts.push(encoder.encode(trailer));
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const bytes = new Uint8Array(total);
    let cursor = 0;
    parts.forEach(part => { bytes.set(part, cursor); cursor += part.length; });
    return bytes;
  }

  function createPdfBlob(){
    const image = cachedLogoImage;
    const list = quoteList();
    const t = totals();
    const made = new Date();
    const valid = addDays(made, cfg.quoteValidityDays || 7);
    const pages = [];
    let content = "";
    let y = 700;

    function newPage(){
      if(content) pages.push(content);
      content = "0.06 0.16 0.29 RG 0.06 0.16 0.29 rg\n";
      if(image) content += "q 62 0 0 62 480 738 cm /Logo Do Q\n";
      content += pdfText(40, 800, 20, "PRESUPUESTO", true);
      content += pdfText(40, 778, 14, cfg.businessName, true);
      content += pdfText(40, 760, 9, cfg.address, false);
      content += pdfText(40, 745, 9, `Tel: ${cfg.phone} | Web: ${cfg.website} | Instagram: ${cfg.instagram}`, false);
      content += pdfLine(40, 725, 555, 725);
      y = 700;
    }

    function drawProductTableHeader(){
      content += pdfLine(40, y + 12, 555, y + 12);
      content += pdfText(44, y, 8.5, "ARTICULO", true);
      content += pdfText(112, y, 8.5, "DESCRIPCION", true);
      content += pdfTextRight(380, y, 8.5, "CANT", true);
      content += pdfTextRight(460, y, 8.5, "PRECIO", true);
      content += pdfTextRight(545, y, 8.5, "IMPORTE", true);
      content += pdfSoftLine(40, y - 8, 555, y - 8);
      y -= 24;
    }

    newPage();
    content += pdfText(40, y, 10, `Fecha: ${dateText(made)}`, true);
    content += pdfText(220, y, 10, `Validez: hasta ${dateText(valid)}`, true);
    y -= 18;
    content += pdfText(40, y, 10, `Cliente / Empresa: ${state.customerName}`, false);
    y -= 15;
    content += pdfText(40, y, 10, `Telefono de contacto: ${state.customerPhone}`, false);
    y -= 15;
    content += pdfText(40, y, 10, `${state.deliveryMode === "pickup" ? "Retiro" : "Entrega"}: ${state.deliveryAddress}`, false);
    y -= 16;
    if(state.quoteNotes){
      content += pdfText(40, y, 10, "Observaciones:", true);
      y -= 14;
      wrapText(state.quoteNotes, 92).forEach(line => {
        content += pdfText(52, y, 8.5, line, false);
        y -= 12;
      });
      y -= 4;
    }
    y -= 22;
    content += pdfText(40, y, 8.5, "Presupuesto sin validez fiscal. No valido como factura.", true);
    y -= 24;
    drawProductTableHeader();

    list.forEach(({ product, qty }) => {
      if(y < 120){
        newPage();
        drawProductTableHeader();
      }
      const price = product.price || 0;
      const description = productDescription(product).slice(0, 58);
      const unitPrice = product.price == null ? "Consultar" : money(price);
      const amount = product.price == null ? "Consultar" : money(price * qty);
      content += pdfText(44, y, 8, product.code, false);
      content += pdfText(112, y, 8, description, false);
      content += pdfTextRight(380, y, 8, String(qty), false);
      content += pdfTextRight(460, y, 8, unitPrice, false);
      content += pdfTextRight(545, y, 8, amount, false);
      content += pdfSoftLine(40, y - 7, 555, y - 7);
      y -= 18;
    });

    y -= 8;
    content += pdfLine(340, y + 10, 555, y + 10);
    content += pdfText(365, y - 5, 10, "Subtotal", true);
    content += pdfText(485, y - 5, 10, money(t.subtotal), false);
    y -= 20;
    content += pdfText(365, y - 5, 10, `Descuento ${t.discountPercent}%`, true);
    content += pdfText(485, y - 5, 10, `-${money(t.discountAmount)}`, false);
    y -= 22;
    content += pdfText(365, y - 5, 13, "TOTAL", true);
    content += pdfText(485, y - 5, 13, money(t.total), true);
    y -= 36;
    wrapText(cfg.quoteDisclaimer, 96).forEach(line => {
      if(y < 60) newPage();
      content += pdfText(40, y, 8, line.trim(), false);
      y -= 12;
    });
    pages.push(content);

    return new Blob([buildPdfBytes(pages, image)], { type: "application/pdf" });
  }

  function updateDownloadLinks(url, filename){
    [$("#downloadLinkMobile"), $("#downloadLinkDesktop")].forEach(link => {
      link.href = url;
      link.removeAttribute("download");
      link.classList.remove("is-hidden");
    });
  }

  function setPdfUrl(blob, filename){
    if(state.lastPdfUrl) URL.revokeObjectURL(state.lastPdfUrl);
    const url = URL.createObjectURL(blob);
    state.lastPdfUrl = url;
    state.lastPdfName = filename;
    updateDownloadLinks(url, filename);
    return url;
  }

  async function savePdfBlob(blob, filename){
    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: "PDF",
            accept: { "application/pdf": [".pdf"] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setPdfUrl(blob, filename);
        return true;
      }catch(error){
        if(error && error.name === "AbortError") return false;
        throw error;
      }
    }
    const url = setPdfUrl(blob, filename);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }

  function whatsappUrl(message){
    return `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function buildMessage(){
    const t = totals();
    const lines = [
      cfg.openingMessage,
      "",
      `Cliente / Empresa: ${state.customerName}`,
      `Telefono de contacto: ${state.customerPhone}`,
      `${state.deliveryMode === "pickup" ? "Retiro" : "Entrega"}: ${state.deliveryAddress}`,
      `Notas generales: ${state.quoteNotes || "-"}`,
      "",
      "Productos:"
    ];
    quoteList().forEach(({ product, qty }) => {
      const price = product.price == null ? "Consultar" : money(product.price);
      const amount = product.price == null ? "Consultar" : money(product.price * qty);
      const detail = productDetail(product);
      const detailText = detail ? ` (${detail})` : "";
      lines.push(`- ${product.code} | ${product.name}${detailText} | Cant: ${qty} | Precio: ${price} | Importe: ${amount}`);
    });
    lines.push("", `Subtotal: ${money(t.subtotal)}`);
    if(t.discountPercent > 0) lines.push(`Descuento: ${t.discountPercent}% (-${money(t.discountAmount)})`);
    lines.push(`Total: ${money(t.total)}`, "", cfg.quoteDisclaimer);
    return lines.join("\n");
  }

  async function generatePdfOnly(){
    if(!validateQuote()) return;
    const buttons = [$("#sendQuote"), $("#sendQuoteDesktop")];
    const labels = buttons.map(btn => btn.querySelector("span").textContent);
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.querySelector("span").textContent = "Preparando PDF...";
    });
    try{
      const blob = createPdfBlob();
      const filename = quoteFilename();
      openSaveModal(blob, filename);
    }catch(error){
      console.error(error);
      alert("No se pudo generar el PDF. Revisa si el navegador bloqueo descargas o intenta nuevamente desde Chrome actualizado.");
    }finally{
      buttons.forEach((btn, index) => {
        btn.disabled = false;
        btn.querySelector("span").textContent = labels[index];
      });
    }
  }

  function sendWhatsapp(){
    if(!validateQuote()) return;
    const message = state.lastWhatsappMessage || buildMessage();
    window.open(whatsappUrl(message), "_blank", "noopener");
  }

  function openDrawer(){
    renderQuote();
    $("#quoteDrawer").classList.add("is-open");
    $("#quoteDrawer").setAttribute("aria-hidden", "false");
    refreshBodyLock();
  }

  function closeDrawer(){
    $("#quoteDrawer").classList.remove("is-open");
    $("#quoteDrawer").setAttribute("aria-hidden", "true");
    refreshBodyLock();
  }

  function openInfo(){
    $("#infoModal").classList.add("is-open");
    $("#infoModal").setAttribute("aria-hidden", "false");
    refreshBodyLock();
  }

  function closeInfo(){
    $("#infoModal").classList.remove("is-open");
    $("#infoModal").setAttribute("aria-hidden", "true");
    refreshBodyLock();
  }

  function openSaveModal(blob, filename){
    state.pendingPdfBlob = blob;
    state.pendingPdfName = filename;
    $("#pdfFilenameInput").value = filename;
    $("#savePdfError").textContent = "";
    $("#saveModal").classList.add("is-open");
    $("#saveModal").setAttribute("aria-hidden", "false");
    refreshBodyLock();
    setTimeout(() => {
      $("#pdfFilenameInput").focus();
      $("#pdfFilenameInput").select();
    }, 80);
  }

  function closeSaveModal(clearPending = true){
    $("#saveModal").classList.remove("is-open");
    $("#saveModal").setAttribute("aria-hidden", "true");
    if(clearPending){
      state.pendingPdfBlob = null;
      state.pendingPdfName = "";
    }
    refreshBodyLock();
  }

  async function confirmSavePdf(){
    if(!state.pendingPdfBlob){
      closeSaveModal();
      return;
    }
    const filename = normalizePdfFilename($("#pdfFilenameInput").value || state.pendingPdfName || quoteFilename());
    const button = $("#confirmSavePdf");
    const label = button.querySelector("span").textContent;
    button.disabled = true;
    button.querySelector("span").textContent = "Guardando...";
    $("#savePdfError").textContent = "";
    try{
      const saved = await savePdfBlob(state.pendingPdfBlob, filename);
      if(!saved) return;
      state.lastWhatsappMessage = buildMessage();
      $("#whatsappMobile").classList.remove("is-hidden");
      $("#whatsappDesktop").classList.remove("is-hidden");
      closeSaveModal();
    }catch(error){
      console.error(error);
      $("#savePdfError").textContent = "No se pudo guardar el PDF. Intenta nuevamente o revisa permisos del navegador.";
    }finally{
      button.disabled = false;
      button.querySelector("span").textContent = label;
    }
  }

  function bind(){
    $("#viewProducts").addEventListener("click", () => {
      state.category = "todos";
      renderCatalog();
      showScreen("catalogo");
    });
    $("#backBtn").addEventListener("click", () => showScreen("inicio"));
    $(".brand").addEventListener("click", event => {
      event.preventDefault();
      showScreen("inicio");
    });
    $("#searchInput").addEventListener("input", event => {
      state.search = event.target.value;
      renderProducts();
    });
    $("#customerName").addEventListener("input", () => syncCustomerFrom("mobile"));
    $("#customerPhone").addEventListener("input", () => syncCustomerFrom("mobile"));
    $("#deliveryAddress").addEventListener("input", () => { state.deliveryMode = "delivery"; syncCustomerFrom("mobile"); });
    $("#quoteNotes").addEventListener("input", () => syncCustomerFrom("mobile"));
    $("#customerNameDesktop").addEventListener("input", () => syncCustomerFrom("desktop"));
    $("#customerPhoneDesktop").addEventListener("input", () => syncCustomerFrom("desktop"));
    $("#deliveryAddressDesktop").addEventListener("input", () => { state.deliveryMode = "delivery"; syncCustomerFrom("desktop"); });
    $("#quoteNotesDesktop").addEventListener("input", () => syncCustomerFrom("desktop"));
    $("#pickupMobile").addEventListener("click", setPickup);
    $("#pickupDesktop").addEventListener("click", setPickup);
    $("#adminAccessMobile").addEventListener("click", openAdminPin);
    $("#adminAccessDesktop").addEventListener("click", openAdminPin);
    $("#confirmAdminPin").addEventListener("click", unlockAdmin);
    $("#adminPinInput").addEventListener("keydown", event => {
      if(event.key === "Enter") unlockAdmin();
    });
    $("#discountPercent").addEventListener("input", event => setDiscount(event.target.value));
    $("#discountPercentDesktop").addEventListener("input", event => setDiscount(event.target.value));
    $("#addExtraMobile").addEventListener("click", () => addExtraProduct("mobile"));
    $("#addExtraDesktop").addEventListener("click", () => addExtraProduct("desktop"));
    ["#extraName", "#extraPresentation", "#extraPrice", "#extraQty"].forEach(selector => {
      const field = $(selector);
      field.addEventListener("focus", keepMobileAdminButtonVisible);
      field.addEventListener("input", keepMobileAdminButtonVisible);
    });
    $("#openInfo").addEventListener("click", openInfo);
    $("#openListTop").addEventListener("click", openDrawer);
    $("#openListBottom").addEventListener("click", openDrawer);
    $("#openListDesktop").addEventListener("click", openDrawer);
    $("#sendQuote").addEventListener("click", generatePdfOnly);
    $("#sendQuoteDesktop").addEventListener("click", generatePdfOnly);
    $("#confirmSavePdf").addEventListener("click", confirmSavePdf);
    $("#pdfFilenameInput").addEventListener("keydown", event => {
      if(event.key === "Enter") confirmSavePdf();
    });
    $("#whatsappMobile").addEventListener("click", sendWhatsapp);
    $("#whatsappDesktop").addEventListener("click", sendWhatsapp);
    $("#clearQuote").addEventListener("click", () => {
      state.quote = {};
      extraProducts = [];
      state.extraCounter = 0;
      markQuoteChanged();
      renderProducts();
      renderQuote();
      updateCounts();
    });
    $$("[data-close-drawer]").forEach(el => el.addEventListener("click", closeDrawer));
    $$("[data-close-info]").forEach(el => el.addEventListener("click", closeInfo));
    $$("[data-close-admin]").forEach(el => el.addEventListener("click", closeAdminPin));
    $$("[data-close-save]").forEach(el => el.addEventListener("click", () => closeSaveModal()));
  }

  async function init(){
    bind();
    preloadLogo();
    try{
      await loadData();
      loadError = "";
      renderCatalog();
    }catch(error){
      console.error(error);
      loadError = "Revisa que data/productos.csv y data/categorias.csv existan, esten subidos al repositorio y que la pagina se abra desde GitHub Pages o un servidor local. Si abriste index.html con doble click, el navegador puede bloquear la lectura del CSV.";
      renderDataError();
    }
    renderQuote();
    updateCounts();
  }

  init();
})();

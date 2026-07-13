(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const cfg = window.BT_CONFIG;
  const categories = window.BT_CATEGORIES;
  const products = window.BT_PRODUCTS;

  const state = {
    screen: "inicio",
    category: "todos",
    search: "",
    quote: {}
  };

  const screens = {
    inicio: $("#screenHome"),
    catalogo: $("#screenCatalog")
  };

  function money(value){
    if(value === null || value === undefined || value === "") return "Consultar";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: cfg.currency || "ARS",
      maximumFractionDigits: 0
    }).format(value);
  }

  function safe(text){
    return String(text || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
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
      todos: "grid",
      papeles: "paper",
      bolsas: "bag",
      quimicos: "drop",
      trapos: "cloth",
      aerosoles: "spray",
      accesorios: "accessory",
      herramientas: "broom",
      dispensers: "box"
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
    return (categories.find(cat => cat.id === id) || categories[0]).name;
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
      const haystack = `${product.name} ${product.presentation} ${categoryName(product.category)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(term);
    });
  }

  function qty(id){
    return state.quote[id] || 0;
  }

  function setQty(id, value){
    const amount = Math.max(0, Number(value) || 0);
    if(amount === 0) delete state.quote[id];
    else state.quote[id] = amount;
    renderProducts();
    renderQuote();
    updateCounts();
  }

  function renderCatalog(){
    renderCategoryButtons($("#categoryTabs"));
    renderCategoryButtons($("#categoryChips"));
    $("#catalogTitle").textContent = state.category === "todos" ? "Todos los productos" : categoryName(state.category);
    $("#catalogNotice").textContent = cfg.catalogNotice;
    $("#infoText").textContent = cfg.catalogNotice;
    renderProducts();
    renderQuote();
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
          <div class="product-name">${safe(product.name)}</div>
          <div class="product-pres">${safe(product.presentation)}</div>
          <div class="prices">
            ${product.wholesale == null ? '<div class="consultar">Mayorista: consultar</div>' : `<div class="price-wholesale">Mayorista <b>${money(product.wholesale)}</b></div>`}
            ${product.retail == null ? '<div class="price-retail">Minorista: consultar</div>' : `<div class="price-retail">Minorista ${money(product.retail)}</div>`}
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
    $$("[data-plus]", grid).forEach(btn => {
      btn.addEventListener("click", () => setQty(btn.dataset.plus, qty(btn.dataset.plus) + 1));
    });
    $$("[data-minus]", grid).forEach(btn => {
      btn.addEventListener("click", () => setQty(btn.dataset.minus, qty(btn.dataset.minus) - 1));
    });
  }

  function quoteList(){
    return Object.entries(state.quote)
      .map(([id, amount]) => ({ product: products.find(product => product.id === id), qty: amount }))
      .filter(item => item.product);
  }

  function selectedCount(){
    return quoteList().reduce((sum, item) => sum + item.qty, 0);
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
      item.innerHTML = `
        <img src="${safe(product.image)}" alt="" loading="lazy" />
        <div>
          <strong>${safe(product.name)}</strong>
          <span>${safe(product.presentation)}<br>x ${amount}</span>
        </div>
        <button type="button" data-remove="${safe(product.id)}" aria-label="Quitar">${icon("close")}</button>
      `;
      container.appendChild(item);
    });
    $$("[data-remove]", container).forEach(btn => {
      btn.addEventListener("click", () => setQty(btn.dataset.remove, 0));
    });
  }

  function renderQuote(){
    renderQuoteInto($("#quoteItems"));
    renderQuoteInto($("#desktopQuoteItems"));
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

  function whatsappUrl(message){
    return `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function buildMessage(){
    const list = quoteList();
    const lines = [cfg.openingMessage, ""];
    if(list.length === 0){
      lines.push("Todavia no seleccione productos. Quiero consultar por disponibilidad, precios vigentes y condiciones de entrega.");
    } else {
      lines.push("Productos seleccionados:");
      list.forEach(({ product, qty: amount }) => {
        lines.push(`- ${product.name} (${product.presentation}) x ${amount}`);
      });
    }
    lines.push("", cfg.priceDisclaimer);
    lines.push("", `Web: ${cfg.website}`, `Direccion: ${cfg.address}`);
    return lines.join("\n");
  }

  function openWhatsApp(){
    window.open(whatsappUrl(buildMessage()), "_blank", "noopener");
  }

  function openDrawer(){
    renderQuote();
    $("#quoteDrawer").classList.add("is-open");
    $("#quoteDrawer").setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeDrawer(){
    $("#quoteDrawer").classList.remove("is-open");
    $("#quoteDrawer").setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  function openInfo(){
    $("#infoModal").classList.add("is-open");
    $("#infoModal").setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeInfo(){
    $("#infoModal").classList.remove("is-open");
    $("#infoModal").setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

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
  $("#openInfo").addEventListener("click", openInfo);
  $("#openListTop").addEventListener("click", openDrawer);
  $("#openListBottom").addEventListener("click", openDrawer);
  $("#openListDesktop").addEventListener("click", openDrawer);
  $("#sendQuote").addEventListener("click", openWhatsApp);
  $("#sendQuoteDesktop").addEventListener("click", openWhatsApp);
  $("#clearQuote").addEventListener("click", () => {
    state.quote = {};
    renderProducts();
    renderQuote();
    updateCounts();
  });
  $$("[data-close-drawer]").forEach(el => el.addEventListener("click", closeDrawer));
  $$("[data-close-info]").forEach(el => el.addEventListener("click", closeInfo));

  renderCatalog();
  renderQuote();
  updateCounts();
})();

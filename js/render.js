/* =========================================================
   DISTRITO 21 — Helpers de UI compartidos (render.js)
   Toast global + tarjeta de producto reutilizable entre
   index.html y categoria.html.
   ========================================================= */
(function (window) {
  "use strict";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---- Toast ----
  let toastTimer;
  function showToast(text) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove("translate-y-24", "opacity-0");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add("translate-y-24", "opacity-0");
    }, 2400);
  }
  window.D21Toast = showToast;

  // ---- Tarjeta de producto ----
  // Devuelve el HTML de una tarjeta glass de producto, lista para inyectar en un grid.
  function productCardHTML(p, categoriaNombre) {
    const tallas = (p.tallas || "Única").split(",").map((t) => t.trim()).filter(Boolean);
    const sinStock = p.stock !== null && p.stock !== undefined && p.stock <= 0;
    return `
    <div class="glass-card rounded-2xl overflow-hidden flex flex-col">
      <div class="aspect-[3/4] overflow-hidden relative">
        <img src="${escapeHtml(p.imagen || "")}" alt="${escapeHtml(p.nombre)}" loading="lazy"
             class="w-full h-full object-cover" onerror="this.src='https://placehold.co/600x750/1c1e1b/f3f1ea?text=Sin+Imagen'">
        ${sinStock ? `<span class="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-widest bg-black/70 px-2.5 py-1 rounded-full">Agotado</span>` : ""}
      </div>
      <div class="p-4 flex flex-col gap-2.5 flex-1">
        ${categoriaNombre ? `<span class="font-mono text-[10px] uppercase tracking-widest text-accent">${escapeHtml(categoriaNombre)}</span>` : ""}
        <h4 class="font-display font-semibold text-sm leading-snug">${escapeHtml(p.nombre)}</h4>
        <select class="talla-select w-full rounded-lg px-2.5 py-2 text-xs mt-auto" data-id="${p.id}" ${sinStock ? "disabled" : ""}>
          ${tallas.map((t) => `<option value="${escapeHtml(t)}">Talla ${escapeHtml(t)}</option>`).join("")}
        </select>
        <div class="flex items-center justify-between pt-1">
          <span class="font-display font-bold text-base">${window.D21Store.money(p.precio)}</span>
          <button class="add-btn w-9 h-9 rounded-full btn-primary flex items-center justify-center shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                  data-id="${p.id}" title="Agregar al carrito" ${sinStock ? "disabled" : ""}>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>
    </div>`;
  }
  window.D21ProductCard = productCardHTML;

  // Adjunta el listener "agregar al carrito" a un contenedor de grid (delegación de eventos).
  function wireAddToCart(gridEl, productsLookup) {
    gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-btn");
      if (!btn) return;
      const id = btn.dataset.id;
      const product = productsLookup.find((p) => p.id === id);
      if (!product) return;
      const select = gridEl.querySelector(`.talla-select[data-id="${id}"]`);
      const talla = select ? select.value : "Única";
      window.D21Cart.add(product, talla);
      showToast(`${product.nombre} agregado al carrito`);
      if (window.D21OpenCart) window.D21OpenCart();
    });
  }
  window.D21WireAddToCart = wireAddToCart;

  // ---- Tarjeta de categoría (home) ----
  function categoryCardHTML(cat, count) {
    return `
    <a href="categoria.html?cat=${encodeURIComponent(cat.slug)}" class="glass-card rounded-2xl p-6 flex flex-col items-start gap-3 group">
      <span class="text-3xl">${cat.icono || "🏷️"}</span>
      <h4 class="font-display font-bold text-lg">${escapeHtml(cat.nombre)}</h4>
      <span class="font-mono text-[11px] uppercase tracking-widest text-[var(--chalk)]/45">${count} ${count === 1 ? "producto" : "productos"}</span>
      <span class="font-mono text-[11px] uppercase tracking-widest text-accent mt-auto flex items-center gap-1 group-hover:gap-2 transition-all">
        Ver colección
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
      </span>
    </a>`;
  }
  window.D21CategoryCard = categoryCardHTML;
})(window);

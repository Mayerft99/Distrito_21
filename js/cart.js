/* =========================================================
   DISTRITO 21 — Carrito (cart.js)
   Estado del carrito compartido entre index.html y categoria.html
   vía localStorage. Incluye export a WhatsApp.
   Requiere que la página tenga en el DOM:
   #cartDrawer #cartOverlay #cartItems #cartCount #cartSubtotal
   #cartTotal #cartBtn #cartCloseBtn #whatsappBtn #toast
   ========================================================= */
(function (window) {
  "use strict";

  const CART_KEY = "d21_cart_v1";
  const WHATSAPP_NUMBER = "59170000000"; // TODO: reemplazar por el número real del vendedor (código país + número, sin +)

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("d21:cart-update"));
  }

  const Cart = {
    WHATSAPP_NUMBER,
    get() {
      return loadCart();
    },
    add(product, talla) {
      const cart = loadCart();
      const existing = cart.find((i) => i.productId === product.id && i.talla === talla);
      if (existing) existing.cantidad += 1;
      else
        cart.push({
          productId: product.id,
          nombre: product.nombre,
          precio: product.precio,
          talla: talla || "Única",
          cantidad: 1,
        });
      saveCart(cart);
    },
    setQty(idx, delta) {
      const cart = loadCart();
      if (!cart[idx]) return;
      cart[idx].cantidad += delta;
      if (cart[idx].cantidad <= 0) cart.splice(idx, 1);
      saveCart(cart);
    },
    remove(idx) {
      const cart = loadCart();
      cart.splice(idx, 1);
      saveCart(cart);
    },
    clear() {
      saveCart([]);
    },
    totals() {
      const cart = loadCart();
      const count = cart.reduce((s, i) => s + i.cantidad, 0);
      const subtotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
      return { count, subtotal };
    },
    whatsappMessage() {
      const cart = loadCart();
      const { subtotal } = this.totals();
      let msg = "*Pedido Distrito 21*\n";
      cart.forEach((item) => {
        msg += `- ${item.cantidad}x ${item.nombre} (Talla ${item.talla}) - ${window.D21Store.money(item.precio * item.cantidad)}\n`;
      });
      msg += `*Total:* ${window.D21Store.money(subtotal)}`;
      return msg;
    },
  };

  window.D21Cart = Cart;

  // ---- UI compartida: se auto-inicializa si encuentra el markup del drawer ----
  function initCartUI() {
    const drawer = document.getElementById("cartDrawer");
    if (!drawer) return; // esta página no tiene carrito (ej. admin)

    const overlay = document.getElementById("cartOverlay");
    const itemsEl = document.getElementById("cartItems");
    const countEl = document.getElementById("cartCount");
    const subtotalEl = document.getElementById("cartSubtotal");
    const totalEl = document.getElementById("cartTotal");
    const openBtn = document.getElementById("cartBtn");
    const closeBtn = document.getElementById("cartCloseBtn");
    const waBtn = document.getElementById("whatsappBtn");

    function money(n) {
      return window.D21Store.money(n);
    }
    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function render() {
      const cart = Cart.get();
      if (cart.length === 0) {
        itemsEl.innerHTML = `<p class="text-center text-[var(--chalk)]/40 font-mono text-xs uppercase tracking-widest mt-10">Tu carrito está vacío</p>`;
      } else {
        itemsEl.innerHTML = cart
          .map(
            (item, idx) => `
          <div class="glass rounded-xl p-3.5 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="font-display font-semibold text-sm truncate">${escapeHtml(item.nombre)}</p>
              <p class="font-mono text-[11px] text-[var(--chalk)]/50 mt-0.5">Talla ${escapeHtml(item.talla)} · ${money(item.precio)}</p>
              <div class="flex items-center gap-2 mt-2">
                <button class="qty-btn w-6 h-6 rounded-full glass flex items-center justify-center text-xs" data-idx="${idx}" data-op="-1">−</button>
                <span class="font-mono text-xs w-4 text-center">${item.cantidad}</span>
                <button class="qty-btn w-6 h-6 rounded-full glass flex items-center justify-center text-xs" data-idx="${idx}" data-op="1">+</button>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="font-display font-bold text-sm">${money(item.precio * item.cantidad)}</p>
              <button class="remove-btn font-mono text-[10px] uppercase text-[var(--chalk)]/40 hover:text-red-400 mt-2" data-idx="${idx}">Quitar</button>
            </div>
          </div>`
          )
          .join("");
      }
      const { count, subtotal } = Cart.totals();
      countEl.textContent = count;
      subtotalEl.textContent = money(subtotal);
      totalEl.textContent = money(subtotal);
    }

    itemsEl.addEventListener("click", (e) => {
      const qtyBtn = e.target.closest(".qty-btn");
      const rmBtn = e.target.closest(".remove-btn");
      if (qtyBtn) Cart.setQty(Number(qtyBtn.dataset.idx), Number(qtyBtn.dataset.op));
      else if (rmBtn) Cart.remove(Number(rmBtn.dataset.idx));
    });

    function openCart() {
      drawer.classList.remove("translate-x-full");
      overlay.classList.remove("opacity-0", "pointer-events-none");
    }
    function closeCart() {
      drawer.classList.add("translate-x-full");
      overlay.classList.add("opacity-0", "pointer-events-none");
    }
    if (openBtn) openBtn.addEventListener("click", openCart);
    if (closeBtn) closeBtn.addEventListener("click", closeCart);
    if (overlay) overlay.addEventListener("click", closeCart);
    window.D21OpenCart = openCart;

    if (waBtn) {
      waBtn.addEventListener("click", () => {
        if (Cart.get().length === 0) {
          window.D21Toast && window.D21Toast("Tu carrito está vacío");
          return;
        }
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(Cart.whatsappMessage())}`;
        window.open(url, "_blank");
      });
    }

    window.addEventListener("d21:cart-update", render);
    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) render();
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", initCartUI);
})(window);

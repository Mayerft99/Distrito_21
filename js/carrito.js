// ══════════════════════════════════════════════
//  DISTRITO 21 — carrito.js
// ══════════════════════════════════════════════

fetch(`${SUPABASE_URL}/rest/v1/...`)

let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// ── Agregar producto ──
function agregarAlCarrito(producto) {
  const existente = carrito.find(item =>
    item.nombre === producto.nombre && item.talla === producto.talla
  );
  if (existente) {
    existente.cantidad += 1;
  } else {
    producto.cantidad = 1;
    carrito.push(producto);
  }
  actualizarCarrito();
  mostrarMensaje("✓ Producto agregado al carrito");
}

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

// ── Actualizar UI del carrito ──
function actualizarCarrito() {
  const listaCarrito    = document.getElementById("lista-carrito");
  const totalCarrito    = document.getElementById("total-carrito");
  const contadorCarrito = document.getElementById("contador-carrito");

  if (!listaCarrito) return;

  listaCarrito.innerHTML = "";
  let total = 0;

  if (carrito.length === 0) {
    listaCarrito.innerHTML = "<p>El carrito está vacío</p>";
    totalCarrito.textContent = "Bs. 0";
    contadorCarrito.textContent = "0";
    guardarCarrito();
    return;
  }

  carrito.forEach((item, index) => {
    const div = document.createElement("div");
    div.classList.add("carrito-item");
    div.innerHTML = `
      <p><strong>${item.nombre}</strong></p>
      <p>Talla: ${item.talla || '—'}</p>
      <p>Bs. ${item.precio} x ${item.cantidad} = <strong>Bs. ${item.precio * item.cantidad}</strong></p>
      <div class="carrito-controles">
        <button class="reducir" data-index="${index}">−</button>
        <span class="cantidad">${item.cantidad}</span>
        <button class="aumentar" data-index="${index}">+</button>
        <button class="eliminar" data-index="${index}">🗑</button>
      </div>`;
    listaCarrito.appendChild(div);
    total += item.precio * item.cantidad;
  });

  totalCarrito.textContent = "Bs. " + total;
  contadorCarrito.textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
  guardarCarrito();

  document.querySelectorAll(".aumentar").forEach(btn => {
    btn.addEventListener("click", function () {
      carrito[this.dataset.index].cantidad += 1;
      actualizarCarrito();
    });
  });
  document.querySelectorAll(".reducir").forEach(btn => {
    btn.addEventListener("click", function () {
      const i = this.dataset.index;
      if (carrito[i].cantidad > 1) carrito[i].cantidad -= 1;
      else carrito.splice(i, 1);
      actualizarCarrito();
    });
  });
  document.querySelectorAll(".eliminar").forEach(btn => {
    btn.addEventListener("click", function () {
      carrito.splice(this.dataset.index, 1);
      actualizarCarrito();
    });
  });
}

// ── Abrir/cerrar panel carrito ──
document.addEventListener("DOMContentLoaded", function () {
  actualizarCarrito();

  const icono  = document.querySelector(".carrito-icono");
  const panel  = document.getElementById("panel-carrito");
  const cerrar = document.getElementById("cerrar-carrito");
  const btnWA  = document.getElementById("btn-whatsapp");

  if (icono)  icono.addEventListener("click",  () => panel.classList.add("activo"));
  if (cerrar) cerrar.addEventListener("click", () => panel.classList.remove("activo"));
  if (btnWA)  btnWA.addEventListener("click",  irAlCheckout);
});

// ── Ir al checkout ──
function irAlCheckout() {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  const nombre   = document.getElementById("cliente-nombre")?.value.trim();
  const telefono = document.getElementById("cliente-telefono")?.value.trim();
  const pago     = document.getElementById("cliente-pago")?.value;
  const direccion = document.getElementById("cliente-direccion")?.value.trim();
  const mapsLink  = document.getElementById("cliente-maps")?.value.trim();

  // Al menos uno de los dos campos de ubicación debe estar lleno
  if (!nombre || !telefono || (!direccion && !mapsLink) || !pago) {
    alert("Por favor completa nombre, teléfono, dirección o ubicación de Maps, y método de pago");
    return;
  }

  localStorage.setItem("checkout_cliente", JSON.stringify({
    nombre,
    telefono,
    direccion,
    mapsLink,
    pago
  }));

  const base = window.location.pathname.includes('/poleras/') ||
               window.location.pathname.includes('/pantalones/') ||
               window.location.pathname.includes('/zapatos/') ||
               window.location.pathname.includes('/accesorios/') ? '../' : '';
  window.location.href = base + 'checkout.html';
}

// ── Mensajes ──
function mostrarMensaje(texto, tiempo = 2000) {
  const mensaje = document.getElementById("mensaje-carrito");
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.classList.add("show");
  setTimeout(() => mensaje.classList.remove("show"), tiempo);
}

function mostrarMensajeBoton(boton, texto, tiempo = 2000) {
  let tooltip = document.createElement("div");
  tooltip.className = "tooltip-carrito";
  tooltip.textContent = texto;
  const rect = boton.getBoundingClientRect();
  tooltip.style.top  = (rect.top + window.scrollY - rect.height) + "px";
  tooltip.style.left = (rect.left + window.scrollX + rect.width + 10) + "px";
  document.body.appendChild(tooltip);
  setTimeout(() => tooltip.classList.add("show"), 10);
  setTimeout(() => {
    tooltip.classList.remove("show");
    setTimeout(() => tooltip.remove(), 300);
  }, tiempo);
}

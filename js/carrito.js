// ══════════════════════════════════════════════
//  DISTRITO 21 — carrito.js (OPTIMIZADO)
// ══════════════════════════════════════════════

const SUPABASE_URL = 'https://qhpyclwnddylziambbsj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFocHljbHduZGR5bHppYW1iYnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzI1NzAsImV4cCI6MjA4OTgwODU3MH0._JEYSQcOhg9TFhhVR_O6lYwMXhUFxj5Osx4PEFPKsQ0'; // ⚠️ Nunca uses service_role aquí

let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// ── Guardar carrito ──
function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

// ── Formato moneda ──
function formatearMoneda(valor) {
  return valor.toLocaleString('es-BO', {
    style: 'currency',
    currency: 'BOB'
  });
}

// ── Agregar producto ──
function agregarAlCarrito(producto) {
  const existente = carrito.find(item =>
    item.nombre === producto.nombre && item.talla === producto.talla
  );

  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  actualizarCarrito();
  mostrarMensaje("✓ Producto agregado al carrito");
}

// ── Actualizar UI ──
function actualizarCarrito() {
  const listaCarrito    = document.getElementById("lista-carrito");
  const totalCarrito    = document.getElementById("total-carrito");
  const contadorCarrito = document.getElementById("contador-carrito");

  listaCarrito.innerHTML = "";
  let total = 0;

  if (carrito.length === 0) {
    listaCarrito.innerHTML = "<p>El carrito está vacío</p>";
    totalCarrito.textContent = formatearMoneda(0);
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
      <p>${formatearMoneda(item.precio)} x ${item.cantidad} = 
         <strong>${formatearMoneda(item.precio * item.cantidad)}</strong></p>

      <div class="carrito-controles">
        <button class="reducir" data-index="${index}">−</button>
        <span class="cantidad">${item.cantidad}</span>
        <button class="aumentar" data-index="${index}">+</button>
        <button class="eliminar" data-index="${index}">🗑</button>
      </div>
    `;

    listaCarrito.appendChild(div);
    total += item.precio * item.cantidad;
  });

  totalCarrito.textContent = formatearMoneda(total);
  contadorCarrito.textContent = carrito.reduce((s, i) => s + i.cantidad, 0);

  guardarCarrito();
}

// ── Delegación de eventos (PRO) ──
document.addEventListener("click", function (e) {

  const index = e.target.dataset.index;

  if (e.target.classList.contains("aumentar")) {
    carrito[index].cantidad++;
    actualizarCarrito();
  }

  if (e.target.classList.contains("reducir")) {
    if (carrito[index].cantidad > 1) {
      carrito[index].cantidad--;
    } else {
      carrito.splice(index, 1);
    }
    actualizarCarrito();
  }

  if (e.target.classList.contains("eliminar")) {
    carrito.splice(index, 1);
    actualizarCarrito();
  }

});

// ── Inicialización ──
document.addEventListener("DOMContentLoaded", function () {

  actualizarCarrito();

  const icono  = document.querySelector(".carrito-icono");
  const panel  = document.getElementById("panel-carrito");
  const cerrar = document.getElementById("cerrar-carrito");
  const btnWA  = document.getElementById("btn-whatsapp");

  icono.addEventListener("click",  () => panel.classList.add("activo"));
  cerrar.addEventListener("click", () => panel.classList.remove("activo"));
  btnWA.addEventListener("click",  irAlCheckout);

});

// ── Checkout ──
function irAlCheckout() {

  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  const nombre    = document.getElementById("cliente-nombre").value.trim();
  const telefono  = document.getElementById("cliente-telefono").value.trim();
  const pago      = document.getElementById("cliente-pago").value;
  const direccion = document.getElementById("cliente-direccion").value.trim();
  const mapsLink  = document.getElementById("cliente-maps").value.trim();

  if (!nombre || !telefono || (!direccion && !mapsLink) || !pago) {
    alert("Por favor completa todos los campos requeridos");
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
               window.location.pathname.includes('/accesorios/')
               ? '../' : '';

  window.location.href = base + 'checkout.html';
}

// ── Mensajes ──
function mostrarMensaje(texto, tiempo = 2000) {
  const mensaje = document.getElementById("mensaje-carrito");
  mensaje.textContent = texto;
  mensaje.classList.add("show");

  setTimeout(() => {
    mensaje.classList.remove("show");
  }, tiempo);
}

// ── Tooltip botón ──
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

// carrito.js

// Carrito global
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// Función para agregar producto
function agregarAlCarrito(producto) {
    const existente = carrito.find(item => item.nombre === producto.nombre && item.talla === producto.talla);

    if (existente) {
        existente.cantidad += 1;
    } else {
        producto.cantidad = 1;
        carrito.push(producto);
    }

    actualizarCarrito();
}
function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

// Función para actualizar la lista del carrito
function actualizarCarrito() {
    const listaCarrito = document.getElementById("lista-carrito");
    const totalCarrito = document.getElementById("total-carrito");
    const contadorCarrito = document.getElementById("contador-carrito");

    listaCarrito.innerHTML = "";
    let total = 0;

    if (carrito.length === 0) {
        listaCarrito.innerHTML = "<p>El carrito está vacío</p>";
        totalCarrito.textContent = "Bs. 0";
        contadorCarrito.textContent = "0";
        return;
    }

    carrito.forEach((item, index) => {
        const div = document.createElement("div");
        div.classList.add("carrito-item");

        div.innerHTML = `
            <p>${item.nombre}</p>
            <p>Talla: ${item.talla}</p>
            <p>Bs. ${item.precio} x ${item.cantidad} = Bs. ${item.precio * item.cantidad}</p>
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

    totalCarrito.textContent = "Bs. " + total;
    contadorCarrito.textContent = carrito.length;
    guardarCarrito();

    // Eventos para los botones dinámicos
    document.querySelectorAll(".aumentar").forEach(btn => {
        btn.addEventListener("click", function () {
            const index = this.dataset.index;
            carrito[index].cantidad += 1;
            actualizarCarrito();
        });
    });

    document.querySelectorAll(".reducir").forEach(btn => {
        btn.addEventListener("click", function () {
            const index = this.dataset.index;
            if (carrito[index].cantidad > 1) {
                carrito[index].cantidad -= 1;
            } else {
                carrito.splice(index, 1);
            }
            actualizarCarrito();
        });
    });

    document.querySelectorAll(".eliminar").forEach(btn => {
        btn.addEventListener("click", function () {
            const index = this.dataset.index;
            carrito.splice(index, 1);
            actualizarCarrito();
        });
    });
}

// Panel carrito
const iconoCarrito = document.querySelector(".carrito-icono");
const panelCarrito = document.getElementById("panel-carrito");
const cerrarCarrito = document.getElementById("cerrar-carrito");

iconoCarrito.addEventListener("click", () => panelCarrito.classList.add("activo"));
cerrarCarrito.addEventListener("click", () => panelCarrito.classList.remove("activo"));

function mostrarMensaje(texto, tiempo = 2000) {
    const mensaje = document.getElementById("mensaje-carrito");
    mensaje.textContent = texto;
    mensaje.classList.add("show");

    setTimeout(() => {
        mensaje.classList.remove("show");
    }, tiempo);
}

function mostrarMensajeBoton(boton, texto, tiempo = 2000) {
    // Crear tooltip
    let tooltip = document.createElement("div");
    tooltip.className = "tooltip-carrito";
    tooltip.textContent = texto;

    // Posicionar tooltip al lado del botón
    const rect = boton.getBoundingClientRect();
    tooltip.style.top = (rect.top + window.scrollY - rect.height) + "px";
    tooltip.style.left = (rect.left + window.scrollX + rect.width + 10) + "px";

    document.body.appendChild(tooltip);

    // Mostrar tooltip
    setTimeout(() => tooltip.classList.add("show"), 10);

    // Ocultar y remover después
    setTimeout(() => {
        tooltip.classList.remove("show");
        setTimeout(() => tooltip.remove(), 300);
    }, tiempo);
}

function comprarPorWhatsApp() {

    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    const nombre = document.getElementById("cliente-nombre").value;
    const telefono = document.getElementById("cliente-telefono").value;
    const direccion = document.getElementById("cliente-direccion").value;
    const pago = document.getElementById("cliente-pago").value;

    if(!nombre || !telefono || !direccion || !pago){
        alert("Por favor complete sus datos");
        return;
    }

    let numero = "59175697356"; // tu número

    let mensaje = "🛒 *NUEVO PEDIDO*\n\n";

    mensaje += "👥 Cliente: " + nombre + "\n";
    mensaje += "📲 Teléfono: " + telefono + "\n";
    mensaje += "📍 Dirección: " + direccion + "\n";
    mensaje += "💳 Pago: " + pago + "\n\n";

    mensaje += "🛍️ *Productos*\n\n";

    carrito.forEach(item => {
        mensaje += "• " + item.nombre + "\n";
        mensaje += "Talla: " + item.talla + "\n";
        mensaje += "Cantidad: " + item.cantidad + "\n";
        mensaje += "Subtotal: Bs. " + (item.precio * item.cantidad) + "\n\n";
    });

    let total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    mensaje += "💰 *TOTAL: Bs. " + total + "*";

    const url = "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensaje);
	if(confirm("¿Deseas enviar este pedido por WhatsApp?")){

    window.open(url, "_blank");
    carrito = [];
    localStorage.removeItem("carrito");
    actualizarCarrito();
}
}

document.addEventListener("DOMContentLoaded", function () {

    actualizarCarrito();

    const botonWhatsapp = document.getElementById("btn-whatsapp");

    if(botonWhatsapp){
        botonWhatsapp.addEventListener("click", comprarPorWhatsApp);
    }

});
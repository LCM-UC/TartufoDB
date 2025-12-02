// js/carrito.js
// ==============================================
// SISTEMA DE CARRITO CON SUPABASE
// ==============================================

// Configuración
const CONFIG = {
  STORAGE_KEY: 'productos-en-carrito',
  ENVIO_GRATIS_MINIMO: 100,
  COSTO_ENVIO: 10
};

// ==============================================
// CLASE GESTOR DE CARRITO
// ==============================================
class CartManager {
  constructor() {
    this.carrito = this.cargarCarrito();
    this.init();
  }

  init() {
    this.actualizarBadge();
    
    // Si estamos en la página del carrito
    if (document.getElementById('cart-items')) {
      this.renderizarCarrito();
      this.configurarEventos();
    }
  }

  // Cargar carrito desde localStorage
  cargarCarrito() {
    try {
      const data = localStorage.getItem(CONFIG.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error al cargar el carrito:', error);
      return [];
    }
  }

  // Guardar carrito en localStorage
  guardarCarrito() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.carrito));
      this.actualizarBadge();
    } catch (error) {
      console.error('Error al guardar el carrito:', error);
    }
  }

  // Agregar producto al carrito
  agregarProducto(producto) {
    const itemExistente = this.carrito.find(item => item.nombre === producto.nombre);
    
    if (itemExistente) {
      itemExistente.cantidad++;
    } else {
      this.carrito.push({
        nombre: producto.nombre,
        precio: parseFloat(producto.precio),
        imagen: producto.imagen,
        cantidad: 1
      });
    }
    
    this.guardarCarrito();
    this.mostrarNotificacion(`✅ ${producto.nombre} agregado al carrito`);
    
    if (document.getElementById('cart-items')) {
      this.renderizarCarrito();
    }
  }

  // Eliminar producto del carrito
  eliminarProducto(index) {
    const producto = this.carrito[index];
    this.carrito.splice(index, 1);
    this.guardarCarrito();
    this.renderizarCarrito();
    this.mostrarNotificacion(`🗑️ ${producto.nombre} eliminado del carrito`);
  }

  // Cambiar cantidad de un producto
  cambiarCantidad(index, cambio) {
    this.carrito[index].cantidad += cambio;
    
    if (this.carrito[index].cantidad <= 0) {
      this.eliminarProducto(index);
    } else {
      this.guardarCarrito();
      this.renderizarCarrito();
    }
  }

  // Vaciar todo el carrito
  vaciarCarrito() {
    if (this.carrito.length === 0) return;
    
    if (confirm('¿Estás seguro de vaciar el carrito?')) {
      this.carrito = [];
      this.guardarCarrito();
      this.renderizarCarrito();
      this.mostrarNotificacion('🗑️ Carrito vaciado');
    }
  }

  // Calcular subtotal
  calcularSubtotal() {
    return this.carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  }

  // Calcular envío
  calcularEnvio() {
    const subtotal = this.calcularSubtotal();
    return subtotal >= CONFIG.ENVIO_GRATIS_MINIMO ? 0 : CONFIG.COSTO_ENVIO;
  }

  // Calcular total
  calcularTotal() {
    return this.calcularSubtotal() + this.calcularEnvio();
  }

  // Actualizar badge del navbar
  actualizarBadge() {
    const badge = document.getElementById('numerito');
    if (badge) {
      const totalItems = this.carrito.reduce((sum, item) => sum + item.cantidad, 0);
      badge.textContent = totalItems;
      badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
  }

  // Renderizar carrito en la página
  renderizarCarrito() {
    const cartItems = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const btnVaciar = document.getElementById('btn-vaciar-carrito');
    
    if (!cartItems) return;

    // Mostrar/ocultar elementos según si hay productos
    if (this.carrito.length === 0) {
      cartItems.style.display = 'none';
      emptyCart.style.display = 'block';
      if (btnVaciar) btnVaciar.style.display = 'none';
      this.actualizarResumen();
      return;
    }

    cartItems.style.display = 'block';
    emptyCart.style.display = 'none';
    if (btnVaciar) btnVaciar.style.display = 'block';

    // Renderizar productos
    cartItems.innerHTML = this.carrito.map((item, index) => `
      <div class="carrito-producto animate__animated animate__fadeIn">
        <div class="carrito-producto-imagen">
          <img src="${item.imagen}" alt="${item.nombre}">
        </div>
        <div class="carrito-producto-info">
          <h5 class="carrito-producto-titulo">${item.nombre}</h5>
          <p class="carrito-producto-precio">S/ ${item.precio.toFixed(2)}</p>
        </div>
        <div class="carrito-producto-cantidad">
          <button class="btn-cantidad" onclick="cartManager.cambiarCantidad(${index}, -1)">
            <i class="bi bi-dash"></i>
          </button>
          <span class="cantidad-numero">${item.cantidad}</span>
          <button class="btn-cantidad" onclick="cartManager.cambiarCantidad(${index}, 1)">
            <i class="bi bi-plus"></i>
          </button>
        </div>
        <div class="carrito-producto-subtotal">
          <p class="carrito-producto-precio">S/ ${(item.precio * item.cantidad).toFixed(2)}</p>
        </div>
        <button class="carrito-producto-eliminar" onclick="cartManager.eliminarProducto(${index})" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');

    this.actualizarResumen();
  }

  // Actualizar resumen de compra
  actualizarResumen() {
    const subtotal = this.calcularSubtotal();
    const envio = this.calcularEnvio();
    const total = this.calcularTotal();
    const faltante = CONFIG.ENVIO_GRATIS_MINIMO - subtotal;

    // Actualizar valores
    const subtotalEl = document.getElementById('subtotal');
    const envioEl = document.getElementById('envio');
    const totalEl = document.getElementById('total');
    
    if (subtotalEl) subtotalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
    if (envioEl) {
      envioEl.textContent = envio === 0 ? 'GRATIS' : `S/ ${envio.toFixed(2)}`;
      envioEl.style.color = envio === 0 ? 'var(--color-acento)' : '';
      envioEl.style.fontWeight = envio === 0 ? 'bold' : '';
    }
    if (totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;

    // Mensajes de envío
    const mensajeEnvioGratis = document.getElementById('envio-gratis-mensaje');
    const mensajeFaltante = document.getElementById('envio-faltante');
    const faltanteMonto = document.getElementById('faltante-monto');

    if (subtotal >= CONFIG.ENVIO_GRATIS_MINIMO) {
      if (mensajeEnvioGratis) mensajeEnvioGratis.style.display = 'block';
      if (mensajeFaltante) mensajeFaltante.style.display = 'none';
    } else if (subtotal > 0) {
      if (mensajeEnvioGratis) mensajeEnvioGratis.style.display = 'none';
      if (mensajeFaltante) mensajeFaltante.style.display = 'block';
      if (faltanteMonto) faltanteMonto.textContent = `S/ ${faltante.toFixed(2)}`;
    } else {
      if (mensajeEnvioGratis) mensajeEnvioGratis.style.display = 'none';
      if (mensajeFaltante) mensajeFaltante.style.display = 'none';
    }
  }

  // Configurar eventos
  configurarEventos() {
    const btnVaciar = document.getElementById('btn-vaciar-carrito');
    if (btnVaciar) {
      btnVaciar.addEventListener('click', () => this.vaciarCarrito());
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.procesarLogin(e));
    }
  }

  // Procesar login (simulado)
  procesarLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (email && password.length >= 6) {
      // Simular login exitoso
      const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
      modal.hide();
      
      this.mostrarNotificacion('✅ Sesión iniciada correctamente');
      
      // Redirigir a página de pago
      setTimeout(() => {
        this.procesarPedido();
      }, 500);
    }
  }

  // Procesar pedido con Supabase
  async procesarPedido() {
    if (this.carrito.length === 0) {
      this.mostrarNotificacion('⚠️ El carrito está vacío', 'warning');
      return;
    }

    // Preparar datos del pedido
    const pedidoData = {
      nombre: 'Cliente Demo', // Aquí irían los datos del formulario
      email: document.getElementById('email')?.value || 'cliente@demo.com',
      telefono: '+51 999 999 999',
      notas: 'Pedido desde la tienda online',
      total: this.calcularTotal()
    };

    // Preparar detalles del pedido
    // NOTA: Necesitarás obtener los IDs reales de los productos desde Supabase
    const detalles = await this.prepararDetallesPedido();

    if (detalles.length === 0) {
      this.mostrarNotificacion('⚠️ Error al preparar el pedido', 'warning');
      return;
    }

    // Crear pedido en Supabase
    const resultado = await crearPedido(pedidoData, detalles);

    if (resultado.success) {
      this.mostrarNotificacion('🎉 ¡Pedido realizado con éxito!', 'success');
      
      // Vaciar carrito
      this.carrito = [];
      this.guardarCarrito();
      this.renderizarCarrito();
      
      // Redirigir o mostrar confirmación
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } else {
      this.mostrarNotificacion('❌ Error al procesar el pedido', 'danger');
    }
  }

  // Preparar detalles del pedido con IDs de Supabase
  async prepararDetallesPedido() {
    const detalles = [];

    for (const item of this.carrito) {
      // Buscar el producto en Supabase por nombre
      const productos = await buscarProductos(item.nombre);
      
      if (productos.length > 0) {
        const producto = productos[0];
        detalles.push({
          producto_id: producto.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          subtotal: item.precio * item.cantidad
        });
      }
    }

    return detalles;
  }

  // Mostrar notificación tipo toast
  mostrarNotificacion(mensaje, tipo = 'success') {
    const toastContainer = document.getElementById('toast-container') || this.crearToastContainer();
    
    const iconos = {
      success: 'check-circle',
      warning: 'exclamation-triangle',
      danger: 'x-circle',
      info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-${iconos[tipo] || 'info-circle'}"></i> ${mensaje}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
  }

  crearToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  }
}

// ==============================================
// PÁGINA DE TIENDA
// ==============================================
class TiendaPage {
  static async init() {
    // Cargar productos desde Supabase
    await this.cargarProductos();
    
    // Configurar botones de agregar al carrito
    this.configurarBotonesCarrito();
  }

  static async cargarProductos() {
    const productos = await obtenerProductos();
    
    if (productos.length === 0) {
      console.warn('⚠️ No se encontraron productos');
      return;
    }

    console.log(`✅ ${productos.length} productos cargados desde Supabase`);
  }

  static configurarBotonesCarrito() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', function() {
        const producto = {
          nombre: this.dataset.name,
          precio: this.dataset.price,
          imagen: this.dataset.img
        };
        
        cartManager.agregarProducto(producto);
      });
    });
  }
}

// ==============================================
// INICIALIZACIÓN
// ==============================================
let cartManager;

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar gestor de carrito
  cartManager = new CartManager();
  
  // Si estamos en tienda.html, inicializar página de tienda
  if (document.querySelector('.add-to-cart')) {
    TiendaPage.init();
  }
});
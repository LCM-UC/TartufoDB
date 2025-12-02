// js/tienda-dinamica.js
// ==============================================
// CARGA DINÁMICA DE PRODUCTOS DESDE SUPABASE
// ==============================================

class TiendaDinamica {
  constructor() {
    this.contenedorProductos = document.getElementById('productos-container');
    this.filtroCategoria = null;
    this.init();
  }

  async init() {
    await this.cargarProductos();
    this.configurarFiltros();
  }

  // Cargar y renderizar productos
  async cargarProductos(categoriaId = null) {
    if (!this.contenedorProductos) return;

    // Mostrar loading
    this.mostrarLoading();

    try {
      // Obtener productos desde Supabase
      const productos = await obtenerProductos(categoriaId);
      
      if (productos.length === 0) {
        this.mostrarMensajeVacio();
        return;
      }

      // Renderizar productos
      this.renderizarProductos(productos);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      this.mostrarError();
    }
  }

  // Renderizar productos en el DOM
  renderizarProductos(productos) {
    this.contenedorProductos.innerHTML = productos.map(producto => `
      <div class="col-md-4">
        <div class="card h-100 shadow-sm animate__animated animate__zoomIn">
          <img src="${producto.imagen_url}" 
               class="card-img-top" 
               alt="${producto.nombre}"
               style="height: 250px; object-fit: cover;">
          <div class="card-body text-center">
            <h5 class="card-title">
              <i class="bi bi-cupcake"></i> ${producto.nombre}
            </h5>
            <p class="card-text">${producto.descripcion || 'Delicioso producto de pastelería'}</p>
            ${producto.categorias ? `
              <span class="badge bg-secondary mb-2">
                ${producto.categorias.nombre}
              </span>
            ` : ''}
            <p class="fw-bold text-accent">S/ ${producto.precio.toFixed(2)}</p>
            <button class="btn btn-accent add-to-cart"
                    data-id="${producto.id}"
                    data-name="${producto.nombre}"
                    data-price="${producto.precio}"
                    data-img="${producto.imagen_url}">
              <i class="bi bi-cart-plus"></i> Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Configurar eventos de los botones
    this.configurarBotonesAgregar();
  }

  // Configurar botones de agregar al carrito
  configurarBotonesAgregar() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', function() {
        const producto = {
          id: this.dataset.id,
          nombre: this.dataset.name,
          precio: this.dataset.price,
          imagen: this.dataset.img
        };
        
        if (window.cartManager) {
          window.cartManager.agregarProducto(producto);
        }
      });
    });
  }

  // Configurar filtros de categoría
  async configurarFiltros() {
    const categorias = await obtenerCategorias();
    
    // Crear menú de filtros
    const filtroContainer = document.getElementById('filtro-categorias');
    if (filtroContainer && categorias.length > 0) {
      filtroContainer.innerHTML = `
        <div class="btn-group mb-4" role="group">
          <button type="button" class="btn btn-outline-primary active" data-categoria="todas">
            Todas
          </button>
          ${categorias.map(cat => `
            <button type="button" class="btn btn-outline-primary" data-categoria="${cat.id}">
              ${cat.nombre}
            </button>
          `).join('')}
        </div>
      `;

      // Agregar eventos a los botones de filtro
      filtroContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          // Actualizar botón activo
          filtroContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');

          // Filtrar productos
          const categoriaId = e.target.dataset.categoria;
          await this.cargarProductos(categoriaId === 'todas' ? null : categoriaId);
        });
      });
    }
  }

  // Mostrar loading
  mostrarLoading() {
    this.contenedorProductos.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-3 text-muted">Cargando productos...</p>
      </div>
    `;
  }

  // Mostrar mensaje vacío
  mostrarMensajeVacio() {
    this.contenedorProductos.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
        <p class="text-muted mt-3">No se encontraron productos</p>
      </div>
    `;
  }

  // Mostrar error
  mostrarError() {
    this.contenedorProductos.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-triangle" style="font-size: 4rem; color: #dc3545;"></i>
        <p class="text-danger mt-3">Error al cargar los productos</p>
        <button class="btn btn-primary" onclick="location.reload()">
          Intentar nuevamente
        </button>
      </div>
    `;
  }

  // Buscar productos
  async buscar(termino) {
    if (!termino || termino.length < 2) {
      await this.cargarProductos();
      return;
    }

    this.mostrarLoading();
    const productos = await buscarProductos(termino);
    this.renderizarProductos(productos);
  }
}

// ==============================================
// INICIALIZACIÓN
// ==============================================
let tiendaDinamica;

document.addEventListener('DOMContentLoaded', () => {
  // Solo inicializar si estamos en la página de tienda
  if (document.getElementById('productos-container')) {
    tiendaDinamica = new TiendaDinamica();
  }

  // Configurar buscador si existe
  const buscador = document.getElementById('buscador-productos');
  if (buscador && tiendaDinamica) {
    buscador.addEventListener('input', (e) => {
      tiendaDinamica.buscar(e.target.value);
    });
  }
});
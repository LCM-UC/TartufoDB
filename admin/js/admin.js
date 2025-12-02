// admin/js/admin.js
// ==============================================
// PANEL DE ADMINISTRACIÓN
// ==============================================

class AdminPanel {
  constructor() {
    this.currentSection = 'dashboard';
    this.categorias = [];
    this.init();
  }

  async init() {
    // Verificar autenticación
    if (!authManager.isAuthenticated()) {
      window.location.href = '../login.html';
      return;
    }

    // Verificar que sea admin o empleado
    if (!authManager.hasRole('administrador') && !authManager.hasRole('empleado')) {
      alert('No tienes permisos para acceder a esta página');
      window.location.href = '../index.html';
      return;
    }

    // Mostrar info del usuario
    this.mostrarInfoUsuario();

    // Cargar datos iniciales
    await this.cargarDashboard();
    await this.cargarCategorias();

    // Configurar eventos
    this.configurarNavegacion();
    this.configurarFormProducto();
    this.configurarLogout();
  }

  // ========================================
  // INFO DE USUARIO
  // ========================================

  mostrarInfoUsuario() {
    const userInfo = document.getElementById('user-info');
    const user = authManager.currentUser;
    
    if (userInfo && user) {
      userInfo.textContent = `${user.nombre} (${user.rol})`;
    }
  }

  // ========================================
  // NAVEGACIÓN
  // ========================================

  configurarNavegacion() {
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.cambiarSeccion(section);
      });
    });
  }

  cambiarSeccion(section) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Mostrar sección seleccionada
    const targetSection = document.getElementById(`section-${section}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    // Actualizar nav activo
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    // Cargar datos de la sección
    this.cargarSeccion(section);
    this.currentSection = section;
  }

  async cargarSeccion(section) {
    switch(section) {
      case 'dashboard':
        await this.cargarDashboard();
        break;
      case 'productos':
        await this.cargarProductos();
        break;
      case 'pedidos':
        await this.cargarPedidos();
        break;
      case 'categorias':
        await this.cargarCategoriasAdmin();
        break;
      case 'clientes':
        await this.cargarClientes();
        break;
    }
  }

  // ========================================
  // DASHBOARD
  // ========================================

  async cargarDashboard() {
    try {
      // Obtener estadísticas
      const [productos, pedidos, usuarios] = await Promise.all([
        supabase.from('productos').select('*', { count: 'exact' }),
        supabase.from('pedidos').select('*, pedidos_detalles(*)', { count: 'exact' }),
        supabase.from('usuarios').select('*', { count: 'exact' }).eq('rol_id', 1)
      ]);

      // Actualizar cards de estadísticas
      document.getElementById('total-productos').textContent = productos.count || 0;
      document.getElementById('total-pedidos').textContent = pedidos.count || 0;
      document.getElementById('total-clientes').textContent = usuarios.count || 0;

      // Calcular ventas totales
      let ventasTotal = 0;
      if (pedidos.data) {
        ventasTotal = pedidos.data.reduce((sum, pedido) => sum + parseFloat(pedido.total), 0);
      }
      document.getElementById('ventas-total').textContent = `S/ ${ventasTotal.toFixed(2)}`;

      // Cargar pedidos recientes
      await this.cargarPedidosRecientes();
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    }
  }

  async cargarPedidosRecientes() {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const tbody = document.getElementById('pedidos-recientes');
      
      if (!pedidos || pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay pedidos</td></tr>';
        return;
      }

      tbody.innerHTML = pedidos.map(pedido => `
        <tr>
          <td>#${pedido.id}</td>
          <td>${pedido.cliente_nombre}</td>
          <td>${new Date(pedido.created_at).toLocaleDateString()}</td>
          <td>S/ ${pedido.total.toFixed(2)}</td>
          <td>
            <span class="badge badge-estado bg-${this.getEstadoColor(pedido.estado)}">
              ${pedido.estado}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="adminPanel.verPedido(${pedido.id})">
              <i class="bi bi-eye"></i>
            </button>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error al cargar pedidos recientes:', error);
    }
  }

  getEstadoColor(estado) {
    const colores = {
      'pendiente': 'warning',
      'en proceso': 'info',
      'completado': 'success',
      'cancelado': 'danger'
    };
    return colores[estado] || 'secondary';
  }

  // ========================================
  // PRODUCTOS
  // ========================================

  async cargarProductos() {
    try {
      const { data: productos, error } = await supabase
        .from('productos')
        .select(`
          *,
          categorias (nombre)
        `)
        .order('nombre', { ascending: true });

      if (error) throw error;

      const tbody = document.getElementById('tabla-productos');
      
      if (!productos || productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos</td></tr>';
        return;
      }

      tbody.innerHTML = productos.map(prod => `
        <tr>
          <td>
            <img src="../${prod.imagen_url}" alt="${prod.nombre}" 
                 style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
          </td>
          <td>${prod.nombre}</td>
          <td>${prod.categorias?.nombre || 'Sin categoría'}</td>
          <td>S/ ${prod.precio.toFixed(2)}</td>
          <td>${prod.stock || 0}</td>
          <td>
            <span class="badge bg-${prod.disponible ? 'success' : 'danger'}">
              ${prod.disponible ? 'Disponible' : 'No disponible'}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="adminPanel.editarProducto(${prod.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminPanel.eliminarProducto(${prod.id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }

  async cargarCategorias() {
    try {
      const { data: categorias, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      this.categorias = categorias || [];
      
      // Llenar select de categorías en el formulario
      const select = document.getElementById('producto-categoria');
      if (select) {
        select.innerHTML = '<option value="">Seleccionar...</option>' +
          this.categorias.map(cat => 
            `<option value="${cat.id}">${cat.nombre}</option>`
          ).join('');
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }

  // ========================================
  // FORMULARIO DE PRODUCTO
  // ========================================

  configurarFormProducto() {
    const btnGuardar = document.getElementById('btn-guardar-producto');
    
    if (btnGuardar) {
      btnGuardar.addEventListener('click', () => this.guardarProducto());
    }
  }

  async editarProducto(id) {
    try {
      const { data: producto, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Llenar formulario
      document.getElementById('producto-id').value = producto.id;
      document.getElementById('producto-nombre').value = producto.nombre;
      document.getElementById('producto-descripcion').value = producto.descripcion || '';
      document.getElementById('producto-precio').value = producto.precio;
      document.getElementById('producto-stock').value = producto.stock || 0;
      document.getElementById('producto-categoria').value = producto.categoria_id;
      document.getElementById('producto-imagen').value = producto.imagen_url || '';
      document.getElementById('producto-disponible').checked = producto.disponible;
      document.getElementById('producto-destacado').checked = producto.destacado;

      // Cambiar título del modal
      document.getElementById('modal-title').textContent = 'Editar Producto';

      // Abrir modal
      const modal = new bootstrap.Modal(document.getElementById('modalProducto'));
      modal.show();
    } catch (error) {
      console.error('Error al cargar producto:', error);
      alert('Error al cargar el producto');
    }
  }

  async guardarProducto() {
    const form = document.getElementById('formProducto');
    
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const productoId = document.getElementById('producto-id').value;
    const productoData = {
      nombre: document.getElementById('producto-nombre').value,
      descripcion: document.getElementById('producto-descripcion').value,
      precio: parseFloat(document.getElementById('producto-precio').value),
      stock: parseInt(document.getElementById('producto-stock').value) || 0,
      categoria_id: parseInt(document.getElementById('producto-categoria').value),
      imagen_url: document.getElementById('producto-imagen').value,
      disponible: document.getElementById('producto-disponible').checked,
      destacado: document.getElementById('producto-destacado').checked
    };

    try {
      const btnGuardar = document.getElementById('btn-guardar-producto');
      btnGuardar.disabled = true;
      btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

      let result;
      
      if (productoId) {
        // Actualizar producto existente
        result = await supabase
          .from('productos')
          .update(productoData)
          .eq('id', productoId);
      } else {
        // Crear nuevo producto
        result = await supabase
          .from('productos')
          .insert([productoData]);
      }

      if (result.error) throw result.error;

      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalProducto'));
      modal.hide();

      // Limpiar formulario
      form.reset();
      document.getElementById('producto-id').value = '';

      // Recargar productos
      await this.cargarProductos();

      // Mostrar mensaje
      this.mostrarToast(
        productoId ? 'Producto actualizado correctamente' : 'Producto creado correctamente',
        'success'
      );

      btnGuardar.disabled = false;
      btnGuardar.innerHTML = '<i class="bi bi-save"></i> Guardar Producto';
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto');
      
      const btnGuardar = document.getElementById('btn-guardar-producto');
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = '<i class="bi bi-save"></i> Guardar Producto';
    }
  }

  async eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await this.cargarProductos();
      this.mostrarToast('Producto eliminado correctamente', 'success');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto');
    }
  }

  // ========================================
  // OTRAS SECCIONES (Placeholder)
  // ========================================

  async cargarPedidos() {
    console.log('Cargando pedidos...');
  }

  async cargarCategoriasAdmin() {
    console.log('Cargando categorías...');
  }

  async cargarClientes() {
    console.log('Cargando clientes...');
  }

  verPedido(id) {
    console.log('Ver pedido:', id);
  }

  // ========================================
  // LOGOUT
  // ========================================

  configurarLogout() {
    const btnLogout = document.getElementById('btn-logout');
    
    if (btnLogout) {
      btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Cerrar sesión?')) {
          authManager.logout();
        }
      });
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================

  mostrarToast(mensaje, tipo = 'success') {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${mensaje}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;

    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => toast.remove());
  }
}

// Inicializar el panel de administración
const adminPanel = new AdminPanel();
window.adminPanel = adminPanel;
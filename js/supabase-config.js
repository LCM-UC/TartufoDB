// js/supabase-config.js
// ==============================================
// CONFIGURACIÓN DE SUPABASE
// ==============================================

// 🔴 IMPORTANTE: Reemplaza estos valores con tus credenciales de Supabase
// Los encuentras en: Supabase Dashboard > Settings > API
const SUPABASE_URL = 'https://skxjwxfgaljnognbuktp.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_OKaovPWIxljS4fD3CtfONA_YfAaPG_j'; 

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==============================================
// FUNCIONES PARA PRODUCTOS
// ==============================================

/**
 * Obtener todos los productos disponibles
 * @param {number|null} categoriaId - ID de categoría (opcional)
 * @returns {Promise<Array>}
 */
async function obtenerProductos(categoriaId = null) {
  try {
    let query = supabase
      .from('productos')
      .select(`
        *,
        categorias (
          id,
          nombre,
          descripcion
        )
      `)
      .eq('disponible', true)
      .order('nombre', { ascending: true });
    
    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    return [];
  }
}

/**
 * Obtener productos destacados (para la página principal)
 * @returns {Promise<Array>}
 */
async function obtenerProductosDestacados() {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categorias (
          id,
          nombre
        )
      `)
      .eq('destacado', true)
      .eq('disponible', true)
      .limit(6);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error al obtener productos destacados:', error);
    return [];
  }
}

/**
 * Obtener un producto por ID
 * @param {number} id - ID del producto
 * @returns {Promise<Object|null>}
 */
async function obtenerProductoPorId(id) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categorias (
          id,
          nombre,
          descripcion
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    return null;
  }
}

/**
 * Buscar productos por término
 * @param {string} termino - Término de búsqueda
 * @returns {Promise<Array>}
 */
async function buscarProductos(termino) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categorias (
          id,
          nombre
        )
      `)
      .eq('disponible', true)
      .or(`nombre.ilike.%${termino}%,descripcion.ilike.%${termino}%`);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error al buscar productos:', error);
    return [];
  }
}

// ==============================================
// FUNCIONES PARA CATEGORÍAS
// ==============================================

/**
 * Obtener todas las categorías activas
 * @returns {Promise<Array>}
 */
async function obtenerCategorias() {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    return [];
  }
}

// ==============================================
// FUNCIONES PARA PEDIDOS
// ==============================================

/**
 * Crear un nuevo pedido con sus detalles
 * @param {Object} pedidoData - Datos del pedido
 * @param {Array} detalles - Array de productos del pedido
 * @returns {Promise<Object>}
 */
async function crearPedido(pedidoData, detalles) {
  try {
    // 1. Crear el pedido principal
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([{
        cliente_nombre: pedidoData.nombre,
        cliente_email: pedidoData.email,
        cliente_telefono: pedidoData.telefono || '',
        total: pedidoData.total,
        notas: pedidoData.notas || '',
        estado: 'pendiente'
      }])
      .select()
      .single();
    
    if (pedidoError) throw pedidoError;
    
    // 2. Insertar los detalles del pedido
    const detallesConPedidoId = detalles.map(detalle => ({
      pedido_id: pedido.id,
      producto_id: detalle.producto_id,
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario,
      subtotal: detalle.subtotal
    }));
    
    const { error: detallesError } = await supabase
      .from('pedidos_detalles')
      .insert(detallesConPedidoId);
    
    if (detallesError) throw detallesError;
    
    return { 
      success: true, 
      pedido,
      mensaje: '¡Pedido creado exitosamente!' 
    };
  } catch (error) {
    console.error('❌ Error al crear pedido:', error);
    return { 
      success: false, 
      error,
      mensaje: 'Error al procesar el pedido. Por favor, intenta nuevamente.' 
    };
  }
}

/**
 * Obtener un pedido por ID con sus detalles
 * @param {number} pedidoId - ID del pedido
 * @returns {Promise<Object|null>}
 */
async function obtenerPedido(pedidoId) {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        pedidos_detalles (
          *,
          productos (
            nombre,
            imagen_url
          )
        )
      `)
      .eq('id', pedidoId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error al obtener pedido:', error);
    return null;
  }
}

// ==============================================
// VERIFICAR CONEXIÓN
// ==============================================

/**
 * Verificar si la conexión con Supabase funciona correctamente
 * @returns {Promise<boolean>}
 */
async function verificarConexion() {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Conexión con Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión con Supabase:', error);
    return false;
  }
}

// ==============================================
// FUNCIONES ADICIONALES PARA ADMIN
// ==============================================

/**
 * Crear un nuevo producto
 * @param {Object} productoData - Datos del producto
 * @returns {Promise<Object>}
 */
async function crearProducto(productoData) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .insert([productoData])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, producto: data };
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    return { success: false, error };
  }
}

/**
 * Actualizar un producto existente
 * @param {number} id - ID del producto
 * @param {Object} productoData - Datos del producto
 * @returns {Promise<Object>}
 */
async function actualizarProducto(id, productoData) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .update(productoData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, producto: data };
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    return { success: false, error };
  }
}

/**
 * Eliminar un producto
 * @param {number} id - ID del producto
 * @returns {Promise<Object>}
 */
async function eliminarProducto(id) {
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    return { success: false, error };
  }
}

// Verificar conexión al cargar
verificarConexion();
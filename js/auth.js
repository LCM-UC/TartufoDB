// js/auth.js
// ==============================================
// SISTEMA DE AUTENTICACIÓN
// ==============================================

class AuthManager {
  constructor() {
    this.currentUser = this.getUserFromSession();
    this.selectedRole = 'cliente';
    this.init();
  }

  init() {
    // Configurar eventos según la página
    if (document.getElementById('registroForm')) {
      this.setupRegistroForm();
    }
    
    if (document.getElementById('loginForm')) {
      this.setupLoginForm();
    }

    // Toggle de contraseña
    this.setupPasswordToggle();

    // Selector de roles
    this.setupRoleSelector();

    // Verificador de fuerza de contraseña
    this.setupPasswordStrength();
  }

  // ========================================
  // REGISTRO DE USUARIOS
  // ========================================
  
  setupRegistroForm() {
    const form = document.getElementById('registroForm');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegistro(form);
    });

    // Validar contraseñas en tiempo real
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    
    confirmPassword.addEventListener('input', () => {
      if (password.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity('Las contraseñas no coinciden');
        confirmPassword.classList.add('is-invalid');
      } else {
        confirmPassword.setCustomValidity('');
        confirmPassword.classList.remove('is-invalid');
      }
    });
  }

  async handleRegistro(form) {
    const formData = new FormData(form);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    // Validar contraseñas
    if (password !== confirmPassword) {
      this.showToast('Las contraseñas no coinciden', 'danger');
      return;
    }

    if (password.length < 6) {
      this.showToast('La contraseña debe tener al menos 6 caracteres', 'danger');
      return;
    }

    // Preparar datos del usuario
    const userData = {
      email: formData.get('email'),
      password: password,
      nombre: formData.get('nombre'),
      apellido: formData.get('apellido'),
      telefono: formData.get('telefono'),
      direccion: formData.get('direccion') || ''
    };

    try {
      // Mostrar loading
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Registrando...';

      // Registrar usuario
      const result = await this.registrarUsuario(userData);

      if (result.success) {
        this.showToast('¡Cuenta creada exitosamente!', 'success');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        this.showToast(result.message || 'Error al crear la cuenta', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Crear Cuenta';
      }
    } catch (error) {
      console.error('Error en registro:', error);
      this.showToast('Error al crear la cuenta', 'danger');
      
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Crear Cuenta';
    }
  }

  async registrarUsuario(userData) {
    try {
      // Verificar si el email ya existe
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        return { success: false, message: 'Este correo ya está registrado' };
      }

      // Hashear contraseña
      const passwordHash = this.hashPassword(userData.password);

      // Insertar usuario en la base de datos
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          email: userData.email,
          password_hash: passwordHash,
          nombre: userData.nombre,
          apellido: userData.apellido,
          telefono: userData.telefono,
          direccion: userData.direccion,
          rol_id: 1 // Cliente por defecto
        }])
        .select()
        .single();

      if (error) {
        console.error('Error al insertar usuario:', error);
        if (error.code === '23505') {
          return { success: false, message: 'Este correo ya está registrado' };
        }
        throw error;
      }

      return { success: true, user: data };
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      return { success: false, message: 'Error al crear la cuenta' };
    }
  }

  // ========================================
  // LOGIN DE USUARIOS
  // ========================================

  setupLoginForm() {
    const form = document.getElementById('loginForm');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin(form);
    });
  }

  async handleLogin(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Iniciando...';

      const result = await this.loginUsuario(email, password, this.selectedRole);

      if (result.success) {
        this.showToast('¡Bienvenido!', 'success');
        
        // Guardar sesión
        this.saveUserSession(result.user);

        // Redirigir según el rol
        setTimeout(() => {
          if (result.user.rol_nombre === 'administrador' || result.user.rol_nombre === 'empleado') {
            window.location.href = 'admin/dashboard.html';
          } else {
            window.location.href = 'carrito.html';
          }
        }, 1000);
      } else {
        this.showToast(result.message || 'Credenciales incorrectas', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión';
      }
    } catch (error) {
      console.error('Error en login:', error);
      this.showToast('Error al iniciar sesión', 'danger');
      
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión';
    }
  }

  async loginUsuario(email, password, expectedRole) {
    try {
      console.log('🔍 Intentando login con:', { email, expectedRole });

      // Buscar usuario por email
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          roles (
            id,
            nombre
          )
        `)
        .eq('email', email)
        .eq('activo', true)
        .single();

      if (error || !usuarios) {
        console.error('❌ Usuario no encontrado:', error);
        return { success: false, message: 'Usuario no encontrado' };
      }

      console.log('👤 Usuario encontrado:', {
        email: usuarios.email,
        rol: usuarios.roles?.nombre,
        hash_guardado: usuarios.password_hash
      });

      // Verificar contraseña
      const passwordHash = this.hashPassword(password);
      console.log('🔐 Hash generado:', passwordHash);
      console.log('🔐 Hash en BD:', usuarios.password_hash);

      const passwordMatch = (passwordHash === usuarios.password_hash);
      
      if (!passwordMatch) {
        console.error('❌ Contraseña incorrecta');
        return { success: false, message: 'Contraseña incorrecta' };
      }

      console.log('✅ Contraseña correcta');

      // Verificar rol
      const userRole = usuarios.roles.nombre;
      
      if (expectedRole === 'cliente' && userRole !== 'cliente') {
        return { success: false, message: 'Acceso no autorizado para clientes' };
      }
      
      if (expectedRole === 'empleado' && userRole !== 'empleado' && userRole !== 'administrador') {
        return { success: false, message: 'Acceso solo para empleados' };
      }
      
      if (expectedRole === 'admin' && userRole !== 'administrador') {
        return { success: false, message: 'Acceso solo para administradores' };
      }

      console.log('✅ Login exitoso');

      // Actualizar último acceso
      await supabase
        .from('usuarios')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', usuarios.id);

      return { 
        success: true, 
        user: {
          ...usuarios,
          rol_nombre: userRole
        }
      };
    } catch (error) {
      console.error('❌ Error al hacer login:', error);
      return { success: false, message: 'Error al iniciar sesión' };
    }
  }

  // ========================================
  // GESTIÓN DE SESIONES
  // ========================================

  saveUserSession(user) {
    const sessionData = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol_nombre,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('tartufo_session', JSON.stringify(sessionData));
    this.currentUser = sessionData;
  }

  getUserFromSession() {
    const sessionData = localStorage.getItem('tartufo_session');
    return sessionData ? JSON.parse(sessionData) : null;
  }

  logout() {
    localStorage.removeItem('tartufo_session');
    this.currentUser = null;
    window.location.href = 'index.html';
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  hasRole(role) {
    return this.currentUser && this.currentUser.rol === role;
  }

  // ========================================
  // UTILIDADES
  // ========================================

  setupPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        const icon = toggleBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          icon.classList.remove('bi-eye');
          icon.classList.add('bi-eye-slash');
        } else {
          passwordInput.type = 'password';
          icon.classList.remove('bi-eye-slash');
          icon.classList.add('bi-eye');
        }
      });
    }
  }

  setupRoleSelector() {
    const roleOptions = document.querySelectorAll('.role-option');
    
    roleOptions.forEach(option => {
      option.addEventListener('click', () => {
        roleOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        this.selectedRole = option.dataset.role;
      });
    });
  }

  setupPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthBar = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthBar) {
      passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        let strength = 0;
        
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        strengthBar.className = 'password-strength';
        
        if (strength <= 2) {
          strengthBar.classList.add('strength-weak');
        } else if (strength <= 4) {
          strengthBar.classList.add('strength-medium');
        } else {
          strengthBar.classList.add('strength-strong');
        }
      });
    }
  }

  // Hash simple de contraseña usando base64
  hashPassword(password) {
    return btoa(password);
  }

  // Mostrar notificación toast
  showToast(mensaje, tipo = 'success') {
    const toastContainer = document.getElementById('toast-container');
    
    const iconos = {
      success: 'check-circle',
      danger: 'x-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-${iconos[tipo]}"></i> ${mensaje}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
  }
}

// Inicializar el gestor de autenticación
const authManager = new AuthManager();

// Hacer disponible globalmente
window.authManager = authManager;
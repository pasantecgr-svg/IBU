import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dashboard from './pages/Dashboard';
import ListaProductos from './pages/ListaProductos';
import FormularioProducto from './pages/FormularioProducto';
import GestionCategorias from './pages/GestionCategorias';
import { authAPI } from './utils/api';
import { setSession, clearSession, setTheme } from './store/authSlice';
import './styles/app.css';

const DOMINIO_PERMITIDO = '@unibague.edu.co';

const getGoogleClientId = () => (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const isGoogleClientPlaceholder = (clientId = '') => {
  const value = String(clientId || '').trim();
  if (!value) return true;

  return /REEMPLAZAR|TU_CLIENT_ID_DE_GOOGLE|your-google-client-id|example|<your-google-client-id>/i.test(value);
};

const validarCorreoUnibague = (email) => {
  const valor = String(email || '').trim().toLowerCase();
  return valor.length > 0 && valor.endsWith(DOMINIO_PERMITIDO);
};

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const usuario = useSelector((state) => state.auth.user);
  const theme = useSelector((state) => state.auth.theme);
  const [pagina, setPagina] = useState('dashboard');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [errorLogin, setErrorLogin] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  const navegarA = (nuevaPagina, producto = null) => {
    setPagina(nuevaPagina);
    if (producto) {
      setProductoSeleccionado(producto);
    } else {
      setProductoSeleccionado(null);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    dispatch(setTheme(theme));
  }, [dispatch, theme]);

  useEffect(() => {
    if (!token) return;

    const cargarPerfil = async () => {
      try {
        const { data } = await authAPI.obtenerPerfil();
        if (data?.user) {
          dispatch(setSession({ token, user: data.user }));
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
        dispatch(clearSession());
      }
    };

    cargarPerfil();
  }, [dispatch, token]);

  const toggleTheme = () => {
    dispatch(setTheme(theme === 'light' ? 'dark' : 'light'));
  };

  const cerrarSesion = () => {
    dispatch(clearSession());
    setErrorLogin('');
    setPagina('dashboard');
  };

  useEffect(() => {
    const clientId = getGoogleClientId();
    const exampleClientId = isGoogleClientPlaceholder(clientId);

    if (!clientId || exampleClientId) {
      setErrorLogin('Google no está configurado: reemplaza VITE_GOOGLE_CLIENT_ID en frontend/.env con un Client ID real de Google Cloud.');
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const { data } = await authAPI.googleLogin({ credential: response.credential });
              dispatch(setSession({ token: data.token, user: data.user }));
              setErrorLogin('');
            } catch (error) {
              setErrorLogin(error?.response?.data?.error || 'No se pudo iniciar sesión con Google');
            }
          }
        });
      }
    };

    if (existingScript) {
      if (window.google?.accounts?.id) {
        initializeGoogle();
      } else {
        existingScript.onload = initializeGoogle;
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => {
      setErrorLogin('No se pudo cargar Google Identity Services. Revisa cookies de terceros y la conexión a accounts.google.com.');
    };
    document.body.appendChild(script);
  }, [dispatch]);

  const cambiarPassword = async (event) => {
    event.preventDefault();
    setPasswordMessage('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage('Debes completar todos los campos');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    try {
      await authAPI.cambiarPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      setPasswordMessage('');
      alert('Contraseña actualizada correctamente');
    } catch (error) {
      setPasswordMessage(error?.response?.data?.error || 'No se pudo actualizar la contraseña');
    }
  };

  const iniciarGoogle = () => {
    const clientId = getGoogleClientId();
    if (!clientId || isGoogleClientPlaceholder(clientId)) {
      setErrorLogin('Google no está configurado: reemplaza VITE_GOOGLE_CLIENT_ID en frontend/.env con un Client ID real de Google Cloud.');
      return;
    }

    if (!window.google?.accounts?.id) {
      setErrorLogin('Google Identity Services está bloqueado por el navegador o aún no cargó. Habilita cookies de terceros y revisa la conexión a accounts.google.com.');
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setErrorLogin('Google bloqueó el inicio de sesión por cookies de terceros o por configuración del navegador. Habilita cookies de terceros y usa un Client ID válido.');
      }
    });
  };

  if (!token || !usuario) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            <img src="/ibu-logo.png" alt="IBU Inventario de Bodega" className="login-logo" />
          </div>

          <div className="login-form-wrapper">
            <div className="login-form">
              <h2>Iniciar sesión</h2>
              <p className="login-subtitle">Ingresa con tu cuenta institucional de Google</p>

              {errorLogin && <div className="login-error">{errorLogin}</div>}

              <button type="button" className="btn btn-primary btn-large login-button" onClick={iniciarGoogle}>
                Continuar con Google
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <img src="/ibu-logo.png" alt="Logo IBU" className="brand-logo" />
            <span>IBU</span>
          </div>

          <ul className="nav-menu">
            <li>
              <button className={`nav-link ${pagina === 'dashboard' ? 'active' : ''}`} onClick={() => navegarA('dashboard')}>
                📊 Dashboard
              </button>
            </li>
            <li>
              <button className={`nav-link ${pagina === 'productos' ? 'active' : ''}`} onClick={() => navegarA('productos')}>
                📋 Productos
              </button>
            </li>
            <li>
              <button className={`nav-link ${pagina === 'nuevo' ? 'active' : ''}`} onClick={() => navegarA('nuevo')}>
                ➕ Nuevo Producto
              </button>
            </li>
            <li>
              <button className={`nav-link ${pagina === 'categorias' ? 'active' : ''}`} onClick={() => navegarA('categorias')}>
                🏷️ Categorías
              </button>
            </li>
          </ul>

          <div className="nav-actions">
            <span className="user-email">{usuario.email}</span>
            <button className="theme-toggle" onClick={toggleTheme} title="Alternar modo día/noche">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setShowPasswordModal(true)}>
              Cambiar contraseña
            </button>
            <button className="logout-btn" onClick={cerrarSesion}>Cerrar sesión</button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {pagina === 'dashboard' && <Dashboard />}
        {pagina === 'productos' && <ListaProductos onEditar={navegarA} />}
        {pagina === 'nuevo' && (
          <FormularioProducto
            producto={productoSeleccionado}
            onGuardar={() => navegarA('productos')}
          />
        )}
        {pagina === 'categorias' && <GestionCategorias />}
      </main>

      {showPasswordModal && (
        <div className="password-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cambiar contraseña</h3>
            <form onSubmit={cambiarPassword} className="password-form">
              <label>
                Contraseña actual
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </label>
              <label>
                Confirmar nueva contraseña
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </label>

              {passwordMessage && <div className="login-error">{passwordMessage}</div>}

              <div className="password-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>© 2024 IBU Inventario de Bodega Unibague - v1.0</p>
      </footer>
    </div>
  );
}

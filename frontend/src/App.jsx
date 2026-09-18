import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dashboard from './pages/Dashboard';
import ListaProductos from './pages/ListaProductos';
import FormularioProducto from './pages/FormularioProducto';
import GestionCategorias from './pages/GestionCategorias';
import OrdenesTrabajo from './pages/OrdenesTrabajo';
import AdminUsuarios from './pages/AdminUsuarios';
import Organigrama from './pages/Organigrama';
import { authAPI, notificacionesAPI } from './utils/api';
import { setSession, clearSession, setTheme } from './store/authSlice';
import { BarChart3, Bell, Building2, ClipboardList, FolderPlus, Tags, Users, Moon, Sun, X } from 'lucide-react';
import './styles/app.css';

const getGoogleClientId = () => (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const isGoogleClientPlaceholder = (clientId = '') => {
  const value = String(clientId || '').trim();
  if (!value) return true;

  return /REEMPLAZAR|TU_CLIENT_ID_DE_GOOGLE|your-google-client-id|example|<your-google-client-id>/i.test(value);
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
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  const navegarA = (nuevaPagina, producto = null) => {
    const isAdmin = (usuario && usuario.role === 'ADMIN');
    const adminOnlyPages = ['usuarios', 'organigrama'];
    if (!isAdmin && adminOnlyPages.includes(nuevaPagina)) {
      setPagina('acceso_denegado');
      return;
    }
    if (producto) {
      setProductoSeleccionado(producto);
    } else {
      setProductoSeleccionado(null);
    }
    setPagina(nuevaPagina);
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

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    const email = String(loginForm.email || '').trim();
    const password = String(loginForm.password || '').trim();

    if (!email || !password) {
      setErrorLogin('Ingresa tu correo institucional y la contraseña.');
      return;
    }

    try {
      setLoadingAuth(true);
      setErrorLogin('');
      const { data } = await authAPI.login({ email, password });
      dispatch(setSession({ token: data.token, user: data.user }));
    } catch (error) {
      const message = error?.response?.data?.error || 'No se pudo iniciar sesión con correo institucional';
      setErrorLogin(message);
    } finally {
      setLoadingAuth(false);
    }
  };

  const toggleTheme = () => {
    dispatch(setTheme(theme === 'light' ? 'dark' : 'light'));
  };

  const cerrarSesion = () => {
    dispatch(clearSession());
    setErrorLogin('');
    setPagina('dashboard');
  };

  useEffect(() => {
    if (!token || !usuario) return undefined;

    const cargarNotificaciones = async () => {
      try {
        const { data } = await notificacionesAPI.obtener();
        setNotificaciones(data.notificaciones || []);
      } catch (error) {
        console.error('Error cargando notificaciones:', error);
      }
    };

    cargarNotificaciones();
    const intervalo = window.setInterval(cargarNotificaciones, 30000);
    return () => window.clearInterval(intervalo);
  }, [token, usuario]);

  useEffect(() => {
    const clientId = getGoogleClientId();
    const exampleClientId = isGoogleClientPlaceholder(clientId);

    if (!clientId || exampleClientId) {
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          ux_mode: 'popup',
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
        const googleButton = document.getElementById('google-signin-button');
        if (googleButton) {
          googleButton.replaceChildren();
          window.google.accounts.id.renderButton(googleButton, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 320,
            locale: 'es'
          });
        }
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
      setErrorLogin('No se pudo cargar Google Identity Services. Puedes continuar con tu correo institucional.');
    };
    document.body.appendChild(script);
  }, [dispatch]);

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
              <p className="login-subtitle">Ingresa con tu cuenta institucional o con Google</p>

              {errorLogin && <div className="login-error">{errorLogin}</div>}

              <form onSubmit={handleEmailLogin} className="login-email-form">
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="correo@unibague.edu.co"
                  autoComplete="email"
                  required
                />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  required
                />
                <button type="submit" className="login-submit" disabled={loadingAuth}>
                  {loadingAuth ? 'Ingresando...' : 'Entrar con correo institucional'}
                </button>
              </form>

              <div className="login-divider"><span>o</span></div>

              <div id="google-signin-button" className="google-signin-button" aria-label="Iniciar sesión con Google" />
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
            <>
                <li>
                  <button className={`nav-link ${pagina === 'dashboard' ? 'active' : ''}`} onClick={() => navegarA('dashboard')}>
                    <BarChart3 size={17} aria-hidden="true" /> Dashboard
                  </button>
                </li>
                <li>
                  <button className={`nav-link ${pagina === 'productos' ? 'active' : ''}`} onClick={() => navegarA('productos')}>
                    <ClipboardList size={17} aria-hidden="true" /> Productos
                  </button>
                </li>
                <li>
                  <button className={`nav-link ${pagina === 'nuevo' ? 'active' : ''}`} onClick={() => navegarA('nuevo')}>
                    <FolderPlus size={17} aria-hidden="true" /> Nuevo Producto
                  </button>
                </li>
                <li>
                  <button className={`nav-link ${pagina === 'categorias' ? 'active' : ''}`} onClick={() => navegarA('categorias')}>
                    <Tags size={17} aria-hidden="true" /> Categorías
                  </button>
                </li>
                <li>
                  <button className={`nav-link ${pagina === 'ordenes' ? 'active' : ''}`} onClick={() => navegarA('ordenes')}>
                    <ClipboardList size={17} aria-hidden="true" /> Órdenes de Trabajo
                  </button>
                </li>
                {usuario.role === 'ADMIN' && (
                  <>
                    <li><button className={`nav-link ${pagina === 'usuarios' ? 'active' : ''}`} onClick={() => navegarA('usuarios')}><Users size={17} aria-hidden="true" /> Usuarios</button></li>
                  </>
                )}
            </>
          </ul>

          <div className="nav-actions">
            <div className="notification-center">
              <button className="notification-toggle" onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)} title="Notificaciones" aria-label="Abrir notificaciones">
                <Bell size={18} aria-hidden="true" />
                {notificaciones.length > 0 && <span className="notification-count">{notificaciones.length > 9 ? '9+' : notificaciones.length}</span>}
              </button>
              {mostrarNotificaciones && (
                <div className="notification-panel">
                  <div className="notification-panel-header"><strong>Notificaciones</strong><button type="button" onClick={() => setMostrarNotificaciones(false)} aria-label="Cerrar notificaciones"><X size={16} /></button></div>
                  {notificaciones.length === 0 ? <p className="notification-empty">No tienes notificaciones pendientes.</p> : notificaciones.map((notificacion) => (
                    <div className={`notification-item ${notificacion.tipo}`} key={notificacion.id}>
                      <Bell size={17} aria-hidden="true" />
                      <div><strong>{notificacion.titulo}</strong><span>{notificacion.mensaje}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title="Alternar modo día/noche">
              {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
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
        {pagina === 'ordenes' && <OrdenesTrabajo />}
        {pagina === 'usuarios' && <AdminUsuarios />}
        {pagina === 'organigrama' && <Organigrama />}
        {pagina === 'acceso_denegado' && (
          <div style={{ padding: 24 }}>
            <h3>Acceso denegado</h3>
            <p>No tienes permisos para ver esta sección. Contacta con un administrador.</p>
          </div>
        )}
      </main>

      

      <footer className="footer">
        <p>© {new Date().getFullYear()} IBU Inventario de Bodega Unibague - v1.0</p>
      </footer>
    </div>
  );
}

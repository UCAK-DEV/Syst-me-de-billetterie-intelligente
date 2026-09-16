import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser, clearAuth, api, photoUrl } from '../services/api';
import '../styles/dashboard.css';

// Pages de gestion, réservées aux administrateurs (« Seul un administrateur
// peut gérer les comptes » — et, par extension, les formules/abonnements).
// Un agent ou un client authentifié n'a accès qu'à son propre profil.
const ADMIN_ONLY_PREFIXES = ['/users', '/formules', '/abonnements', '/stats'];
const isAdminOnlyPath = (path) => ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix));

function DashboardLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);

    // Mot de passe temporaire : écran dédié en dehors du dashboard, rien
    // d'autre n'est accessible tant que ce n'est pas fait.
    if (storedUser.mustChangePassword) {
      navigate('/change-password', { replace: true });
      return;
    }

    if (storedUser.role !== 'Administrateur' && isAdminOnlyPath(currentPath)) {
      navigate('/profile', { replace: true });
    }
  }, [navigate, currentPath]);

  const isAdmin = user?.role === 'Administrateur';
  // Tant que le rôle n'a pas encore tranché (premier rendu) ou que la
  // redirection est en cours, ne jamais laisser apparaître une page
  // réservée : évite le flash de contenu admin pour un compte non autorisé.
  const blockedForRole = !user || (user.role !== 'Administrateur' && isAdminOnlyPath(currentPath));

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    }
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Gemini Background Depth */}
      <div className="gemini-bg" />
      <div className="gemini-aura">
        <div className="aura-spot spot-1" />
        <div className="aura-spot spot-2" />
        <div className="aura-spot spot-3" />
      </div>

      {/* Centralized Top Navbar */}
      <header className="navbar">
        <div className="nav-brand">
          <span className="material-symbols-outlined nav-brand-icon">
            local_activity
          </span>
          <span className="nav-brand-text">Billetterie Intelligente</span>
        </div>

        {/* Navigation centrée : uniquement les sections de gestion.
            L'accès au profil se fait via l'identité, à droite — pas besoin
            d'un onglet "Mon profil" en plus de l'avatar qui l'affiche déjà. */}
        {isAdmin && (
          <nav className="nav-links">
            <Link
              to="/users"
              title="Utilisateurs"
              className={`nav-link-item ${currentPath === '/users' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">group</span>
              <span className="nav-link-text">Utilisateurs</span>
            </Link>
            <Link
              to="/formules"
              title="Formules"
              className={`nav-link-item ${currentPath === '/formules' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              <span className="nav-link-text">Formules</span>
            </Link>
            <Link
              to="/abonnements"
              title="Abonnements"
              className={`nav-link-item ${currentPath.startsWith('/abonnements') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">card_membership</span>
              <span className="nav-link-text">Abonnements</span>
            </Link>
            <Link
              to="/stats"
              title="Tableau de bord"
              className={`nav-link-item ${currentPath === '/stats' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">bar_chart</span>
              <span className="nav-link-text">Tableau de bord</span>
            </Link>
          </nav>
        )}

        {user && (
          <div className="nav-user">
            <Link
              to="/profile"
              className="nav-user-identity"
              title="Mon profil"
            >
              <div className="nav-user-avatar">
                {user.photo ? (
                  <img
                    src={photoUrl(user.photo)}
                    alt=""
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  user.prenom ? user.prenom[0].toUpperCase() : 'U'
                )}
              </div>
              <span className="nav-user-name">{user.prenom} {user.nom}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="icon-btn logout-btn"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Render children pages — jamais avant d'avoir vérifié que le rôle
          autorise la page demandée, pour ne pas laisser apparaître même
          brièvement un écran de gestion à un compte non administrateur. */}
      {!blockedForRole && <Outlet />}
    </div>
  );
}

export default DashboardLayout;

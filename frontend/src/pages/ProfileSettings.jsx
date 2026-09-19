import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setStoredUser, photoUrl } from '../services/api';
import { validateNewPassword, validateUserForm } from '../utils/validators';
import PasswordInput from '../components/PasswordInput';
import { formatDateFR } from '../utils/dates';
import { useTheme, TRANSIT_OPERATORS, DISPLAY_MODES, UI_DENSITIES } from '../context/ThemeContext';
import './ProfileSettings.css';

function ProfileSettings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    operator,
    displayMode,
    density,
    setOperator,
    setDisplayMode,
    setDensity,
    resetCustomization,
  } = useTheme();

  // Formulaire informations personnelles
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [infoMessage, setInfoMessage] = useState(null);

  // Formulaire mot de passe
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);

  const [photoMessage, setPhotoMessage] = useState(null);

  useEffect(() => {
    document.title = 'Mon profil - Système de Billetterie';

    const load = async () => {
      try {
        const data = await api.getProfile();
        applyUser(data.user);
      } catch (err) {
        console.error('Impossible de charger le profil', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Synchronise l'état local et l'utilisateur stocké après chaque mise à jour
  const applyUser = (u) => {
    setUser(u);
    setNom(u.nom || '');
    setPrenom(u.prenom || '');
    setTelephone(u.telephone || '');
    setStoredUser(u);
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoMessage(null);

    const validationError = validateUserForm({ nom, prenom, telephone }, { requireEmail: false });
    if (validationError) {
      setInfoMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      const data = await api.updateProfile({ nom, prenom, telephone });
      applyUser(data.user);
      setInfoMessage({ type: 'success', text: 'Informations enregistrées.' });
    } catch (err) {
      setInfoMessage({ type: 'error', text: err.message });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    const validationError = validateNewPassword(newPassword, confirmPassword);
    if (validationError) {
      setPasswordMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      const data = await api.changePassword(oldPassword, newPassword);
      applyUser(data.user);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message });
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoMessage(null);
    try {
      const data = await api.uploadPhoto(file);
      applyUser(data.user);
      setPhotoMessage({ type: 'success', text: 'Photo mise à jour.' });
    } catch (err) {
      setPhotoMessage({ type: 'error', text: err.message });
    } finally {
      e.target.value = ''; // permet de re-sélectionner le même fichier
    }
  };

  if (isLoading) {
    return (
      <main className="main-content">
        <div className="loader-container">
          <span className="page-loader" />
          <p className="loader-text">Chargement du profil...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main-content">
        <div className="profile-alert error">Impossible de charger votre profil.</div>
      </main>
    );
  }

  const initiales = `${(user.prenom || '?')[0]}${(user.nom || '')[0] || ''}`.toUpperCase();

  return (
    <main className="main-content">
      <section className="page-header">
        <div className="page-title-row">
          <span className="page-title-icon material-symbols-outlined">account_circle</span>
          <div>
            <h1 className="page-title">Mon profil</h1>
            <p className="page-subtitle">Gérer vos informations personnelles et votre mot de passe</p>
          </div>
        </div>
      </section>

      <div className="profile-grid">
        {/* Carte identité + photo */}
        <section className="table-card profile-card">
          <div className="profile-avatar-zone">
            {user.photo ? (
              <img src={photoUrl(user.photo)} alt="Photo de profil" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">{initiales}</div>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <span className="material-symbols-outlined btn-icon">photo_camera</span>
              Changer la photo
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="profile-file-input"
            />
            <p className="profile-hint">JPEG, PNG, WEBP ou GIF — 2 Mo maximum</p>
            {photoMessage && (
              <div className={`profile-alert ${photoMessage.type}`}>{photoMessage.text}</div>
            )}
          </div>

          <dl className="profile-meta">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Rôle</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>{user.status}</dd>
            </div>
            <div>
              <dt>Membre depuis</dt>
              <dd>{formatDateFR(user.date)}</dd>
            </div>
          </dl>
        </section>

        {/* Formulaires */}
        <div className="profile-forms">
          <section className="table-card">
            <h2 className="profile-section-title">Informations personnelles</h2>
            <form onSubmit={handleSaveInfo} className="modal-form">
              <div className="modal-grid">
                <div className="form-group">
                  <label className="form-label">Prénom<span className="required-mark">*</span></label>
                  <input
                    type="text"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom<span className="required-mark">*</span></label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone<span className="required-mark">*</span></label>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="form-input"
                  placeholder="771234567"
                  pattern="^(\+?221)?\d{9}$"
                  title="9 chiffres, avec ou sans indicatif +221, ex. 771234567"
                />
              </div>

              {infoMessage && (
                <div className={`profile-alert ${infoMessage.type}`}>{infoMessage.text}</div>
              )}

              <div className="profile-form-footer">
                <button type="submit" className="btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </section>

          <section className="table-card">
            <h2 className="profile-section-title">Changer le mot de passe</h2>
            <form onSubmit={handleChangePassword} className="modal-form">
              <div className="form-group">
                <label className="form-label">Mot de passe actuel<span className="required-mark">*</span></label>
                <PasswordInput
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div className="modal-grid">
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe<span className="required-mark">*</span></label>
                  <PasswordInput
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmer<span className="required-mark">*</span></label>
                  <PasswordInput
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <p className="profile-hint">8 caractères minimum, différent de l'actuel.</p>

              {passwordMessage && (
                <div className={`profile-alert ${passwordMessage.type}`}>{passwordMessage.text}</div>
              )}

              <div className="profile-form-footer">
                <button type="button" className="btn-secondary" onClick={() => navigate('/users')}>
                  Retour
                </button>
                <button type="submit" className="btn-primary">
                  Modifier le mot de passe
                </button>
              </div>
            </form>
          </section>

          {/* Section Charte Réseau & Ergonomie Opérationnelle */}
          <section className="table-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 className="profile-section-title" style={{ margin: 0 }}>Charte Réseau & Ergonomie</h2>
                <p className="customizer-subtitle">Identité de l'opérateur de transport et conformité accessibilité WCAG 2.1</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetCustomization}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                Réseau par défaut (BRT)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div>
                <label className="customizer-label">1. Réseau de Transport (Opérateur)</label>
                <div className="operator-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', marginTop: '0.5rem' }}>
                  {TRANSIT_OPERATORS.map((op) => {
                    const isActive = op.id === operator;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        className={`accent-card${isActive ? ' active' : ''}`}
                        onClick={() => setOperator(op.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '0.75rem 0.85rem',
                          borderRadius: '12px',
                          gap: '0.25rem',
                          textAlign: 'left',
                          borderColor: isActive ? op.hex : 'var(--border-glass)',
                          backgroundColor: isActive ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                backgroundColor: op.hex,
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.65rem',
                              }}
                            >
                              {op.shortCode}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-dark)' }}>
                              {op.name}
                            </span>
                          </div>
                          {isActive && (
                            <span
                              className="material-symbols-outlined"
                              style={{ color: op.hex, fontSize: '18px' }}
                            >
                              check_circle
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.66rem', color: op.hex, fontWeight: 600 }}>
                          {op.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="customizer-label">2. Environnement Lumineux & Ergonomie (WCAG 2.1 AAA)</label>
                <div className="mode-selector-row" style={{ marginTop: '0.5rem' }}>
                  {DISPLAY_MODES.map((mode) => {
                    const isActive = mode.id === displayMode;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`mode-pill${isActive ? ' active' : ''}`}
                        onClick={() => setDisplayMode(mode.id)}
                      >
                        <span className="material-symbols-outlined mode-icon">{mode.icon}</span>
                        <span className="mode-label">{mode.name}</span>
                        <span style={{ fontSize: '0.62rem', color: isActive ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                          {mode.standard}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="customizer-label">3. Densité d'Interface Métier (Loi de Fitts)</label>
                <div className="radius-selector-row" style={{ marginTop: '0.5rem' }}>
                  {UI_DENSITIES.map((d) => {
                    const isActive = d.id === density;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`radius-pill${isActive ? ' active' : ''}`}
                        onClick={() => setDensity(d.id)}
                      >
                        <span className="material-symbols-outlined">{d.icon}</span>
                        <div>
                          <div className="radius-name">{d.name}</div>
                          <div className="radius-desc">{d.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default ProfileSettings;

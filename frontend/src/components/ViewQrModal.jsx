import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDateFR } from '../utils/dates';

/**
 * Libellés d'affichage selon le type de titre
 */
const TYPE_LABELS = {
  TICKET_SIMPLE: 'Ticket Simple',
  LIMITE: 'Abonnement Limité',
  ILLIMITE: 'Abonnement Illimité',
};

/**
 * Modale de visualisation du QR Code numérique d'un titre de transport
 * Permet au voyageur de présenter son billet, de copier le code ou de télécharger le QR.
 */
function ViewQrModal({ titre, client, onClose }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!titre) return null;

  // Copie le code textuel du titre dans le presse-papier
  const handleCopyCode = () => {
    navigator.clipboard.writeText(titre.codeUnique);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Télécharge le QR Code : soit via l'image base64 existante, soit en sérialisant le SVG
  const handleDownloadImage = () => {
    if (titre.qrCodeData && (titre.qrCodeData.startsWith('data:image') || titre.qrCodeData.startsWith('http'))) {
      const link = document.createElement('a');
      link.href = titre.qrCodeData;
      link.download = `QR-${titre.codeUnique}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Export dynamique au format SVG si l'image brute n'est pas fournie
    const svgEl = document.querySelector('.qr-neon-frame svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = svgUrl;
      link.download = `QR-${titre.codeUnique}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(svgUrl);
    }
  };

  // Partage le titre via la Web Share API native sur smartphone
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Titre de transport - ${titre.codeUnique}`,
          text: `Mon titre de transport numérique (${TYPE_LABELS[titre.typeTitre] || titre.typeTitre}) : ${titre.codeUnique}`,
          url: window.location.href,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // Annulé par l'utilisateur ou non supporté
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel qr-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* En-tête style mobile */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="customizer-close-btn"
              onClick={onClose}
              aria-label="Retour"
              title="Retour"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="modal-title" style={{ fontSize: '1.1rem' }}>QR Code Numérique</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Corps de présentation épuré */}
        <div className="qr-showcase-container" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
          {/* Cadre QR Code épuré */}
          <div className="qr-neon-frame">
            {titre.qrCodeData && (titre.qrCodeData.startsWith('data:image') || titre.qrCodeData.startsWith('http')) ? (
              <img
                src={titre.qrCodeData}
                alt={`QR Code ${titre.codeUnique}`}
                style={{ width: '210px', height: '210px', display: 'block' }}
              />
            ) : (
              <QRCodeSVG
                value={titre.codeUnique || 'TCK-DK-2026-0891'}
                size={210}
                level="M"
                style={{
                  width: '210px',
                  height: '210px',
                  display: 'block',
                  backgroundColor: '#ffffff',
                  padding: '10px',
                  borderRadius: '12px',
                }}
              />
            )}
          </div>

          {/* Tableau structuré de métadonnées */}
          <div className="qr-meta-table">
            {client && (
              <div className="qr-meta-row">
                <span className="qr-meta-label">Nom du voyageur</span>
                <span className="qr-meta-val" style={{ fontFamily: 'inherit' }}>
                  {client.prenom} {client.nom}
                </span>
              </div>
            )}

            <div className="qr-meta-row">
              <span className="qr-meta-label">Identifiant Titre</span>
              <span className="qr-meta-val">{titre.codeUnique}</span>
            </div>

            <div className="qr-meta-row">
              <span className="qr-meta-label">Formule d'accès</span>
              <span className="qr-meta-val" style={{ fontFamily: 'inherit', color: 'var(--primary-color)' }}>
                {TYPE_LABELS[titre.typeTitre] || titre.typeTitre}
              </span>
            </div>

            <div className="qr-meta-row">
              <span className="qr-meta-label">Statut du titre</span>
              <span
                className="role-badge"
                style={{
                  backgroundColor: titre.statut === 'ACTIF' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: titre.statut === 'ACTIF' ? '#10b981' : '#ef4444',
                  border: `1px solid ${titre.statut === 'ACTIF' ? '#10b981' : '#ef4444'}`,
                }}
              >
                {titre.statut}
              </span>
            </div>

            {titre.dateExpiration && (
              <div className="qr-meta-row" style={{ borderBottom: 'none' }}>
                <span className="qr-meta-label">Date d'expiration</span>
                <span className="qr-meta-val">{formatDateFR(titre.dateExpiration)}</span>
              </div>
            )}
          </div>

          {/* Boutons d'action modernes */}
          <div className="qr-action-buttons">
            <button type="button" className="qr-glow-action-btn" onClick={handleDownloadImage}>
              <span className="material-symbols-outlined">download</span>
              Télécharger
            </button>

            <button type="button" className="qr-share-btn" onClick={handleShare}>
              <span className="material-symbols-outlined">{shared || copied ? 'check' : 'share'}</span>
              {shared ? 'Partagé' : copied ? 'Copié' : 'Partager'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewQrModal;

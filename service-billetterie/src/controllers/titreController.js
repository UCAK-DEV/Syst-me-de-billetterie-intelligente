import { Op } from 'sequelize';
import { TitreTransport, AuditLog } from '../models/index.js';
import { genererTokenUnique, genererQRCodeImage } from '../services/qrCodeService.js';
import { TYPES_TITRE, STATUTS_TITRE } from '../utils/constants.js';
import logger from '../config/logger.js';

/**
 * Contrôleur de gestion des titres de transport numériques et des QR Codes.
 */

// POST /api/billetterie/titres
export const creerTitre = async (req, res) => {
  try {
    const { utilisateurId, typeTitre, abonnementId, dateExpiration } = req.body;

    if (!utilisateurId || typeof utilisateurId !== 'string') {
      return res.status(400).json({ message: 'Identifiant client (utilisateurId) obligatoire' });
    }

    if (!typeTitre || !TYPES_TITRE.includes(typeTitre)) {
      return res.status(400).json({
        message: `typeTitre invalide. Valeurs possibles : ${TYPES_TITRE.join(', ')}`,
      });
    }

    if (typeTitre !== 'TICKET_SIMPLE' && !abonnementId) {
      return res.status(400).json({
        message: "L'identifiant de l'abonnement (abonnementId) est obligatoire pour ce type de titre",
      });
    }

    // 1. Génération du token cryptographique unique
    const codeUnique = genererTokenUnique();

    // 2. Rendu de l'image QR Code
    const qrCodeData = await genererQRCodeImage(codeUnique);

    // 3. Enregistrement en base PostgreSQL
    const titre = await TitreTransport.create({
      codeUnique,
      qrCodeData,
      utilisateurId,
      typeTitre,
      abonnementId: abonnementId || null,
      statut: 'ACTIF',
      dateCreation: new Date(),
      dateExpiration: dateExpiration || null,
    });

    // 4. Piste d'audit inviolable
    await AuditLog.create({
      utilisateurId: req.user.id,
      role: req.user.role,
      action: 'GENERATION_TITRE',
      ressourceType: 'TITRE',
      ressourceId: titre.id,
      resultat: 'SUCCES',
      details: {
        codeUnique,
        typeTitre,
        utilisateurId,
        abonnementId,
      },
      ipAdresse: req.ip || req.connection.remoteAddress,
    });

    logger.info(`Titre généré : ${titre.id} (${typeTitre}) pour le client ${utilisateurId}`);
    return res.status(201).json({ titre });
  } catch (error) {
    logger.error(`Erreur lors de la création du titre : ${error.message}`);
    return res.status(500).json({ message: 'Erreur lors de la génération du titre de transport' });
  }
};

// GET /api/billetterie/titres
export const listerTitres = async (req, res) => {
  try {
    const { statut, typeTitre, utilisateurId, recherche } = req.query;
    const where = {};

    if (statut && STATUTS_TITRE.includes(statut)) {
      where.statut = statut;
    }
    if (typeTitre && TYPES_TITRE.includes(typeTitre)) {
      where.typeTitre = typeTitre;
    }
    if (utilisateurId) {
      where.utilisateurId = utilisateurId;
    }
    if (recherche) {
      where[Op.or] = [
        { codeUnique: { [Op.iLike]: `%${recherche}%` } },
        { utilisateurId: { [Op.iLike]: `%${recherche}%` } },
      ];
    }

    const titres = await TitreTransport.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(titres);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des titres : ${error.message}`);
    return res.status(500).json({ message: 'Erreur lors de la récupération des titres' });
  }
};

// GET /api/billetterie/titres/:id
export const getTitreById = async (req, res) => {
  try {
    const titre = await TitreTransport.findByPk(req.params.id);
    if (!titre) {
      return res.status(404).json({ message: 'Titre de transport introuvable' });
    }
    return res.status(200).json({ titre });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la consultation du titre' });
  }
};

// PATCH /api/billetterie/titres/:id/statut
export const changerStatutTitre = async (req, res) => {
  try {
    const { statut } = req.body;
    if (!['ACTIF', 'DESACTIVE'].includes(statut)) {
      return res.status(400).json({
        message: "Seuls les statuts ACTIF et DESACTIVE peuvent être appliqués manuellement",
      });
    }

    const titre = await TitreTransport.findByPk(req.params.id);
    if (!titre) {
      return res.status(404).json({ message: 'Titre de transport introuvable' });
    }

    const ancienStatut = titre.statut;
    titre.statut = statut;
    await titre.save();

    const action = statut === 'DESACTIVE' ? 'DESACTIVATION_TITRE' : 'ACTIVATION_TITRE';
    await AuditLog.create({
      utilisateurId: req.user.id,
      role: req.user.role,
      action,
      ressourceType: 'TITRE',
      ressourceId: titre.id,
      resultat: 'SUCCES',
      details: { ancienStatut, nouveauStatut: statut },
      ipAdresse: req.ip || req.connection.remoteAddress,
    });

    logger.info(`Statut titre #${titre.id} changé de ${ancienStatut} à ${statut} par ${req.user.id}`);
    return res.status(200).json({ titre });
  } catch (error) {
    logger.error(`Erreur lors du changement de statut du titre : ${error.message}`);
    return res.status(500).json({ message: 'Erreur lors de la modification du statut' });
  }
};

// GET /api/billetterie/titres/client/:utilisateurId
export const getTitresParClient = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const titres = await TitreTransport.findAll({
      where: { utilisateurId },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(titres);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des titres du client' });
  }
};

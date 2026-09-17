import sequelize from '../config/database.js';
import TitreTransport from './TitreTransport.js';
import Validation from './Validation.js';

// Relations
TitreTransport.hasMany(Validation, {
  foreignKey: 'titreId',
  as: 'validations',
  onDelete: 'SET NULL',
});

Validation.belongsTo(TitreTransport, {
  foreignKey: 'titreId',
  as: 'titre',
});

export { sequelize, TitreTransport, Validation };

export default {
  sequelize,
  TitreTransport,
  Validation,
};

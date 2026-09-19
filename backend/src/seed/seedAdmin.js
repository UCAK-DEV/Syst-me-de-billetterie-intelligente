import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

// Crée (ou réactive) un administrateur initial pour amorcer le système.
// Identifiants configurables via ADMIN_EMAIL / ADMIN_PASSWORD.
const seedAdmin = async () => {
  await connectDB();

  const defaultUsers = [
    {
      nom: 'Admin',
      prenom: 'Super',
      email: (process.env.ADMIN_EMAIL || 'admin@billetterie.com').toLowerCase(),
      telephone: '+221770000000',
      role: 'Administrateur',
      password: process.env.ADMIN_PASSWORD || 'Admin1234',
    },
    {
      nom: 'Admin',
      prenom: 'Super',
      email: 'admin@billeterie.com',
      telephone: '+221770000001',
      role: 'Administrateur',
      password: process.env.ADMIN_PASSWORD || 'Admin1234',
    },
    {
      nom: 'Diallo',
      prenom: 'Agent',
      email: 'agent@billetterie.com',
      telephone: '+221770000002',
      role: 'Agent',
      password: process.env.ADMIN_PASSWORD || 'Admin1234',
    },
    {
      nom: 'Sow',
      prenom: 'Client',
      email: 'client@billetterie.com',
      telephone: '+221770000003',
      role: 'Client',
      password: process.env.ADMIN_PASSWORD || 'Admin1234',
    },
  ];

  for (const u of defaultUsers) {
    let user = await User.findOne({ email: u.email });
    if (user) {
      user.password = u.password;
      user.status = 'Actif';
      user.role = u.role;
      user.nom = u.nom;
      user.prenom = u.prenom;
      user.mustChangePassword = false;
      await user.save();
      console.log(`Utilisateur existant réinitialisé : ${u.email} (${u.role})`);
    } else {
      user = await User.create({
        ...u,
        status: 'Actif',
        mustChangePassword: false,
      });
      console.log(`Utilisateur créé : ${u.email} (${u.role})`);
    }
  }

  console.log(`  Mot de passe par défaut pour tous : ${process.env.ADMIN_PASSWORD || 'Admin1234'}`);
  await mongoose.disconnect();
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('Échec du seed admin :', err.message);
  process.exit(1);
});

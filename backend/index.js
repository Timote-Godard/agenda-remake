import express from 'express';
import cors from 'cors';
import session from 'express-session';

// Import des fichiers de routes
import authRoutes from './routes/auth.js';
import validationsRoutes from './routes/validations.js';
import registrationRoutes from './routes/registration.js';

const app = express();

// ========================================================
// 1. LE CORS EN TOUT PREMIER (Le videur de la boîte de nuit)
// ========================================================
app.use(cors({
  origin: true,
  credentials: true
})); // Autorise TOUT le monde

// ========================================================
// 2. LA SESSION (Le gestionnaire de mémoire)
// ========================================================
app.use(session({
  secret: 'ton_secret_ultra_complexe_ici',
  resave: false,
  saveUninitialized: false, // Ne crée une session QUE si l'utilisateur s'est loggé
  cookie: { 
    secure: true, // ⚠️ À passer sur `true` le jour où ton site sera en ligne avec HTTPS
    httpOnly: true, // 🛡️ MAGIE ANTI-HACKEUR : Interdit au Javascript du navigateur de lire le cookie (Protège contre le XSS)
    sameSite: 'lax', // Autorise le cookie à voyager entre localhost:5173 et localhost:5000
    maxAge: 1000 * 60 * 60 * 24 // 24h
  }
}));

// 3. LE PARSER JSON
app.use(express.json());

// ========================================================
// 4. LES ROUTES (Maintenant, elles ont le bon CORS et la Session)
// ========================================================
app.use('/api', authRoutes);   
app.use('/api', validationsRoutes); 
app.use('/api', registrationRoutes); 

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur structuré et démarré sur http://localhost:${PORT}`);
});
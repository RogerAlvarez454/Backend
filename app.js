require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();
const rutas = require('./routes/api');
// Servir archivos estáticos (como el logo)
app.use('/static', express.static(path.join(__dirname)));
app.use(cors());
app.use(express.json());

// Todas las rutas API
app.use('/api', rutas);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://0.0.0.0:${PORT}`);
});


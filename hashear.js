// hashear.js
const bcrypt = require('bcryptjs');

const passwordPlano = 'admin123';

bcrypt.hash(passwordPlano, 10).then(hash => {
  console.log('Hash generado:', hash);
});

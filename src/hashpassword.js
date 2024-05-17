// hash-password.js
const bcrypt = require('bcrypt');

const password = 'password';
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error(err);
  } else {
    console.log(hash);
  }
});

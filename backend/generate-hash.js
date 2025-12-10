const bcrypt = require('bcryptjs');
const password = 'Trat_forTestJang$_+190';
bcrypt.hash(password, 12).then(hash => {
  console.log('Password:', password);
  console.log('Hash:', hash);
  // Verify it works
  bcrypt.compare(password, hash).then(result => {
    console.log('Verify:', result);
  });
});

#!/usr/bin/env node

/**
 * Admin Password Hash Generator
 * 
 * Usage: node scripts/generate-admin-hash.js
 * 
 * Generates a bcrypt hash for admin password to be stored in .env file.
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;

// Password policy regex patterns
const PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

function validatePassword(password) {
  const errors = [];
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  
  if (!PATTERNS.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!PATTERNS.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!PATTERNS.number.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!PATTERNS.special.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }
  
  return errors;
}

async function promptPassword(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    // Hide input
    process.stdout.write(prompt);
    
    let password = '';
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    const onData = (char) => {
      if (char === '\n' || char === '\r') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.exit();
      } else if (char === '\u007F') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(prompt + '*'.repeat(password.length));
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };
    
    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log('\n🔐 Admin Password Hash Generator');
  console.log('================================\n');
  console.log('Password requirements:');
  console.log(`  • Minimum ${MIN_PASSWORD_LENGTH} characters`);
  console.log('  • At least one uppercase letter');
  console.log('  • At least one lowercase letter');
  console.log('  • At least one number');
  console.log('  • At least one special character\n');
  
  try {
    // Get password
    const password = await promptPassword('Enter admin password: ');
    
    // Validate password
    const errors = validatePassword(password);
    if (errors.length > 0) {
      console.log('\n❌ Password does not meet requirements:');
      errors.forEach(e => console.log(`   • ${e}`));
      process.exit(1);
    }
    
    // Confirm password
    const confirm = await promptPassword('Confirm password: ');
    
    if (password !== confirm) {
      console.log('\n❌ Passwords do not match');
      process.exit(1);
    }
    
    // Generate hash
    console.log('\nGenerating hash...');
    const hash = await bcrypt.hash(password, BCRYPT_COST);
    
    console.log('\n✅ Hash generated successfully!\n');
    console.log('Add this to your .env file:\n');
    console.log('─'.repeat(60));
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('─'.repeat(60));
    console.log('\n⚠️  Keep this hash secure. Do not commit it to version control.\n');
    
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();

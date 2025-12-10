// Quick script to check app_logs in database
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../backend/db/database.sqlite'));

// Check app_logs
console.log('\n📋 Latest 20 app_logs entries:');
console.log('================================');
const logs = db.prepare('SELECT * FROM app_logs ORDER BY created_at DESC LIMIT 20').all();
if (logs.length === 0) {
  console.log('   (No logs found)');
} else {
  logs.forEach((log, i) => {
    console.log(`${i+1}. [${log.level}] ${log.category}: ${log.message}`);
    console.log(`   IP: ${log.ip || 'N/A'} | Time: ${log.created_at}`);
    if (log.metadata) console.log(`   Metadata: ${log.metadata.substring(0, 100)}...`);
    console.log('');
  });
}

console.log('================================');
console.log(`Total logs in database: ${db.prepare('SELECT COUNT(*) as count FROM app_logs').get().count}`);

db.close();

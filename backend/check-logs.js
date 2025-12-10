const db = require('better-sqlite3')('./db/database.sqlite');
const logs = db.prepare('SELECT * FROM app_logs ORDER BY created_at DESC LIMIT 10').all();

console.log('\n📋 Latest app_logs:');
console.log('===================');

if (logs.length === 0) {
  console.log('(No logs found in database)');
} else {
  logs.forEach((log, i) => {
    console.log(`${i+1}. [${log.level}] ${log.category}: ${log.message}`);
    console.log(`   IP: ${log.ip || 'N/A'} | Time: ${log.created_at}`);
  });
}

console.log('\nTotal logs:', db.prepare('SELECT COUNT(*) as c FROM app_logs').get().c);
db.close();

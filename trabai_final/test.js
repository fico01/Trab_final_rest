// Criar arquivo test.js
const Database = require('better-sqlite3');
const db = new Database('test.db');

console.log('✅ SQLite funcionando!');

// Executar: node test.js
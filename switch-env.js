const fs = require('fs');

const env = process.argv[2]; // 'local' o 'prod'

if (!env || !['local', 'prod'].includes(env)) {
  console.log('❌ Uso: node switch-env.js [local|prod]');
  console.log('   local: Usa backend locale (localhost:8000)');
  console.log('   prod:  Usa backend Koyeb');
  process.exit(1);
}

const localEnv = `export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  appName: 'Agriturismo Management (Dev)'
};`;

const prodEnv = `export const environment = {
  production: false,
  apiUrl: 'https://flat-damselfly-agriturismo-backend-47075869.koyeb.app',
  appName: 'Agriturismo Management (Dev)'
};`;

const targetPath = './src/environments/environment.ts';
const content = env === 'local' ? localEnv : prodEnv;

fs.writeFileSync(targetPath, content);

console.log(`✅ Ambiente switchato a: ${env.toUpperCase()}`);
console.log(`   API URL: ${env === 'local' ? 'http://localhost:8000' : 'https://flat-damselfly-agriturismo-backend-47075869.koyeb.app/'}`);
console.log(`   File aggiornato: ${targetPath}`); 
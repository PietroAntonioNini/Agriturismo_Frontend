const fs = require('fs');

const targetPath = './src/environments/environment.prod.ts';

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${process.env.API_URL || 'https://flat-damselfly-agriturismo-backend-47075869.koyeb.app/'}',
  appName: '${process.env.APP_NAME || 'Agriturismo Management'}',
  supabaseUrl: '${process.env.SUPABASE_URL || ''}',
  supabaseAnonKey: '${process.env.SUPABASE_ANON_KEY || ''}'
};`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`Environment config generated at ${targetPath}`); 
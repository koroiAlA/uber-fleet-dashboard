import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function runSqlFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Separamos por punto y coma para ejecutar cada INSERT por separado
  const statements = content
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let count = 0;
  for (const statement of statements) {
    try {
      await sql.query(statement);
      count++;
    } catch (err: any) {
      console.error(`Error en: ${statement.slice(0, 80)}...`);
      console.error(err.message);
    }
  }
  return count;
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data', 'fleet-management-software-data');

  console.log('Cargando taxis...');
  const taxisInserted = await runSqlFile(path.join(dataDir, 'taxis', 'taxis.sql'));
  console.log(`✔ ${taxisInserted} taxis insertados`);

  const trajectoriesDir = path.join(dataDir, 'trajectories');
  const files = fs.readdirSync(trajectoriesDir).filter(f => f.endsWith('.sql'));

  let totalTrajectories = 0;
  for (const file of files) {
    console.log(`Cargando ${file}...`);
    const inserted = await runSqlFile(path.join(trajectoriesDir, file));
    totalTrajectories += inserted;
    console.log(`  ✔ ${inserted} registros de ${file}`);
  }

  console.log(`\n🎉 Total: ${taxisInserted} taxis y ${totalTrajectories} trayectorias cargadas`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
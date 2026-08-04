"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const serverless_1 = require("@neondatabase/serverless");
require("dotenv/config");
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
async function runSqlFile(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
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
        }
        catch (err) {
            console.error(`Error en: ${statement.slice(0, 80)}...`);
            console.error(err.message);
        }
    }
    return count;
}
async function main() {
    const dataDir = path_1.default.join(__dirname, '..', 'data', 'fleet-management-software-data');
    console.log('Cargando taxis...');
    const taxisInserted = await runSqlFile(path_1.default.join(dataDir, 'taxis', 'taxis.sql'));
    console.log(`✔ ${taxisInserted} taxis insertados`);
    const trajectoriesDir = path_1.default.join(dataDir, 'trajectories');
    const files = fs_1.default.readdirSync(trajectoriesDir).filter(f => f.endsWith('.sql'));
    let totalTrajectories = 0;
    for (const file of files) {
        console.log(`Cargando ${file}...`);
        const inserted = await runSqlFile(path_1.default.join(trajectoriesDir, file));
        totalTrajectories += inserted;
        console.log(`  ✔ ${inserted} registros de ${file}`);
    }
    console.log(`\n🎉 Total: ${taxisInserted} taxis y ${totalTrajectories} trayectorias cargadas`);
}
main()
    .catch(console.error)
    .finally(() => process.exit());
//# sourceMappingURL=loadData.js.map
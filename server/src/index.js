"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const prisma_1 = __importDefault(require("./prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware_1 = require("./authMiddleware");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Endpoint: obtener todos los taxis
app.get('/taxis', async (req, res) => {
    try {
        const taxis = await prisma_1.default.taxi.findMany();
        res.json(taxis);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los taxis' });
    }
});
app.listen(PORT, () => {
    console.log(`🚕 Servidor corriendo en http://localhost:${PORT}`);
});
// Endpoint: última ubicación conocida de cada taxi
app.get('/trajectories/latest', async (req, res) => {
    try {
        // 1. Traemos el id de la trayectoria más reciente por cada taxi
        const latestPerTaxi = await prisma_1.default.trajectory.groupBy({
            by: ['taxiId'],
            _max: { recordedAt: true },
        });
        // 2. Con esas fechas, buscamos el registro completo de cada una
        const latestTrajectories = await Promise.all(latestPerTaxi.map(async (entry) => {
            return prisma_1.default.trajectory.findFirst({
                where: {
                    taxiId: entry.taxiId,
                    recordedAt: entry._max.recordedAt,
                },
            });
        }));
        res.json(latestTrajectories);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las últimas ubicaciones' });
    }
});
// Endpoint: obtener el recorrido de un taxi específico
app.get('/trajectories/:taxiId', async (req, res) => {
    try {
        const taxiId = Number(req.params.taxiId);
        if (isNaN(taxiId)) {
            return res.status(400).json({ error: 'El taxiId debe ser un número' });
        }
        const trajectories = await prisma_1.default.trajectory.findMany({
            where: { taxiId },
            orderBy: { recordedAt: 'asc' },
        });
        if (trajectories.length === 0) {
            return res.status(404).json({ error: 'No se encontraron trayectorias para este taxi' });
        }
        res.json(trajectories);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las trayectorias' });
    }
});
// Endpoint: registrar un nuevo usuario
app.post('/users', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        // Encriptamos la contraseña antes de guardarla
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: { email, passwordHash },
        });
        // Nunca devolvemos el passwordHash en la respuesta
        res.status(201).json({ id: user.id, email: user.email, role: user.role });
    }
    catch (error) {
        if (error.code === 'P2002') {
            // Prisma lanza este código cuando ya existe un valor único (el email)
            return res.status(409).json({ error: 'Ese email ya está registrado' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});
// Endpoint: iniciar sesión
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        // Buscamos al usuario por email
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Comparamos la contraseña enviada con la encriptada guardada
        const passwordMatches = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Generamos el token JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});
// Endpoint protegido: crear un nuevo taxi (requiere estar logueado)
app.post('/taxis', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { id, plate } = req.body;
        if (!id || !plate) {
            return res.status(400).json({ error: 'id y plate son requeridos' });
        }
        const taxi = await prisma_1.default.taxi.create({ data: { id, plate } });
        res.status(201).json(taxi);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Ya existe un taxi con esa placa' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al crear el taxi' });
    }
});
//# sourceMappingURL=index.js.map
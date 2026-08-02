import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import prisma from './prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './authMiddleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint: obtener todos los taxis
app.get('/taxis', async (req, res) => {
  try {
    const taxis = await prisma.taxi.findMany();
    res.json(taxis);
  } catch (error) {
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
    const latestPerTaxi = await prisma.trajectory.groupBy({
      by: ['taxiId'],
      _max: { recordedAt: true },
    });

    // 2. Con esas fechas, buscamos el registro completo de cada una
    const latestTrajectories = await Promise.all(
      latestPerTaxi.map(async (entry) => {
        return prisma.trajectory.findFirst({
          where: {
            taxiId: entry.taxiId,
            recordedAt: entry._max.recordedAt!,
          },
        });
      })
    );

    res.json(latestTrajectories);
  } catch (error) {
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

    const trajectories = await prisma.trajectory.findMany({
      where: { taxiId },
      orderBy: { recordedAt: 'asc' },
    });

    if (trajectories.length === 0) {
      return res.status(404).json({ error: 'No se encontraron trayectorias para este taxi' });
    }

    res.json(trajectories);
  } catch (error) {
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
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    // Nunca devolvemos el passwordHash en la respuesta
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (error: any) {
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
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Comparamos la contraseña enviada con la encriptada guardada
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generamos el token JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Endpoint protegido: crear un nuevo taxi (requiere estar logueado)
app.post('/taxis', authMiddleware, async (req, res) => {
  try {
    const { id, plate } = req.body;

    if (!id || !plate) {
      return res.status(400).json({ error: 'id y plate son requeridos' });
    }

    const taxi = await prisma.taxi.create({ data: { id, plate } });
    res.status(201).json(taxi);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un taxi con esa placa' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el taxi' });
  }
});
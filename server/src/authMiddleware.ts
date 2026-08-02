import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extendemos el tipo Request para poder guardar los datos del usuario ahí
interface AuthRequest extends Request {
  user?: { userId: number; role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1]; // "Bearer eyJhbGci..." -> tomamos solo el token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; role: string };
    req.user = decoded; // guardamos los datos del usuario para usarlos en el endpoint
    next(); // todo bien, deja pasar la petición
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
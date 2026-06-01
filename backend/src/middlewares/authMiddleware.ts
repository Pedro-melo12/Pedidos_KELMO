import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  role: string;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const secret = (process.env.JWT_SECRET || 'secret') as string;
    const decoded = jwt.verify(token as string, secret);
    (req as any).user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido' });
  }
};

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as TokenPayload;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado: Requer privilegios de administrador' });
  }
  return next();
};

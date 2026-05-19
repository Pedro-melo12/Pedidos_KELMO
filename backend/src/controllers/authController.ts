import type { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LogService } from '../services/logService';

const authService = new AuthService();
const logService = new LogService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { nome, email, senha, role } = req.body;
      const user = await authService.register(nome, email, senha, role);
      try {
        await logService.create({
          usuario_id: user.id,
          evento: 'auth.register',
          acao: 'register',
          descricao: `Usuário registrado: ${user.email}`,
        });
      } catch (e) {
        console.error('Erro ao gravar log de registro', e);
      }
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;
      const result = await authService.login(email, senha);
      try {
        await logService.create({
          usuario_id: result.user.id,
          evento: 'auth.login',
          acao: 'login',
          descricao: `Usuário logado: ${result.user.email}`,
        });
      } catch (e) {
        console.error('Erro ao gravar log de login', e);
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

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
      await logService.createSafe({
        usuario_id: user.id,
        evento: 'auth.register.success',
        acao: 'register',
        descricao: `Usuario registrado: ${user.email}`,
        metadata: { email: user.email, role: user.role },
      });
      res.status(201).json(user);
    } catch (error: any) {
      await logService.createSafe({
        evento: 'auth.register.failure',
        acao: 'register',
        descricao: `Falha ao registrar usuario: ${error.message}`,
        metadata: { email: req.body?.email },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;
      const result = await authService.login(email, senha);
      await logService.createSafe({
        usuario_id: result.user.id,
        evento: 'auth.login.success',
        acao: 'login',
        descricao: `Login realizado com sucesso: ${result.user.email}`,
        metadata: { email: result.user.email, role: result.user.role },
      });
      res.json(result);
    } catch (error: any) {
      await logService.createSafe({
        evento: 'auth.login.failure',
        acao: 'login',
        descricao: `Falha de login: ${error.message}`,
        metadata: { email: req.body?.email },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { senhaAtual, novaSenha } = req.body;
      const userId = (req as any).user?.id;

      await authService.changePassword(userId, senhaAtual, novaSenha);
      await logService.createSafe({
        usuario_id: userId,
        evento: 'auth.change_password.success',
        acao: 'change_password',
        descricao: 'Senha alterada com sucesso',
      });
      res.json({ message: 'Senha alterada com sucesso.' });
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'auth.change_password.failure',
        acao: 'change_password',
        descricao: `Falha ao alterar senha: ${error.message}`,
      });
      res.status(400).json({ error: error.message });
    }
  }
}

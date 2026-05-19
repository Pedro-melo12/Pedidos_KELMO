import type { Request, Response } from 'express';
import { LogService } from '../services/logService';

const logService = new LogService();

export class LogController {
  async create(req: Request, res: Response) {
    try {
      const usuario_id = (req as any).user?.id;
      const { evento, acao, descricao, metadata } = req.body;

      const log = await logService.create({
        usuario_id,
        evento,
        acao,
        descricao,
        metadata,
      });

      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const logs = await logService.findAll();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

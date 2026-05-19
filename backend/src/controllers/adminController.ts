import type { Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { Role } from '@prisma/client';

const adminService = new AdminService();

export class AdminController {
  async getUsers(req: Request, res: Response) {
    try {
      const users = await adminService.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async changeRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = await adminService.changeUserRole(id as string, role as Role);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await adminService.deleteUser(id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async exportFullBackup(req: Request, res: Response) {
    try {
      const jsonData = await adminService.exportFullBackup();
      res.header('Content-Type', 'application/json');
      res.attachment('backup_total.json');
      res.send(jsonData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async restoreFullBackup(req: Request, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const fileContent = file.buffer.toString('utf-8');
      const backupData = JSON.parse(fileContent);

      await adminService.restoreFullBackup(backupData);
      
      res.json({ message: 'Backup restaurado com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: `Erro ao restaurar backup: ${error.message}` });
    }
  }

  async getBackupSchedule(req: Request, res: Response) {
    try {
      const schedule = await adminService.getBackupSchedule();
      res.json({ schedule });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async setBackupSchedule(req: Request, res: Response) {
    try {
      const { cronStr } = req.body;
      if (!cronStr) {
        return res.status(400).json({ error: 'Cron string é obrigatório.' });
      }

      await adminService.setBackupSchedule(cronStr);

      // Atualiza o agendamento em memória
      const { setupCron } = require('../utils/backupScheduler');
      setupCron(cronStr);

      res.json({ message: 'Agendamento atualizado com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBackupsList(req: Request, res: Response) {
    try {
      const fs = require('fs');
      const path = require('path');
      const backupsDir = path.resolve(__dirname, '../../backups');

      let backups: any[] = [];
      
      if (fs.existsSync(backupsDir)) {
        const files = fs.readdirSync(backupsDir);
        backups = files.filter((f: string) => f.endsWith('.json')).map((f: string) => {
          const filePath = path.join(backupsDir, f);
          const stats = fs.statSync(filePath);
          return {
            fileName: f,
            status: 'Concluído',
            createdAt: stats.birthtime, // Ou stats.mtime
            size: stats.size
          };
        });
      }

      // Buscar agendamento pendente no banco
      const scheduleConfig = await adminService.getBackupSchedule();
      if (scheduleConfig) {
        try {
          // Calcula o próximo horário com base no cron
          const cronParser = require('cron-parser');
          const parseExp = cronParser.parseExpression || (cronParser.default && cronParser.default.parseExpression);
          
          if (parseExp) {
            const interval = parseExp(scheduleConfig);
            const nextDate = interval.next().toDate();

            backups.push({
              fileName: '(Aguardando execução...)',
              status: 'Pendente',
              createdAt: nextDate,
              size: 0
            });
          }
        } catch (err) {
          console.error('Erro ao calcular próximo backup: ', err);
        }
      }

      // Ordenar do mais recente (ou futuro) para o mais antigo
      backups.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(backups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async forceBackup(req: Request, res: Response) {
    try {
      const { createLocalBackup } = require('../utils/backupScheduler');
      await createLocalBackup();
      res.json({ message: 'Backup gerado no servidor com sucesso!' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async downloadBackupFile(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const path = require('path');
      const fs = require('fs');

      if (!fileName || fileName.includes('..')) {
        return res.status(400).json({ error: 'Nome de arquivo inválido.' });
      }

      const filePath = path.resolve(__dirname, '../../backups', fileName);
      console.log(`[Download] Requested file: ${fileName}, Resolved Path: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.log(`[Download] File not found: ${filePath}`);
        return res.status(404).json({ error: 'Arquivo não encontrado.' });
      }

      console.log(`[Download] Sending file via stream...`);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

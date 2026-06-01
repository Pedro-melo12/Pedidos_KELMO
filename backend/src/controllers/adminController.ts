import type { Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { LogService } from '../services/logService';
import { Role } from '@prisma/client';

const adminService = new AdminService();
const logService = new LogService();

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
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'admin.user.change_role.success',
        acao: 'change_role',
        descricao: `Perfil do usuario atualizado: ${id} -> ${role}`,
        metadata: { targetUserId: id, role },
      });
      res.json(user);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'admin.user.change_role.failure',
        acao: 'change_role',
        descricao: `Falha ao alterar perfil do usuario: ${error.message}`,
        metadata: { targetUserId: req.params?.id, role: req.body?.role },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, email, role } = req.body;
      const user = await adminService.updateUser(id as string, {
        ...(nome ? { nome } : {}),
        ...(email ? { email } : {}),
        ...(role ? { role: role as Role } : {}),
      });
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'admin.user.update.success',
        acao: 'update_user',
        descricao: `Usuario atualizado: ${id}`,
        metadata: { targetUserId: id, nome, email, role },
      });
      res.json(user);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'admin.user.update.failure',
        acao: 'update_user',
        descricao: `Falha ao atualizar usuario: ${error.message}`,
        metadata: { targetUserId: req.params?.id },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await adminService.deleteUser(id as string);
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'admin.user.delete.success',
        acao: 'delete_user',
        descricao: `Usuario excluido: ${id}`,
        metadata: { targetUserId: id },
      });
      res.status(204).send();
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'admin.user.delete.failure',
        acao: 'delete_user',
        descricao: `Falha ao excluir usuario: ${error.message}`,
        metadata: { targetUserId: req.params?.id },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async exportFullBackup(req: Request, res: Response) {
    try {
      const jsonData = await adminService.exportFullBackup();
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.export.success',
        acao: 'export_backup',
        descricao: 'Backup completo exportado para download',
        metadata: { bytes: Buffer.byteLength(jsonData, 'utf8') },
      });
      res.header('Content-Type', 'application/json');
      res.attachment('backup_total.json');
      res.send(jsonData);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.export.failure',
        acao: 'export_backup',
        descricao: `Falha ao exportar backup: ${error.message}`,
      });
      res.status(500).json({ error: error.message });
    }
  }

  async restoreFullBackup(req: Request, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) {
        await logService.createSafe({
          usuario_id: (req as any).user?.id,
          evento: 'backup.restore.failure',
          acao: 'restore_backup',
          descricao: 'Falha ao restaurar backup: nenhum arquivo enviado',
        });
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const fileContent = file.buffer.toString('utf-8');
      const backupData = JSON.parse(fileContent);

      await adminService.restoreFullBackup(backupData);
      await logService.createSafe({
        evento: 'backup.restore.success',
        acao: 'restore_backup',
        descricao: 'Backup restaurado com sucesso',
        metadata: {
          fileName: file.originalname,
          bytes: file.size,
          usuarios: backupData.usuarios?.length || 0,
          produtos: backupData.produtos?.length || 0,
          pedidos: backupData.pedidos?.length || 0,
          logs: backupData.logs?.length || 0,
        },
      });

      res.json({ message: 'Backup restaurado com sucesso.' });
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.restore.failure',
        acao: 'restore_backup',
        descricao: `Erro ao restaurar backup: ${error.message}`,
        metadata: { fileName: (req as any).file?.originalname },
      });
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
        await logService.createSafe({
          usuario_id: (req as any).user?.id,
          evento: 'backup.schedule.update.failure',
          acao: 'update_schedule',
          descricao: 'Falha ao atualizar agendamento: cronStr nao informado',
        });
        return res.status(400).json({ error: 'Cron string e obrigatorio.' });
      }

      await adminService.setBackupSchedule(cronStr);

      const { setupCron } = require('../utils/backupScheduler');
      setupCron(cronStr);

      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.schedule.update.success',
        acao: 'update_schedule',
        descricao: `Agendamento de backup atualizado: ${cronStr}`,
        metadata: { cronStr },
      });
      res.json({ message: 'Agendamento atualizado com sucesso.' });
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.schedule.update.failure',
        acao: 'update_schedule',
        descricao: `Falha ao atualizar agendamento de backup: ${error.message}`,
        metadata: { cronStr: req.body?.cronStr },
      });
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
            status: 'Concluido',
            createdAt: stats.birthtime,
            size: stats.size
          };
        });
      }

      const scheduleConfig = await adminService.getBackupSchedule();
      if (scheduleConfig) {
        try {
          const cronParser = require('cron-parser');
          const parseExp = cronParser.parseExpression || (cronParser.default && cronParser.default.parseExpression);

          if (parseExp) {
            const interval = parseExp(scheduleConfig);
            const nextDate = interval.next().toDate();

            backups.push({
              fileName: '(Aguardando execucao...)',
              status: 'Pendente',
              createdAt: nextDate,
              size: 0
            });
          }
        } catch (err) {
          console.error('Erro ao calcular proximo backup: ', err);
        }
      }

      backups.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(backups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async forceBackup(req: Request, res: Response) {
    try {
      const { createLocalBackup } = require('../utils/backupScheduler');
      await createLocalBackup((req as any).user?.id);
      res.json({ message: 'Backup gerado no servidor com sucesso!' });
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.force.failure',
        acao: 'force_backup',
        descricao: `Falha ao gerar backup manual: ${error.message}`,
      });
      res.status(500).json({ error: error.message });
    }
  }

  async downloadBackupFile(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const path = require('path');
      const fs = require('fs');

      if (!fileName || fileName.includes('..')) {
        await logService.createSafe({
          usuario_id: (req as any).user?.id,
          evento: 'backup.download.failure',
          acao: 'download_backup',
          descricao: 'Falha ao baixar backup: nome de arquivo invalido',
          metadata: { fileName },
        });
        return res.status(400).json({ error: 'Nome de arquivo invalido.' });
      }

      const filePath = path.resolve(__dirname, '../../backups', fileName);
      console.log(`[Download] Requested file: ${fileName}, Resolved Path: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.log(`[Download] File not found: ${filePath}`);
        await logService.createSafe({
          usuario_id: (req as any).user?.id,
          evento: 'backup.download.failure',
          acao: 'download_backup',
          descricao: `Falha ao baixar backup: arquivo nao encontrado (${fileName})`,
          metadata: { fileName, filePath },
        });
        return res.status(404).json({ error: 'Arquivo nao encontrado.' });
      }

      const stats = fs.statSync(filePath);
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.download.success',
        acao: 'download_backup',
        descricao: `Download de backup iniciado: ${fileName}`,
        metadata: { fileName, filePath, size: stats.size },
      });

      console.log('[Download] Sending file via stream...');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'backup.download.failure',
        acao: 'download_backup',
        descricao: `Falha ao baixar backup: ${error.message}`,
        metadata: { fileName: req.params?.fileName },
      });
      res.status(500).json({ error: error.message });
    }
  }
}

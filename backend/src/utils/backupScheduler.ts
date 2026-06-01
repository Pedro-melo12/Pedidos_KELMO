import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

let currentTask: any = null;

async function createSystemLog(
  evento: string,
  acao: string,
  descricao: string,
  metadata?: Prisma.InputJsonObject,
  usuarioId?: string
) {
  try {
    await prisma.log.create({
      data: {
        evento,
        acao,
        descricao,
        ...(usuarioId ? { usuario_id: usuarioId } : {}),
        ...(metadata ? { metadata } : {}),
      },
    });
  } catch (error) {
    console.error('[BackupScheduler] Erro ao gravar log de auditoria', error);
  }
}

export async function createLocalBackup(usuarioId?: string) {
  try {
    const usuarios = await prisma.usuario.findMany();
    const produtos = await prisma.produto.findMany();
    const pedidos = await prisma.pedido.findMany();
    const pedidoItens = await prisma.pedidoItem.findMany();
    const logs = await prisma.log.findMany();
    const senhaHistoricos = await prisma.senhaHistorico.findMany();

    const fullBackup = {
      timestamp: new Date().toISOString(),
      usuarios,
      produtos,
      pedidos,
      pedidoItens,
      logs,
      senhaHistoricos
    };

    const fileName = `backup_${Date.now()}.json`;
    const backupsDir = path.resolve(__dirname, '../../backups');

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filePath = path.join(backupsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2));
    const size = fs.statSync(filePath).size;

    console.log(`[BackupScheduler] Backup gerado com sucesso: ${fileName}`);
    await createSystemLog(
      'backup.local.success',
      'backup',
      `Backup local gerado com sucesso: ${fileName}`,
      { fileName, filePath, size },
      usuarioId
    );

    return { fileName, filePath, size };
  } catch (error) {
    console.error('[BackupScheduler] Erro ao gerar backup automatico', error);
    await createSystemLog(
      'backup.local.failure',
      'backup',
      `Erro ao gerar backup local: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

export async function initializeBackupScheduler() {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { chave: 'backup_schedule' }
    });

    if (config && config.valor) {
      setupCron(config.valor);
    }
  } catch (error) {
    console.log('[BackupScheduler] Nao foi possivel carregar agendamento de backup.');
  }
}

export function setupCron(cronStr: string) {
  if (currentTask) {
    currentTask.stop();
    console.log('[BackupScheduler] Tarefa anterior parada.');
  }

  const isValid = cron.validate(cronStr);
  if (!isValid) {
    console.log(`[BackupScheduler] Expressao Cron invalida: ${cronStr}`);
    createSystemLog(
      'backup.scheduler.invalid',
      'schedule',
      `Expressao Cron invalida: ${cronStr}`,
      { cronStr }
    );
    return;
  }

  currentTask = cron.schedule(cronStr, () => {
    console.log(`[BackupScheduler] Executando rotina de backup (Schedule: ${cronStr})...`);
    createLocalBackup();
  });

  console.log(`[BackupScheduler] Nova tarefa agendada: ${cronStr}`);
}

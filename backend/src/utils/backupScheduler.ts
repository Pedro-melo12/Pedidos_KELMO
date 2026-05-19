import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

let currentTask: any = null;

export async function createLocalBackup() {
  try {
    const usuarios = await prisma.usuario.findMany();
    const produtos = await prisma.produto.findMany();
    const pedidos = await prisma.pedido.findMany();
    const pedidoItens = await prisma.pedidoItem.findMany();

    const fullBackup = {
      timestamp: new Date().toISOString(),
      usuarios,
      produtos,
      pedidos,
      pedidoItens
    };

    const fileName = `backup_${Date.now()}.json`;
    const backupsDir = path.resolve(__dirname, '../../backups');
    
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filePath = path.join(backupsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2));
    console.log(`[BackupScheduler] Backup gerado com sucesso: ${fileName}`);
  } catch (error) {
    console.error('[BackupScheduler] Erro ao gerar backup automático', error);
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
    console.log('[BackupScheduler] Não foi possível carregar agendamento de backup.');
  }
}

export function setupCron(cronStr: string) {
  if (currentTask) {
    currentTask.stop();
    console.log('[BackupScheduler] Tarefa anterior parada.');
  }

  const isValid = cron.validate(cronStr);
  if (!isValid) {
    console.log(`[BackupScheduler] Expressão Cron inválida: ${cronStr}`);
    return;
  }

  currentTask = cron.schedule(cronStr, () => {
    console.log(`[BackupScheduler] Executando rotina de backup (Schedule: ${cronStr})...`);
    createLocalBackup();
  });

  console.log(`[BackupScheduler] Nova tarefa agendada: ${cronStr}`);
}

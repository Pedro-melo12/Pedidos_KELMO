import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';

export class AdminService {
  async getAllUsers() {
    return prisma.usuario.findMany({ select: { id: true, nome: true, email: true, role: true, created_at: true } });
  }

  async changeUserRole(id: string, role: Role) {
    return prisma.usuario.update({
      where: { id },
      data: { role },
      select: { id: true, nome: true, role: true }
    });
  }

  async deleteUser(id: string) {
    return prisma.usuario.delete({ where: { id } });
  }

  async exportFullBackup() {
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

    return JSON.stringify(fullBackup, null, 2);
  }

  async restoreFullBackup(data: any) {
    // Apaga os dados atuais (cuidado com as chaves estrangeiras)
    await prisma.$transaction([
      prisma.pedidoItem.deleteMany(),
      prisma.pedido.deleteMany(),
      prisma.produto.deleteMany(),
      prisma.usuario.deleteMany(),
    ]);

    // Insere os dados novos do backup
    if (data.usuarios?.length) await prisma.usuario.createMany({ data: data.usuarios });
    if (data.produtos?.length) await prisma.produto.createMany({ data: data.produtos });
    if (data.pedidos?.length) await prisma.pedido.createMany({ data: data.pedidos });
    if (data.pedidoItens?.length) await prisma.pedidoItem.createMany({ data: data.pedidoItens });

    return { success: true };
  }

  async getBackupSchedule() {
    const config = await prisma.configuracao.findUnique({
      where: { chave: 'backup_schedule' }
    });
    return config ? config.valor : '';
  }

  async setBackupSchedule(cronStr: string) {
    return prisma.configuracao.upsert({
      where: { chave: 'backup_schedule' },
      update: { valor: cronStr },
      create: { chave: 'backup_schedule', valor: cronStr }
    });
  }
}

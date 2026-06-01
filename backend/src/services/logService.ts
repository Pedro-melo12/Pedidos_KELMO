import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class LogService {
  async create(data: Prisma.LogUncheckedCreateInput) {
    return prisma.log.create({ data });
  }

  async createSafe(data: Prisma.LogUncheckedCreateInput) {
    try {
      return await this.create(data);
    } catch (error) {
      console.error('Erro ao gravar log de auditoria', error);
      return null;
    }
  }

  async findAll() {
    return prisma.log.findMany({
      orderBy: { created_at: 'desc' },
      include: { usuario: true },
    });
  }
}

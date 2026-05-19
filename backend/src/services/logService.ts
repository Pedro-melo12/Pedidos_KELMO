import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class LogService {
  async create(data: { usuario_id?: string; evento: string; acao?: string; descricao?: string; metadata?: Prisma.JsonValue }) {
    return prisma.log.create({ data });
  }

  async findAll() {
    return prisma.log.findMany({
      orderBy: { created_at: 'desc' },
      include: { usuario: true },
    });
  }
}

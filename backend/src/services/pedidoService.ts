import { prisma } from '../utils/prisma';
import { StatusPedido } from '@prisma/client';

export class PedidoService {
  async create(usuario_id: string, itens: { produto_id: string; quantidade: number; preco_unitario: number }[]) {
    // Calculando valor total
    let valor_total = 0;
    const itemsData = itens.map(item => {
      const subtotal = item.quantidade * item.preco_unitario;
      valor_total += subtotal;
      return {
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal
      };
    });

    return prisma.pedido.create({
      data: {
        usuario_id,
        valor_total,
        itens: {
          create: itemsData
        }
      },
      include: { itens: true }
    });
  }

  async findByUsuario(usuario_id: string) {
    return prisma.pedido.findMany({
      where: { usuario_id },
      include: { itens: { include: { produto: true } } }
    });
  }

  async findAll() {
    return prisma.pedido.findMany({
      include: { usuario: { select: { nome: true, email: true } }, itens: { include: { produto: true } } }
    });
  }

  async updateStatus(id: string, status: StatusPedido) {
    return prisma.pedido.update({
      where: { id },
      data: { status }
    });
  }
}

import type { Request, Response } from 'express';
import { PedidoService } from '../services/pedidoService';
import { StatusPedido } from '@prisma/client';
import { LogService } from '../services/logService';

const pedidoService = new PedidoService();
const logService = new LogService();

export class PedidoController {
  async create(req: Request, res: Response) {
    try {
      const usuario_id = (req as any).user.id;
      const { itens } = req.body;
      const pedido = await pedidoService.create(usuario_id, itens);
      await logService.createSafe({
        usuario_id,
        evento: 'pedido.create.success',
        acao: 'create',
        descricao: `Pedido criado: ${pedido.id}`,
        metadata: { pedidoId: pedido.id, itens, valorTotal: pedido.valor_total },
      });
      res.status(201).json(pedido);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'pedido.create.failure',
        acao: 'create',
        descricao: `Falha ao criar pedido: ${error.message}`,
        metadata: { itens: req.body?.itens },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async getMeusPedidos(req: Request, res: Response) {
    try {
      const usuario_id = (req as any).user.id;
      const pedidos = await pedidoService.findByUsuario(usuario_id);
      res.json(pedidos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const pedidos = await pedidoService.findAll();
      res.json(pedidos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const pedido = await pedidoService.updateStatus(id as string, status as StatusPedido);
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'pedido.update_status.success',
        acao: 'update_status',
        descricao: `Status do pedido atualizado: ${pedido.id} -> ${pedido.status}`,
        metadata: { pedidoId: pedido.id, status: pedido.status },
      });
      res.json(pedido);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'pedido.update_status.failure',
        acao: 'update_status',
        descricao: `Falha ao atualizar status do pedido: ${error.message}`,
        metadata: { pedidoId: req.params?.id, status: req.body?.status },
      });
      res.status(400).json({ error: error.message });
    }
  }
}

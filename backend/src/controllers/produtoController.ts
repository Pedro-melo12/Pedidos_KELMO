import type { Request, Response } from 'express';
import { ProdutoService } from '../services/produtoService';
import { LogService } from '../services/logService';

const produtoService = new ProdutoService();
const logService = new LogService();

export class ProdutoController {
  async create(req: Request, res: Response) {
    try {
      const { nome, descricao, preco, estoque } = req.body;
      const produto = await produtoService.create({ nome, descricao, preco, estoque });
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'produto.create.success',
        acao: 'create',
        descricao: `Produto criado: ${produto.id} - ${produto.nome}`,
        metadata: { produtoId: produto.id, nome: produto.nome, preco: produto.preco, estoque: produto.estoque },
      });
      res.status(201).json(produto);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'produto.create.failure',
        acao: 'create',
        descricao: `Falha ao criar produto: ${error.message}`,
        metadata: { nome: req.body?.nome, preco: req.body?.preco, estoque: req.body?.estoque },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const produtos = await produtoService.findAll();
      res.json(produtos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const produto = await produtoService.findById(id as string);
      res.json(produto);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, descricao, preco, estoque } = req.body;
      const produto = await produtoService.update(id as string, { nome, descricao, preco, estoque });
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'produto.update.success',
        acao: 'update',
        descricao: `Produto atualizado: ${produto.id} - ${produto.nome}`,
        metadata: { produtoId: produto.id, nome, descricao, preco, estoque },
      });
      res.json(produto);
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'produto.update.failure',
        acao: 'update',
        descricao: `Falha ao atualizar produto: ${error.message}`,
        metadata: { produtoId: req.params?.id, ...req.body },
      });
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await produtoService.delete(id as string);
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'produto.delete.success',
        acao: 'delete',
        descricao: `Produto excluido: ${id}`,
        metadata: { produtoId: id },
      });
      res.status(204).send();
    } catch (error: any) {
      await logService.createSafe({
        usuario_id: (req as any).user?.id,
        evento: 'produto.delete.failure',
        acao: 'delete',
        descricao: `Falha ao excluir produto: ${error.message}`,
        metadata: { produtoId: req.params?.id },
      });
      res.status(400).json({ error: error.message });
    }
  }
}

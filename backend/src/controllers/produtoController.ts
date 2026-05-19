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
      try {
        await logService.create({
          usuario_id: (req as any).user?.id,
          evento: 'produto.create',
          acao: 'create',
          descricao: `Produto criado: ${produto.id} - ${produto.nome}`,
          metadata: { produtoId: produto.id, nome: produto.nome },
        });
      } catch (e) {
        console.error('Erro ao gravar log de produto', e);
      }
      res.status(201).json(produto);
    } catch (error: any) {
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
      res.json(produto);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await produtoService.delete(id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

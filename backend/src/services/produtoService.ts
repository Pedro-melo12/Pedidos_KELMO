import { prisma } from '../utils/prisma';

export class ProdutoService {
  async create(data: { nome: string; descricao?: string; preco: number; estoque: number }) {
    return prisma.produto.create({ data });
  }

  async findAll() {
    return prisma.produto.findMany();
  }

  async findById(id: string) {
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) throw new Error('Produto não encontrado');
    return produto;
  }

  async update(id: string, data: { nome?: string; descricao?: string; preco?: number; estoque?: number }) {
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) throw new Error('Produto não encontrado');

    return prisma.produto.update({ where: { id }, data });
  }

  async delete(id: string) {
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) throw new Error('Produto não encontrado');

    return prisma.produto.delete({ where: { id } });
  }
}

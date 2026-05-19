import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, ShoppingCart, Trash2, CheckCircle } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
}

export default function Produtos() {
  const { isAdmin } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cart, setCart] = useState<{ produto: Produto, qtd: number }[]>([]);
  
  // Modal de novo produto (apenas ADMIN)
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');

  const fetchProdutos = async () => {
    try {
      const res = await api.get('/produtos');
      setProdutos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleAddProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/produtos', { nome, descricao, preco: parseFloat(preco), estoque: parseInt(estoque, 10) });
      setShowModal(false);
      setNome(''); setDescricao(''); setPreco(''); setEstoque('');
      fetchProdutos();
    } catch (err) {
      alert('Erro ao criar produto');
    }
  };

  const handleDeleteProduto = async (id: string) => {
    if (!window.confirm('Excluir produto?')) return;
    try {
      await api.delete(`/produtos/${id}`);
      fetchProdutos();
    } catch (err) {
      alert('Erro ao excluir produto');
    }
  };

  const addToCart = (produto: Produto) => {
    const existing = cart.find(c => c.produto.id === produto.id);
    if (existing) {
      setCart(cart.map(c => c.produto.id === produto.id ? { ...c, qtd: c.qtd + 1 } : c));
    } else {
      setCart([...cart, { produto, qtd: 1 }]);
    }
  };

  const removeFromCart = (produtoId: string) => {
    setCart(cart.filter(c => c.produto.id !== produtoId));
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const itens = cart.map(c => ({
      produto_id: c.produto.id,
      quantidade: c.qtd,
      preco_unitario: c.produto.preco
    }));
    try {
      await api.post('/pedidos', { itens });
      alert('Pedido realizado com sucesso!');
      setCart([]);
    } catch (err) {
      alert('Erro ao realizar pedido');
    }
  };

  const cartTotal = cart.reduce((acc, current) => acc + (current.produto.preco * current.qtd), 0);

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <div className="flex-1 space-y-6 w-full">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Produtos Disponíveis</h1>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center cursor-pointer">
              <Plus className="w-4 h-4 mr-2" /> Novo Produto
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtos.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-md transition">
              <h3 className="text-lg font-bold text-gray-900">{p.nome}</h3>
              <p className="text-sm text-gray-500 mt-1 flex-1">{p.descricao}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xl font-extrabold text-primary-600">R$ {p.preco.toFixed(2)}</span>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                  Estoque: {p.estoque}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center gap-2">
                <button
                  onClick={() => addToCart(p)}
                  className="flex-1 bg-gray-900 text-white hover:bg-gray-800 font-medium px-4 py-2 rounded-lg transition text-sm flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-50"
                  disabled={p.estoque === 0}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {p.estoque > 0 ? 'Adicionar' : 'Esgotado'}
                </button>
                {isAdmin && (
                  <button onClick={() => handleDeleteProduto(p.id)} className="text-gray-400 hover:text-red-500 p-2 cursor-pointer transition bg-gray-50 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {produtos.length === 0 && <p className="text-gray-500 italic col-span-full">Nenhum produto encontrado na loja.</p>}
        </div>
      </div>

      <div className="w-full md:w-80 shrink-0 sticky top-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center pb-3 border-b border-gray-100">
            <ShoppingCart className="w-5 h-5 mr-2 text-primary-600" /> Seu Carrinho
          </h2>
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">Seu carrinho está vazio.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
                {cart.map(c => (
                  <div key={c.produto.id} className="flex justify-between items-start text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 line-clamp-1">{c.produto.nome}</p>
                      <p className="text-gray-500 mt-1">Qtd: <span className="font-medium text-gray-700">{c.qtd}</span> x R$ {c.produto.preco.toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeFromCart(c.produto.id)} className="text-gray-400 hover:text-red-500 ml-2 p-1 bg-white rounded-md shadow-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-gray-600 font-medium">Total Estimado</span>
                  <span className="font-extrabold text-2xl text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={checkout}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow hover:shadow-lg flex items-center justify-center cursor-pointer transform hover:-translate-y-0.5"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Finalizar Pedido
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <h3 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">Novo Produto</h3>
            <form onSubmit={handleAddProduto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none h-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" required value={preco} onChange={e => setPreco(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd Estoque</label>
                  <input type="number" required value={estoque} onChange={e => setEstoque(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-6 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 bg-gray-50 border border-gray-200 rounded-lg font-medium transition cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 shadow-sm transition cursor-pointer">Salvar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

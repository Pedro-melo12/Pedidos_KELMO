import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Clock, CheckCircle2, XCircle, PackageOpen } from 'lucide-react';

export default function MeusPedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pedidos/meus').then(res => {
      setPedidos(res.data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'CONCLUIDO': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'CANCELADO': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CONCLUIDO': return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELADO': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Pedidos</h1>
      
      {pedidos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <PackageOpen className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum pedido encontrado</h3>
          <p className="text-gray-500">Você ainda não realizou nenhuma compra no sistema.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map(p => (
            <div key={p.id} className="bg-white p-6 shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-4">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="font-bold text-gray-900 text-lg">Pedido #{p.id.split('-')[0].toUpperCase()}</span>
                    <span className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(p.status)}`}>
                      {getStatusIcon(p.status)}
                      <span>{p.status}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Realizado em {new Date(p.created_at).toLocaleDateString('pt-BR')} às {new Date(p.created_at).toLocaleTimeString('pt-BR')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-500 mb-1">Valor Total</p>
                  <p className="text-2xl font-extrabold text-primary-600">R$ {p.valor_total.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-50 pt-5 mt-5">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Itens do Pedido</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {p.itens.map((i: any) => (
                    <div key={i.id} className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="bg-white p-2 rounded border border-gray-200 mr-3">
                         <PackageOpen className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{i.produto.nome}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {i.quantidade}x R$ {i.preco_unitario.toFixed(2)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right ml-3">
                        <p className="text-sm font-bold text-gray-700">R$ {i.subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

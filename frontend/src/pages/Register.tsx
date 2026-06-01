import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid(senha)) {
      setError('A senha deve ter no minimo 10 caracteres, letra maiuscula, letra, numero e caractere especial.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { nome, email, senha });
      alert('Cadastro realizado com sucesso! Faça login.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = (value: string) => (
    value.length >= 10 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value) &&
    /[A-Z]/.test(value)
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Criar nova conta
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <input
                type="text" required
                value={nome} onChange={e => setNome(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Seu Nome Completo"
              />
            </div>
            <div>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Endereço de Email"
              />
            </div>
            <div>
              <input
                type="password" required minLength={10}
                pattern="^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.*[A-Z]).{10,}$"
                title="Minimo de 10 caracteres, com letra maiuscula, letra, numero e caractere especial."
                value={senha} onChange={e => setSenha(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Senha"
              />
              <p className="mt-2 text-xs text-gray-500">
                Minimo de 10 caracteres, com letra maiuscula, letra, numero e caractere especial.
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
            >
             {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </div>
          <div className="text-center text-sm">
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Já tem conta? Faça login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

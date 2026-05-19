import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export class AuthService {
  async register(nome: string, email: string, senha: string, role?: Role) {
    const userExists = await prisma.usuario.findUnique({ where: { email } });
    if (userExists) {
      throw new Error('Email já cadastrado');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const user = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        role: role || Role.USER
      }
    });

    return { id: user.id, nome: user.nome, email: user.email, role: user.role };
  }

  async login(email: string, senha: string) {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    return {
      token,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role }
    };
  }
}

import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const MIN_PASSWORD_LENGTH = 10;
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_MINUTES = 10;

export class AuthService {
  private validatePasswordPolicy(senha: string) {
    if (!senha || senha.length < MIN_PASSWORD_LENGTH) {
      throw new Error('A senha deve ter no minimo 10 caracteres');
    }

    if (!/[A-Za-z]/.test(senha)) {
      throw new Error('A senha deve possuir pelo menos uma letra');
    }

    if (!/[0-9]/.test(senha)) {
      throw new Error('A senha deve possuir pelo menos um numero');
    }

    if (!/[^A-Za-z0-9]/.test(senha)) {
      throw new Error('A senha deve possuir pelo menos um caractere especial');
    }

    if (!/[A-Z]/.test(senha)) {
      throw new Error('A senha deve possuir pelo menos uma letra maiuscula');
    }
  }

  private async validatePasswordHistory(usuarioId: string, senha: string) {
    const ultimasSenhas = await prisma.senhaHistorico.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { created_at: 'desc' },
      take: 3
    });

    for (const historico of ultimasSenhas) {
      const reused = await bcrypt.compare(senha, historico.senha_hash);
      if (reused) {
        throw new Error('A nova senha nao pode ser igual as 3 ultimas senhas utilizadas');
      }
    }
  }

  async register(nome: string, email: string, senha: string, role?: Role) {
    this.validatePasswordPolicy(senha);

    const userExists = await prisma.usuario.findUnique({ where: { email } });
    if (userExists) {
      throw new Error('Email ja cadastrado');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.usuario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          role: role || Role.USER
        }
      });

      await tx.senhaHistorico.create({
        data: {
          usuario_id: createdUser.id,
          senha_hash: senhaHash
        }
      });

      return createdUser;
    });

    return { id: user.id, nome: user.nome, email: user.email, role: user.role };
  }

  async login(email: string, senha: string) {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Credenciais invalidas');
    }

    if (user.bloqueado_ate && user.bloqueado_ate > new Date()) {
      throw new Error('Usuario bloqueado por excesso de tentativas. Tente novamente em alguns minutos');
    }

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      const falhasLogin = user.falhas_login + 1;
      const bloqueadoAte = falhasLogin >= MAX_LOGIN_FAILURES
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          falhas_login: falhasLogin,
          bloqueado_ate: bloqueadoAte
        }
      });

      if (bloqueadoAte) {
        throw new Error('Usuario bloqueado por 10 minutos apos 5 falhas de autenticacao');
      }

      throw new Error('Credenciais invalidas');
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        falhas_login: 0,
        bloqueado_ate: null
      }
    });

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

  async changePassword(usuarioId: string, senhaAtual: string, novaSenha: string) {
    this.validatePasswordPolicy(novaSenha);

    const user = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!user) {
      throw new Error('Usuario nao encontrado');
    }

    const senhaAtualConfere = await bcrypt.compare(senhaAtual, user.senha);
    if (!senhaAtualConfere) {
      throw new Error('Senha atual invalida');
    }

    await this.validatePasswordHistory(usuarioId, novaSenha);

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(novaSenha, salt);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: usuarioId },
        data: { senha: senhaHash }
      }),
      prisma.senhaHistorico.create({
        data: {
          usuario_id: usuarioId,
          senha_hash: senhaHash
        }
      })
    ]);

    return { success: true };
  }
}

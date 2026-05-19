import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/authRoutes';
import produtoRoutes from './routes/produtoRoutes';
import adminRoutes from './routes/adminRoutes'; // forced update
import pedidoRoutes from './routes/pedidoRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pedidos', pedidoRoutes);

app.get('/', (req: express.Request, res: express.Response) => {
  res.send('API do Sistema de Pedidos Operacional.');
});

import { initializeBackupScheduler } from './utils/backupScheduler';

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await initializeBackupScheduler();
});

import { Router } from 'express';
import { PedidoController } from '../controllers/pedidoController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const pedidoController = new PedidoController();

router.use(authMiddleware);

// Rotas do cliente
router.post('/', pedidoController.create.bind(pedidoController));
router.get('/meus', pedidoController.getMeusPedidos.bind(pedidoController));

// Rotas do admin
router.get('/todos', adminMiddleware, pedidoController.getAll.bind(pedidoController));
router.patch('/:id/status', adminMiddleware, pedidoController.updateStatus.bind(pedidoController));

export default router;

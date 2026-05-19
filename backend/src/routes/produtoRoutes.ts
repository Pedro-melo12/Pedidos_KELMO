import { Router } from 'express';
import { ProdutoController } from '../controllers/produtoController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const produtoController = new ProdutoController();

router.use(authMiddleware);

router.get('/', produtoController.getAll.bind(produtoController));
router.get('/:id', produtoController.getById.bind(produtoController));

router.use(adminMiddleware);
router.post('/', produtoController.create.bind(produtoController));
router.put('/:id', produtoController.update.bind(produtoController));
router.delete('/:id', produtoController.delete.bind(produtoController));

export default router;

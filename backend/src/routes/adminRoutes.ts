import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { LogController } from '../controllers/logController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';
import multer from 'multer';

const router = Router();
const adminController = new AdminController();
const logController = new LogController();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminController.getUsers.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.patch('/users/:id/role', adminController.changeRole.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));

router.get('/backup/full', adminController.exportFullBackup.bind(adminController));
router.post('/backup/restore', upload.single('file'), adminController.restoreFullBackup.bind(adminController));
router.get('/backup/schedule', adminController.getBackupSchedule.bind(adminController));
router.post('/backup/schedule', adminController.setBackupSchedule.bind(adminController));
router.get('/backup/list', adminController.getBackupsList.bind(adminController));
router.post('/backup/force', adminController.forceBackup.bind(adminController));
router.get('/logs', logController.getAll.bind(logController));
router.get('/backup/download/:fileName', adminController.downloadBackupFile.bind(adminController));

export default router;

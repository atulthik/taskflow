const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', adminController.getStats);
router.get('/workers', adminController.getWorkers);
router.get('/dead-letter', adminController.getDeadLetterJobs);
router.post('/dead-letter/:id/retry', adminController.retryDeadLetterJob);

module.exports = router;

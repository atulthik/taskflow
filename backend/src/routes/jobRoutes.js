const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate } = require('../middleware/auth');

// All job routes require authentication
router.use(authenticate);

router.post('/', jobController.createJob);
router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJobById);
router.post('/:id/cancel', jobController.cancelJob);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, allow } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { list, detail, bukti, create, setujui, tolak } = require('../controllers/izinController');

router.use(protect);

router.get('/', list);
router.get('/:id', detail);
router.get('/:id/bukti', bukti);
router.post('/', allow('penghuni'), upload.single('bukti'), create);
router.put('/:id/setujui', allow('fasil', 'admin'), setujui);
router.put('/:id/tolak', allow('fasil', 'admin'), tolak);

module.exports = router;

const express = require('express');
const { protect, allow } = require('../middlewares/auth');
const akunController = require('../controllers/akunController');

// Router yang sama dipakai untuk /api/penghuni dan /api/fasil (khusus admin)
module.exports = function akunRoutes(role) {
  const router = express.Router();
  const { list, detail, create, update, setStatus } = akunController(role);

  router.use(protect, allow('admin'));

  router.get('/', list);
  router.get('/:id', detail);
  router.post('/', create);
  router.put('/:id', update);
  router.patch('/:id/status', setStatus);

  return router;
};

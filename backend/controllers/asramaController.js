const { Asrama } = require('../models');

// GET /api/asrama — untuk pilihan gedung di form & filter
exports.list = async (req, res, next) => {
  try {
    const data = await Asrama.findAll({ order: [['kode', 'ASC']] });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

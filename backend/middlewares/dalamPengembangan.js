// Balasan sementara untuk endpoint modul yang sedang dikerjakan ulang.
// Hapus pemakaiannya di routes/ setelah controller modulnya selesai.
module.exports = function dalamPengembangan(req, res) {
  res.status(501).json({ success: false, message: 'Fitur ini sedang dalam pengembangan' });
};

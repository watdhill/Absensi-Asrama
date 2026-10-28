// Konfigurasi halaman Data & Form untuk penghuni dan fasil.
// Keduanya memakai komponen DataAkun.jsx dan FormAkun.jsx yang sama.
export const AKUN = {
  penghuni: {
    label: 'Penghuni',
    path: '/penghuni',
    induk: 'NIM',
    cariPlaceholder: 'Cari nama / NIM...',
    filters: ['asramaId', 'kamar', 'prodi', 'status'],
  },
  fasil: {
    label: 'Fasil',
    path: '/fasil',
    induk: 'NIP / ID Fasil',
    cariPlaceholder: 'Cari nama / NIP / email...',
    filters: ['asramaId', 'status'],
  },
};

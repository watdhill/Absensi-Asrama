// Geofence presensi: penghuni harus berada dalam radius gedung asramanya.
// Bisa dimatikan untuk development dengan GEOFENCE=nonaktif di .env.
const geofenceAktif = () => process.env.GEOFENCE !== 'nonaktif';

// akurasi GPS yang buruk diberi kelonggaran, tapi paling banyak 50 m
const MAKS_TOLERANSI = 50;

// Jarak dua titik di permukaan bumi (rumus haversine), dalam meter
function jarakMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// { jarak, dalamRadius } terhadap gedung; jarak null kalau gedung belum punya koordinat
function cekLokasi(asrama, latitude, longitude, akurasi) {
  if (!asrama || asrama.latitude == null || asrama.longitude == null) return { jarak: null, dalamRadius: true };
  const jarak = jarakMeter(latitude, longitude, asrama.latitude, asrama.longitude);
  const toleransi = Math.min(Number(akurasi) || 0, MAKS_TOLERANSI);
  return { jarak, dalamRadius: !geofenceAktif() || jarak - toleransi <= asrama.radius };
}

module.exports = { geofenceAktif, jarakMeter, cekLokasi, MAKS_TOLERANSI };

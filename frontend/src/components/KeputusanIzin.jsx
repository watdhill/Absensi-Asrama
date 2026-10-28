import { useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { Button, ConfirmDialog, Field, Modal, SuccessDialog } from './ui';

// Tombol Setujui / Tolak beserta dialog konfirmasi, alasan penolakan, dan
// tampilan sukses. Dipakai di daftar perizinan dan halaman detail fasil.
export default function KeputusanIzin({ izin, onDone, size }) {
  const toast = useToast();
  const [mode, setMode] = useState(null); // 'setujui' | 'tolak' | 'sukses-setujui' | 'sukses-tolak'
  const [alasan, setAlasan] = useState('');
  const [errAlasan, setErrAlasan] = useState('');
  const [busy, setBusy] = useState(false);

  const setujui = async () => {
    try {
      await api.put(`/izin/${izin.id}/setujui`);
      setMode('sukses-setujui');
    } catch (err) {
      setMode(null);
      toast.error(err.message);
    }
  };

  const tolak = async () => {
    if (!alasan.trim()) return setErrAlasan('Alasan penolakan wajib diisi.');
    setBusy(true);
    try {
      await api.put(`/izin/${izin.id}/tolak`, { alasan: alasan.trim() });
      setMode('sukses-tolak');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const selesai = () => {
    const status = mode === 'sukses-setujui' ? 'disetujui' : 'ditolak';
    setMode(null);
    setAlasan('');
    onDone(status);
  };

  // event dari modal (portal) tetap merambat lewat pohon React; ditahan di sini
  // supaya klik di dalam dialog tidak ikut membuka kartu izin di belakangnya
  return (
    <span style={{ display: 'contents' }} onClick={(e) => e.stopPropagation()}>
      <Button variant="danger-outline" size={size} onClick={() => setMode('tolak')}>
        <CircleX size={16} /> Tolak
      </Button>
      <Button variant="success" size={size} onClick={() => setMode('setujui')}>
        <CircleCheck size={16} /> Setujui
      </Button>

      <ConfirmDialog
        open={mode === 'setujui'}
        onClose={() => setMode(null)}
        onConfirm={setujui}
        icon={CircleCheck}
        tone="success"
        title="Setujui pengajuan izin ini?"
        message={`Izin ${izin.penghuni?.name} akan disetujui dan presensinya pada tanggal tersebut tercatat sebagai Izin.`}
        confirmLabel="Setujui"
      />

      <Modal
        open={mode === 'tolak'}
        onClose={() => setMode(null)}
        busy={busy}
        title="Tolak Pengajuan Izin"
        subtitle={`${izin.penghuni?.name} • ${izin.jenis}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMode(null)} disabled={busy}>
              Batal
            </Button>
            <Button variant="danger" onClick={tolak} loading={busy}>
              Konfirmasi Penolakan
            </Button>
          </>
        }
      >
        <Field label="Alasan Penolakan" required error={errAlasan}>
          <textarea
            className={`textarea ${errAlasan ? 'invalid' : ''}`}
            placeholder="Jelaskan alasan penolakan agar penghuni dapat memperbaiki pengajuannya"
            value={alasan}
            onChange={(e) => {
              setAlasan(e.target.value);
              setErrAlasan('');
            }}
            autoFocus
          />
        </Field>
      </Modal>

      <SuccessDialog
        open={mode === 'sukses-setujui' || mode === 'sukses-tolak'}
        title={mode === 'sukses-setujui' ? 'Izin Disetujui' : 'Izin Ditolak'}
        message={mode === 'sukses-setujui' ? 'Pengajuan izin berhasil disetujui.' : 'Pengajuan izin telah ditolak.'}
        actions={<Button onClick={selesai}>OK</Button>}
      />
    </span>
  );
}

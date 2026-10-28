import { useEffect, useState } from 'react';
import { ClipboardList, Eye, History, PencilLine, SearchX } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounced, useFetch } from '../../lib/hooks';
import { hariIniWIB, jamMenit, SESI_LABEL, STATUS, tglJam, tglPanjang } from '../../lib/format';
import {
  ActionMenu,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Field,
  Loading,
  Mark,
  Modal,
  PageHead,
  SearchInput,
  SuccessDialog,
} from '../../components/ui';

function SelPresensi({ data }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <Mark status={data.status} />
      <span className="cell-sub num">{data.waktu ? jamMenit(data.waktu) : STATUS[data.status].label}</span>
    </div>
  );
}

// Detail presensi satu penghuni pada satu tanggal + riwayat koreksinya
function DetailModal({ row, onClose, onKoreksi }) {
  const log = useFetch(
    () => (row ? api.get('/presensi/koreksi', { userId: row.penghuni.id, tanggal: row.tanggal }) : Promise.resolve(null)),
    [row?.penghuni.id, row?.tanggal]
  );
  const p = row?.penghuni;
  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      title="Detail Presensi"
      subtitle={row && tglPanjang(row.tanggal)}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={() => onKoreksi(row)}>
            <PencilLine size={16} /> Koreksi Presensi
          </Button>
        </>
      }
    >
      {row && (
        <div className="stack">
          <dl className="info-list">
            <dt>Nama</dt>
            <dd>{p.name}</dd>
            <dt>NIM</dt>
            <dd>{p.nomorInduk}</dd>
            <dt>Asrama / Kamar</dt>
            <dd>
              {p.Asrama?.nama} • {p.kamar}
            </dd>
          </dl>
          <div className="grid grid-2" style={{ gap: 12 }}>
            {['pagi', 'malam'].map((s) => (
              <div key={s} className="session-card" style={{ padding: 16, gap: 8 }}>
                <div className="row between">
                  <span className="strong">Presensi {SESI_LABEL[s]}</span>
                  <Badge status={row[s].status} />
                </div>
                <span className="muted">Waktu: {row[s].waktu ? `${jamMenit(row[s].waktu)} WIB` : '-'}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="label row" style={{ marginBottom: 10 }}>
              <History size={16} /> Riwayat Koreksi
            </div>
            {log.data?.data?.length ? (
              <div className="timeline">
                {log.data.data.map((l) => (
                  <div key={l.id} className="timeline-item">
                    <div className="small strong">
                      {SESI_LABEL[l.sesi]}: {STATUS[l.statusLama]?.label} → {STATUS[l.statusBaru]?.label}
                    </div>
                    <div className="small">{l.alasan}</div>
                    <div className="small muted">
                      {l.pengubah?.name} • {tglJam(l.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Belum ada koreksi untuk tanggal ini.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

const PILIHAN = [
  ['hadir', 'Hadir'],
  ['tidak_hadir', 'Tidak Hadir'],
  ['izin', 'Izin'],
];

function KoreksiModal({ row, sesiAwal, onClose, onSaved }) {
  const toast = useToast();
  const [sesi, setSesi] = useState(sesiAwal);
  const [status, setStatus] = useState('');
  const [alasan, setAlasan] = useState('');
  const [errors, setErrors] = useState({});
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [sukses, setSukses] = useState(false);

  // reset form setiap membuka koreksi untuk baris lain
  useEffect(() => {
    setSesi(sesiAwal);
    setStatus('');
    setAlasan('');
    setErrors({});
    setSukses(false);
  }, [row, sesiAwal]);

  if (!row) return null;
  const sekarang = row[sesi].status;

  const simpan = () => {
    const e = {};
    if (!status) e.status = 'Pilih status baru';
    else if (status === sekarang) e.status = 'Status baru sama dengan status sekarang';
    if (!alasan.trim()) e.alasan = 'Alasan perubahan wajib diisi';
    setErrors(e);
    if (!Object.keys(e).length) setKonfirmasi(true);
  };

  const kirim = async () => {
    try {
      await api.put('/presensi/koreksi', { userId: row.penghuni.id, tanggal: row.tanggal, sesi, status, alasan });
      setKonfirmasi(false);
      setSukses(true);
    } catch (err) {
      setKonfirmasi(false);
      toast.error(err.message);
    }
  };

  return (
    <>
      <Modal
        open={!sukses}
        onClose={onClose}
        title="Koreksi Presensi"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={simpan}>Simpan Perubahan</Button>
          </>
        }
      >
        <div className="stack">
          <dl className="info-list">
            <dt>Nama</dt>
            <dd>{row.penghuni.name}</dd>
            <dt>NIM</dt>
            <dd>{row.penghuni.nomorInduk}</dd>
            <dt>Kamar</dt>
            <dd>{row.penghuni.kamar}</dd>
            <dt>Tanggal</dt>
            <dd>{tglPanjang(row.tanggal)}</dd>
          </dl>

          <div className="form-grid">
            <Field label="Sesi" required>
              <select className="select" value={sesi} onChange={(e) => setSesi(e.target.value)}>
                <option value="pagi">Pagi</option>
                <option value="malam">Malam</option>
              </select>
            </Field>
            <Field label="Status Saat Ini">
              <div style={{ height: 42, display: 'flex', alignItems: 'center' }}>
                <Badge status={sekarang} />
              </div>
            </Field>
          </div>

          <Field label="Ubah Status Menjadi" required error={errors.status}>
            <div className="choice-group">
              {PILIHAN.map(([value, label]) => (
                <label key={value} className={`choice ${status === value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    checked={status === value}
                    onChange={() => {
                      setStatus(value);
                      setErrors({ ...errors, status: undefined });
                    }}
                  />
                  <Mark status={value} /> {label}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Alasan Perubahan" required error={errors.alasan}>
            <textarea
              className={`textarea ${errors.alasan ? 'invalid' : ''}`}
              placeholder="Contoh: Penghuni sudah hadir namun lupa melakukan presensi, dikonfirmasi langsung oleh fasil."
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value);
                setErrors({ ...errors, alasan: undefined });
              }}
            />
          </Field>

          <div className="audit-note">
            <History size={16} /> Perubahan akan dicatat dalam riwayat sistem beserta nama Anda dan waktu perubahan.
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={konfirmasi}
        onClose={() => setKonfirmasi(false)}
        onConfirm={kirim}
        icon={PencilLine}
        title="Ubah data presensi?"
        message={`Apakah Anda yakin ingin mengubah presensi ${SESI_LABEL[sesi].toLowerCase()} ${row.penghuni.name} menjadi “${
          STATUS[status]?.label
        }”?`}
        confirmLabel="Konfirmasi"
      />

      <SuccessDialog
        open={sukses}
        title="Berhasil Diperbarui"
        message="Data presensi berhasil diperbarui."
        actions={
          <Button
            onClick={() => {
              setSukses(false);
              onSaved();
            }}
          >
            OK
          </Button>
        }
      />
    </>
  );
}

export default function DataPresensi() {
  const { user } = useAuth();
  const [filter, setFilter] = useState({ tanggal: hariIniWIB(), sesi: '', status: '', asramaId: '', kamar: '' });
  const [cari, setCari] = useState('');
  const q = useDebounced(cari);
  const kamar = useDebounced(filter.kamar);
  const data = useFetch(
    () => api.get('/presensi', { ...filter, kamar, q }),
    [filter.tanggal, filter.sesi, filter.status, filter.asramaId, kamar, q]
  );
  const asrama = useFetch(() => (user.role === 'admin' ? api.get('/asrama') : Promise.resolve(null)), []);

  const [detail, setDetail] = useState(null);
  const [koreksi, setKoreksi] = useState(null);

  const rows = data.data?.data || [];
  const set = (k) => (e) => setFilter({ ...filter, [k]: e.target.value });
  const sesiKoreksi = (row) => filter.sesi || (row.pagi.status !== 'hadir' ? 'pagi' : 'malam');

  return (
    <>
      <PageHead
        title="Data Presensi Penghuni"
        subtitle={`${user.role === 'fasil' ? user.Asrama?.nama + ' • ' : ''}${tglPanjang(filter.tanggal)}`}
      />

      <section className="card">
        <div className="toolbar">
          <SearchInput value={cari} onChange={setCari} placeholder="Cari nama / NIM penghuni..." />
          <input type="date" className="input" value={filter.tanggal} max={hariIniWIB()} onChange={set('tanggal')} aria-label="Tanggal" />
          <select className="select" value={filter.sesi} onChange={set('sesi')} aria-label="Sesi">
            <option value="">Semua Sesi</option>
            <option value="pagi">Pagi</option>
            <option value="malam">Malam</option>
          </select>
          <select className="select" value={filter.status} onChange={set('status')} aria-label="Status">
            <option value="">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="belum">Belum Presensi</option>
            <option value="tidak_hadir">Tidak Hadir</option>
          </select>
          {user.role === 'admin' && (
            <select className="select" value={filter.asramaId} onChange={set('asramaId')} aria-label="Gedung">
              <option value="">Semua Gedung</option>
              {asrama.data?.data.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama}
                </option>
              ))}
            </select>
          )}
          <input className="input" style={{ width: 120 }} placeholder="Kamar" value={filter.kamar} onChange={set('kamar')} aria-label="Kamar" />
        </div>

        <div className="row wrap small muted" style={{ padding: '10px 20px', gap: 16, borderBottom: '1px solid var(--border)' }}>
          {['hadir', 'izin', 'belum', 'tidak_hadir'].map((s) => (
            <span key={s} className="row" style={{ gap: 6 }}>
              <Mark status={s} /> {STATUS[s].label}
            </span>
          ))}
        </div>

        {data.error ? (
          <div className="card-pad">
            <ErrorBox message={data.error} onRetry={data.reload} />
          </div>
        ) : data.loading && !data.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="Tidak ada penghuni yang cocok">
            Coba ubah kata kunci atau filter.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NIM</th>
                  <th>Kamar</th>
                  <th>Pagi</th>
                  <th>Malam</th>
                  <th>Status</th>
                  <th style={{ width: 60 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.penghuni.id} className="clickable" onClick={() => setDetail(row)}>
                    <td className="cell-main">{row.penghuni.name}</td>
                    <td className="num">{row.penghuni.nomorInduk}</td>
                    <td>
                      {row.penghuni.kamar}
                      {user.role === 'admin' && <div className="cell-sub">{row.penghuni.Asrama?.nama}</div>}
                    </td>
                    <td>
                      <SelPresensi data={row.pagi} />
                    </td>
                    <td>
                      <SelPresensi data={row.malam} />
                    </td>
                    <td>
                      <Badge status={filter.sesi ? row[filter.sesi].status : row.status} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          { label: 'Lihat Detail', icon: Eye, onClick: () => setDetail(row) },
                          { label: 'Koreksi Presensi', icon: PencilLine, onClick: () => setKoreksi(row) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <div className="pagination">
            <span className="row">
              <ClipboardList size={16} /> {rows.length} penghuni
            </span>
          </div>
        )}
      </section>

      <DetailModal
        row={detail}
        onClose={() => setDetail(null)}
        onKoreksi={(row) => {
          setDetail(null);
          setKoreksi(row);
        }}
      />
      <KoreksiModal
        row={koreksi}
        sesiAwal={koreksi ? sesiKoreksi(koreksi) : 'pagi'}
        onClose={() => setKoreksi(null)}
        onSaved={() => {
          setKoreksi(null);
          data.reload();
        }}
      />
    </>
  );
}

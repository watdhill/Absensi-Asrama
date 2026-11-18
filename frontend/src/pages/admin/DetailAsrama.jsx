import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, DoorOpen, ExternalLink, MapPin, MapPinOff, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../lib/hooks';
import { JENIS_ASRAMA, koordinat } from '../../lib/format';
import { Button, ConfirmDialog, EmptyState, ErrorBox, Field, Loading, Modal, SearchInput, StatCard, Tabs } from '../../components/ui';
import FormGedung from './FormGedung';
import { JENIS_TONE } from './DataAsrama';

// Modal tambah kamar: sekaligus per lantai, atau satu kamar
function TambahKamar({ gedung, onClose, onSaved }) {
  const toast = useToast();
  const [mode, setMode] = useState('massal');
  const [m, setM] = useState({ lantaiDari: 1, lantaiSampai: 3, nomorDari: 1, nomorSampai: 10, kapasitas: 4 });
  const [s, setS] = useState({ nomor: `${gedung.kode}-`, lantai: 1, kapasitas: 4 });
  const [busy, setBusy] = useState(false);

  const jumlah = Math.max(0, m.lantaiSampai - m.lantaiDari + 1) * Math.max(0, m.nomorSampai - m.nomorDari + 1);
  const contoh = (l, n) => `${gedung.kode}-${l}${String(n).padStart(2, '0')}`;

  const simpan = async () => {
    setBusy(true);
    try {
      const body = mode === 'massal' ? m : s;
      const res = await api.post(`/asrama/${gedung.id}/kamar`, body);
      toast.success(res.message);
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const angka = (setter, obj, k) => (e) => setter({ ...obj, [k]: Number(e.target.value) });

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title={`Tambah Kamar — ${gedung.nama}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={simpan} loading={busy} disabled={mode === 'massal' && !jumlah}>
            <Plus size={16} /> Tambah {mode === 'massal' ? `${jumlah} Kamar` : 'Kamar'}
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <div className="card" style={{ boxShadow: 'none' }}>
          <Tabs
            value={mode}
            onChange={setMode}
            tabs={[
              { value: 'massal', label: 'Sekaligus per lantai' },
              { value: 'satu', label: 'Satu kamar' },
            ]}
          />
        </div>
        {mode === 'massal' ? (
          <>
            <div className="form-grid">
              <Field label="Lantai dari">
                <input className="input" type="number" min={1} max={20} value={m.lantaiDari} onChange={angka(setM, m, 'lantaiDari')} />
              </Field>
              <Field label="Lantai sampai">
                <input className="input" type="number" min={1} max={20} value={m.lantaiSampai} onChange={angka(setM, m, 'lantaiSampai')} />
              </Field>
              <Field label="Nomor kamar dari">
                <input className="input" type="number" min={1} max={99} value={m.nomorDari} onChange={angka(setM, m, 'nomorDari')} />
              </Field>
              <Field label="Nomor kamar sampai">
                <input className="input" type="number" min={1} max={99} value={m.nomorSampai} onChange={angka(setM, m, 'nomorSampai')} />
              </Field>
              <Field label="Kapasitas per kamar" className="span-2">
                <input className="input" type="number" min={1} max={12} value={m.kapasitas} onChange={angka(setM, m, 'kapasitas')} />
              </Field>
            </div>
            <div className="audit-note">
              <DoorOpen size={16} />
              {jumlah
                ? `Akan dibuat ${jumlah} kamar: ${contoh(m.lantaiDari, m.nomorDari)} … ${contoh(m.lantaiSampai, m.nomorSampai)}. Nomor yang sudah ada dilewati.`
                : 'Rentang lantai atau nomor tidak valid.'}
            </div>
          </>
        ) : (
          <div className="form-grid">
            <Field label="Nomor kamar" hint={`Harus diawali "${gedung.kode}-"`} className="span-2">
              <input className="input" value={s.nomor} onChange={(e) => setS({ ...s, nomor: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Lantai">
              <input className="input" type="number" min={1} max={20} value={s.lantai} onChange={angka(setS, s, 'lantai')} />
            </Field>
            <Field label="Kapasitas">
              <input className="input" type="number" min={1} max={12} value={s.kapasitas} onChange={angka(setS, s, 'kapasitas')} />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Detail satu kamar: penghuni, ubah kapasitas, hapus
function DetailKamar({ kamar, gedung, onClose, onChanged }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [kapasitas, setKapasitas] = useState(kamar.kapasitas || 4);
  const [busy, setBusy] = useState(false);
  const [hapus, setHapus] = useState(false);

  const jalankan = async (fn) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res.message);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const lantaiDariNomor = Number(kamar.kamar.split('-')[1]?.[0]) || 1;

  return (
    <>
      <Modal open onClose={onClose} busy={busy} title={`Kamar ${kamar.kamar}`} subtitle={`${gedung.nama}${kamar.lantai ? ` • Lantai ${kamar.lantai}` : ''}`}>
        <div className="stack" style={{ gap: 18 }}>
          {!kamar.terdaftar && (
            <div className="alert tone-warning">
              <TriangleAlert size={18} />
              <div style={{ flex: 1 }}>Kamar ini ditempati tetapi belum terdaftar. Daftarkan agar kapasitasnya dijaga sistem.</div>
              <Button
                size="sm"
                onClick={() => jalankan(() => api.post(`/asrama/${gedung.id}/kamar`, { nomor: kamar.kamar, lantai: lantaiDariNomor, kapasitas: 4 }))}
                loading={busy}
              >
                Daftarkan
              </Button>
            </div>
          )}

          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              Penghuni ({kamar.terisi}
              {kamar.kapasitas ? `/${kamar.kapasitas}` : ''})
            </div>
            {kamar.penghuni.length ? (
              <div className="card" style={{ boxShadow: 'none' }}>
                {kamar.penghuni.map((p) => (
                  <button key={p.id} className="list-row notif-item" style={{ padding: '10px 14px' }} onClick={() => navigate(`/penghuni/${p.id}/edit`)}>
                    <span className="strong" style={{ flex: 1, textAlign: 'left' }}>
                      {p.name}
                    </span>
                    <span className="cell-sub">
                      {p.nomorInduk} • {p.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">Kamar kosong.</p>
            )}
          </div>

          {kamar.terdaftar && (
            <div className="row wrap" style={{ alignItems: 'flex-end' }}>
              <Field label="Kapasitas" hint={`Minimal ${kamar.terisi} (jumlah penghuni sekarang)`}>
                <input className="input" type="number" min={Math.max(1, kamar.terisi)} max={12} value={kapasitas} onChange={(e) => setKapasitas(Number(e.target.value))} style={{ width: 120 }} />
              </Field>
              <Button variant="secondary" loading={busy} disabled={kapasitas === kamar.kapasitas} onClick={() => jalankan(() => api.put(`/kamar/${kamar.id}`, { kapasitas }))}>
                Simpan Kapasitas
              </Button>
              <div style={{ flex: 1 }} />
              <Button variant="danger-outline" disabled={kamar.terisi > 0 || busy} onClick={() => setHapus(true)} title={kamar.terisi ? 'Kamar masih berpenghuni' : undefined}>
                <Trash2 size={16} /> Hapus Kamar
              </Button>
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={hapus}
        onClose={() => setHapus(false)}
        onConfirm={() => jalankan(() => api.del(`/kamar/${kamar.id}`))}
        icon={Trash2}
        tone="danger"
        title={`Hapus kamar ${kamar.kamar}?`}
        message="Kamar kosong ini akan dihapus dari daftar."
        confirmLabel="Hapus"
      />
    </>
  );
}

export default function DetailAsrama() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const g = useFetch(() => api.get(`/asrama/${id}`), [id]);
  const k = useFetch(() => api.get(`/asrama/${id}/kamar`), [id]);
  const [edit, setEdit] = useState(false);
  const [hapus, setHapus] = useState(false);
  const [tambah, setTambah] = useState(false);
  const [pilih, setPilih] = useState(null);
  const [lantai, setLantai] = useState('');
  const [cari, setCari] = useState('');

  const kamar = useMemo(() => k.data?.data || [], [k.data]);
  const daftarLantai = [...new Set(kamar.map((x) => x.lantai).filter(Boolean))].sort((a, b) => a - b);
  const tampil = kamar.filter(
    (x) =>
      (!lantai || String(x.lantai) === lantai) &&
      (!cari ||
        x.kamar.toLowerCase().includes(cari.toLowerCase()) ||
        x.penghuni.some((p) => p.name.toLowerCase().includes(cari.toLowerCase())))
  );
  const perLantai = tampil.reduce((acc, x) => {
    const key = x.lantai ? `Lantai ${x.lantai}` : 'Belum terdaftar';
    (acc[key] ||= []).push(x);
    return acc;
  }, {});

  const muatUlang = () => {
    g.reload();
    k.reload();
  };

  const kembali = (
    <button className="back-link" onClick={() => navigate('/asrama')}>
      <ArrowLeft size={16} /> Kembali ke Gedung & Kamar
    </button>
  );
  if (g.error) return <>{kembali}<ErrorBox message={g.error} /></>;
  if (!g.data) return <Loading />;

  const a = g.data.data;
  const adaLokasi = a.latitude != null && a.longitude != null;
  const kosong = kamar.filter((x) => x.terdaftar && x.terisi === 0).length;

  return (
    <>
      {kembali}
      <div className="page-head">
        <div className="row">
          <span className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
            {a.kode}
          </span>
          <div>
            <h1>{a.nama}</h1>
            <span className={`badge tone-${JENIS_TONE[a.jenis]}`}>{JENIS_ASRAMA[a.jenis]}</span>
          </div>
        </div>
        <div className="row wrap">
          <Button variant="danger-outline" onClick={() => setHapus(true)}>
            <Trash2 size={16} /> Hapus
          </Button>
          <Button variant="secondary" onClick={() => setEdit(true)}>
            <Pencil size={16} /> Edit Gedung
          </Button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={DoorOpen} label="Jumlah Kamar" value={a.jumlahKamar} hint={`${kosong} kamar kosong`} />
        <StatCard icon={DoorOpen} tone="success" label="Penghuni / Kapasitas" value={`${a.jumlahPenghuni}/${a.kapasitasTotal}`} hint="penghuni aktif" />
        <StatCard icon={DoorOpen} tone="warning" label="Kamar Terisi" value={a.kamarTerisi} hint={`dari ${a.jumlahKamar} kamar`} />
        <div className="card stat">
          <div className={`stat-icon ${adaLokasi ? 'tone-info' : 'tone-warning'}`}>{adaLokasi ? <MapPin size={22} /> : <MapPinOff size={22} />}</div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label">Lokasi Presensi</div>
            {adaLokasi ? (
              <>
                <div className="strong">Radius {a.radius} m</div>
                <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer" className="small row" style={{ gap: 4 }}>
                  <ExternalLink size={12} /> {koordinat(a.latitude, a.longitude)}
                </a>
              </>
            ) : (
              <>
                <div className="strong">Belum diatur</div>
                <div className="stat-hint">presensi tidak dibatasi lokasi</div>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Daftar Kamar</h2>
            <div className="card-sub">Klik kamar untuk melihat penghuni atau mengubah kapasitas</div>
          </div>
          <Button onClick={() => setTambah(true)}>
            <Plus size={16} /> Tambah Kamar
          </Button>
        </div>
        <div className="toolbar">
          <SearchInput value={cari} onChange={setCari} placeholder="Cari nomor kamar / nama penghuni..." />
          <select className="select" value={lantai} onChange={(e) => setLantai(e.target.value)} aria-label="Lantai">
            <option value="">Semua Lantai</option>
            {daftarLantai.map((l) => (
              <option key={l} value={l}>
                Lantai {l}
              </option>
            ))}
          </select>
          <span className="row small muted" style={{ gap: 12 }}>
            <span className="row" style={{ gap: 4 }}>
              <i className="kamar-dot kosong" /> Kosong
            </span>
            <span className="row" style={{ gap: 4 }}>
              <i className="kamar-dot sebagian" /> Terisi
            </span>
            <span className="row" style={{ gap: 4 }}>
              <i className="kamar-dot penuh" /> Penuh
            </span>
          </span>
        </div>

        {k.error ? (
          <div className="card-pad">
            <ErrorBox message={k.error} onRetry={k.reload} />
          </div>
        ) : !k.data ? (
          <Loading />
        ) : kamar.length === 0 ? (
          <EmptyState icon={DoorOpen} title="Belum ada kamar">
            Klik “Tambah Kamar” untuk mendaftarkan kamar, misalnya lantai 1–3 nomor 01–10 sekaligus.
          </EmptyState>
        ) : (
          <div className="card-pad stack">
            {Object.entries(perLantai).map(([judul, list]) => (
              <div key={judul}>
                <div className="label" style={{ marginBottom: 10 }}>
                  {judul}
                </div>
                <div className="kamar-grid">
                  {list.map((x) => {
                    const kelas = !x.terdaftar ? 'liar' : x.penuh ? 'penuh' : x.terisi ? 'sebagian' : 'kosong';
                    return (
                      <button key={x.kamar} className={`kamar-tile ${kelas}`} onClick={() => setPilih(x)}>
                        <span className="strong">{x.kamar}</span>
                        <span className="small">
                          {x.terisi}
                          {x.kapasitas ? `/${x.kapasitas}` : ''} {x.jenisKelamin ? (x.jenisKelamin === 'L' ? '• L' : '• P') : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {tampil.length === 0 && <p className="muted">Tidak ada kamar yang cocok.</p>}
          </div>
        )}
      </section>

      {edit && (
        <FormGedung
          gedung={a}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            muatUlang();
          }}
        />
      )}
      {tambah && (
        <TambahKamar
          gedung={a}
          onClose={() => setTambah(false)}
          onSaved={() => {
            setTambah(false);
            muatUlang();
          }}
        />
      )}
      {pilih && (
        <DetailKamar
          key={pilih.kamar}
          kamar={pilih}
          gedung={a}
          onClose={() => setPilih(null)}
          onChanged={() => {
            setPilih(null);
            muatUlang();
          }}
        />
      )}
      <ConfirmDialog
        open={hapus}
        onClose={() => setHapus(false)}
        onConfirm={async () => {
          try {
            const res = await api.del(`/asrama/${a.id}`);
            toast.success(res.message);
            navigate('/asrama');
          } catch (err) {
            toast.error(err.message);
            setHapus(false);
          }
        }}
        icon={Trash2}
        tone="danger"
        title={`Hapus ${a.nama}?`}
        message="Gedung dan seluruh kamarnya akan dihapus. Hanya bisa dilakukan jika tidak ada penghuni atau fasil di gedung ini."
        confirmLabel="Hapus Gedung"
      />
    </>
  );
}

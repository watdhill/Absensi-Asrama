import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ban, CircleCheck, Eye, Pencil, Plus, SearchX } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useDebounced, useFetch } from '../../lib/hooks';
import { inisial, PRODI, tglPanjang } from '../../lib/format';
import {
  ActionMenu,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Loading,
  Modal,
  PageHead,
  Pagination,
  SearchInput,
} from '../../components/ui';
import { AKUN } from './config';

function DetailModal({ user, cfg, onClose, onEdit }) {
  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title={`Detail ${cfg.label}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={onEdit}>
            <Pencil size={16} /> Edit
          </Button>
        </>
      }
    >
      {user && (
        <div className="stack">
          <div className="row">
            <span className="avatar" style={{ width: 52, height: 52, fontSize: 16 }}>
              {inisial(user.name)}
            </span>
            <div>
              <div className="strong" style={{ fontSize: 16 }}>
                {user.name}
              </div>
              <Badge status={user.status} />
            </div>
          </div>
          <dl className="info-list">
            <dt>{cfg.induk}</dt>
            <dd>{user.nomorInduk || '-'}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Telepon</dt>
            <dd>{user.telepon || '-'}</dd>
            {user.role === 'penghuni' && (
              <>
                <dt>Jenis Kelamin</dt>
                <dd>{user.jenisKelamin === 'P' ? 'Perempuan' : user.jenisKelamin === 'L' ? 'Laki-laki' : '-'}</dd>
                <dt>Program Studi</dt>
                <dd>{user.prodi || '-'}</dd>
                <dt>Fakultas</dt>
                <dd>{user.fakultas || '-'}</dd>
              </>
            )}
            <dt>Asrama</dt>
            <dd>{user.Asrama?.nama || '-'}</dd>
            {user.role === 'penghuni' && (
              <>
                <dt>Kamar</dt>
                <dd>{user.kamar || '-'}</dd>
                <dt>Tanggal Masuk</dt>
                <dd>{tglPanjang(user.tanggalMasuk)}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </Modal>
  );
}

export default function DataAkun({ role }) {
  const cfg = AKUN[role];
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState({ asramaId: '', kamar: '', prodi: '', status: '' });
  const [cari, setCari] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(cari);
  const kamar = useDebounced(filter.kamar);

  const data = useFetch(
    () => api.get(cfg.path, { ...filter, kamar, q, page }),
    [role, filter.asramaId, filter.prodi, filter.status, kamar, q, page]
  );
  const asrama = useFetch(() => api.get('/asrama'), []);

  const [detail, setDetail] = useState(null);
  const [ubahStatus, setUbahStatus] = useState(null);

  const set = (k) => (e) => {
    setFilter({ ...filter, [k]: e.target.value });
    setPage(1);
  };
  const rows = data.data?.data || [];

  const konfirmasiStatus = async () => {
    const baru = ubahStatus.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      const res = await api.patch(`${cfg.path}/${ubahStatus.id}/status`, { status: baru });
      toast.success(res.message);
      data.reload();
    } catch (err) {
      toast.error(err.message);
    }
    setUbahStatus(null);
  };

  return (
    <>
      <PageHead title={`Data ${cfg.label}`} subtitle={`Kelola akun ${cfg.label.toLowerCase()} asrama Universitas Andalas`}>
        <Link to={`${cfg.path}/tambah`} className="btn btn-primary">
          <Plus size={18} /> Tambah {cfg.label}
        </Link>
      </PageHead>

      <section className="card">
        <div className="toolbar">
          <SearchInput
            value={cari}
            onChange={(v) => {
              setCari(v);
              setPage(1);
            }}
            placeholder={cfg.cariPlaceholder}
          />
          <select className="select" value={filter.asramaId} onChange={set('asramaId')} aria-label="Gedung">
            <option value="">Semua Gedung</option>
            {asrama.data?.data.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama}
              </option>
            ))}
          </select>
          {cfg.filters.includes('kamar') && (
            <input className="input" style={{ width: 120 }} placeholder="Kamar" value={filter.kamar} onChange={set('kamar')} aria-label="Kamar" />
          )}
          {cfg.filters.includes('prodi') && (
            <select className="select" value={filter.prodi} onChange={set('prodi')} aria-label="Program studi">
              <option value="">Semua Prodi</option>
              {Object.keys(PRODI).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          )}
          <select className="select" value={filter.status} onChange={set('status')} aria-label="Status">
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Tidak Aktif</option>
          </select>
        </div>

        {data.error ? (
          <div className="card-pad">
            <ErrorBox message={data.error} onRetry={data.reload} />
          </div>
        ) : data.loading && !data.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title={`Tidak ada data ${cfg.label.toLowerCase()}`}>
            Coba ubah kata kunci atau filter.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                {role === 'penghuni' ? (
                  <tr>
                    <th>NIM</th>
                    <th>Nama</th>
                    <th>Program Studi</th>
                    <th>Kamar</th>
                    <th>Status</th>
                    <th style={{ width: 60 }}>Aksi</th>
                  </tr>
                ) : (
                  <tr>
                    <th>ID</th>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Asrama</th>
                    <th>Status</th>
                    <th style={{ width: 60 }}>Aksi</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => setDetail(u)}>
                    <td className="num">{u.nomorInduk || '-'}</td>
                    <td>
                      <div className="row">
                        <span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {inisial(u.name)}
                        </span>
                        <div>
                          <div className="cell-main">{u.name}</div>
                          {role === 'penghuni' && <div className="cell-sub">{u.email}</div>}
                        </div>
                      </div>
                    </td>
                    {role === 'penghuni' ? (
                      <>
                        <td>
                          {u.prodi || '-'}
                          <div className="cell-sub">{u.fakultas}</div>
                        </td>
                        <td>
                          {u.kamar || '-'}
                          <div className="cell-sub">{u.Asrama?.nama}</div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.email}</td>
                        <td>{u.Asrama?.nama || '-'}</td>
                      </>
                    )}
                    <td>
                      <Badge status={u.status} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          { label: 'Lihat Detail', icon: Eye, onClick: () => setDetail(u) },
                          { label: 'Edit', icon: Pencil, onClick: () => navigate(`${cfg.path}/${u.id}/edit`) },
                          u.status === 'aktif'
                            ? { label: 'Nonaktifkan', icon: Ban, danger: true, onClick: () => setUbahStatus(u) }
                            : { label: 'Aktifkan', icon: CircleCheck, onClick: () => setUbahStatus(u) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={data.data?.meta} onPage={setPage} />
      </section>

      <DetailModal user={detail} cfg={cfg} onClose={() => setDetail(null)} onEdit={() => navigate(`${cfg.path}/${detail.id}/edit`)} />

      <ConfirmDialog
        open={Boolean(ubahStatus)}
        onClose={() => setUbahStatus(null)}
        onConfirm={konfirmasiStatus}
        icon={ubahStatus?.status === 'aktif' ? Ban : CircleCheck}
        tone={ubahStatus?.status === 'aktif' ? 'danger' : 'success'}
        title={ubahStatus?.status === 'aktif' ? `Nonaktifkan ${cfg.label.toLowerCase()}?` : `Aktifkan ${cfg.label.toLowerCase()}?`}
        message={
          ubahStatus?.status === 'aktif'
            ? `Apakah Anda yakin ingin menonaktifkan ${ubahStatus?.name}? Akun tidak dapat login, tetapi datanya tetap tersimpan.`
            : `${ubahStatus?.name} akan dapat login kembali.`
        }
        confirmLabel={ubahStatus?.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
      />
    </>
  );
}

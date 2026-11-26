import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, SearchX } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../lib/hooks';
import { inisial, rentangTgl, tglJam } from '../../lib/format';
import { Badge, EmptyState, ErrorBox, Loading, PageHead, SearchInput, Tabs } from '../../components/ui';

const TAB_IZIN = [
  ['menunggu', 'Menunggu'],
  ['disetujui', 'Disetujui'],
  ['ditolak', 'Ditolak'],
  ['', 'Semua'],
];

// Daftar izin untuk fasil (asramanya) dan admin (semua asrama)
export default function PerizinanFasil() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('menunggu');
  const [cari, setCari] = useState('');
  const q = useFetch(() => api.get('/izin', { status }), [status]);

  const kata = cari.trim().toLowerCase();
  const rows = (q.data?.data || []).filter(
    (i) =>
      !kata ||
      i.penghuni.name.toLowerCase().includes(kata) ||
      (i.penghuni.nomorInduk || '').toLowerCase().includes(kata) ||
      (i.penghuni.kamar || '').toLowerCase().includes(kata)
  );
  const jumlah = q.data?.jumlah;
  const subtitle =
    user.role === 'admin'
      ? 'Pengajuan izin penghuni dari semua asrama'
      : `Pengajuan izin penghuni ${user.Asrama?.nama || 'asrama'}`;

  return (
    <>
      <PageHead title="Perizinan" subtitle={subtitle} />

      <section className="card">
        <div className="toolbar">
          <Tabs
            tabs={TAB_IZIN.map(([value, label]) => ({ value, label, count: jumlah?.[value || 'semua'] }))}
            value={status}
            onChange={setStatus}
          />
          <div style={{ flex: 1 }} />
          <SearchInput value={cari} onChange={setCari} placeholder="Cari nama, NIM, atau kamar" />
        </div>

        {q.error ? (
          <div className="card-pad">
            <ErrorBox message={q.error} onRetry={q.reload} />
          </div>
        ) : q.loading && !q.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          kata ? (
            <EmptyState icon={SearchX} title="Tidak ada hasil">
              Tidak ada pengajuan yang cocok dengan “{cari}”.
            </EmptyState>
          ) : (
            <EmptyState icon={FileText} title={status === 'menunggu' ? 'Tidak ada izin yang menunggu' : 'Belum ada pengajuan izin'} />
          )
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Penghuni</th>
                  <th>Kamar</th>
                  <th>Jenis Izin</th>
                  <th>Tanggal Izin</th>
                  <th>Diajukan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className="clickable" onClick={() => navigate(`/perizinan/${i.id}`)}>
                    <td>
                      <div className="row">
                        <span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {inisial(i.penghuni.name)}
                        </span>
                        <div>
                          <div className="cell-main">{i.penghuni.name}</div>
                          <div className="cell-sub">{i.penghuni.nomorInduk}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {i.penghuni.kamar || '-'}
                      <div className="cell-sub">{i.penghuni.Asrama?.nama}</div>
                    </td>
                    <td>{i.jenis}</td>
                    <td className="num">{rentangTgl(i.tanggalMulai, i.tanggalSelesai)}</td>
                    <td className="num">{tglJam(i.createdAt)}</td>
                    <td>
                      <Badge status={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

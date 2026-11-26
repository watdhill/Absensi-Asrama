import { Hammer } from 'lucide-react';
import { EmptyState, PageHead } from './ui';

// Penanda halaman untuk modul yang sedang dikerjakan ulang.
// Ganti route di App.jsx ke halaman aslinya setelah modul selesai.
export default function DalamPengembangan({ title, subtitle }) {
  return (
    <>
      <PageHead title={title} subtitle={subtitle} />
      <div className="card">
        <EmptyState icon={Hammer} title="Sedang dalam pengembangan">
          Fitur ini sedang dikerjakan dan akan segera tersedia.
        </EmptyState>
      </div>
    </>
  );
}

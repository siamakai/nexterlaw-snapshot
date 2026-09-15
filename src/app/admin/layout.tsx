import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1a3a6b] text-white px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-sm tracking-widest uppercase opacity-80">NexterLaw Admin</span>
        <div className="flex gap-4 text-sm ml-4">
          <Link href="/admin/submissions" className="hover:text-white/80 transition-colors">
            Submissions
          </Link>
          <Link href="/admin/global-submissions" className="hover:text-white/80 transition-colors">
            Global Submissions
          </Link>
          <Link href="/admin/knowledge-base" className="hover:text-white/80 transition-colors">
            Knowledge Base
          </Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

import Header from '../components/Header';

export default function UnderConstruction({ title }: { title: string }) {
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header title={title} />
      <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <span className="text-6xl">🚧</span>
        <p className="text-xl font-semibold text-slate-700">Under Construction</p>
        <p className="text-sm text-slate-400 max-w-xs">
          This module is being built. Check back soon.
        </p>
      </main>
    </div>
  );
}

import Header from '../components/Header';

interface PlaceholderProps {
  title: string;
}

export default function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title={title} />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🚧</div>
          <h2 className="text-lg font-semibold text-brand-navy mb-1">{title}</h2>
          <p className="text-sm text-slate-500">This module is coming soon.</p>
        </div>
      </main>
    </div>
  );
}

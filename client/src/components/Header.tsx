interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-brand-navy">{title}</h1>
      <span className="text-sm text-slate-500">{now}</span>
    </header>
  );
}

import { useState } from 'react';
import Header from '../components/Header';

type Tab = 'od' | 'scheduled';

export default function MISTemplate() {
  const [tab, setTab] = useState<Tab>('od');

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header title="MIS Template" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">

        <div className="flex gap-1 border-b border-slate-200">
          {([
            { id: 'od',        label: 'MIS Template - OD'        },
            { id: 'scheduled', label: 'MIS Template - Scheduled' },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center gap-3">
          <span className="text-5xl">🚧</span>
          <p className="text-lg font-semibold text-slate-700">Under Construction</p>
          <p className="text-sm text-slate-400 max-w-xs">
            {tab === 'od' ? 'MIS Template - OD' : 'MIS Template - Scheduled'} is being built. Check back soon.
          </p>
        </div>

      </main>
    </div>
  );
}

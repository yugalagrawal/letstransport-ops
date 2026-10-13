import { getUser } from '../hooks/useAuth';

export default function BiddingLoads() {
  const user = getUser();
  const isCRE = user?.role === 'CRE';

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-100">
      <div className="text-center space-y-3">
        <div className="text-4xl">🚚</div>
        <h1 className="text-xl font-semibold text-slate-700">Bidding Loads</h1>
        <p className="text-slate-500 text-sm max-w-xs">
          {isCRE
            ? 'This section is under development. CRE will be able to review and approve winning bids for local (intra-city) loads here.'
            : 'This section is under development. CDE will be able to review and approve winning bids for upcountry loads here.'}
        </p>
      </div>
    </div>
  );
}

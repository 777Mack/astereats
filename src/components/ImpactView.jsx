import { labelFor } from '../lib/categories.js';
import { StatusPill } from './SidePanel.jsx';
import CountUp from './CountUp.jsx';

const money = (n) => `$${Math.round(n)}`;

function Tile({ value, label, sub }) {
  return (
    <div className="tile">
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

export default function ImpactView({ requests, pantries, farms, onOpen }) {
  const pantryById = Object.fromEntries(pantries.map((p) => [p.id, p]));
  const farmById = Object.fromEntries(farms.map((f) => [f.id, f]));

  const requested = requests.reduce((s, r) => s + r.lbsNeeded, 0);
  const delivered = requests.reduce((s, r) => s + r.deliveredLbs, 0);
  const pledged = requests.reduce((s, r) => s + r.pledged, 0);
  const goals = requests.reduce((s, r) => s + r.goal, 0);
  const fundedCount = requests.filter((r) => ['funded', 'partial', 'delivered'].includes(r.status)).length;
  const deliveredCount = requests.filter((r) => r.status === 'delivered').length;

  return (
    <section className="impact" aria-label="Impact dashboard">
      <h2>Impact so far</h2>
      <p className="muted">Only pantry-confirmed deliveries count as delivered. All figures are sample data.</p>

      <div className="tiles" data-tour="tiles">
        <Tile value={<CountUp value={requests.length} fromZero />} label="Requests posted" sub={`${deliveredCount} delivered`} />
        <Tile
          value={
            <>
              <CountUp value={requested} fromZero /> lbs
            </>
          }
          label="Food requested"
        />
        <Tile
          value={
            <>
              $<CountUp value={Math.round(pledged)} fromZero />
            </>
          }
          label="Pledged"
          sub={goals ? `of ${money(goals)} matched goals` : undefined}
        />
        <Tile
          value={
            <>
              <CountUp value={delivered} fromZero /> lbs
            </>
          }
          label="Verified delivered"
          sub={`${fundedCount} requests fully funded`}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Pantry</th>
              <th scope="col">Request</th>
              <th scope="col">Farm</th>
              <th scope="col">Funding</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>
                  <button className="link" onClick={() => onOpen(r.pantryId)}>
                    {pantryById[r.pantryId].area}
                  </button>
                </td>
                <td>
                  {r.lbsNeeded} lbs {labelFor(r.category).toLowerCase()}
                </td>
                <td>{r.farmId ? farmById[r.farmId].name.replace('Sample ', '') : '—'}</td>
                <td>{r.goal ? `${money(r.pledged)} / ${money(r.goal)}` : '—'}</td>
                <td>
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

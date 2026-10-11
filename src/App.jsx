import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import sample from './data/sample.json';
import { APP_NAME, DEFAULT_MAP_MODE, TAGLINE } from './config.js';
import { applyMatch, buildSeedRequests, evaluateFarm, rankFarms } from './lib/match.js';
import SkyMap from './components/SkyMap.jsx';
import SidePanel from './components/SidePanel.jsx';
import NewRequestModal from './components/NewRequestModal.jsx';
import ImpactView from './components/ImpactView.jsx';
import Tour from './components/Tour.jsx';
import FarmPanel from './components/FarmPanel.jsx';
import QuestionsView from './components/QuestionsView.jsx';
import IntroModal from './components/IntroModal.jsx';
import MyPledges from './components/MyPledges.jsx';
import { labelFor } from './lib/categories.js';
import MoneyView from './components/MoneyView.jsx';
import JoinView from './components/JoinView.jsx';
import { TOUR_STEPS } from './lib/tourSteps.js';

const { pantries, farms } = sample;
const pantryById = Object.fromEntries(pantries.map((p) => [p.id, p]));
const farmById = Object.fromEntries(farms.map((f) => [f.id, f]));
const seed = () => buildSeedRequests(sample.seedRequests, pantries, farms);

// The mark: an aster, the star-shaped flower named after the Greek word for star.
// Long and short petals make it read as both a bloom (farms) and a starburst (the sky).
const PETALS = Array.from({ length: 16 }, (_, i) => i * 22.5);

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1B0948" />
      <g transform="translate(16 16)">
        {PETALS.map((a, i) => (
          <ellipse
            key={a}
            cx="0"
            cy={i % 2 ? -7.6 : -8.6}
            rx={i % 2 ? 1.25 : 1.7}
            ry={i % 2 ? 3.6 : 4.9}
            fill={i % 2 ? '#9B75DB' : '#F6F1FF'}
            transform={`rotate(${a})`}
          />
        ))}
        <circle r="4.6" fill="#F2B90C" />
        <circle r="4.6" fill="none" stroke="#1B0948" strokeWidth="0.8" strokeDasharray="0.6 1.4" />
      </g>
    </svg>
  );
}

// "AsterEats" -> "Aster" + gold "Eats". A name without a second capital is shown whole.
function Wordmark() {
  const m = APP_NAME.match(/^([A-Z][a-z]+)([A-Z].*)$/);
  return (
    <h1 className="wordmark">
      {m ? (
        <>
          {m[1]}
          <span className="wordmark-accent">{m[2]}</span>
        </>
      ) : (
        APP_NAME
      )}
    </h1>
  );
}

// Icons for the Sky view / Map view buttons. They use the button's text colour.
function SkyIcon() {
  return (
    <svg className="seg-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="13" r="5" fill="currentColor" />
      <ellipse cx="11" cy="13" rx="9" ry="3" fill="none" stroke="currentColor" strokeWidth="1.6" transform="rotate(-20 11 13)" />
      <path d="M19.5 3.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="seg-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6.5l5.5-2 7 2 5.5-2v13l-5.5 2-7-2-5.5 2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 4.5v13M15.5 6.5v13" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
      <path d="M12 3.2a3.3 3.3 0 0 0-3.3 3.3c0 2.4 3.3 5.6 3.3 5.6s3.3-3.2 3.3-5.6A3.3 3.3 0 0 0 12 3.2z" fill="currentColor" stroke="var(--seg-bg, #1b0948)" strokeWidth="1.2" />
      <circle cx="12" cy="6.5" r="1.2" fill="var(--seg-bg, #1b0948)" />
    </svg>
  );
}

// Phones open on the plain map; larger screens start with the first pantry's request open for the demo.
const startPantry = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)').matches ? null : 'p1';

export default function App() {
  const [requests, setRequests] = useState(seed);
  const [view, setView] = useState('sky');
  const [selectedPantryId, setSelectedPantryId] = useState(startPantry);
  const [hoverFarmId, setHoverFarmId] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState(null); // a farm (star) whose details are open
  const [modal, setModal] = useState(null); // { pantryId } | null
  const [mapMode, setMapMode] = useState(DEFAULT_MAP_MODE); // 'sky' | 'map'
  const [largeText, setLargeText] = useState(false); // bigger labels in map view
  const [tour, setTour] = useState(null); // { step, playing } while the guided tour is open
  const [intro, setIntro] = useState(true); // the welcome popup: open on load, reopened by the About button
  const tourBase = useRef(null); // the person's own view settings, restored when the tour ends
  const [menuOpen, setMenuOpen] = useState(false); // phone header menu
  const [pledges, setPledges] = useState([]); // this visitor's own pledges: { requestId, pantryId, category, amount, at }
  const [showPledges, setShowPledges] = useState(false);
  const [toast, setToast] = useState(null); // { key, title, body }
  const toastTimer = useRef(0);
  const thank = (title, body) => {
    clearTimeout(toastTimer.current);
    setToast({ key: Date.now(), title, body });
    toastTimer.current = setTimeout(() => setToast(null), 5200);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [viewKey, setViewKey] = useState(0); // bumped to put the sky / map back to its normal zoom
  const headerRef = useRef(null);
  const footRef = useRef(null);
  // Heights of the floating top bar and footer, so the overlays on the picture sit between them.
  const [bars, setBars] = useState({ top: 64, foot: 32 });

  useEffect(() => {
    const top = headerRef.current;
    const foot = footRef.current;
    if (!top || !foot) return undefined;
    const measure = () =>
      setBars({ top: Math.ceil(top.getBoundingClientRect().height), foot: Math.ceil(foot.getBoundingClientRect().height) });
    const ro = new ResizeObserver(measure);
    ro.observe(top);
    ro.observe(foot);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.title = `${APP_NAME} · ${TAGLINE}`;
  }, []);

  // The most recent request per pantry is the one drawn on its planet.
  const latestByPantry = useMemo(() => {
    const m = {};
    for (const r of requests) m[r.pantryId] = r;
    return m;
  }, [requests]);

  const selectedPantry = selectedPantryId ? pantryById[selectedPantryId] : null;
  const selectedRequest = selectedPantryId ? latestByPantry[selectedPantryId] || null : null;

  const ranking = useMemo(
    () =>
      selectedRequest && selectedRequest.status === 'open'
        ? rankFarms(selectedRequest, pantryById[selectedRequest.pantryId], farms)
        : null,
    [selectedRequest],
  );

  const selectedFarm = selectedFarmId ? farmById[selectedFarmId] : null;
  const farmEvaluation = useMemo(
    () =>
      selectedFarm && selectedRequest && selectedRequest.status === 'open'
        ? evaluateFarm(selectedRequest, pantryById[selectedRequest.pantryId], selectedFarm)
        : null,
    [selectedFarm, selectedRequest],
  );
  const farmRequests = useMemo(
    () => (selectedFarmId ? requests.filter((r) => r.farmId === selectedFarmId) : []),
    [requests, selectedFarmId],
  );

  const selectPantry = (id) => {
    setSelectedFarmId(null);
    setSelectedPantryId((cur) => (cur === id ? null : id));
  };
  const selectFarm = (id) => setSelectedFarmId((cur) => (cur === id ? null : id));

  const update = (id, fn) => setRequests((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));

  const choose = (farmId) => {
    if (!selectedRequest) return;
    update(selectedRequest.id, (r) => {
      const ev = evaluateFarm(r, pantryById[r.pantryId], farmById[farmId]);
      return ev.eligible ? applyMatch(r, ev) : r;
    });
    setHoverFarmId(null);
    setSelectedFarmId(null); // back to the pantry, where funding opens
  };

  const pledge = (amount) => {
    if (!selectedRequest) return;
    const r0 = selectedRequest;
    const add = Math.min(amount, r0.goal - r0.pledged);
    if (add > 0) {
      const area = pantryById[r0.pantryId].area;
      const food = labelFor(r0.category).toLowerCase();
      const lbs = r0.goal > 0 ? Math.max(1, Math.round((add / r0.goal) * r0.lbsPlanned)) : 0;
      setPledges((ps) => [...ps, { requestId: r0.id, pantryId: r0.pantryId, category: r0.category, amount: add, at: Date.now() }]);
      if (r0.pledged + add >= r0.goal) {
        thank(`You completed ${area}’s goal!`, `Your $${add} finished it. The farm can start getting ${r0.lbsPlanned} lbs of ${food} ready.`);
      } else {
        const pct = Math.round(((r0.pledged + add) / r0.goal) * 100);
        thank(`Thank you for supporting ${area}!`, `Your $${add} covers about ${lbs} lbs of ${food}. The goal is now ${pct}% funded.`);
      }
    }
    update(selectedRequest.id, (r) => {
      const add = Math.min(amount, r.goal - r.pledged);
      if (add <= 0) return r;
      const pledged = r.pledged + add;
      return { ...r, pledged, pledgeCount: r.pledgeCount + 1, status: pledged >= r.goal ? 'funded' : 'matched' };
    });
  };

  // Each pantry confirmation adds to the pounds received. The request is only "delivered" once every planned
  // pound is confirmed; until then it is "partial" and the planet fills with gold as shipments arrive.
  const confirmDelivery = (lbs) => {
    if (!selectedRequest) return;
    // Let a donor know when food they helped fund arrives
    if (pledges.some((p) => p.requestId === selectedRequest.id)) {
      const r0 = selectedRequest;
      const total = Math.min(r0.lbsPlanned, r0.deliveredLbs + lbs);
      thank(
        total >= r0.lbsPlanned ? 'Food you helped fund arrived!' : 'A shipment you helped fund arrived',
        `${pantryById[r0.pantryId].area} confirmed ${total} of ${r0.lbsPlanned} lbs of ${labelFor(r0.category).toLowerCase()}.`,
      );
    }
    update(selectedRequest.id, (r) => {
      const deliveredLbs = Math.min(r.lbsPlanned, r.deliveredLbs + lbs);
      return { ...r, deliveredLbs, status: deliveredLbs >= r.lbsPlanned ? 'delivered' : 'partial' };
    });
  };
  // The farm can't send the rest: close the request at what arrived (the rest of the money would go back to donors).
  const closeOutDelivery = () => {
    if (!selectedRequest) return;
    update(selectedRequest.id, (r) => ({ ...r, status: 'delivered' }));
  };

  const addRequest = ({ pantryId, category, lbsNeeded, deadlineHours }) => {
    const id = `r${Date.now()}`;
    setRequests((rs) => [
      ...rs,
      {
        id,
        pantryId,
        category,
        lbsNeeded,
        deadlineHours,
        status: 'open',
        farmId: null,
        goal: 0,
        produceCost: 0,
        transportCost: 0,
        lbsPlanned: 0,
        pledged: 0,
        pledgeCount: 0,
        deliveredLbs: 0,
      },
    ]);
    setSelectedPantryId(pantryId);
    setSelectedFarmId(null);
    setView('sky');
    setModal(null);
  };

  const reset = () => {
    setRequests(seed());
    setPledges([]);
    setToast(null);
    setSelectedPantryId(startPantry());
    setSelectedFarmId(null);
    setHoverFarmId(null);
    setView('sky');
    setViewKey((k) => k + 1);
  };

  // ---- Guided tour: every step rebuilds the demo state from the start, so Back, Next and auto-play agree ----
  const applyStep = (i) => {
    const st = TOUR_STEPS[i];
    setRequests(st.requests(seed()));
    setView(st.view || 'sky');
    setSelectedPantryId(st.pantry ?? null);
    setMapMode(st.mapMode || 'sky');
    setHoverFarmId(null);
    setSelectedFarmId(st.farm ?? null);
    setModal(null);
    setViewKey((k) => k + 1);
  };
  const tourGo = (i) => {
    const n = Math.max(0, Math.min(TOUR_STEPS.length - 1, i));
    applyStep(n);
    setTour((t) => ({ playing: false, ...t, step: n }));
  };
  const startTour = () => {
    if (!tourBase.current) tourBase.current = { mapMode, largeText };
    setLargeText(false);
    applyStep(0);
    setTour({ step: 0, playing: false });
  };
  const exitTour = () => {
    const base = tourBase.current;
    tourBase.current = null;
    reset();
    if (base) {
      setMapMode(base.mapMode);
      setLargeText(base.largeText);
    }
    setTour(null);
  };
  const setTourPlaying = useCallback((playing) => setTour((t) => (t ? { ...t, playing } : t)), []);

  // Pantries that can take a new request: none, or their latest one is delivered.
  const freePantries = pantries.filter((p) => !latestByPantry[p.id] || latestByPantry[p.id].status === 'delivered');

  const openFromImpact = (pantryId) => {
    setSelectedPantryId(pantryId);
    setSelectedFarmId(null);
    setView('sky');
  };

  const details = selectedFarm ? (
    <FarmPanel
      farm={selectedFarm}
      pantry={selectedPantry}
      request={selectedRequest}
      evaluation={farmEvaluation}
      farmRequests={farmRequests}
      pantryById={pantryById}
      onChoose={choose}
      onClose={() => setSelectedFarmId(null)}
    />
  ) : (
    <SidePanel
      pantry={selectedPantry}
      request={selectedRequest}
      farms={farms}
      ranking={ranking}
      onChoose={choose}
      onPledge={pledge}
      onConfirm={confirmDelivery}
      onCloseOut={closeOutDelivery}
      onHoverFarm={setHoverFarmId}
      onNewRequest={(pantryId) => setModal({ pantryId })}
    />
  );

  // Sky and Map view fill the screen: the see-through top bar floats over the picture and
  // details open in a side bar on demand.
  const fullView = view === 'sky';
  const tourOnMap = !!tour && /^g\[data-tour=/.test(TOUR_STEPS[tour.step]?.target || '');
  const mapFull = fullView && mapMode === 'map';
  const sidebarOpen = !!(selectedPantryId || selectedFarmId);
  const closeSidebar = () => {
    setSelectedPantryId(null);
    setSelectedFarmId(null);
    setHoverFarmId(null);
  };

  return (
    <div
      className={`app${tour ? ' has-tour' : ''}${fullView ? ' full-view' : ''}${mapFull ? ' map-full' : ''}${tourOnMap ? ' tour-on-map' : ''}`}
      style={{ '--topbar-h': `${bars.top}px`, '--foot-h': `${bars.foot}px` }}
    >
      <header className="topbar" ref={headerRef}>
        <div className="brand">
          <Logo />
          <div>
            <Wordmark />
            <p className="tagline">{TAGLINE}</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Views">
          <button className={view === 'sky' ? 'tab on' : 'tab'} aria-pressed={view === 'sky'} onClick={() => setView('sky')}>
            Sky
          </button>
          <button className={view === 'impact' ? 'tab on' : 'tab'} aria-pressed={view === 'impact'} onClick={() => setView('impact')}>
            Impact
          </button>
          <button className={view === 'money' ? 'tab on' : 'tab'} aria-pressed={view === 'money'} onClick={() => setView('money')}>
            Money
          </button>
          <button className={view === 'questions' ? 'tab on' : 'tab'} aria-pressed={view === 'questions'} onClick={() => setView('questions')}>
            Questions
          </button>
          <button className={view === 'join' ? 'tab on' : 'tab'} aria-pressed={view === 'join'} onClick={() => setView('join')}>
            Join
          </button>
        </nav>
        <span className="sample-badge" title="Every pantry, farm, pledge and delivery is invented for the demo">
          Sample data
        </span>
        {/* Phones only: the action buttons fold into this menu so the top bar stays short */}
        <button
          className="btn btn-ghost btn-sm menu-btn"
          aria-expanded={menuOpen}
          aria-controls="top-actions"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? '✕' : '☰'}
          {!menuOpen && pledges.length > 0 && <span className="menu-dot" aria-hidden="true" />}
        </button>
        <div id="top-actions" className={menuOpen ? 'top-actions is-open' : 'top-actions'} onClick={() => setMenuOpen(false)}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (tour) exitTour();
              setIntro(true);
            }}
          >
            About
          </button>
          <button className="btn btn-primary btn-sm" onClick={startTour} disabled={!!tour}>
            Take the tour
          </button>
          <button className="btn btn-ghost btn-sm pledges-btn" onClick={() => setShowPledges(true)}>
            My pledges
            {pledges.length > 0 && <span className="pledges-count">{pledges.length}</span>}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (tour) exitTour();
              setModal({ pantryId: null });
            }}
          >
            New request
          </button>
          <button className="btn btn-ghost btn-sm" onClick={tour ? exitTour : reset}>
            Reset demo
          </button>
        </div>
      </header>

      {view === 'sky' ? (
        <main className="stage">
          <div className={mapMode === 'map' ? 'sky-wrap is-map' : 'sky-wrap'}>
            <SkyMap
              pantries={pantries}
              farms={farms}
              latestByPantry={latestByPantry}
              selectedPantryId={selectedPantryId}
              selectedRequest={selectedRequest}
              ranking={ranking}
              hoverFarmId={hoverFarmId}
              onSelectPantry={selectPantry}
              selectedFarmId={selectedFarmId}
              onSelectFarm={selectFarm}
              mode={mapMode}
              largeText={largeText}
              viewKey={viewKey}
            />
            <div className="view-controls" role="group" aria-label="Picture style">
              <span className="view-toggle" data-tour="views">
              <button className={mapMode === 'sky' ? 'seg seg-icon-btn on' : 'seg seg-icon-btn'} aria-pressed={mapMode === 'sky'} aria-label="Sky view" title="Sky view" onClick={() => setMapMode('sky')}>
                <SkyIcon />
              </button>
              <button className={mapMode === 'map' ? 'seg seg-icon-btn on' : 'seg seg-icon-btn'} aria-pressed={mapMode === 'map'} aria-label="Map view" title="Map view" onClick={() => {
                  setMapMode('map');
                  closeSidebar();
                }}>
                <MapIcon />
              </button>
              </span>
              {mapMode === 'map' && (
                <button className={largeText ? 'seg seg-text on' : 'seg seg-text'} aria-pressed={largeText} onClick={() => setLargeText((v) => !v)}>
                  Larger text
                </button>
              )}
            </div>
            <div className="map-overlay-bl">
            {mapMode === 'map' && (
              <ul className="map-legend" aria-label="Map key">
                <li>
                  <svg viewBox="-12 -12 24 24" aria-hidden="true">
                    <circle r="11" fill="#2E1069" />
                    <path d="M-7,1 L0,-6 L7,1 L7,7 L-7,7 Z M-2,7 L-2,2 L2,2 L2,7 Z" fill="#fff" fillRule="evenodd" />
                  </svg>
                  Food pantry
                </li>
                <li>
                  <svg viewBox="-12 -12 24 24" aria-hidden="true">
                    <polygon points="0,-10 3,-3 10,-3 4.5,2 6.5,9 0,5 -6.5,9 -4.5,2 -10,-3 -3,-3" fill="#F2B90C" stroke="#2E1069" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  Farm
                </li>
                <li>
                  <svg viewBox="-14 -8 28 16" aria-hidden="true">
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#E0A22B" strokeWidth="8" strokeLinecap="round" />
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#FCD26A" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                  Interstate highway
                </li>
                <li>
                  <svg viewBox="-12 -12 24 24" aria-hidden="true">
                    <circle r="9" fill="none" stroke="#CDBDF2" strokeWidth="4" />
                    <path d="M0,-9 A9,9 0 0 1 9,0" fill="none" stroke="#272F8B" strokeWidth="4" />
                  </svg>
                  Ring = funding progress
                </li>
                <li>
                  <svg viewBox="-12 -12 24 24" aria-hidden="true">
                    <clipPath id="legend-fill">
                      <circle r="9" />
                    </clipPath>
                    <circle r="9" fill="#2E1069" />
                    <rect x="-9" y="0" width="18" height="9" fill="#F2B90C" clipPath="url(#legend-fill)" />
                    <circle r="9" fill="none" stroke="#2E1069" strokeWidth="2" />
                  </svg>
                  Gold fill = pounds delivered
                </li>
              </ul>
            )}
            <p className="map-note">
              {mapMode === 'map'
                ? 'Simplified map: highways and cities are approximate. Distances are to scale, straight-line estimates.'
                : 'Planets are pantries, stars are farms. Ring = funding, gold fill = pounds delivered. Straight-line distances.'}
            </p>
            </div>
          </div>
          {fullView ? (
            sidebarOpen && (
              <div className="map-sidebar">
                <div className="map-sidebar-bar">
                  <button className="btn btn-ghost btn-sm" onClick={closeSidebar} aria-label="Close details">
                    Close ✕
                  </button>
                </div>
                {details}
              </div>
            )
          ) : (
            details
          )}
        </main>
      ) : view === 'impact' ? (
        <main className="stage stage-impact">
          <ImpactView requests={requests} pantries={pantries} farms={farms} onOpen={openFromImpact} />
        </main>
      ) : view === 'money' ? (
        <main className="stage stage-impact">
          <MoneyView onJoin={() => setView('join')} />
        </main>
      ) : view === 'join' ? (
        <main className="stage stage-impact">
          <JoinView />
        </main>
      ) : (
        <main className="stage stage-impact">
          <QuestionsView />
        </main>
      )}

      <footer className="foot" ref={footRef}>
        <span className="foot-long">
          All pantries, farms, pledges and deliveries are sample data. No real payments are taken, and nothing here claims
          a partnership with any organization.
        </span>
        <span className="foot-short">Sample data only · No real payments · No partnerships claimed</span>
      </footer>

      {tour && (
        <Tour
          steps={TOUR_STEPS}
          index={tour.step}
          playing={tour.playing}
          wide={view !== 'sky'}
          onNext={() => tourGo(tour.step + 1)}
          onBack={() => tourGo(tour.step - 1)}
          onExit={exitTour}
          onReplay={() => tourGo(0)}
          onSetPlaying={setTourPlaying}
        />
      )}

      {/* Thank-you note after a pledge (and when food a donor funded arrives) */}
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div key={toast.key} className="toast" role="status">
            <svg className="toast-icon" viewBox="-12 -12 24 24" aria-hidden="true">
              <polygon points="0,-11 3.2,-3.4 11,-3.4 4.7,1.5 7.1,9.9 0,5.3 -7.1,9.9 -4.7,1.5 -11,-3.4 -3.2,-3.4" />
            </svg>
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.body}</p>
              <button
                className="link"
                onClick={() => {
                  setToast(null);
                  setShowPledges(true);
                }}
              >
                See my pledges
              </button>
            </div>
            <button className="toast-x" onClick={() => setToast(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}
      </div>

      {showPledges && (
        <MyPledges
          pledges={pledges}
          requests={requests}
          pantryById={pantryById}
          onOpen={(pantryId) => {
            setShowPledges(false);
            openFromImpact(pantryId);
          }}
          onClose={() => setShowPledges(false)}
        />
      )}

      {intro && (
        <IntroModal
          onClose={() => setIntro(false)}
          onTour={() => {
            setIntro(false);
            startTour();
          }}
        />
      )}

      {modal && (
        <NewRequestModal
          pantries={freePantries}
          initialPantryId={modal.pantryId}
          onSubmit={addRequest}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

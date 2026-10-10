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
import { TOUR_STEPS } from './lib/tourSteps.js';

const { pantries, farms } = sample;
const pantryById = Object.fromEntries(pantries.map((p) => [p.id, p]));
const farmById = Object.fromEntries(farms.map((f) => [f.id, f]));
const seed = () => buildSeedRequests(sample.seedRequests, pantries, farms);

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1B0948" />
      <polygon points="16,4 19.5,12.5 28,13 21.5,18.8 23.6,27.5 16,22.8 8.4,27.5 10.5,18.8 4,13 12.5,12.5" fill="#F2B90C" />
    </svg>
  );
}

export default function App() {
  const [requests, setRequests] = useState(seed);
  const [view, setView] = useState('sky');
  const [selectedPantryId, setSelectedPantryId] = useState('p1');
  const [hoverFarmId, setHoverFarmId] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState(null); // a farm (star) whose details are open
  const [modal, setModal] = useState(null); // { pantryId } | null
  const [mapMode, setMapMode] = useState(DEFAULT_MAP_MODE); // 'sky' | 'map'
  const [largeText, setLargeText] = useState(false); // bigger labels in map view
  const [tour, setTour] = useState(null); // { step, playing } while the guided tour is open
  const [intro, setIntro] = useState(true); // the welcome popup: open on load, reopened by the About button
  const tourBase = useRef(null); // the person's own view settings, restored when the tour ends

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
    update(selectedRequest.id, (r) => {
      const add = Math.min(amount, r.goal - r.pledged);
      if (add <= 0) return r;
      const pledged = r.pledged + add;
      return { ...r, pledged, pledgeCount: r.pledgeCount + 1, status: pledged >= r.goal ? 'funded' : 'matched' };
    });
  };

  const confirmDelivery = (lbs) => {
    if (!selectedRequest) return;
    update(selectedRequest.id, (r) => ({ ...r, status: 'delivered', deliveredLbs: Math.min(lbs, r.lbsPlanned) }));
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
    setSelectedPantryId('p1');
    setSelectedFarmId(null);
    setHoverFarmId(null);
    setView('sky');
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

  return (
    <div className={tour ? 'app has-tour' : 'app'}>
      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <h1>{APP_NAME}</h1>
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
          <button className={view === 'questions' ? 'tab on' : 'tab'} aria-pressed={view === 'questions'} onClick={() => setView('questions')}>
            Questions
          </button>
        </nav>
        <div className="top-actions">
          <span className="sample-badge" title="Every pantry, farm, pledge and delivery is invented for the demo">
            Sample data
          </span>
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
            />
            <div className="view-controls" role="group" aria-label="Picture style" data-tour="views">
              <button className={mapMode === 'sky' ? 'seg on' : 'seg'} aria-pressed={mapMode === 'sky'} onClick={() => setMapMode('sky')}>
                Sky view
              </button>
              <button className={mapMode === 'map' ? 'seg on' : 'seg'} aria-pressed={mapMode === 'map'} onClick={() => setMapMode('map')}>
                Map view
              </button>
              {mapMode === 'map' && (
                <button className={largeText ? 'seg seg-text on' : 'seg seg-text'} aria-pressed={largeText} onClick={() => setLargeText((v) => !v)}>
                  Larger text
                </button>
              )}
            </div>
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
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#2E1069" strokeWidth="8" strokeLinecap="round" />
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#F2B90C" strokeWidth="4.5" strokeLinecap="round" />
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
              </ul>
            )}
            <p className="map-note">
              {mapMode === 'map'
                ? 'Simplified map: highways and cities are approximate. Distances are to scale, straight-line estimates.'
                : 'Planets are pantries, stars are farms. Distances are to scale. Straight-line estimates.'}
            </p>
          </div>
          {selectedFarm ? (
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
            onHoverFarm={setHoverFarmId}
            onNewRequest={(pantryId) => setModal({ pantryId })}
          />
          )}
        </main>
      ) : view === 'impact' ? (
        <main className="stage stage-impact">
          <ImpactView requests={requests} pantries={pantries} farms={farms} onOpen={openFromImpact} />
        </main>
      ) : (
        <main className="stage stage-impact">
          <QuestionsView />
        </main>
      )}

      <footer className="foot">
        All pantries, farms, pledges and deliveries are sample data. No real payments are taken, and nothing here claims a
        partnership with any organization.
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

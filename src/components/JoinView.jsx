import { useState } from 'react';

// "Join" tab: where a pantry or farm says it is interested. Demo only: nothing is sent or saved,
// because there is no backend. When one exists, replace the body of `submit` with a call to a server function.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function JoinView() {
  const [role, setRole] = useState('pantry');
  const [org, setOrg] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  const valid = org.trim() && EMAIL.test(email.trim()) && city.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setDone(true);
  };

  const again = () => {
    setOrg('');
    setEmail('');
    setCity('');
    setNote('');
    setDone(false);
  };

  return (
    <section className="impact join" aria-label="Join">
      <div>
        <h2>Join as a pantry or a farm</h2>
        <p className="muted join-lead">
          Pantries and farms opt in before they appear on the map. Farms also agree to the price terms on the Money tab.
          Donors do not need to register to try the demo.
        </p>
      </div>

      {done ? (
        <div className="join-done" role="status">
          <h3>Thanks, that is the whole flow.</h3>
          <p>
            This is a demo, so nothing was sent or saved. In a real version we would review {org.trim()} and email{' '}
            {email.trim()} before it appears on the map.
          </p>
          <button className="btn btn-ghost" onClick={again}>
            Try another
          </button>
        </div>
      ) : (
        <form className="join-form" onSubmit={submit} noValidate>
          <fieldset className="join-role">
            <legend>I am a</legend>
            <label>
              <input type="radio" name="role" checked={role === 'pantry'} onChange={() => setRole('pantry')} />
              Food pantry
            </label>
            <label>
              <input type="radio" name="role" checked={role === 'farm'} onChange={() => setRole('farm')} />
              Farm
            </label>
          </fieldset>

          <label className="field">
            <span>{role === 'farm' ? 'Farm name' : 'Pantry name'}</span>
            <input value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" />
          </label>
          <label className="field">
            <span>Business email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@yourorganization.org"
            />
          </label>
          <label className="field">
            <span>City or area</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Decatur, GA" />
          </label>
          <label className="field">
            <span>Anything we should know (optional)</span>
            <textarea
              rows="3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                role === 'farm' ? 'What you grow, and how far you can deliver' : 'What you usually need, and how often'
              }
            />
          </label>

          <p className="note">Demo form: nothing is sent or saved. Please do not enter real contact details.</p>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={!valid}>
              Express interest
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// Colours a pantry can pick for its planet and a farm can pick for its star.
// Gold is left out of the planet colours on purpose: a gold planet means "fully delivered".
// Each planet colour has a light/base/dark trio for the sky gradient, and a deeper `map` shade that keeps
// the white house icon readable in Map view.

export const PLANET_COLORS = {
  lavender: { label: 'Lavender', light: '#C9B3F5', base: '#9B75DB', dark: '#272F8B', map: '#2E1069' },
  sky: { label: 'Sky blue', light: '#BFE0FF', base: '#4C9BEF', dark: '#1D3F8F', map: '#1D4FA0' },
  rose: { label: 'Rose', light: '#F9C6DD', base: '#E26BA3', dark: '#6E1D55', map: '#8A1F5E' },
  teal: { label: 'Teal', light: '#AEF1E8', base: '#2BB5A3', dark: '#0E4F5C', map: '#0E5C63' },
  coral: { label: 'Coral', light: '#FFCDB9', base: '#F07A55', dark: '#7A2A1C', map: '#9A3416' },
  mint: { label: 'Mint', light: '#CCF5C8', base: '#5CC97A', dark: '#1B5E3A', map: '#1E6B3A' },
};

export const STAR_COLORS = {
  gold: { label: 'Gold', fill: '#F2B90C', light: '#FFE58A' },
  ice: { label: 'Ice blue', fill: '#8FD3FF', light: '#D9F1FF' },
  rose: { label: 'Rose', fill: '#FF8FBF', light: '#FFD3E6' },
  mint: { label: 'Mint', fill: '#7FE8A8', light: '#D2FADF' },
  ember: { label: 'Ember', fill: '#FF9A57', light: '#FFD5B8' },
  pearl: { label: 'Pearl', fill: '#F1E9FF', light: '#FFFFFF' },
};

export const planetColor = (key) => PLANET_COLORS[key] || PLANET_COLORS.lavender;
export const starColor = (key) => STAR_COLORS[key] || STAR_COLORS.gold;

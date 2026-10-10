export const CATEGORIES = [
  {
    id: 'greens',
    label: 'Leafy greens',
    keywords: ['green', 'kale', 'collard', 'lettuce', 'spinach', 'chard', 'arugula', 'cabbage'],
  },
  {
    id: 'roots',
    label: 'Root vegetables',
    keywords: ['potato', 'carrot', 'beet', 'onion', 'turnip', 'radish', 'root'],
  },
  {
    id: 'tomatoes',
    label: 'Tomatoes & peppers',
    keywords: ['tomato', 'pepper'],
  },
  {
    id: 'squash',
    label: 'Squash',
    keywords: ['squash', 'zucchini', 'pumpkin', 'gourd'],
  },
  {
    id: 'fruit',
    label: 'Fruit',
    keywords: ['fruit', 'apple', 'peach', 'berry', 'berries', 'melon', 'pear', 'grape', 'plum'],
  },
];

export const labelFor = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

// Short names keep the labels under each planet from colliding.
const SHORT = { greens: 'greens', roots: 'roots', tomatoes: 'tomatoes', squash: 'squash', fruit: 'fruit' };
export const shortFor = (id) => SHORT[id] ?? id;

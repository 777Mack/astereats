// A SIMPLIFIED road map of metro Atlanta, drawn by hand from approximate coordinates.
// It exists so people can orient themselves (highways, big cities), not to give directions.
// Roads are accurate to roughly a mile or two, not survey-accurate. City points are accurate.
//
// To improve it later: replace these polylines with real OpenStreetMap or Census road data
// (same {lat,lng} shape), or swap the whole layer for a tile map such as Leaflet + OpenStreetMap
// (needs an internet connection while presenting).
//
// Each road: kind ('interstate' draws amber, 'highway' draws white, both with a soft edge),
// label (text on the road sign), pts ([lat, lng] pairs in order), closed (true for the I-285 loop),
// shields (candidate [lat, lng] spots for the sign; ones that would cover a pin are skipped).

export const ROADS = [
  {
    id: 'i285',
    kind: 'interstate',
    label: 'I-285',
    closed: true,
    pts: [
      [33.766, -84.502], [33.805, -84.492], [33.845, -84.478], [33.883, -84.466], [33.903, -84.445],
      [33.918, -84.405], [33.921, -84.357], [33.927, -84.32], [33.915, -84.292], [33.898, -84.28],
      [33.87, -84.248], [33.84, -84.225], [33.805, -84.215], [33.77, -84.225], [33.74, -84.243],
      [33.716, -84.257], [33.68, -84.268], [33.643, -84.285], [33.628, -84.33], [33.63, -84.37],
      [33.625, -84.42], [33.625, -84.462], [33.65, -84.5], [33.7, -84.51],
    ],
    shields: [[33.915, -84.42], [33.627, -84.4], [33.7, -84.2255], [33.72, -84.507]],
  },
  {
    id: 'i75',
    kind: 'interstate',
    label: 'I-75',
    pts: [
      // north branch through Cobb County
      [34.17, -84.8], [34.12, -84.73], [34.07, -84.65], [34.025, -84.585], [33.985, -84.545],
      [33.95, -84.515], [33.915, -84.485], [33.883, -84.466], [33.862, -84.46], [33.83, -84.44],
      [33.8, -84.415], [33.775, -84.399], [33.745, -84.392],
      // south branch past the airport and Henry County
      [33.715, -84.385], [33.68, -84.368], [33.645, -84.352], [33.63, -84.35], [33.58, -84.33],
      [33.53, -84.3], [33.48, -84.24], [33.44, -84.2], [33.4, -84.17],
    ],
    shields: [[33.99, -84.545], [33.595, -84.335], [33.805, -84.42]],
  },
  {
    id: 'i85',
    kind: 'interstate',
    label: 'I-85',
    pts: [
      // northeast branch through Gwinnett County
      [34.11, -83.99], [34.075, -84.03], [34.03, -84.1], [34.0, -84.15], [33.975, -84.19],
      [33.945, -84.215], [33.925, -84.245], [33.9, -84.285], [33.87, -84.315], [33.85, -84.335],
      [33.825, -84.355], [33.795, -84.388], [33.745, -84.392],
      // southwest branch past the airport toward Newnan
      [33.72, -84.405], [33.69, -84.43], [33.66, -84.455], [33.63, -84.468], [33.6, -84.505],
      [33.575, -84.545], [33.545, -84.595], [33.515, -84.65], [33.47, -84.71], [33.42, -84.77],
      [33.38, -84.82],
    ],
    shields: [[33.99, -84.17], [33.57, -84.55], [33.86, -84.325]],
  },
  {
    id: 'i20',
    kind: 'interstate',
    label: 'I-20',
    pts: [
      // west toward Douglasville and Alabama
      [33.7, -84.9], [33.715, -84.79], [33.725, -84.72], [33.735, -84.66], [33.738, -84.6],
      [33.752, -84.545], [33.766, -84.502], [33.755, -84.465], [33.748, -84.43], [33.745, -84.392],
      // east toward Conyers and Covington
      [33.742, -84.35], [33.735, -84.31], [33.727, -84.275], [33.715, -84.255], [33.708, -84.215],
      [33.708, -84.16], [33.71, -84.11], [33.69, -84.05], [33.668, -84.015], [33.64, -83.96],
      [33.6, -83.88],
    ],
    shields: [[33.723, -84.7], [33.706, -84.14], [33.747, -84.33]],
  },
  {
    id: 'ga400',
    kind: 'highway',
    label: 'GA-400',
    pts: [
      [33.838, -84.375], [33.87, -84.372], [33.895, -84.366], [33.921, -84.357], [33.96, -84.35],
      [34.0, -84.325], [34.04, -84.285], [34.075, -84.27], [34.12, -84.235], [34.17, -84.185],
    ],
    shields: [[34.02, -84.305], [33.86, -84.372]],
  },
  {
    id: 'us78',
    kind: 'highway',
    label: 'US-78',
    pts: [[33.815, -84.212], [33.805, -84.17], [33.82, -84.11], [33.845, -84.045], [33.87, -83.99]],
    shields: [[33.836, -84.075]],
  },
];

// Cities and landmarks: [name, lat, lng, rank]. Rank 1 is drawn largest and placed first.
// Names that already have a pantry or farm pin are skipped automatically.
export const CITIES = [
  ['Atlanta', 33.749, -84.388, 1],
  ['Sandy Springs', 33.9304, -84.3733, 2],
  ['Smyrna', 33.8839, -84.5144, 2],
  ['Alpharetta', 34.0754, -84.2941, 2],
  ['Peachtree City', 33.3968, -84.5961, 2],
  ['College Park', 33.6534, -84.4494, 2],
  ['Kennesaw', 34.0234, -84.6155, 2],
  ['Duluth', 34.0029, -84.1446, 2],
  ['Tucker', 33.8545, -84.2171, 3],
  ['Lithonia', 33.7126, -84.1052, 3],
  ['McDonough', 33.4473, -84.1469, 2],
  ['Stockbridge', 33.5443, -84.2338, 3],
  ['Fairburn', 33.567, -84.581, 3],
  ['Buckhead', 33.8389, -84.3797, 3],
  ['Lilburn', 33.8901, -84.143, 3],
  ['Atlanta Airport', 33.6407, -84.4277, 3],
  ['Snellville', 33.8573, -84.0199, 3],
  ['Cumming', 34.2073, -84.1402, 2],
];

// Parks drawn as soft green patches: [name, lat, lng, width in miles, height in miles].
// Rough size and position, for orientation only. They carry no label.
export const PARKS = [
  ['Piedmont Park', 33.7851, -84.3738, 0.8, 1.0],
  ['Stone Mountain Park', 33.806, -84.145, 4.2, 2.6],
  ['Kennesaw Mountain', 33.9833, -84.5775, 2.8, 1.8],
  ['Chastain Park', 33.8795, -84.3925, 1.3, 1.0],
];

// Catalog. Prices are whole rupees. The server is the only source of truth for price.
export const COLORS = ['black', 'tort', 'navy', 'gold', 'silver', 'rose', 'green', 'clear', 'red'];

const rows = [
  ['Aria', 'eye', 'round', 'Unisex', 1499, 1999, ['black', 'tort', 'gold'], 'A thin round rim that sits light on the nose.'],
  ['Metro', 'eye', 'rect', 'Men', 1299, 1799, ['black', 'navy', 'tort'], 'The everyday rectangle, built for long days.'],
  ['Skyline', 'sun', 'aviator', 'Unisex', 1899, 2499, ['gold', 'silver', 'black'], 'Teardrop lenses with UV400 protection.'],
  ['Vesper', 'eye', 'cat', 'Women', 1599, 2199, ['rose', 'black', 'tort'], 'A lifted outer corner for a sharper line.'],
  ['Hexa', 'eye', 'hex', 'Unisex', 1699, 2299, ['green', 'gold', 'black'], 'Six sides, one confident outline.'],
  ['Wayline', 'sun', 'way', 'Men', 1799, 2299, ['black', 'tort', 'navy'], 'A classic wayfarer with polarised lenses.'],
  ['Pixel', 'screen', 'rect', 'Unisex', 999, 1499, ['black', 'clear', 'navy'], 'Blue-light filter lenses for screen-heavy days.'],
  ['Lumen', 'screen', 'round', 'Unisex', 1099, 1599, ['clear', 'tort', 'black'], 'Round screen glasses, zero power by default.'],
  ['Bloom', 'sun', 'cat', 'Women', 1999, 2699, ['red', 'black', 'tort'], 'Oversized cat-eye with gradient lenses.'],
  ['Orbit', 'sun', 'round', 'Unisex', 1599, 2099, ['gold', 'black', 'silver'], 'Round metal sunglasses with slim temples.'],
  ['Drift', 'eye', 'way', 'Women', 1399, 1899, ['rose', 'navy', 'black'], 'A soft wayfarer in a lighter frame weight.'],
  ['Coder', 'screen', 'hex', 'Men', 1199, 1699, ['black', 'green', 'silver'], 'Anti-glare lenses tuned for long coding sessions.'],
  ['Sprout', 'kids', 'round', 'Kids', 899, 1299, ['red', 'navy', 'green'], 'Flexible hinges and a soft nose pad for ages 4 to 8.'],
  ['Bolt', 'kids', 'rect', 'Kids', 949, 1349, ['navy', 'black', 'red'], 'Impact-resistant frame for active kids.'],
  ['Strata', 'eye', 'aviator', 'Men', 1799, 2399, ['silver', 'gold', 'black'], 'Double-bridge aviator for a stronger look.'],
  ['Sol', 'sun', 'way', 'Women', 1699, 2199, ['tort', 'rose', 'black'], 'Large wayfarer shades that block 100% UV.'],
];

export const PRODUCTS = rows.map((a, i) => ({
  id: i, name: a[0], type: a[1], shape: a[2], gender: a[3], price: a[4], was: a[5], colors: a[6], desc: a[7], pop: i % 5,
}));

// Lens choices by product type. Prices are whole rupees added to the frame price.
// rx: true means the customer should provide a prescription (now or after ordering).
export const LENS_OPTIONS = {
  eye: [
    { id: 'clear', name: 'Clear lenses, no power', price: 0, rx: false },
    { id: 'blue', name: 'Blue-light protection, no power', price: 399, rx: false },
    { id: 'rx', name: 'Prescription, single vision', price: 499, rx: true },
    { id: 'prog', name: 'Prescription, progressive', price: 1299, rx: true },
  ],
  sun: [
    { id: 'uv', name: 'UV400 tinted', price: 0, rx: false },
    { id: 'polar', name: 'Polarised', price: 499, rx: false },
    { id: 'rxsun', name: 'Prescription, tinted', price: 799, rx: true },
  ],
  screen: [
    { id: 'blue', name: 'Blue-light, no power', price: 0, rx: false },
    { id: 'rx', name: 'Blue-light with prescription', price: 499, rx: true },
  ],
  kids: [
    { id: 'clear', name: 'Clear lenses, no power', price: 0, rx: false },
    { id: 'rx', name: 'Prescription, single vision', price: 399, rx: true },
  ],
};

export const SHIPPING = { freeOver: 1499, fee: 79 };
export const COUPONS = {
  WELCOME10: { label: '10% off', pct: 10 },
  CALM200: { label: '₹200 off orders above ₹1,999', flat: 200, min: 1999 },
};

// Starting stock per product and color (admin can change it later).
export function seedQty(id, colorIndex) {
  if (id === 6 && colorIndex === 0) return 2; // Pixel in black: low stock
  if (id === 8 && colorIndex === 0) return 0; // Bloom in cherry: sold out
  return 8 + ((id * 7 + colorIndex * 3) % 9);
}

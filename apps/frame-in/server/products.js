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

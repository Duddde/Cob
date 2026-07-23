/**
 * Construit une version 100 % STATIQUE de SnowBall dans dist/ — déployable
 * par simple upload (hébergement mutualisé Hostinger, GitHub Pages, etc.).
 *
 *   npm run build:static
 *
 * Les projections sont déjà calculées dans le navigateur ; ce build remplace
 * seulement les deux routes d'API par des fichiers JSON figés :
 *  - le catalogue d'actifs (identique au serveur) ;
 *  - les prix : instantanés du catalogue, marqués live:false (« prix
 *    indicatif ») — sans serveur, les API de prix bloquent les requêtes
 *    navigateur (CORS).
 */

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ASSETS, INFLATION } from '../lib/assets.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

/** Remplace exactement `count` occurrences, sinon échoue bruyamment. */
function replaceExactly(source, search, replacement, count, label) {
  const parts = source.split(search);
  if (parts.length - 1 !== count) {
    throw new Error(
      `${label} : ${parts.length - 1} occurrence(s) de « ${search} » (attendu : ${count}). ` +
        'Le code a changé — mettre à jour scripts/build-static.mjs.'
    );
  }
  return parts.join(replacement);
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'api'), { recursive: true });
await mkdir(path.join(dist, 'lib'), { recursive: true });

// Interface + moteur de calcul
await cp(path.join(root, 'public'), dist, { recursive: true });
await cp(path.join(root, 'lib', 'projection.js'), path.join(dist, 'lib', 'projection.js'));

// Les routes d'API deviennent des fichiers JSON
await writeFile(
  path.join(dist, 'api', 'assets.json'),
  JSON.stringify({ inflation: INFLATION, assets: ASSETS })
);
for (const currency of ['eur', 'usd']) {
  const prices = {};
  for (const a of ASSETS) {
    prices[a.id] = { price: a.spotPrice[currency], currency, live: false };
  }
  await writeFile(
    path.join(dist, 'api', `prices-${currency}.json`),
    JSON.stringify({ currency, prices })
  );
}

// L'app pointe vers ces fichiers (chemins RELATIFS : fonctionne aussi dans un
// sous-dossier type votredomaine.fr/snowball/)
const appPath = path.join(dist, 'app.js');
let app = await readFile(appPath, 'utf8');
app = replaceExactly(app, "from '/lib/projection.js'", "from './lib/projection.js'", 1, 'import moteur');
app = replaceExactly(app, "fetch('/api/assets')", "fetch('api/assets.json')", 1, 'fetch catalogue');
app = replaceExactly(
  app,
  'fetch(`/api/prices?currency=${state.currency}`)',
  'fetch(`api/prices-${state.currency}.json`)',
  1,
  'fetch prix'
);
await writeFile(appPath, app);

console.log('✔ Version statique construite dans dist/');
console.log('  → téléversez le CONTENU de dist/ à la racine du site (hPanel → Gestionnaire de fichiers → public_html).');
console.log('  Limite : prix « indicatifs » (pas de serveur → pas d’API de prix en direct).');

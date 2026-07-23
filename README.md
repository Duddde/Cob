# ❄️ SnowBall

> Laissez vos intérêts faire boule de neige : visualisez votre capital dans 5, 10, 15, 20 ans.

**SnowBall** est une interface web open source (Node.js) pour visualiser ce que pourrait
devenir un capital investi aujourd'hui dans une crypto, un ETF ou une action, en se basant
sur les **performances historiques documentées** — et en montrant honnêtement l'incertitude
qui les entoure.

![Licence MIT](https://img.shields.io/badge/licence-MIT-blue) ![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## Fonctionnalités

- **Comparaison multi-actifs** : Bitcoin, Ethereum, S&P 500, Nasdaq-100, MSCI World, or,
  Nvidia, obligations US — chacun avec sa couleur fixe, superposés sur un même graphique.
- **Trois scénarios sourcés** par actif : *Prudent* (estimations prospectives),
  *Modéré* (historique le plus long disponible), *Historique* (CAGR des 10 dernières années).
- **Tuiles 5 / 10 / 15 / 20 ans** pour l'actif en vedette, avec multiple vs montant versé.
- **Bande d'incertitude** : simulation Monte Carlo (2 000 trajectoires, rendements mensuels
  log-normaux) couvrant 80 % des futurs simulés — parce qu'une ligne seule ment.
- **Prix en direct** via CoinGecko (cryptos) et Yahoo Finance (ETF/actions), avec repli sur
  des instantanés si les API sont injoignables ; calcul des unités achetées au prix actuel.
- **ETF capitalisants vs distribuants** : les dividendes réinvestis composent, les
  dividendes encaissés ne composent plus — un panneau « Effet des intérêts composés »
  chiffre l'écart entre les deux à l'horizon choisi.
- **Versements mensuels (DCA)**, devise € / $, **pouvoir d'achat constant** (inflation
  déduite), **échelle logarithmique**, vue tableau année par année.
- **Thème « nuit polaire »** : dashboard sombre avec barre latérale, cartes translucides
  et ligne de portefeuille lumineuse (palette de séries validée contraste + daltonisme).

## Démarrage

```bash
npm install
npm start        # ❄️ http://localhost:3000
npm test         # tests du moteur de projection (node:test)
```

Aucune clé d'API nécessaire. Node.js ≥ 18.

## Comment sont calculées les projections ?

- La projection centrale est une **capitalisation composée** au CAGR (rendement
  **géométrique** annualisé) du scénario choisi — pas la moyenne arithmétique, qui
  surestime systématiquement les projections (« volatility drag », Jacquier, Kane &
  Marcus 2003).
- La bande d'incertitude simule des rendements mensuels log-normaux calés sur le CAGR et
  la volatilité historique de l'actif (percentiles 10–90, graine fixe pour la
  reproductibilité).
- Le moteur ([`lib/projection.js`](lib/projection.js)) est un module pur, partagé tel quel
  entre le serveur, le navigateur et les tests.

Tous les chiffres (CAGR, volatilités, prix) et leur provenance — sites spécialisés
(MSCI, officialdata.org, macrotrends, slickcharts, World Gold Council…) et papiers de
recherche (Dimson-Marsh-Staunton, Siegel, Liu & Tsyvinski, SPIVA, Bogle…) — sont
documentés dans **[docs/RESEARCH.md](docs/RESEARCH.md)**.

## ⚠️ Avertissement

**Les performances passées ne préjugent pas des performances futures** — c'est même un
résultat central de la littérature citée (Persistence Scorecard de S&P, retour à la
moyenne chez Bogle). Le CAGR de Bitcoin sur 10 ans est de ~59 %/an, mais de ~15 %/an
seulement sur 5 ans, et les projections institutionnelles sérieuses retiennent 3 à 15 %/an
pour la prochaine décennie. SnowBall est un outil pédagogique de visualisation d'ordres
de grandeur, pas un conseil en investissement.

## Contribuer

Le projet est sous licence [MIT](LICENSE). Idées bienvenues : actifs personnalisés,
import d'historiques réels, frais et fiscalité, rééquilibrage de portefeuille,
internationalisation.

# Recherche : performances historiques & littérature

Ce document rassemble les données et références qui fondent les hypothèses de rendement
de SnowBall (`lib/assets.js`). Données collectées en **juillet 2026** ; les CAGR sont des
rendements **géométriques annualisés nominaux**, dividendes réinvestis quand applicable.
Certains sites (curvo.eu, slickcharts, averageannualreturn…) bloquent la consultation
automatisée : leurs chiffres proviennent alors d'extraits de recherche, recoupés quand
c'était possible.

## 1. CAGR historiques par actif

### Bitcoin (BTC)
- Prix ~**65 859 $** (22 juil. 2026), en baisse de ~48 % vs le pic de 126 000 $ d'octobre 2025.
- CAGR 10 ans (juil. 2016 → juil. 2026) ≈ **58-60 %/an** (~660 $ → ~65 900 $). Les chiffres
  de 71-84 %/an encore affichés par certains sites utilisent des fenêtres antérieures au
  krach de 2026.
- CAGR 5 ans (juil. 2021 → juil. 2026) ≈ **15 %/an** (~32 000 $ → ~65 900 $).
- Volatilité annualisée ≈ **42 %** en 2025 (vs ~80 % en 2021) ; 60-80 % en historique long.
  Le moteur retient 60 % (cohérent avec l'extrapolation d'un CAGR historique long).
- Projections prospectives sérieuses : E*TRADE **3-10 %/an** ; VanEck cas de base **15 %/an**.
- Sources : [Fortune (prix 22/07/2026)](https://fortune.com/article/price-of-bitcoin-07-22-2026/),
  [CompaniesHistory – Bitcoin CAGR](https://www.companieshistory.com/bitcoin-cagr),
  [StatMuse](https://www.statmuse.com/money/ask/btc-cagr-10-year),
  [bestbrokers.com](https://www.bestbrokers.com/bitcoin-trading/bitcoin-price-history/),
  [Schwab – volatilité](https://www.schwab.com/learn/story/bitcoin-volatility-shrinks-to-magnificent-7-levels),
  [charts.bitbo.io](https://charts.bitbo.io/),
  [slickcharts BTC](https://www.slickcharts.com/currency/BTC/returns),
  [E*TRADE – rendements long terme](https://us.etrade.com/knowledge/library/cryptocurrency/how-should-investors-think-about-long-term-bitcoin-returns),
  [VanEck – Bitcoin Long-Term CMA](https://www.vaneck.com/us/en/blogs/digital-assets/matthew-sigel-vaneck-bitcoin-long-term-capital-market-assumptions/),
  [Fidelity Digital Assets – fin du cycle de 4 ans](https://www.fidelitydigitalassets.com/research-and-insights/bitcoins-four-year-cycle-over),
  [Bitcoin Magazine – diminishing returns](https://bitcoinmagazine.com/markets/bitcoin-price-defy-diminishing-returns).

### Ethereum (ETH)
- Prix ~**1 870 $** (juil. 2026 ; pic ~5 000 $ en août 2025).
- CAGR 10 ans ≈ **65 %/an** (~12,5 $ en juil. 2016, après le hack de The DAO → ~1 870 $).
- CAGR 5 ans ≈ **0 %/an** (~2 000 $ en juil. 2021 → 1 870 $).
- Volatilité annualisée ≈ **60-80 %** (supérieure au BTC). Rendements annuels :
  2020 +472 %, 2021 +395 %, 2023 +93 %, 2024 +46 %.
- Sources : [Fortune (prix 01/07/2026)](https://fortune.com/article/price-of-ethereum-07-01-2026/),
  [slickcharts ETH](https://www.slickcharts.com/currency/ETH/returns),
  [curvo.eu – backtest Ethereum](https://curvo.eu/backtest/en/market-index/ethereum).

### S&P 500 (SPY)
- CAGR depuis 1957 ≈ **10,3-10,4 %/an** nominal, dividendes réinvestis (7,4 % hors dividendes).
- CAGR 10 ans ≈ **13,7 %/an** (à janvier 2026). Volatilité ≈ **15-18 %** (16 % sur 1975-2024).
- Sources : [officialdata.org](https://www.officialdata.org/us/stocks/s-p-500/1957),
  [Fidelity](https://www.fidelity.com/learning-center/trading-investing/sp-500-average-return),
  [macrotrends](https://www.macrotrends.net/2526/sp-500-historical-annual-returns),
  [slickcharts](https://www.slickcharts.com/sp500/returns),
  [tradethatswing](https://tradethatswing.com/average-historical-stock-market-returns-for-sp-500-5-year-up-to-150-year-averages/).

### Nasdaq-100 (QQQ)
- CAGR 10 ans = **22,1 %/an** (dividendes réinvestis, au 25/06/2026).
- Depuis mars 1999 : **10,2-10,7 %/an seulement** — l'éclatement de la bulle dot-com pèse
  lourd (pire décennie 2000-2009 : −6,7 %/an ; 2022 : −32,5 %). Volatilité ≈ **17-20 %**.
- Sources : [averageannualreturn.com/qqq](https://www.averageannualreturn.com/qqq/),
  [quantflowlab](https://quantflowlab.com/qqq-average-return/),
  [totalrealreturns](https://totalrealreturns.com/n/QQQ),
  [slickcharts Nasdaq-100](https://www.slickcharts.com/nasdaq100/returns).

### MSCI World (IWDA)
- CAGR 10 ans = **14,9 %/an** net USD (factsheet MSCI au 30/06/2026).
- Long terme : **8,9 %/an** (1986-2025, gross USD) ; 9,3 % sur 1970-2018.
- Volatilité = **15,1 %** (écart-type annualisé 10 ans) ; drawdown max −57,8 % (2007-09).
- Sources : [factsheet MSCI World (PDF)](https://www.msci.com/documents/10199/255599/msci-world-index-usd-net.pdf),
  [investingintheweb](https://investingintheweb.com/blog/msci-world-index-historical-data/),
  [curvo.eu – backtest MSCI World](https://curvo.eu/backtest/en/portfolio/msci-world--NoIgsgygwgkgBAdQPYCcA2ATEAaYoAyAqgIwDsAHMQKwAsxZAnDsQLptA).

### Or
- Once ~**4 104 $** (23 juil. 2026). CAGR depuis 1971 (fin de Bretton Woods) ≈ **7,9-8 %/an**.
- CAGR 10 ans ≈ **11,9 %/an** (~1 330 $ → ~4 104 $) ; GLD 5 ans = 17,5 %/an. Volatilité ≈ **15 %**.
- Sources : [World Gold Council](https://www.gold.org/goldhub/data/gold-returns),
  [Statista 1971-2025](https://www.statista.com/statistics/1061434/gold-other-assets-average-annual-returns-global/),
  [Fortune (prix 20/07/2026)](https://fortune.com/article/current-price-of-gold-07-20-202/),
  [financecharts GLD](https://www.financecharts.com/etfs/GLD/performance/total-return-cagr).

### Nvidia (NVDA)
- CAGR 10 ans = **66-69 %/an** (au 12/06/2026 ; +17 783 % au total sur 10 ans).
- Volatilité ≈ **45-55 %** annualisée. Trajectoire exceptionnelle, non extrapolable telle quelle.
- Sources : [averageannualreturn.com/nvda](https://www.averageannualreturn.com/nvda/),
  [financecharts NVDA](https://www.financecharts.com/stocks/NVDA/summary/price-cagr),
  [totalrealreturns NVDA](https://totalrealreturns.com/n/NVDA).

### Apple (AAPL) — référence supplémentaire, non incluse par défaut
- CAGR 10 ans = **29-31 %/an** (mi-2026, dividendes réinvestis) ; volatilité ≈ 25-30 %.
- Sources : [averageannualreturn.com/aapl](https://www.averageannualreturn.com/aapl/),
  [portfolioslab](https://portfolioslab.com/tools/stock-comparison/NVDA/AAPL).

### Obligations US aggregate (AGG)
- CAGR 10 ans ≈ **1,9-2 %/an** (2016-2025, dont −13 % en 2022). Volatilité ≈ **4-6 %**.
- Sources : [fact sheet iShares AGG (PDF)](https://www.ishares.com/us/literature/fact-sheet/agg-ishares-core-u-s-aggregate-bond-etf-fund-fact-sheet-en-us.pdf),
  [Morningstar](https://www.morningstar.com/etfs/arcx/agg/performance).

### Rendements du dividende (pour le mode capitalisant / distribuant)

Valeurs approximatives mi-2026, issues des factsheets émetteurs et agrégateurs
(SSGA/SPY, iShares/IWDA et AGG, Invesco/QQQ, justETF, Morningstar) :

| ETF | Rendement du dividende ≈ |
|---|---|
| S&P 500 (SPY) | 1,2 %/an |
| MSCI World (IWDA) | 1,7 %/an |
| Nasdaq-100 (QQQ) | 0,6 %/an |
| Obligations US (AGG) | 4 %/an *(coupons — l'essentiel du rendement obligataire)* |

Décomposition utilisée : (1 + rendement total) = (1 + rendement prix) × (1 + dividende).
En version **capitalisante**, le dividende est réinvesti et compose avec le prix (le CAGR
total « dividendes réinvestis » des sources s'applique tel quel). En version
**distribuante**, la part investie ne croît que de la composante prix et les dividendes
sont encaissés en cash : l'écart entre les deux à horizon donné mesure exactement
l'effet des intérêts composés sur les dividendes (cf. la mécanique moyenne
géométrique/composition de Jacquier, Kane & Marcus 2003, section 3). Le calcul ignore
le frottement fiscal, qui pénalise en pratique davantage encore les fonds distribuants
(imposition des dividendes au fil de l'eau).

### Inflation
- US : ~**3,3 %/an** en moyenne depuis 1913 ; 2025 : 2,6 %. Zone euro : ~**2 %/an** depuis
  1999 (cible BCE) ; juin 2026 : 2,8 %. Convention du projet : **2,5 %/an**.
- Sources : [usinflationcalculator](https://www.usinflationcalculator.com/inflation/historical-inflation-rates/),
  [macrotrends](https://www.macrotrends.net/global-metrics/countries/usa/us/inflation-rate-cpi),
  [inflationtool – zone euro](https://www.inflationtool.com/rates/euro/historical),
  [Eurostat](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Inflation_in_the_euro_area).

## 2. « Le BTC fait en moyenne +50 %/an » — vrai ou faux ?

- **Sur 10 ans : vrai, et même dépassé** (~59 %/an). C'est le scénario « Historique » de
  SnowBall — utile pour visualiser la question, à condition de voir ce qu'elle suppose.
- **Sur 5 ans : faux** (~15 %/an). Les rendements du BTC **décroissent structurellement**
  à mesure que l'actif mûrit : multiples de cycle en chute (×100+ en 2013, ×30 en 2017,
  ×8 en 2021, ×3-4 en 2025), modèles en loi de puissance en décélération continue,
  volatilité divisée par deux depuis 2021.
- Les hypothèses prospectives institutionnelles vont de **3 à 15 %/an** pour la prochaine
  décennie (E*TRADE, VanEck) — c'est la fourchette des scénarios « Prudent » et « Modéré ».
- Extrapoler +50 %/an sur 10-20 ans suppose que la phase d'adoption précoce, déjà terminée,
  se répète : à manier comme une expérience de pensée, pas comme une prévision.

## 3. Papiers de recherche et littérature

- **Dimson, E., Marsh, P. & Staunton, M. (2026).** *Global Investment Returns Yearbook 2026.*
  UBS / London Business School / Cambridge. 126 ans de données (1900-2025), 35 marchés :
  rendement **réel** actions US = 6,6 %/an ; actions mondiales ≈ 5-5,2 % réel ; obligations
  1,6 % réel. [Page UBS](https://www.ubs.com/global/en/investment-bank/insights-and-data/articles/global-investment-returns-yearbook-2026.html) ·
  [résumé public (PDF)](https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf)
- **Siegel, J. (2022, 6ᵉ éd.).** *Stocks for the Long Run.* McGraw-Hill. Rendement réel des
  actions US ≈ 6,7 %/an depuis 1802 (« constante de Siegel »), remarquablement stable sur
  deux siècles. [Knowledge at Wharton](https://knowledge.wharton.upenn.edu/article/jeremy-siegel-why-stocks-are-still-durable-in-the-long-run/)
- **Liu, Y. & Tsyvinski, A. (2021).** « Risks and Returns of Cryptocurrency ».
  *The Review of Financial Studies*, 34(6), 2689-2727. Les rendements crypto sont pilotés
  par des facteurs propres au marché crypto (adoption réseau, momentum, attention) et non
  par les facteurs actions/macro classiques.
  [Oxford Academic](https://academic.oup.com/rfs/article-abstract/34/6/2689/5912024) ·
  [NBER w24877](https://www.nber.org/papers/w24877)
- **Jacquier, E., Kane, A. & Marcus, A. (2003).** « Geometric or Arithmetic Mean:
  A Reconsideration ». *Financial Analysts Journal*, 59(6), 46-53. Composer la moyenne
  arithmétique historique biaise les projections à la hausse (« volatility drag »,
  g ≈ μ − σ²/2) ; sur 40 ans l'écart peut dépasser un facteur 2. C'est pourquoi SnowBall
  projette sur le CAGR **géométrique** et cale la médiane Monte Carlo dessus.
  [Tandfonline](https://www.tandfonline.com/doi/abs/10.2469/faj.v59.n6.2574) ·
  [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=489522)
- **S&P Dow Jones Indices.** *The Persistence Scorecard* (semestriel depuis 2010).
  Moins de 1 % des fonds actions US restent dans le top quartile 5 années consécutives :
  la performance passée ne prédit pas la future.
  [PDF](https://www.spglobal.com/spdji/en/documents/spiva/persistence-scorecard-january-2016.pdf)
- **Bogle, J.C. (2002).** « The Telltale Chart ». Keynote, Morningstar Investment Forum.
  Le retour à la moyenne est omniprésent : les surperformances passées tendent à s'inverser.
  [PDF](https://johncbogle.com/speeches/JCB_Morningstar_6-02.pdf)
- **Kitces, M. & Pfau, W. (2015).** « Retirement Risk, Rising Equity Glide Paths, and
  Valuation-Based Asset Allocation ». *Journal of Financial Planning*, 28(3), 38-48.
  Référence sur l'usage des simulations Monte Carlo en planification financière.
  [FPA](https://www.financialplanningassociation.org/article/journal/MAR15-retirement-risk-rising-equity-glide-paths-and-valuation-based-asset) ·
  voir aussi [arXiv 2306.16563](https://arxiv.org/pdf/2306.16563) et la
  [critique des fat tails (Kitces)](https://www.kitces.com/blog/monte-carlo-analysis-risk-fat-tails-vs-safe-withdrawal-rates-rolling-historical-returns/)

## 4. Comment ces chiffres alimentent les scénarios

| Actif | Prudent (prospectif) | Modéré (long terme) | Historique (10 ans) |
|---|---|---|---|
| S&P 500 | 6,5 % | 10,4 % *(depuis 1957)* | 13,7 % |
| Bitcoin | 5 % *(E*TRADE 3-10 %)* | 15 % *(VanEck, ≈ CAGR 5 ans)* | 59 % |
| MSCI World | 5,5 % | 8,9 % *(1986-2025)* | 14,9 % |
| Or | 3 % | 7,9 % *(depuis 1971)* | 11,9 % |
| Ethereum | 2 % | 10 % | 65 % |
| Nvidia | 8 % | 20 % | 67 % |
| Nasdaq-100 | 6,5 % | 10,5 % *(depuis 1999)* | 22,1 % |
| Obligations US | 1,5 % | 2 % | 2 % |

La volatilité retenue par actif (pour la bande Monte Carlo) figure dans
[`lib/assets.js`](../lib/assets.js) avec une note par actif.

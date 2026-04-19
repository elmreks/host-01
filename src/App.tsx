import { useEffect, useMemo, useState } from 'react'
import rawOptions from '../data/options.json'
import type { EnrichedOptionItem, OptionItem, OptionType, ScoreKey } from './types'

type Page = 'home' | 'compare' | 'methodology'
type NeedFilter = 'auth' | 'payments' | 'database' | 'pwa' | 'lowest-complexity' | 'lowest-lock-in'
type SortKey = 'overall' | 'simplicity' | 'stability' | 'auth' | 'payments'
type FilterType = 'all' | OptionType
type Theme = 'light' | 'dark'

const options = rawOptions as OptionItem[]
const pageOrder: readonly Page[] = ['home', 'compare', 'methodology']
const typeOptions: readonly FilterType[] = ['all', 'platform', 'combo']
const needOptions: ReadonlyArray<readonly [NeedFilter, string]> = [
  ['auth', 'Auth'],
  ['payments', 'Payments'],
  ['database', 'Database'],
  ['pwa', 'PWA'],
  ['lowest-complexity', 'Lowest complexity'],
  ['lowest-lock-in', 'Lowest lock-in'],
]
const compareTags = [
  'hosting',
  'auth',
  'payments',
  'database',
  'storage',
  'PWA support',
  'setup complexity',
  'pricing clarity',
  'lock-in',
] as const

const weights: Record<ScoreKey, number> = {
  simplicity: 1.35,
  stability: 1.2,
  frontend_hosting: 0.9,
  backend_functions: 0.9,
  database: 1.05,
  auth: 1.1,
  payments: 1.05,
  storage: 0.7,
  pwa: 1,
  pricing_clarity: 0.85,
  lock_in_risk: 0.8,
  scalability_confidence: 1,
}

const scoreLabels: Record<ScoreKey, string> = {
  simplicity: 'Simplicity',
  stability: 'Stability',
  frontend_hosting: 'Frontend',
  backend_functions: 'Backend',
  database: 'Database',
  auth: 'Auth',
  payments: 'Payments',
  storage: 'Storage',
  pwa: 'PWA',
  pricing_clarity: 'Pricing',
  lock_in_risk: 'Portability',
  scalability_confidence: 'Scale',
}

const scoreDescriptions: Record<ScoreKey, string> = {
  simplicity: 'How easy it is to get a useful app running quickly.',
  stability: 'How dependable and established the option feels.',
  frontend_hosting: 'How well it serves frontend deployment.',
  backend_functions: 'How well it handles app logic, functions, or services.',
  database: 'How easily it supports application data.',
  auth: 'How straightforward login and identity are.',
  payments: 'How straightforward billing integration is.',
  storage: 'How well it supports files and object storage.',
  pwa: 'How suitable it is for modern installable web apps.',
  pricing_clarity: 'How easy it is to understand likely cost and usage risk.',
  lock_in_risk: 'Higher is better: lower lock-in and easier future portability.',
  scalability_confidence: 'Confidence that it can handle growth without surprise.',
}

const featuredIds = ['firebase', 'vercel-supabase', 'render', 'cloudflare']

function calculateOverallScore(option: OptionItem) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + option.scores[key as ScoreKey] * weight
  }, 0)
  return Number((weightedScore / totalWeight).toFixed(1))
}

function getHashPage(): Page {
  const hash = window.location.hash.replace('#', '') as Page
  return pageOrder.includes(hash) ? hash : 'home'
}

function scoreTone(score: number) {
  if (score >= 4.5) return 'great'
  if (score >= 3.5) return 'good'
  if (score >= 2.5) return 'okay'
  return 'rough'
}

function getPreferredTheme(): Theme {
  const storedTheme = window.localStorage.getItem('hosty-theme')
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const enrichedOptions = useMemo<EnrichedOptionItem[]>(
    () => options.map((option) => ({ ...option, overall: calculateOverallScore(option) })),
    [],
  )

  const [page, setPage] = useState<Page>(() => getHashPage())
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme())
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [activeNeed, setActiveNeed] = useState<NeedFilter | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('overall')
  const [selectedOption, setSelectedOption] = useState<(typeof enrichedOptions)[number] | null>(null)

  useEffect(() => {
    const onHashChange = () => setPage(getHashPage())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    window.location.hash = page
  }, [page])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('hosty-theme', theme)
  }, [theme])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const matchesNeed = (option: EnrichedOptionItem) => {
      if (!activeNeed) return true

      switch (activeNeed) {
        case 'auth':
          return option.scores.auth >= 4
        case 'payments':
          return option.scores.payments >= 4
        case 'database':
          return option.scores.database >= 4
        case 'pwa':
          return option.scores.pwa >= 4
        case 'lowest-complexity':
          return option.scores.simplicity >= 4
        case 'lowest-lock-in':
          return option.scores.lock_in_risk >= 4
      }
    }

    const sorted = enrichedOptions
      .filter((option) => {
        const haystack = [option.name, option.summary, ...option.best_for, ...option.recommended_for]
          .join(' ')
          .toLowerCase()
        const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
        const matchesType = filterType === 'all' || option.type === filterType
        return matchesQuery && matchesType && matchesNeed(option)
      })
      .sort((a, b) => {
        if (sortKey === 'overall') return b.overall - a.overall
        return b.scores[sortKey] - a.scores[sortKey]
      })

    return sorted
  }, [activeNeed, enrichedOptions, filterType, query, sortKey])

  const quickPicks = useMemo(() => {
    const byId = Object.fromEntries(enrichedOptions.map((option) => [option.id, option]))
    return {
      allInOne: byId.firebase,
      combo: byId['vercel-supabase'],
      fullStack: byId.render,
      edge: byId.cloudflare,
    }
  }, [enrichedOptions])

  const featured = enrichedOptions.filter((option) => featuredIds.includes(option.id))

  return (
    <div className="site-shell">
      <div className="grain" />
      <header className="topbar">
        <button className="brand" onClick={() => setPage('home')}>
          <span className="brand-mark">🚢</span>
          <span>
            <strong>Hosty McHostface</strong>
            <em>hosting comparison notes</em>
          </span>
        </button>
        <div className="topbar-actions">
          <nav className="nav">
            <button className={page === 'home' ? 'is-active' : ''} onClick={() => setPage('home')}>
              Home
            </button>
            <button className={page === 'compare' ? 'is-active' : ''} onClick={() => setPage('compare')}>
              Compare
            </button>
            <button className={page === 'methodology' ? 'is-active' : ''} onClick={() => setPage('methodology')}>
              Methodology
            </button>
          </nav>
          <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </header>

      <main className="page-wrap">
        {page === 'home' && (
          <>
            <section className="hero panel">
              <div className="eyebrow">Personal-first V1 · practical notes, not affiliate sludge</div>
              <div className="hero-grid">
                <div className="hero-main">
                  <h1>Compare hosting for modern apps.</h1>
                  <p className="hero-copy">
                    A compact guide to simple, stable options for apps and PWAs that need auth, payments, a database,
                    and a sane place to start.
                  </p>
                  <div className="hero-actions hero-links">
                    <button className="text-link" onClick={() => setPage('compare')}>
                      Compare options →
                    </button>
                    <button className="text-link" onClick={() => setPage('methodology')}>
                      View methodology →
                    </button>
                  </div>
                </div>
                <div className="hero-meta">
                  <div className="hero-meta-item">
                    <span>Focus</span>
                    <strong>personal decision tool first</strong>
                  </div>
                  <div className="hero-meta-item">
                    <span>Format</span>
                    <strong>small, opinionated, JSON-driven</strong>
                  </div>
                  <div className="hero-meta-item">
                    <span>Question</span>
                    <strong>what is the least annoying good stack to start with?</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="quick-picks panel">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Quick recommendation block</div>
                  <h2>Starter picks, clearly marked as opinion.</h2>
                </div>
                <p>Editorial picks, informed by the scores but not pretending to be objective truth.</p>
              </div>

              <div className="pick-grid">
                <QuickPickCard
                  label="Best all-in-one starter"
                  option={quickPicks.allInOne}
                  blurb="If you want fewer decisions and fast movement, this is the easiest whole-package answer."
                />
                <QuickPickCard
                  label="Best modern combo starter"
                  option={quickPicks.combo}
                  blurb="Probably the cleanest default for a web-first MVP with real auth and a real database."
                />
                <QuickPickCard
                  label="Best full-stack host"
                  option={quickPicks.fullStack}
                  blurb="More conventional app hosting shape, with less frontend-first hype and fewer weird surprises."
                />
                <QuickPickCard
                  label="Best edge-first option"
                  option={quickPicks.edge}
                  blurb="Very capable when you actually want edge power, not when you just want to be done."
                />
              </div>
            </section>

            <section className="panel">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">What this site compares</div>
                  <h2>Useful stack traits, not giant comparison-table sludge.</h2>
                </div>
              </div>
              <div className="pill-grid">
                {compareTags.map((item) => (
                  <div key={item} className="info-pill">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Featured options</div>
                  <h2>A small set of genuinely relevant starting points.</h2>
                </div>
                <button className="text-link" onClick={() => setPage('compare')}>
                  Open the full comparison →
                </button>
              </div>
              <div className="card-grid">
                {featured.map((option) => (
                  <OptionCard key={option.id} option={option} onOpen={() => setSelectedOption(option)} />
                ))}
              </div>
            </section>

            <section className="panel editorial-block">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">My take</div>
                  <h2>What I would start with today.</h2>
                </div>
              </div>
              <div className="editorial-grid">
                <div>
                  <h3>Default pick</h3>
                  <p>
                    If I wanted the most balanced modern web-app answer right now, I’d probably start with{' '}
                    <strong>Vercel + Supabase</strong>. It has the cleanest mix of frontend ease, auth, database, and
                    “this will still make sense in six months.”
                  </p>
                </div>
                <div>
                  <h3>Best shortcut pick</h3>
                  <p>
                    If I wanted to skip stack churn and just move, I’d lean <strong>Firebase</strong>, while accepting
                    that the convenience comes with more platform gravity.
                  </p>
                </div>
                <div>
                  <h3>What I would avoid for a first build</h3>
                  <p>
                    I would avoid choosing <strong>Cloudflare</strong> first unless I had a specific edge or performance
                    reason. It is powerful, but “powerful” and “least annoying first build” are not the same thing.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {page === 'compare' && (
          <section className="panel compare-panel">
            <div className="section-heading compare-heading compact">
              <div>
                <h1>Compare Features</h1>
              </div>
            </div>

            <div className="controls">
              <label className="search">
                <span>Search</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Vercel, auth, PWA, starter SaaS…"
                />
              </label>

              <div className="control-group">
                <span>Type</span>
                <div className="chip-row">
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      className={filterType === type ? 'chip is-active' : 'chip'}
                      onClick={() => setFilterType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-group">
                <span>Need</span>
                <div className="chip-row wrap">
                  {needOptions.map(([value, label]) => (
                    <button
                      key={value}
                      className={activeNeed === value ? 'chip is-active' : 'chip'}
                      onClick={() => setActiveNeed(activeNeed === value ? null : value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="sort">
                <span>Sort by</span>
                <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                  <option value="overall">Overall score</option>
                  <option value="simplicity">Simplicity</option>
                  <option value="stability">Stability</option>
                  <option value="auth">Auth</option>
                  <option value="payments">Payments</option>
                </select>
              </label>
            </div>

            <div className="table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Type</th>
                    <th>Best for</th>
                    <th>Simplicity</th>
                    <th>Stability</th>
                    <th>Auth</th>
                    <th>Payments</th>
                    <th>Database</th>
                    <th>PWA</th>
                    <th>Pricing</th>
                    <th>Portability</th>
                    <th>Overall</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOptions.map((option) => (
                    <tr key={option.id}>
                      <td>
                        <div className="row-option">
                          <strong><ServiceLinks name={option.name} urls={option.urls} /></strong>
                        </div>
                      </td>
                      <td>
                        <span className="table-badge">{option.type}</span>
                      </td>
                      <td>{option.best_for.slice(0, 2).join(', ')}</td>
                      <td><ScoreChip score={option.scores.simplicity} /></td>
                      <td><ScoreChip score={option.scores.stability} /></td>
                      <td><ScoreChip score={option.scores.auth} /></td>
                      <td><ScoreChip score={option.scores.payments} /></td>
                      <td><ScoreChip score={option.scores.database} /></td>
                      <td><ScoreChip score={option.scores.pwa} /></td>
                      <td><ScoreChip score={option.scores.pricing_clarity} /></td>
                      <td><ScoreChip score={option.scores.lock_in_risk} /></td>
                      <td>
                        <div className="overall-cell">
                          <ScoreChip score={option.overall} />
                        </div>
                      </td>
                      <td>
                        <button className="table-link" onClick={() => setSelectedOption(option)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {page === 'methodology' && (
          <section className="panel methodology-panel">
            <div className="section-heading compact">
              <div>
                <h1>Methodology</h1>
              </div>
            </div>

            <div className="method-grid">
              <article>
                <h2>Why this exists</h2>
                <p>
                  A lot of hosting comparison content is either too shallow to help, or too padded with platform
                  marketing energy to trust. This project tries to stay small, legible, and practical.
                </p>
              </article>
              <article>
                <h2>How scoring works</h2>
                <p>
                  Every scored field uses a 1–5 scale, where higher is better. The overall score is a weighted average
                  tuned for starter usefulness, with extra emphasis on simplicity, stability, auth, database, payments,
                  and PWA fit.
                </p>
              </article>
            </div>

            <section className="weights-panel">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">Weighting</div>
                  <h2>What counts a little more in the overall score.</h2>
                </div>
              </div>
              <div className="weights-grid">
                {Object.entries(weights).map(([key, value]) => (
                  <div key={key} className="weight-card">
                    <span>{scoreLabels[key as ScoreKey]}</span>
                    <strong>{value.toFixed(2)}×</strong>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">Category definitions</div>
                  <h2>What each score is trying to capture.</h2>
                </div>
              </div>
              <div className="definition-grid">
                {(Object.keys(scoreLabels) as ScoreKey[]).map((key) => (
                  <article key={key} className="definition-card">
                    <h3>{scoreLabels[key]}</h3>
                    <p>{scoreDescriptions[key]}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="opinion-fact panel inset-panel">
              <h2>Opinion vs fact</h2>
              <p>
                Some content here is descriptive, and some is intentionally opinionated. Quick picks and “my take” are
                viewpoint sections. Raw dimensions and weighting logic are the more structured side of the project.
              </p>
            </section>
          </section>
        )}
      </main>

      <footer className="site-footer panel">
        <div>
          <strong>Hosty McHostface</strong>
          <p>Data is manually maintained for now. Last updated: 2026-04-16.</p>
        </div>
        <div className="footer-links">
          <button className="text-link" onClick={() => setPage('methodology')}>
            Methodology
          </button>
          <button className="text-link" onClick={() => setPage('compare')}>
            Compare options
          </button>
        </div>
      </footer>

      <aside className={selectedOption ? 'drawer is-open' : 'drawer'}>
        {selectedOption && (
          <>
            <div className="drawer-header">
              <div>
                <div className="eyebrow">{selectedOption.type}</div>
                <h2><ServiceLinks name={selectedOption.name} urls={selectedOption.urls} /></h2>
              </div>
              <button className="close-button" onClick={() => setSelectedOption(null)}>
                Close
              </button>
            </div>

            <div className="drawer-score-row">
              <div>
                <span>Overall</span>
                <strong>{selectedOption.overall.toFixed(1)} / 5</strong>
              </div>
              <div>
                <span>Last reviewed</span>
                <strong>{selectedOption.last_reviewed}</strong>
              </div>
            </div>

            <p className="drawer-summary">{selectedOption.summary}</p>

            <section className="drawer-section">
              <h3>Best for</h3>
              <div className="chip-row wrap">
                {selectedOption.best_for.map((item) => (
                  <span key={item} className="chip static">{item}</span>
                ))}
              </div>
            </section>

            <section className="drawer-section">
              <h3>Score breakdown</h3>
              <div className="score-list">
                {(Object.keys(selectedOption.scores) as ScoreKey[]).map((key) => (
                  <div key={key} className="score-row">
                    <span>{scoreLabels[key]}</span>
                    <ScoreChip score={selectedOption.scores[key]} />
                  </div>
                ))}
              </div>
            </section>

            <section className="drawer-columns">
              <div className="drawer-section">
                <h3>Key pros</h3>
                <ul>
                  {selectedOption.pros.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="drawer-section">
                <h3>Key cons</h3>
                <ul>
                  {selectedOption.cons.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="drawer-columns">
              <div className="drawer-section">
                <h3>Recommended for</h3>
                <ul>
                  {selectedOption.recommended_for.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="drawer-section">
                <h3>Avoid if</h3>
                <ul>
                  {selectedOption.avoid_if.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="drawer-section">
              <h3>Notes</h3>
              <p>{selectedOption.notes}</p>
            </section>

            <section className="drawer-section">
              <h3>Official URLs</h3>
              <ul className="url-list">
                {selectedOption.urls.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </aside>
      {selectedOption && <button className="scrim" aria-label="Close drawer" onClick={() => setSelectedOption(null)} />}
    </div>
  )
}

function QuickPickCard({ label, option, blurb }: { label: string; option: EnrichedOptionItem | undefined; blurb: string }) {
  if (!option) return null

  return (
    <article className="pick-card">
      <div className="pick-label">{label}</div>
      <h3><ServiceLinks name={option.name} urls={option.urls} /></h3>
      <p>{blurb}</p>
      <div className="pick-footer">
        <span className="table-badge">{option.type}</span>
        <span className="overall-badge">{option.overall.toFixed(1)} / 5</span>
      </div>
    </article>
  )
}

function OptionCard({ option, onOpen }: { option: EnrichedOptionItem; onOpen: () => void }) {
  return (
    <article className="option-card">
      <div className="option-card-head">
        <div>
          <span className="table-badge">{option.type}</span>
          <h3><ServiceLinks name={option.name} urls={option.urls} /></h3>
        </div>
        <div className="overall-badge">{option.overall.toFixed(1)}</div>
      </div>
      <p>{option.summary}</p>
      <div className="chip-row wrap static-row">
        {option.best_for.slice(0, 3).map((item) => (
          <span key={item} className="chip static">
            {item}
          </span>
        ))}
      </div>
      <div className="score-chip-row">
        <LabeledScore label="Simple" score={option.scores.simplicity} />
        <LabeledScore label="Auth" score={option.scores.auth} />
        <LabeledScore label="DB" score={option.scores.database} />
      </div>
      <button className="text-link left" onClick={onOpen}>
        View notes →
      </button>
    </article>
  )
}

function ServiceLinks({ name, urls }: { name: string; urls: string[] }) {
  const parts = name.split(' + ')

  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 && <span className="service-separator"> + </span>}
          <a
            className="service-link"
            href={urls[index] ?? urls[0] ?? '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!urls[index] && !urls[0]) event.preventDefault()
            }}
          >
            {part}
          </a>
        </span>
      ))}
    </>
  )
}

function LabeledScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="labeled-score">
      <span>{label}</span>
      <ScoreChip score={score} />
    </div>
  )
}

function ScoreChip({ score }: { score: number }) {
  return <span className={`score-chip ${scoreTone(score)}`}>{score}</span>
}

export default App

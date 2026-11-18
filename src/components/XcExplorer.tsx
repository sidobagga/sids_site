"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, ChevronLeft, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Kind = "runner" | "team" | "race";
type SearchItem = { id: string; type: Kind; name: string; keywords?: string; meta: string; href: string };
type RaceSummary = { id: string; name: string; date: string; count: number };
type Catalog = { stats: { results: number; runners: number; teams: number; races: number }; search: SearchItem[]; recentRaces: RaceSummary[]; recentRoadRaces?: RaceSummary[]; roadRaceIds?: string[] };
type Runner = { id: string; name: string; sex: string; ageLastActive: string; latestClub: string; lastYear: string; clubs: string[]; seasonEstimates: Record<string, string>; results: { year: string; date: string; raceId: string; race: string; time: string; place: string; club: string }[] };
type RoadResult = { raceId: string; race: string; year: string; date: string; course: string; place: string; genderPlace: string; time: string; pacePerMile: string; age: string; source: string };
type Team = { id: string; name: string; club: string; division: string; roster: { runnerId: string; name: string; rating: string; age: string; xcRaceCount: number; roadRaceCount: number; status: string }[] };
type RaceWeather = { highF: number; lowF: number; precipIn: number; venue?: string; source: string };
type Race = { id: string; kind?: "road"; name: string; event: string; year: string; date: string; section: string; sourceUrl: string; distance: string; distanceMeters: string; distanceSource: string; weather?: RaceWeather; results: { place: string; genderPlace?: string; gender?: string; runnerId: string; name: string; time: string; pacePerMile: string; age: string; teamId: string; team: string }[] };

const BASE = "/xc";

const dataCache = new Map<string, Promise<unknown>>();
function loadJson<T>(name: string): Promise<T> {
  if (!dataCache.has(name)) dataCache.set(name, fetch(`/xc-data/${name}.json`).then((r) => { if (!r.ok) throw new Error(name); return r.json(); }));
  return dataCache.get(name) as Promise<T>;
}
function formatDate(value: string) {
  if (!value || value.length === 4) return value || "—";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatWeather(weather: RaceWeather) {
  const rain = weather.precipIn > 0 ? `${weather.precipIn.toFixed(weather.precipIn < 0.1 ? 2 : 1)} in rain` : "dry";
  return `${weather.highF}° / ${weather.lowF}° · ${rain}`;
}

function SearchBox({ catalog, hero = false }: { catalog: Catalog | null; hero?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !catalog) return [];
    const words = q.split(/\s+/);
    return catalog.search.filter((item) => words.every((word) => `${item.name} ${item.keywords || ""} ${item.meta}`.toLowerCase().includes(word))).sort((a, b) => Number(a.name.toLowerCase().startsWith(q)) < Number(b.name.toLowerCase().startsWith(q)) ? 1 : -1).slice(0, 10);
  }, [query, catalog]);
  function go(item: SearchItem) { setFocused(false); setQuery(""); router.push(item.href); }
  return <div className={`search-shell ${hero ? "search-hero" : ""}`}>
    <Search aria-hidden="true" size={hero ? 22 : 18} />
    <input aria-label="Search runners, teams, and races" placeholder="Search a runner, club, or race…" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onKeyDown={(e) => { if (e.key === "Enter" && results[0]) go(results[0]); }} />
    {focused && query && <div className="search-results">{results.length ? results.map((item) => <button key={`${item.type}-${item.id}`} onMouseDown={() => go(item)}><span className={`result-kind ${item.type}`}>{item.type}</span><span><strong>{item.name}</strong><small>{item.meta}</small></span><ArrowRight size={16} /></button>) : <p>No matching runners, teams, or races.</p>}</div>}
  </div>;
}
function Header({ catalog }: { catalog: Catalog | null }) {
  return <header className="site-header"><Link href={BASE} className="brand">PAUSATF Results Archives</Link><div className="header-search"><SearchBox catalog={catalog} /></div><nav><Link href={BASE}>Home</Link></nav></header>;
}
function Loading() { return <div className="loading"><span /><p>Loading the archive…</p></div>; }

type Discipline = "xc" | "road";
function DisciplineToggle({ value, onChange }: { value: Discipline; onChange: (value: Discipline) => void }) {
  return <div className="discipline-toggle" role="group" aria-label="Result discipline"><button type="button" className={value === "xc" ? "active" : ""} aria-pressed={value === "xc"} onClick={() => onChange("xc")}>Cross country</button><button type="button" className={value === "road" ? "active" : ""} aria-pressed={value === "road"} onClick={() => onChange("road")}>Road</button></div>;
}

function Home({ catalog }: { catalog: Catalog | null }) {
  const [discipline, setDiscipline] = useState<Discipline>("xc");
  if (!catalog) return <Loading />;
  const stats = [[catalog.stats.results, "results"],[catalog.stats.runners, "runners"],[catalog.stats.teams, "teams"],[catalog.stats.races, "race fields"]] as const;
  const recent = discipline === "road" ? catalog.recentRoadRaces || [] : catalog.recentRaces;
  return <><section className="hero"><p className="eyebrow">Pacific Association results archive</p><h1>PAUSATF Results Archives</h1><p className="hero-copy">Search runners, clubs, teams, and races.</p><SearchBox catalog={catalog} hero /><div className="quick-links"><span>Examples:</span><Link href={`${BASE}/runners/5361299`}>Alex Varner</Link><Link href={`${BASE}/teams/263973`}>West Valley TC Open Men</Link></div></section>
    <section className="stats-band">{stats.map(([value, label]) => <div key={label}><strong>{value.toLocaleString()}</strong> <span>{label}</span></div>)}</section>
    <section className="content-section"><div className="section-heading"><div><h2>Recent {discipline === "road" ? "road races" : "cross country fields"}</h2></div><DisciplineToggle value={discipline} onChange={setDiscipline} /></div><div className="race-grid">{recent.map((race) => <Link className="race-card" href={`${BASE}/races/${race.id}`} key={race.id}><span>{formatDate(race.date)}</span><h3>{race.name}</h3><p>{race.count} results</p><ArrowRight size={14}/></Link>)}</div><p className="update-note">Last updated November 16, 2026 at 11:58 AM — Deduplicate club names with USATF records.</p></section></>;
}
function PageHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: React.ReactNode }) { return <div className="entity-header"><Link href={BASE} className="back"><ChevronLeft size={14}/>Back to archive</Link><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><div className="entity-meta">{meta}</div></div>; }

function RunnerPage({ runner, roadResults }: { runner: Runner; roadResults: RoadResult[] }) {
  const [showEstimates, setShowEstimates] = useState(false);
  const xcSeasons = runner.results.reduce<Record<string, Runner["results"]>>((out, result) => { (out[result.year] ||= []).push(result); return out; }, {});
  const roadSeasons = roadResults.reduce<Record<string, RoadResult[]>>((out, result) => { (out[result.year] ||= []).push(result); return out; }, {});
  const years = [...new Set([...Object.keys(xcSeasons), ...Object.keys(roadSeasons)])].sort((a, b) => b.localeCompare(a));
  return <div className="entity-page"><PageHeader eyebrow="Runner profile" title={runner.name} meta={<><span>Latest club {runner.latestClub || "Unattached"}</span><span>Age last active {runner.ageLastActive || "—"}</span><span>Last result {runner.lastYear}</span><span>{runner.results.length} XC races</span><span>{roadResults.length} road races</span></>} /><div className="runner-controls"><button className="archive-button" type="button" aria-pressed={showEstimates} onClick={() => setShowEstimates((visible) => !visible)}>Toggle 5K equivalences</button></div><div className="season-stack">{years.map((year) => { const xc = xcSeasons[year] || []; const road = roadSeasons[year] || []; return <section className="table-card season-card" key={year}><div className="table-title"><h2>{year} season</h2><span>{showEstimates && runner.seasonEstimates?.[year] && <>Peak track 5K equivalent <strong>{runner.seasonEstimates[year]}</strong> · </>}{xc.length} XC · {road.length} road</span></div>{xc.length > 0 && <div className="discipline-section"><div className="discipline-title"><h3>Cross country</h3><span>{xc.length} {xc.length === 1 ? "race" : "races"}</span></div><div className="table-scroll"><table><thead><tr><th>Time</th><th>Place</th><th>Date</th><th>Race</th><th>Club</th></tr></thead><tbody>{xc.map((r, i) => <tr key={`${r.raceId}-${i}`}><td className="time">{r.time || "—"}</td><td>{r.place || "—"}</td><td>{formatDate(r.date)}</td><td><Link href={`${BASE}/races/${r.raceId}`}>{r.race}</Link></td><td>{r.club || "Unattached"}</td></tr>)}</tbody></table></div></div>}{road.length > 0 && <div className="discipline-section"><div className="discipline-title"><h3>Road</h3><span>{road.length} {road.length === 1 ? "race" : "races"}</span></div><div className="table-scroll"><table><thead><tr><th>Time</th><th>Place</th><th>Date</th><th>Race</th><th>Pace / mi</th><th>Course</th></tr></thead><tbody>{road.map((result, index) => <tr key={`${result.raceId}-${index}`}><td className="time">{result.time || "—"}</td><td>{result.place || "—"}</td><td>{formatDate(result.date)}</td><td><Link href={`${BASE}/races/${result.raceId}`}>{result.race}</Link></td><td className="time">{result.pacePerMile || "—"}</td><td>{result.course || "—"}</td></tr>)}</tbody></table></div></div>}</section>; })}</div></div>;
}
type TeamSortKey = "name" | "rating" | "age" | "xcRaceCount" | "roadRaceCount" | "status";
function TeamPage({ team }: { team: Team }) {
  const [discipline, setDiscipline] = useState<Discipline>("xc");
  const [sort, setSort] = useState<{ key: TeamSortKey; direction: "asc" | "desc" }>({ key: "name", direction: "asc" });
  const roster = useMemo(() => team.roster.filter((runner) => discipline === "xc" || runner.roadRaceCount > 0).sort((a, b) => {
    const numeric = sort.key === "age" || sort.key === "xcRaceCount" || sort.key === "roadRaceCount" || sort.key === "status";
    const left = numeric ? Number.parseInt(String(a[sort.key]), 10) || -1 : String(a[sort.key]).toLowerCase();
    const right = numeric ? Number.parseInt(String(b[sort.key]), 10) || -1 : String(b[sort.key]).toLowerCase();
    const comparison = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return (comparison || a.name.localeCompare(b.name)) * (sort.direction === "asc" ? 1 : -1);
  }), [team.roster, discipline, sort]);
  function toggleSort(key: TeamSortKey) {
    setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: key === "name" ? "asc" : "desc" });
  }
  function heading(key: TeamSortKey, label: string) {
    const active = sort.key === key;
    return <button className={`sort-button${active ? " active" : ""}`} type="button" onClick={() => toggleSort(key)} aria-label={`Sort by ${label}, ${active && sort.direction === "asc" ? "descending" : "ascending"}`}>{label}<span aria-hidden="true">{active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
  }
  return <div className="entity-page"><PageHeader eyebrow="Team profile" title={team.name} meta={<span>{team.division}</span>} /><section className="table-card"><div className="table-title"><h2>{discipline === "road" ? "Road results for roster" : "Roster"}</h2><span>{roster.length} archive entries · click a column to sort</span></div><div className="table-controls"><DisciplineToggle value={discipline} onChange={setDiscipline} /></div><div className="table-scroll"><table><thead><tr><th aria-sort={sort.key === "name" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("name", "Name")}</th><th aria-sort={sort.key === "rating" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("rating", "Rating")}</th><th aria-sort={sort.key === "xcRaceCount" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("xcRaceCount", "XC races")}</th><th aria-sort={sort.key === "roadRaceCount" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("roadRaceCount", "Road races")}</th><th aria-sort={sort.key === "status" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("status", "Season last active")}</th><th aria-sort={sort.key === "age" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("age", "Age last active")}</th></tr></thead><tbody>{roster.map((r) => <tr key={r.runnerId}><td><Link href={`${BASE}/runners/${r.runnerId}`}>{r.name}</Link></td><td aria-label="Rating not yet calculated"></td><td>{r.xcRaceCount}</td><td>{r.roadRaceCount}</td><td><span className="status">{r.status}</span></td><td>{r.age || "—"}</td></tr>)}</tbody></table></div></section></div>;
}
function RacePage({ race }: { race: Race }) {
  const road = race.kind === "road";
  return <div className="entity-page"><PageHeader eyebrow={road ? "Road race results" : "Race results"} title={race.name} meta={<><span>{formatDate(race.date)}</span><span>Distance {race.distance || "Not recorded"}</span><span>{race.results.length} results</span>{race.weather && <span className="weather-meta" title={`${race.weather.source}${race.weather.venue ? ` · ${race.weather.venue}` : ""}`}>Weather {formatWeather(race.weather)}</span>}</>} />{race.sourceUrl && <a className="source-link" href={race.sourceUrl} target="_blank" rel="noreferrer"><span><small>Official race record</small><strong>{road ? "View original results" : "View original PAUSATF results"}</strong></span><ExternalLink size={20} aria-hidden="true" /></a>}<section className="table-card"><div className="table-title"><h2>Individual results</h2><span>{race.section}{race.distance ? ` · ${race.distance}` : ""}</span></div><div className="table-scroll"><table><thead><tr><th>{road ? "Overall" : "Place"}</th>{road && <th>Gender place</th>}<th>Name</th>{road && <th>Gender</th>}<th>Time</th><th>Pace / mi</th><th>Age</th>{!road && <th>Team</th>}</tr></thead><tbody>{race.results.map((r, i) => <tr key={`${r.runnerId || r.name}-${i}`}><td className="place">{r.place || "—"}</td>{road && <td>{r.genderPlace || "—"}</td>}<td>{r.runnerId ? <Link href={`${BASE}/runners/${r.runnerId}`}>{r.name}</Link> : r.name}</td>{road && <td>{r.gender || "—"}</td>}<td className="time">{r.time || "—"}</td><td className="time">{r.pacePerMile || "—"}</td><td>{r.age || "—"}</td>{!road && <td>{r.teamId ? <Link href={`${BASE}/teams/${r.teamId}`}>{r.team}</Link> : "—"}</td>}</tr>)}</tbody></table></div><p className="table-note">Pace per mile is calculated from the recorded race distance.</p></section></div>;
}

export default function Explorer({ initialRoute }: { initialRoute?: { type: Kind; id: string } }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null); const [entity, setEntity] = useState<Runner | Team | Race | null>(null); const [roadResults, setRoadResults] = useState<RoadResult[]>([]); const [error, setError] = useState("");
  const routeType = initialRoute?.type; const routeId = initialRoute?.id;
  useEffect(() => { loadJson<Catalog>("catalog").then(setCatalog).catch(() => setError("The search index could not be loaded.")); }, []);
  useEffect(() => { if (!routeType || !routeId) return; if (routeType === "race") { loadJson<Catalog>("catalog").then((index) => index.roadRaceIds?.includes(routeId) ? fetch(`/xc-data/road-races/${routeId}.json`).then((response) => { if (!response.ok) throw new Error(routeId); return response.json() as Promise<Race>; }).then(setEntity) : loadJson<Record<string, Race>>("races").then((data) => { const found = data[routeId]; if (!found) throw new Error(routeId); setEntity(found); })).catch(() => setError("That archive page could not be found.")); return; } const file = routeType === "runner" ? "runners" : "teams"; loadJson<Record<string, Runner | Team>>(file).then((data) => { const found = data[routeId]; if (!found) setError("That archive page could not be found."); else setEntity(found); }).catch(() => setError("The archive data could not be loaded.")); }, [routeType, routeId]);
  useEffect(() => { if (routeType !== "runner" || !routeId) return; loadJson<Record<string, RoadResult[]>>("road_results").then((data) => setRoadResults(data[routeId] || [])).catch(() => setRoadResults([])); }, [routeType, routeId]);
  return <div className="site-shell not-prose"><Header catalog={catalog}/>{error ? <div className="error-state"><h1>Page unavailable</h1><p>{error}</p><Link href={BASE}>Return to search</Link></div> : !routeType ? <Home catalog={catalog}/> : !entity ? <Loading/> : routeType === "runner" ? <RunnerPage runner={entity as Runner} roadResults={roadResults}/> : routeType === "team" ? <TeamPage team={entity as Team}/> : <RacePage race={entity as Race}/>}<footer><span>PAUSATF Results Archives</span></footer></div>;
}

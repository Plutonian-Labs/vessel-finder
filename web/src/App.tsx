import { useMemo, useState } from 'react';
import MapView, { type LayerName, type VisibleLayers } from './MapView';
import { ports, satellites, teleports, vessels } from './data';

const layerDefinitions: { id: LayerName; label: string; count: number }[] = [
  { id: 'vessels', label: 'Vessels', count: vessels.length },
  { id: 'ports', label: 'Ports', count: ports.length },
  { id: 'teleports', label: 'Teleports', count: teleports.length },
  { id: 'satellites', label: 'Satellite coverage', count: satellites.length }
];
const defaults: VisibleLayers = { vessels: true, ports: true, teleports: false, satellites: false };

export default function App() {
  const [visible, setVisible] = useState(defaults);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const matches = useMemo(() => vessels.filter(v => [v.name,v.mmsi,v.destination].some(x => x.toLowerCase().includes(query.toLowerCase().trim()))), [query]);
  const selected = vessels.find(v => v.id === selectedId);
  return <div className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">◈</span><div><strong>VESSEL FINDER</strong><small>MARITIME INTELLIGENCE</small></div></div><span className="studio">PLUTONIAN LABS</span></header>
    <div className="workspace">
      <aside className="sidebar">
        <div className="section-heading"><span>Operations map</span><span className="pill">DEMO MODE</span></div>
        <h1>Track the world.<br/><em>Understand the network.</em></h1>
        <p className="intro">Explore vessels, ports, teleports and satellite coverage in one workspace.</p>
        <label className="field-label" htmlFor="ship-search">Search demonstration vessels</label>
        <input id="ship-search" className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Vessel name, MMSI, destination" />
        <h2>Map layers</h2>
        <div className="layer-list">
          {layerDefinitions.map(item => <label className="layer-row" key={item.id}>
            <span><input type="checkbox" checked={visible[item.id]} onChange={e=>setVisible(v=>({...v,[item.id]:e.target.checked}))}/>{item.label}</span>
            <span className="count">{item.count}</span>
          </label>)}
        </div>
        <div className="list-heading"><h2>Vessels</h2><span>{matches.length} shown</span></div>
        <div className="vessel-list">{matches.length ? matches.map(v=><button type="button" key={v.id} className={`vessel-row ${selectedId===v.id?'selected':''}`} onClick={()=>{setSelectedId(v.id);setVisible(x=>({...x,vessels:true}));}}>
          <span><strong>{v.name}</strong><small>{v.mmsi} · {v.speedKnots} kn</small></span><span aria-hidden="true">›</span>
        </button>) : <p className="empty">No demonstration vessels match that search.</p>}</div>
        {selected && <section className="selected-detail"><h2>{selected.name}</h2><p>{selected.status} · {selected.heading}° heading</p><p>Destination: {selected.destination}</p><small>Simulated position, not a current AIS report.</small></section>}
        <div className="sidebar-footer">Prototype v0.1 · No live AIS connection</div>
      </aside>
      <main className="map-panel"><MapView visible={visible} selectedId={selectedId} onSelect={setSelectedId}/><div className="map-notice"><span className="notice-dot"/> SIMULATED VESSEL POSITIONS <span className="notice-separator">·</span> COVERAGE SCHEMATIC ONLY</div></main>
    </div>
  </div>;
}

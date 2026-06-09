import React from 'react';
import { Play, Cpu, TrendingUp, HelpCircle } from 'lucide-react';

export default function Sidebar({
  n, setN,
  hType, setHType,
  customHEdges, setCustomHEdges,
  playerConstructor, setPlayerConstructor,
  playerPainter, setPlayerPainter,
  constructorStrategy, setConstructorStrategy,
  painterStrategy, setPainterStrategy,
  presets,
  handleStartGame,
  handleRunSimulation,
  numRuns, setNumRuns,
  loading,
  constructorOptions = [],
  painterOptions = []
}) {
  return (
    <section className="sidebar">
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="panel-title">
          <TrendingUp size={18} color="#6366f1" />
          <span>Konfiguracja Gry</span>
        </div>

        <div className="control-group">
          <div className="form-field">
            <label>Liczba wierzchołków (n)</label>
            <select value={n} onChange={(e) => setN(parseInt(e.target.value))}>
              {[3,4,5,6,7,8,9,10,11,12].map(val => (
                <option key={val} value={val}>{val} (Klika K{val} ma {val * (val-1)/2} krawędzi)</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Graf Celu (H)</label>
            <select value={hType} onChange={(e) => setHType(e.target.value)}>
              {Object.entries(presets).map(([key, preset]) => (
                <option key={key} value={key}>{preset.name}</option>
              ))}
              <option value="custom">Własne krawędzie...</option>
            </select>
          </div>

          {hType === 'custom' && (
            <div className="form-field custom-h-input-wrapper animate-scale-in">
              <label>Definicja krawędzi H (np. 0-1, 1-2, 2-0)</label>
              <input
                type="text"
                value={customHEdges}
                onChange={(e) => setCustomHEdges(e.target.value)}
                placeholder="np. 0-1, 1-2, 2-3"
              />
              <div className="custom-h-desc">Wprowadź krawędzie jako pary wierzchołków oddzielone myślnikami, rozdzielone przecinkami.</div>
            </div>
          )}

          <div className="form-field">
            <label>Konstruktor (Rysuje)</label>
            <select value={playerConstructor} onChange={(e) => setPlayerConstructor(e.target.value)}>
              <option value="human">Człowiek (Gracz)</option>
              <option value="computer">Komputer (AI)</option>
            </select>
          </div>

          <div className="form-field">
            <label>Malarz (Koloruje)</label>
            <select value={playerPainter} onChange={(e) => setPlayerPainter(e.target.value)}>
              <option value="human">Człowiek (Gracz)</option>
              <option value="computer">Komputer (AI)</option>
            </select>
          </div>

          {(playerConstructor === 'computer' || playerPainter === 'computer') && (
            <>
              {playerConstructor === 'computer' && (
                <div className="form-field animate-scale-in">
                  <label>Strategia Konstruktora (AI)</label>
                  <select value={constructorStrategy} onChange={(e) => setConstructorStrategy(e.target.value)}>
                    {constructorOptions && constructorOptions.length > 0 ? (
                      constructorOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)
                    ) : (
                      <>
                      <option value="maximin-threat">Maximin — maksymalizacja zagrożenia</option>
                        <option value="random">Ruchy Losowe (Słaba)</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {playerPainter === 'computer' && (
                <div className="form-field animate-scale-in">
                  <label>Strategia Malarza (AI)</label>
                  <select value={painterStrategy} onChange={(e) => setPainterStrategy(e.target.value)}>
                    {painterOptions && painterOptions.length > 0 ? (
                      painterOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)
                    ) : (
                      <>
                      <option value="min-threat">Min — redukcja zagrożenia</option>
                        <option value="random">Kolorowanie Losowe (Słaba)</option>
                      </>
                    )}
                  </select>
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleStartGame} disabled={loading}>
              <Play size={16} /> Rozpocznij Grę
            </button>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

            <div className="form-field" style={{ marginBottom: '0.5rem' }}>
              <label>Liczba symulacji (komputer vs komputer)</label>
              <input type="number" min="1" max="200" value={numRuns} onChange={(e) => setNumRuns(parseInt(e.target.value) || 10)} />
            </div>

            <button className="btn btn-secondary" onClick={handleRunSimulation} disabled={loading}>
              <Cpu size={16} /> Uruchom Symulację
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel rules-card">
        <div className="panel-title" style={{ fontSize: '1rem' }}>
          <HelpCircle size={16} color="#6366f1" />
          <span>Zasady Gry</span>
        </div>
        <ul className="rules-list">
          <li>Gra toczy się na pełnym grafie o <strong>n</strong> wierzchołkach, startując bez krawędzi.</li>
          <li>W każdej turze <strong>Konstruktor</strong> wybiera i rysuje nową krawędź.</li>
          <li>Następnie <strong>Malarz</strong> wybiera dla niej jeden z 2 kolorów: <strong style={{color: 'var(--color-red)'}}>Czerwony</strong> lub <strong style={{color: 'var(--color-blue)'}}>Niebieski</strong>.</li>
          <li><strong>Konstruktor</strong> dąży do utworzenia monochromatycznego podgrafu izomorficznego z <strong>H</strong>.</li>
          <li><strong>Malarz</strong> dąży do zablokowania powstania takiego podgrafu aż do momentu, gdy wszystkie krawędzie zostaną pokolorowane.</li>
        </ul>
      </div>
    </section>
  );
}

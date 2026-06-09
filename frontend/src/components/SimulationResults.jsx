import React, { useState } from 'react';
import { Cpu, List, Info } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

export default function SimulationResults({ simResult, selectedRun, setSelectedRun }) {
  const [showAll, setShowAll] = useState(false);
  if (!simResult) return null;

  const listToShow = showAll ? (simResult.full_runs_log || []) : (simResult.runs_log || []);

  return (
    <div className="animate-scale-in">
      <div className="glass-panel info-banner finished-turn" style={{ background: 'rgba(99, 102, 241, 0.1)', borderLeft: '4px solid var(--accent)', borderColor: 'rgba(99, 102, 241, 0.25)' }}>
        <div>
          <div className="turn-title" style={{ color: 'var(--color-text-primary)' }}>
            <Cpu size={18} color="var(--accent)" />
            Wyniki Symulacji Komputer vs Komputer
          </div>
          <div className="turn-desc">Przeprowadzono {simResult.num_runs} gier testowych dla n={simResult.n}.</div>
        </div>
      </div>

      <div className="sim-stats-grid" style={{ marginTop: '1rem' }}>
        <div className="glass-panel stat-item">
          <span className="stat-lbl">Wygrane Konstruktora</span>
          <span className="stat-val constructor">{simResult.constructor_wins}</span>
          <span className="stat-lbl">Win Rate: {(simResult.constructor_win_rate * 100).toFixed(1)}%</span>
          <div className="stat-progress-bar">
            <div className="stat-progress" style={{ width: `${simResult.constructor_win_rate * 100}%` }}></div>
          </div>
        </div>

        <div className="glass-panel stat-item">
          <span className="stat-lbl">Wygrane Malarza</span>
          <span className="stat-val painter">{simResult.painter_wins}</span>
          <span className="stat-lbl">Win Rate: {(simResult.painter_win_rate * 100).toFixed(1)}%</span>
          <div className="stat-progress-bar">
            <div className="stat-progress painter" style={{ width: `${simResult.painter_win_rate * 100}%` }}></div>
          </div>
        </div>

        <div className="glass-panel stat-item">
          <span className="stat-lbl">Średnia liczba tur</span>
          <span className="stat-val" style={{ color: '#f59e0b' }}>{simResult.avg_turns.toFixed(1)}</span>
          <span className="stat-lbl">Maksymalnie: {simResult.n * (simResult.n - 1) / 2}</span>
        </div>
      </div>

      <div className="glass-panel sim-results-card">
        <h3 className="panel-title">
          <List size={18} color="#6366f1" />
          <span>Historia Gier Symulacji</span>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setShowAll(!showAll)}>
              {showAll ? `Pokaż tylko pierwsze 5` : `Pokaż wszystkie (${simResult.num_runs})`}
            </button>
          </div>
        </h3>

        <div className="sim-runs-list">
          {listToShow && listToShow.map((run) => (
            <div
              key={`run-${run.run_index}`}
              className={`sim-run-row ${selectedRun && selectedRun.run_index === run.run_index ? 'active-row' : ''}`}
              onClick={() => setSelectedRun(run)}
            >
              <div className="run-info-left">
                <span className="detail-move-num">Gra #{run.run_index}</span>
                <span className={`run-badge ${run.winner}`}>{run.winner === 'constructor' ? 'Konstruktor' : 'Malarz'}</span>
              </div>
              <div className="run-meta">Rozegrano tur: <strong>{run.turns}</strong>
                <ChevronRight size={16} style={{ marginLeft: '0.5rem', verticalAlign: 'middle', display: 'inline-block' }} />
              </div>
            </div>
          ))}
        </div>

        {selectedRun && (
          <div className="run-detail-panel animate-scale-in">
            <div className="run-detail-header">
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Szczegóły gry #{selectedRun.run_index}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Zwycięzca: <strong style={{ textTransform: 'capitalize' }}>{selectedRun.winner === 'constructor' ? 'Konstruktor' : 'Malarz'}</strong>
                  {selectedRun.winning_color && ` (Kolor: ${selectedRun.winning_color === 'red' ? 'Czerwony' : 'Niebieski'})`}
                </span>
              </div>
              <span className="run-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)' }}>{selectedRun.moves.length} ruchów</span>
            </div>

            <div className="detail-moves-list">
              {selectedRun.moves.map((move, mIdx) => (
                <div key={`move-${mIdx}`} className="detail-move-card">
                  <span className="detail-move-num">Ruch #{mIdx + 1}</span>
                  <div className="detail-move-val">
                    <span>{move.u} &mdash; {move.v}</span>
                    <div className={`detail-color-dot ${move.color}`}></div>
                  </div>
                </div>
              ))}
            </div>

            {selectedRun.winning_subgraph && (
              <div className="winning-highlight-box" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                <Info size={14} />
                <span>Monochromatyczna kopia H powstała na krawędziach: <strong>{selectedRun.winning_subgraph.map(e => `(${e[0]},${e[1]})`).join(', ')}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

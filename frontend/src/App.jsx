import { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  HelpCircle, 
  Award, 
  User, 
  Cpu, 
  Layers, 
  TrendingUp, 
  List, 
  AlertCircle, 
  Info,
  ChevronRight
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  // Config state
  const [n, setN] = useState(6);
  const [hType, setHType] = useState('triangle');
  const [customHEdges, setCustomHEdges] = useState('0-1, 1-2, 2-0');
  const [playerConstructor, setPlayerConstructor] = useState('human');
  const [playerPainter, setPlayerPainter] = useState('computer');
  const [constructorStrategy, setConstructorStrategy] = useState('heuristic');
  const [painterStrategy, setPainterStrategy] = useState('heuristic');
  
  // Game & presets state
  const [presets, setPresets] = useState({});
  const [gameState, setGameState] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Simulation state
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [numRuns, setNumRuns] = useState(20);
  const [simResult, setSimResult] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  // Fetch presets on load
  useEffect(() => {
    fetch(`${API_BASE}/presets`)
      .then(res => {
        if (!res.ok) throw new Error("Błąd pobierania konfiguracji z serwera");
        return res.json();
      })
      .then(data => {
        setPresets(data);
        const keys = Object.keys(data);
        if (keys.length > 0 && !keys.includes(hType) && hType !== 'custom') {
          setHType(keys[0]);
        }
      })
      .catch(err => {
        console.error("Backend error: presets fetching failed", err);
        setError("Brak połączenia z serwerem. Uruchom backend, aby załadować grafy celu H.");
      });
  }, []);

  const getHDetails = () => {
    if (hType === 'custom') {
      const parsedEdges = parseCustomEdges(customHEdges);
      const uniqueVertices = Array.from(new Set(parsedEdges.flat()));
      return {
        name: "Graf Własny H",
        vertices: uniqueVertices,
        edges: parsedEdges,
        description: `Niestandardowy graf H z ${uniqueVertices.length} wierzchołkami i ${parsedEdges.length} krawędziami`
      };
    }
    return presets[hType] || { name: "", vertices: [], edges: [], description: "" };
  };

  const parseCustomEdges = (text) => {
    try {
      const tokens = text.split(/[,\s]+/);
      const parsed = [];
      for (let token of tokens) {
        if (!token.trim()) continue;
        const parts = token.split(/[-_:]/);
        if (parts.length === 2) {
          const u = parseInt(parts[0].trim());
          const v = parseInt(parts[1].trim());
          if (!isNaN(u) && !isNaN(v)) {
            parsed.push([u, v]);
          }
        }
      }
      return parsed;
    } catch (e) {
      return [];
    }
  };

  const handleStartGame = async () => {
    setError(null);
    setLoading(true);
    setIsSimulationMode(false);
    setSelectedNode(null);
    
    const hDetails = getHDetails();
    if (hDetails.edges.length === 0) {
      setError("Niepoprawne krawędzie dla grafu H");
      setLoading(false);
      return;
    }

    const maxHNode = Math.max(...hDetails.edges.flat(), -1);
    if (maxHNode >= n) {
      setError(`Indeks wierzchołka grafu H (${maxHNode}) nie może być większy lub równy liczbie wierzchołków n (${n})`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/start_game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n,
          h_type: hType,
          h_edges: hType === 'custom' ? hDetails.edges : null,
          player_constructor: playerConstructor,
          player_painter: playerPainter,
          constructor_strategy: constructorStrategy,
          painter_strategy: painterStrategy
        })
      });
      if (!response.ok) throw new Error("Nie udało się rozpocząć gry");
      const data = await response.json();
      setGameState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    setError(null);
    setLoading(true);
    setIsSimulationMode(true);
    setGameState(null);
    setSelectedRun(null);

    const hDetails = getHDetails();
    if (hDetails.edges.length === 0) {
      setError("Niepoprawne krawędzie dla grafu H");
      setLoading(false);
      return;
    }

    const maxHNode = Math.max(...hDetails.edges.flat(), -1);
    if (maxHNode >= n) {
      setError(`Indeks wierzchołka grafu H (${maxHNode}) nie może być większy lub równy liczbie wierzchołków n (${n})`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n,
          h_type: hType,
          h_edges: hType === 'custom' ? hDetails.edges : null,
          constructor_strategy: constructorStrategy,
          painter_strategy: painterStrategy,
          num_runs: numRuns
        })
      });
      if (!response.ok) throw new Error("Nie udało się uruchomić symulacji");
      const data = await response.json();
      setSimResult(data);
      if (data.runs_log && data.runs_log.length > 0) {
        setSelectedRun(data.runs_log[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (nodeIndex) => {
    if (!gameState || gameState.status !== 'active' || gameState.turn !== 'constructor') return;
    if (gameState.player_constructor !== 'human') return;

    if (selectedNode === null) {
      setSelectedNode(nodeIndex);
    } else {
      if (selectedNode === nodeIndex) {
        setSelectedNode(null); // Deselect
      } else {
        // Draw edge
        submitConstructorMove(selectedNode, nodeIndex);
        setSelectedNode(null);
      }
    }
  };

  const handleEdgeClick = (u, v) => {
    if (!gameState || gameState.status !== 'active' || gameState.turn !== 'constructor') return;
    if (gameState.player_constructor !== 'human') return;
    submitConstructorMove(u, v);
  };

  const submitConstructorMove = async (u, v) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/constructor_move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameState.game_id,
          u,
          v
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Błąd przy ruchu Konstruktora");
      }
      const data = await response.json();
      setGameState(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleColorMove = async (color) => {
    if (!gameState || gameState.status !== 'active' || gameState.turn !== 'painter') return;
    if (gameState.player_painter !== 'human') return;

    setError(null);
    try {
      const response = await fetch(`${API_BASE}/painter_move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameState.game_id,
          color
        })
      });
      if (!response.ok) throw new Error("Błąd przy kolorowaniu");
      const data = await response.json();
      setGameState(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // SVG Coordinates Helpers
  const getNodeCoordinates = (index, total) => {
    const cx = 250;
    const cy = 250;
    const radius = 180;
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  };

  const getMiniNodeCoordinates = (index, total) => {
    const cx = 60;
    const cy = 60;
    const radius = 40;
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  };

  // Generate all possible pairs of edges
  const getAllPossibleEdges = (num) => {
    const list = [];
    for (let i = 0; i < num; i++) {
      for (let j = i + 1; j < num; j++) {
        list.push({ u: i, v: j });
      }
    }
    return list;
  };

  // Check if edge is winning
  const isEdgeInWinningSubgraph = (u, v) => {
    if (!gameState || !gameState.winning_subgraph) return false;
    return gameState.winning_subgraph.some(
      ([wu, wv]) => (wu === u && wv === v) || (wu === v && wv === u)
    );
  };

  // Check if node is part of winning subgraph
  const isNodeInWinningSubgraph = (nodeIndex) => {
    if (!gameState || !gameState.winning_subgraph) return false;
    return gameState.winning_subgraph.flat().includes(nodeIndex);
  };

  const renderSVGBoard = () => {
    const totalNodes = gameState ? gameState.n : n;
    const activeEdges = gameState ? gameState.edges : [];

    const allPossible = getAllPossibleEdges(totalNodes);

    return (
      <svg className="svg-wrapper" viewBox="0 0 500 500">
        {/* Render potential undrawn edges */}
        {gameState && gameState.status === 'active' && gameState.turn === 'constructor' && gameState.player_constructor === 'human' && 
          allPossible.map(({ u, v }) => {
            const isDrawn = activeEdges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
            if (isDrawn) return null;
            
            const start = getNodeCoordinates(u, totalNodes);
            const end = getNodeCoordinates(v, totalNodes);
            
            const isHighlight = selectedNode === u || selectedNode === v;

            return (
              <line
                key={`potential-${u}-${v}`}
                className="edge edge-potential"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                onClick={() => handleEdgeClick(u, v)}
                style={{
                  stroke: isHighlight ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                  strokeWidth: isHighlight ? '3px' : '2px'
                }}
              />
            );
          })
        }

        {/* Render colored edges */}
        {activeEdges.map((edge, index) => {
          const start = getNodeCoordinates(edge.u, totalNodes);
          const end = getNodeCoordinates(edge.v, totalNodes);

          if (edge.color === null) {
            // Last drawn edge but not colored yet
            return (
              <line
                key={`draft-${edge.u}-${edge.v}`}
                className="edge edge-draft"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
              />
            );
          }

          const isWin = isEdgeInWinningSubgraph(edge.u, edge.v);
          const edgeClass = isWin 
            ? (edge.color === 'red' ? 'edge-winning-red' : 'edge-winning-blue')
            : (edge.color === 'red' ? 'edge-red' : 'edge-blue');

          return (
            <line
              key={`edge-${index}`}
              className={`edge ${edgeClass}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}

        {/* Render nodes */}
        {Array.from({ length: totalNodes }).map((_, index) => {
          const coords = getNodeCoordinates(index, totalNodes);
          const isSelected = selectedNode === index;
          const isWinning = isNodeInWinningSubgraph(index);
          let nodeClass = "node";
          if (isSelected) nodeClass += " selected";
          if (isWinning) nodeClass += " winning";

          return (
            <g 
              key={`node-${index}`} 
              className={nodeClass}
              onClick={() => handleNodeClick(index)}
            >
              <circle cx={coords.x} cy={coords.y} r="18" />
              <text className="node-text" x={coords.x} y={coords.y}>
                {index}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Render Mini Preview of H
  const renderHPreview = () => {
    const hDetails = getHDetails();
    if (!hDetails || hDetails.edges.length === 0) {
      return <div className="custom-h-desc text-center">Brak grafu H</div>;
    }

    // Map the unique nodes of H to indices 0..m-1
    const hUniqueNodes = Array.from(new Set(hDetails.edges.flat())).sort((a, b) => a - b);
    const nodeMap = {};
    hUniqueNodes.forEach((node, idx) => {
      nodeMap[node] = idx;
    });

    const m = hUniqueNodes.length;

    return (
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Edges */}
        {hDetails.edges.map(([u, v], index) => {
          const uIdx = nodeMap[u];
          const vIdx = nodeMap[v];
          const start = getMiniNodeCoordinates(uIdx, m);
          const end = getMiniNodeCoordinates(vIdx, m);
          return (
            <line
              key={`mini-edge-${index}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2px"
            />
          );
        })}
        {/* Nodes */}
        {hUniqueNodes.map((node, index) => {
          const coords = getMiniNodeCoordinates(index, m);
          return (
            <g key={`mini-node-${index}`}>
              <circle cx={coords.x} cy={coords.y} r="8" fill="#1e293b" stroke="var(--color-text-secondary)" strokeWidth="1.5px" />
              <text 
                x={coords.x} 
                y={coords.y} 
                fill="var(--color-text-primary)" 
                fontSize="8px" 
                fontWeight="700" 
                textAnchor="middle" 
                dominantBaseline="middle"
              >
                {node}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const getWinnerMessage = () => {
    if (!gameState) return null;
    if (gameState.status === 'win_constructor') {
      const colorText = gameState.winning_color === 'red' ? 'czerwonego' : 'niebieskiego';
      const playerText = gameState.player_constructor === 'human' ? 'Wygrałeś!' : 'Komputer wygrał!';
      return (
        <div className="winning-highlight-box animate-scale-in">
          <Award size={18} />
          <span>
            <strong>Konstruktor wygrał!</strong> {playerText} Powstała monochromatyczna kopia grafu H w kolorze <strong>{colorText}</strong>.
          </span>
        </div>
      );
    }
    if (gameState.status === 'win_painter') {
      const playerText = gameState.player_painter === 'human' ? 'Wygrałeś!' : 'Komputer wygrał!';
      return (
        <div className="winning-highlight-box animate-scale-in" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.08)' }}>
          <Award size={18} />
          <span>
            <strong>Malarz wygrał!</strong> {playerText} Wszystkie krawędzie kliki K<sub>{gameState.n}</sub> zostały pokolorowane i brak monochromatycznej kopii H.
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="main-header glass-panel" style={{ padding: '1rem 1.5rem' }}>
        <div className="app-logo">
          <Layers className="logo-icon" size={28} color="#6366f1" />
          <div>
            <h1 className="logo-text">Liczby Ramseya Online</h1>
            <div className="subtitle">Konstruktor vs Malarz &bull; Interaktywne Analizy Grafów</div>
          </div>
        </div>
        <div className="header-actions">
          {gameState && (
            <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleStartGame}>
              <RotateCcw size={16} /> Resetuj Grę
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="glass-panel animate-scale-in" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', color: '#fc8181', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-grid">
        {/* Left column: Setup Panel */}
        <section className="sidebar">
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div className="panel-title">
              <TrendingUp size={18} color="#6366f1" />
              <span>Konfiguracja Gry</span>
            </div>

            <div className="control-group">
              {/* Vertices N */}
              <div className="form-field">
                <label>Liczba wierzchołków (n)</label>
                <select value={n} onChange={(e) => setN(parseInt(e.target.value))}>
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(val => (
                    <option key={val} value={val}>{val} (Klika K{val} ma {val * (val-1)/2} krawędzi)</option>
                  ))}
                </select>
              </div>

              {/* Target Graph H */}
              <div className="form-field">
                <label>Graf Celu (H)</label>
                <select value={hType} onChange={(e) => setHType(e.target.value)}>
                  {Object.entries(presets).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.name}
                    </option>
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
                  <div className="custom-h-desc">
                    Wprowadź krawędzie jako pary wierzchołków oddzielone myślnikami, rozdzielone przecinkami.
                  </div>
                </div>
              )}

              {/* Player 1: Constructor */}
              <div className="form-field">
                <label>Konstruktor (Rysuje)</label>
                <select value={playerConstructor} onChange={(e) => setPlayerConstructor(e.target.value)}>
                  <option value="human">Człowiek (Gracz)</option>
                  <option value="computer">Komputer (AI)</option>
                </select>
              </div>

              {/* Player 2: Painter */}
              <div className="form-field">
                <label>Malarz (Koloruje)</label>
                <select value={playerPainter} onChange={(e) => setPlayerPainter(e.target.value)}>
                  <option value="human">Człowiek (Gracz)</option>
                  <option value="computer">Komputer (AI)</option>
                </select>
              </div>

              {/* AI Strategy parameters if needed */}
              {(playerConstructor === 'computer' || playerPainter === 'computer') && (
                <>
                  {playerConstructor === 'computer' && (
                    <div className="form-field animate-scale-in">
                      <label>Strategia Konstruktora (AI)</label>
                      <select value={constructorStrategy} onChange={(e) => setConstructorStrategy(e.target.value)}>
                        <option value="heuristic">Heurystyka Minimax (Silna)</option>
                        <option value="random">Ruchy Losowe (Słaba)</option>
                      </select>
                    </div>
                  )}

                  {playerPainter === 'computer' && (
                    <div className="form-field animate-scale-in">
                      <label>Strategia Malarza (AI)</label>
                      <select value={painterStrategy} onChange={(e) => setPainterStrategy(e.target.value)}>
                        <option value="heuristic">Heurystyka Potencjałowa (Silna)</option>
                        <option value="random">Kolorowanie Losowe (Słaba)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Run Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleStartGame}
                  disabled={loading}
                >
                  <Play size={16} /> Rozpocznij Grę
                </button>

                <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>
                
                <div className="form-field" style={{ marginBottom: '0.5rem' }}>
                  <label>Liczba symulacji (komputer vs komputer)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="200" 
                    value={numRuns} 
                    onChange={(e) => setNumRuns(parseInt(e.target.value) || 10)}
                  />
                </div>

                <button 
                  className="btn btn-secondary" 
                  onClick={handleRunSimulation}
                  disabled={loading}
                >
                  <Cpu size={16} /> Uruchom Symulację
                </button>
              </div>
            </div>
          </div>

          {/* Rules Panel */}
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

        {/* Right column: Game Board or Simulation results */}
        <section className="main-board-container">
          {/* Active Interactive Game Mode */}
          {gameState && !isSimulationMode && (
            <div className="animate-scale-in">
              {/* Turn Banner */}
              <div className={`info-banner ${
                gameState.status !== 'active' 
                  ? 'finished-turn' 
                  : (gameState.turn === 'constructor' ? 'constructor-turn' : 'painter-turn')
              }`}>
                <div>
                  <div className="turn-title">
                    {gameState.status !== 'active' ? (
                      <>Koniec gry!</>
                    ) : gameState.turn === 'constructor' ? (
                      <>
                        <User size={18} color="var(--accent)" />
                        Tura Konstruktora ({gameState.player_constructor === 'human' ? 'Ty' : 'Komputer'})
                      </>
                    ) : (
                      <>
                        <Cpu size={18} color="#f59e0b" />
                        Tura Malarza ({gameState.player_painter === 'human' ? 'Ty' : 'Komputer'})
                      </>
                    )}
                  </div>
                  <div className="turn-desc">
                    {gameState.status === 'active' ? (
                      gameState.turn === 'constructor' ? (
                        gameState.player_constructor === 'human' 
                          ? "Wybierz 2 wierzchołki, aby narysować krawędź, lub kliknij bezpośrednio na szarą przerywaną linię."
                          : "Komputer myśli nad optymalnym ruchem..."
                      ) : (
                        gameState.player_painter === 'human'
                          ? "Zdecyduj, na jaki kolor pomalować świeżą pomarańczową krawędź narysowaną przez Konstruktora."
                          : "Komputer decyduje o kolorze krawędzi..."
                      )
                    ) : (
                      "Rozpocznij nową grę w panelu bocznym."
                    )}
                  </div>
                </div>
                
                {gameState.status === 'active' && (
                  <span className="run-badge constructor" style={{ background: gameState.turn === 'constructor' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(245, 158, 11, 0.25)', color: gameState.turn === 'constructor' ? '#a5b4fc' : '#f59e0b', borderColor: gameState.turn === 'constructor' ? 'var(--accent)' : '#f59e0b' }}>
                    W grze
                  </span>
                )}
              </div>

              {/* Main Board Layout */}
              <div className="game-layout" style={{ marginTop: '1rem' }}>
                <div className="glass-panel board-card">
                  {renderSVGBoard()}
                  
                  {/* Winner text */}
                  {getWinnerMessage()}

                  {/* Manual Painter Controls */}
                  {gameState.status === 'active' && gameState.turn === 'painter' && gameState.player_painter === 'human' && (
                    <div className="glass-panel painter-action-overlay animate-scale-in">
                      <div className="painter-action-title">
                        Pokoloruj narysowaną krawędź ({gameState.last_drawn_edge.u} &mdash; {gameState.last_drawn_edge.v})
                      </div>
                      <div className="painter-btn-group">
                        <button className="btn btn-painter-red" onClick={() => handleColorMove('red')}>
                          Czerwony
                        </button>
                        <button className="btn btn-painter-blue" onClick={() => handleColorMove('blue')}>
                          Niebieski
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side status legend & target graph */}
                <div className="side-panel">
                  <div className="glass-panel legend-card">
                    <h3 className="panel-title" style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      Szukany Graf Celu (H)
                    </h3>
                    <div className="target-preview-box">
                      {renderHPreview()}
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      <strong>Nazwa:</strong> {getHDetails().name}<br/>
                      <strong>Opis:</strong> {getHDetails().description}
                    </div>
                  </div>

                  <div className="glass-panel legend-card">
                    <h3 className="panel-title" style={{ fontSize: '1rem' }}>Legenda</h3>
                    <div className="legend-list">
                      <div className="legend-item">
                        <div className="color-indicator red"></div>
                        <span>Krawędź Czerwona (Malarz)</span>
                      </div>
                      <div className="legend-item">
                        <div className="color-indicator blue"></div>
                        <span>Krawędź Niebieska (Malarz)</span>
                      </div>
                      <div className="legend-item">
                        <div className="color-indicator draft"></div>
                        <span>Narysowana, niepokolorowana</span>
                      </div>
                      <div className="legend-item">
                        <div className="color-indicator potential"></div>
                        <span>Krawędź potencjalna (dostępna)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simulation Results Dashboard */}
          {isSimulationMode && simResult && (
            <div className="animate-scale-in">
              <div className="glass-panel info-banner finished-turn" style={{ background: 'rgba(99, 102, 241, 0.1)', borderLeft: '4px solid var(--accent)', borderColor: 'rgba(99, 102, 241, 0.25)' }}>
                <div>
                  <div className="turn-title" style={{ color: 'var(--color-text-primary)' }}>
                    <Cpu size={18} color="var(--accent)" />
                    Wyniki Symulacji Komputer vs Komputer
                  </div>
                  <div className="turn-desc">
                    Przeprowadzono {simResult.num_runs} gier testowych dla n={simResult.n}.
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
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

              {/* Detailed run selection and step logs */}
              <div className="glass-panel sim-results-card">
                <h3 className="panel-title">
                  <List size={18} color="#6366f1" />
                  <span>Historia Gier Symulacji (log pierwszych 5)</span>
                </h3>
                
                <div className="sim-runs-list">
                  {simResult.runs_log && simResult.runs_log.map((run) => (
                    <div 
                      key={`run-${run.run_index}`}
                      className={`sim-run-row ${selectedRun && selectedRun.run_index === run.run_index ? 'active-row' : ''}`}
                      onClick={() => setSelectedRun(run)}
                    >
                      <div className="run-info-left">
                        <span className="detail-move-num">Gra #{run.run_index}</span>
                        <span className={`run-badge ${run.winner}`}>
                          {run.winner === 'constructor' ? 'Konstruktor' : 'Malarz'}
                        </span>
                      </div>
                      <div className="run-meta">
                        Rozegrano tur: <strong>{run.turns}</strong>
                        <ChevronRight size={16} style={{ marginLeft: '0.5rem', verticalAlign: 'middle', display: 'inline-block' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Run Step-by-Step moves */}
                {selectedRun && (
                  <div className="run-detail-panel animate-scale-in">
                    <div className="run-detail-header">
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                          Szczegóły gry #{selectedRun.run_index}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          Zwycięzca: <strong style={{ textTransform: 'capitalize' }}>{selectedRun.winner === 'constructor' ? 'Konstruktor' : 'Malarz'}</strong>
                          {selectedRun.winning_color && ` (Kolor: ${selectedRun.winning_color === 'red' ? 'Czerwony' : 'Niebieski'})`}
                        </span>
                      </div>
                      <span className="run-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)' }}>
                        {selectedRun.moves.length} ruchów
                      </span>
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
                        <span>
                          Monochromatyczna kopia H powstała na krawędziach:{' '}
                          <strong>
                            {selectedRun.winning_subgraph.map(e => `(${e[0]},${e[1]})`).join(', ')}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Welcoming View */}
          {!gameState && !isSimulationMode && (
            <div className="glass-panel board-card animate-scale-in" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto' }}>
                <Layers size={48} color="var(--accent)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Witaj w Grach Ramseya!</h2>
                <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0.5rem auto 0 auto', fontSize: '0.95rem' }}>
                  Wybierz parametry gry po lewej stronie. Możesz zagrać przeciwko komputerowemu AI lub uruchomić symulację komputer vs komputer w celu testów i statystyk.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleStartGame}>
                  Graj Teraz
                </button>
                <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleRunSimulation}>
                  Testuj AI (Symulacja)
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

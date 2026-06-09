import { useState, useEffect } from "react";
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
  ChevronRight,
} from "lucide-react";
import "./App.css";

import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Board from "./components/Board.jsx";
import HPreview from "./components/HPreview.jsx";
import SimulationResults from "./components/SimulationResults.jsx";

const API_BASE = "http://localhost:5000/api";

function App() {
  // Config state
  const [n, setN] = useState(6);
  const [hType, setHType] = useState("triangle");
  const [customHEdges, setCustomHEdges] = useState("0-1, 1-2, 2-0");
  const [playerConstructor, setPlayerConstructor] = useState("human");
  const [playerPainter, setPlayerPainter] = useState("computer");
  const [constructorStrategy, setConstructorStrategy] = useState("maximin-threat");
  const [painterStrategy, setPainterStrategy] = useState("min-threat");

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

  // Strategies fetched from backend
  const [strategies, setStrategies] = useState({});

  // Fetch presets on load
  useEffect(() => {
    fetch(`${API_BASE}/presets`)
      .then((res) => {
        if (!res.ok) throw new Error("Błąd pobierania konfiguracji z serwera");
        return res.json();
      })
      .then((data) => {
        setPresets(data);
        const keys = Object.keys(data);
        if (keys.length > 0 && !keys.includes(hType) && hType !== "custom") {
          setHType(keys[0]);
        }
      })
      .catch((err) => {
        console.error("Backend error: presets fetching failed", err);
        setError(
          "Brak połączenia z serwerem. Uruchom backend, aby załadować grafy celu H.",
        );
      });

    // Fetch available strategies
    fetch(`${API_BASE}/strategies`)
      .then((res) => {
        if (!res.ok) throw new Error("Błąd pobierania strategii z serwera");
        return res.json();
      })
      .then((data) => {
        setStrategies(data || {});
        // set defaults if current choices are not valid
        if (data) {
          const cons = data.constructor || [];
          const pain = data.painter || [];
          if (cons.length > 0 && !cons.some((s) => s.id === constructorStrategy)) {
            setConstructorStrategy(cons[0].id);
          }
          if (pain.length > 0 && !pain.some((s) => s.id === painterStrategy)) {
            setPainterStrategy(pain[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Backend error: strategies fetching failed", err);
        // keep defaults if fetching strategies fails
      });
  }, []);

  const getHDetails = () => {
    if (hType === "custom") {
      const parsedEdges = parseCustomEdges(customHEdges);
      const uniqueVertices = Array.from(new Set(parsedEdges.flat()));
      return {
        name: "Graf Własny H",
        vertices: uniqueVertices,
        edges: parsedEdges,
        description: `Niestandardowy graf H z ${uniqueVertices.length} wierzchołkami i ${parsedEdges.length} krawędziami`,
      };
    }
    return (
      presets[hType] || { name: "", vertices: [], edges: [], description: "" }
    );
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
      setError(
        `Indeks wierzchołka grafu H (${maxHNode}) nie może być większy lub równy liczbie wierzchołków n (${n})`,
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/start_game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n,
          h_type: hType,
          h_edges: hType === "custom" ? hDetails.edges : null,
          player_constructor: playerConstructor,
          player_painter: playerPainter,
          constructor_strategy: constructorStrategy,
          painter_strategy: painterStrategy,
        }),
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
      setError(
        `Indeks wierzchołka grafu H (${maxHNode}) nie może być większy lub równy liczbie wierzchołków n (${n})`,
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n,
          h_type: hType,
          h_edges: hType === "custom" ? hDetails.edges : null,
          constructor_strategy: constructorStrategy,
          painter_strategy: painterStrategy,
          num_runs: numRuns,
        }),
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
    if (
      !gameState ||
      gameState.status !== "active" ||
      gameState.turn !== "constructor"
    )
      return;
    if (gameState.player_constructor !== "human") return;

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
    if (
      !gameState ||
      gameState.status !== "active" ||
      gameState.turn !== "constructor"
    )
      return;
    if (gameState.player_constructor !== "human") return;
    submitConstructorMove(u, v);
  };

  const submitConstructorMove = async (u, v) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/constructor_move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameState.game_id,
          u,
          v,
        }),
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
    if (
      !gameState ||
      gameState.status !== "active" ||
      gameState.turn !== "painter"
    )
      return;
    if (gameState.player_painter !== "human") return;

    setError(null);
    try {
      const response = await fetch(`${API_BASE}/painter_move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameState.game_id,
          color,
        }),
      });
      if (!response.ok) throw new Error("Błąd przy kolorowaniu");
      const data = await response.json();
      setGameState(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Board and HPreview were moved to separate components (components/Board.jsx and components/HPreview.jsx)

  const getWinnerMessage = () => {
    if (!gameState) return null;
    if (gameState.status === "win_constructor") {
      const colorText =
        gameState.winning_color === "red" ? "czerwonego" : "niebieskiego";
      const playerText =
        gameState.player_constructor === "human"
          ? "Wygrałeś!"
          : "Komputer wygrał!";
      return (
        <div className="winning-highlight-box animate-scale-in">
          <Award size={18} />
          <span>
            <strong>Konstruktor wygrał!</strong> {playerText} Powstała
            monochromatyczna kopia grafu H w kolorze{" "}
            <strong>{colorText}</strong>.
          </span>
        </div>
      );
    }
    if (gameState.status === "win_painter") {
      const playerText =
        gameState.player_painter === "human" ? "Wygrałeś!" : "Komputer wygrał!";
      return (
        <div
          className="winning-highlight-box animate-scale-in"
          style={{
            borderColor: "rgba(59, 130, 246, 0.3)",
            color: "#60a5fa",
            background: "rgba(59, 130, 246, 0.08)",
          }}
        >
          <Award size={18} />
          <span>
            <strong>Malarz wygrał!</strong> {playerText} Wszystkie krawędzie
            kliki K<sub>{gameState.n}</sub> zostały pokolorowane i brak
            monochromatycznej kopii H.
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header onReset={handleStartGame} showReset={!!gameState} />

      {error && (
        <div
          className="glass-panel animate-scale-in"
          style={{
            borderColor: "rgba(239, 68, 68, 0.3)",
            background: "rgba(239, 68, 68, 0.05)",
            color: "#fc8181",
            padding: "1rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-grid">
        {/* Left column: Setup Panel (extracted) */}
        <Sidebar
          n={n}
          setN={setN}
          hType={hType}
          setHType={setHType}
          customHEdges={customHEdges}
          setCustomHEdges={setCustomHEdges}
          playerConstructor={playerConstructor}
          setPlayerConstructor={setPlayerConstructor}
          playerPainter={playerPainter}
          setPlayerPainter={setPlayerPainter}
          constructorStrategy={constructorStrategy}
          setConstructorStrategy={setConstructorStrategy}
          painterStrategy={painterStrategy}
          setPainterStrategy={setPainterStrategy}
          presets={presets}
          handleStartGame={handleStartGame}
          handleRunSimulation={handleRunSimulation}
          numRuns={numRuns}
          setNumRuns={setNumRuns}
          loading={loading}
          constructorOptions={strategies.constructor || []}
          painterOptions={strategies.painter || []}
        />

        {/* Right column: Game Board or Simulation results */}
        <section className="main-board-container">
          {/* Active Interactive Game Mode */}
          {gameState && !isSimulationMode && (
            <div className="animate-scale-in">
              {/* Turn Banner */}
              <div
                className={`info-banner ${
                  gameState.status !== "active"
                    ? "finished-turn"
                    : gameState.turn === "constructor"
                      ? "constructor-turn"
                      : "painter-turn"
                }`}
              >
                <div>
                  <div className="turn-title">
                    {gameState.status !== "active" ? (
                      <>Koniec gry!</>
                    ) : gameState.turn === "constructor" ? (
                      <>
                        <User size={18} color="var(--accent)" />
                        Tura Konstruktora (
                        {gameState.player_constructor === "human"
                          ? "Ty"
                          : "Komputer"}
                        )
                      </>
                    ) : (
                      <>
                        <Cpu size={18} color="#f59e0b" />
                        Tura Malarza (
                        {gameState.player_painter === "human"
                          ? "Ty"
                          : "Komputer"}
                        )
                      </>
                    )}
                  </div>
                  <div className="turn-desc">
                    {gameState.status === "active"
                      ? gameState.turn === "constructor"
                        ? gameState.player_constructor === "human"
                          ? "Wybierz 2 wierzchołki, aby narysować krawędź, lub kliknij bezpośrednio na szarą przerywaną linię."
                          : "Komputer myśli nad optymalnym ruchem..."
                        : gameState.player_painter === "human"
                          ? "Zdecyduj, na jaki kolor pomalować świeżą pomarańczową krawędź narysowaną przez Konstruktora."
                          : "Komputer decyduje o kolorze krawędzi..."
                      : "Rozpocznij nową grę w panelu bocznym."}
                  </div>
                </div>

                {gameState.status === "active" && (
                  <span
                    className="run-badge constructor"
                    style={{
                      background:
                        gameState.turn === "constructor"
                          ? "rgba(99, 102, 241, 0.25)"
                          : "rgba(245, 158, 11, 0.25)",
                      color:
                        gameState.turn === "constructor"
                          ? "#a5b4fc"
                          : "#f59e0b",
                      borderColor:
                        gameState.turn === "constructor"
                          ? "var(--accent)"
                          : "#f59e0b",
                    }}
                  >
                    W grze
                  </span>
                )}
              </div>

              {/* Main Board Layout */}
              <div className="game-layout" style={{ marginTop: "1rem" }}>
                <div className="glass-panel board-card">
                  <Board
                    gameState={gameState}
                    n={n}
                    selectedNode={selectedNode}
                    setSelectedNode={setSelectedNode}
                    handleEdgeClick={handleEdgeClick}
                    handleNodeClick={handleNodeClick}
                  />

                  {/* Winner text */}
                  {getWinnerMessage()}

                  {/* Manual Painter Controls */}
                  {gameState.status === "active" &&
                    gameState.turn === "painter" &&
                    gameState.player_painter === "human" && (
                      <div className="glass-panel painter-action-overlay animate-scale-in">
                        <div className="painter-action-title">
                          Pokoloruj narysowaną krawędź (
                          {gameState.last_drawn_edge.u} &mdash;{" "}
                          {gameState.last_drawn_edge.v})
                        </div>
                        <div className="painter-btn-group">
                          <button
                            className="btn btn-painter-red"
                            onClick={() => handleColorMove("red")}
                          >
                            Czerwony
                          </button>
                          <button
                            className="btn btn-painter-blue"
                            onClick={() => handleColorMove("blue")}
                          >
                            Niebieski
                          </button>
                        </div>
                      </div>
                    )}
                </div>

                {/* Right side status legend & target graph */}
                <div className="side-panel">
                  <div className="glass-panel legend-card">
                    <h3
                      className="panel-title"
                      style={{
                        fontSize: "1rem",
                        borderBottom: "1px solid var(--border-color)",
                        paddingBottom: "0.5rem",
                      }}
                    >
                      Szukany Graf Celu (H)
                    </h3>
                    <div className="target-preview-box">
                      <HPreview hDetails={getHDetails()} />
                    </div>
                    <div
                      style={{
                        marginTop: "0.75rem",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <strong>Nazwa:</strong> {getHDetails().name}
                      <br />
                      <strong>Opis:</strong> {getHDetails().description}
                    </div>
                  </div>

                  <div className="glass-panel legend-card">
                    <h3 className="panel-title" style={{ fontSize: "1rem" }}>
                      Legenda
                    </h3>
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
          <SimulationResults
            simResult={simResult}
            selectedRun={selectedRun}
            setSelectedRun={setSelectedRun}
          />

          {/* Welcoming View */}
          {!gameState && !isSimulationMode && (
            <div
              className="glass-panel board-card animate-scale-in"
              style={{
                padding: "3rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  background: "rgba(99, 102, 241, 0.1)",
                  padding: "1.5rem",
                  borderRadius: "50%",
                  width: "fit-content",
                  margin: "0 auto",
                }}
              >
                <Layers size={48} color="var(--accent)" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                  Konstruktor vs Malarz!
                </h2>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    maxWidth: "500px",
                    margin: "0.5rem auto 0 auto",
                    fontSize: "0.95rem",
                  }}
                >
                  Wybierz parametry gry po lewej stronie. Możesz zagrać
                  przeciwko komputerowemu AI lub uruchomić symulację komputer vs
                  komputer w celu testów i statystyk.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                }}
              >
                <button
                  className="btn btn-primary"
                  style={{ width: "auto" }}
                  onClick={handleStartGame}
                >
                  Graj Teraz
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto" }}
                  onClick={handleRunSimulation}
                >
                  Symulacja gry AI
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

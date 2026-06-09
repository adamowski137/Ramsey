import React from 'react';

function getNodeCoordinates(index, total) {
  const cx = 250;
  const cy = 250;
  const radius = 180;
  const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function getAllPossibleEdges(num) {
  const list = [];
  for (let i = 0; i < num; i++) {
    for (let j = i + 1; j < num; j++) {
      list.push({ u: i, v: j });
    }
  }
  return list;
}

export default function Board({ gameState, n, selectedNode, setSelectedNode, handleEdgeClick, handleNodeClick }) {
  const totalNodes = gameState ? gameState.n : n;
  const activeEdges = gameState ? gameState.edges : [];
  const allPossible = getAllPossibleEdges(totalNodes);

  const isEdgeInWinningSubgraph = (u, v) => {
    if (!gameState || !gameState.winning_subgraph) return false;
    return gameState.winning_subgraph.some(
      ([wu, wv]) => (wu === u && wv === v) || (wu === v && wv === u)
    );
  };

  const isNodeInWinningSubgraph = (nodeIndex) => {
    if (!gameState || !gameState.winning_subgraph) return false;
    return gameState.winning_subgraph.flat().includes(nodeIndex);
  };

  return (
    <svg className="svg-wrapper" viewBox="0 0 500 500">
      {/* potential edges */}
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

      {/* colored edges */}
      {activeEdges.map((edge, index) => {
        const start = getNodeCoordinates(edge.u, totalNodes);
        const end = getNodeCoordinates(edge.v, totalNodes);

        if (edge.color === null) {
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

      {/* nodes */}
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
            <text className="node-text" x={coords.x} y={coords.y}>{index}</text>
          </g>
        );
      })}
    </svg>
  );
}

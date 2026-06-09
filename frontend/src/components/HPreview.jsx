import React from 'react';

function getMiniNodeCoordinates(index, total) {
  const cx = 60;
  const cy = 60;
  const radius = 40;
  const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

export default function HPreview({ hDetails }) {
  if (!hDetails || hDetails.edges.length === 0) {
    return <div className="custom-h-desc text-center">Brak grafu H</div>;
  }

  const hUniqueNodes = Array.from(new Set(hDetails.edges.flat())).sort((a, b) => a - b);
  const nodeMap = {};
  hUniqueNodes.forEach((node, idx) => { nodeMap[node] = idx; });
  const m = hUniqueNodes.length;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
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

      {hUniqueNodes.map((node, index) => {
        const coords = getMiniNodeCoordinates(index, m);
        return (
          <g key={`mini-node-${index}`}>
            <circle cx={coords.x} cy={coords.y} r="8" fill="#1e293b" stroke="var(--color-text-secondary)" strokeWidth="1.5px" />
            <text x={coords.x} y={coords.y} fill="var(--color-text-primary)" fontSize="8px" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{node}</text>
          </g>
        );
      })}
    </svg>
  );
}

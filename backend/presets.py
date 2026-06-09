# Preset H configurations for the Ramsey game

PRESETS = {
    "triangle": {
        "name": "Trójkąt (K3)",
        "vertices": [0, 1, 2],
        "edges": [(0, 1), (1, 2), (2, 0)],
        "description": "Monochromatyczny trójkąt K3 (3 wierzchołki, 3 krawędzie)"
    },
    "clique4": {
        "name": "Klika K4",
        "vertices": [0, 1, 2, 3],
        "edges": [(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)],
        "description": "Monochromatyczna klika K4 (4 wierzchołki, 6 krawędzi)"
    },
    "cycle4": {
        "name": "Cykl C4",
        "vertices": [0, 1, 2, 3],
        "edges": [(0, 1), (1, 2), (2, 3), (3, 0)],
        "description": "Monochromatyczny cykl C4 (4 wierzchołki, 4 krawędzie)"
    },
    "path4": {
        "name": "Ścieżka P4",
        "vertices": [0, 1, 2, 3],
        "edges": [(0, 1), (1, 2), (2, 3)],
        "description": "Monochromatyczna ścieżka P4 (4 wierzchołki, 3 krawędzie)"
    },
    "star4": {
        "name": "Gwiazda K1,3",
        "vertices": [0, 1, 2, 3],
        "edges": [(0, 1), (0, 2), (0, 3)],
        "description": "Monochromatyczna gwiazda K1,3 (4 wierzchołki, 3 krawędzie)"
    }
}

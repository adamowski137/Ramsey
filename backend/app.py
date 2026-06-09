import uuid
import random
import itertools
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory storage for active games
GAMES = {}

# Standard presets for H
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

def find_subgraphs(n, H_vertices, H_edges):
    """
    Finds all edge-sets in Kn that are isomorphic to H.
    Each edge in the result is a sorted tuple (u, v) with u < v.
    Returns a list of frozensets, each representing the edges of an isomorphic copy of H.
    """
    edge_sets = set()
    num_h_nodes = len(H_vertices)
    
    if num_h_nodes > n:
        return []
        
    for p in itertools.permutations(range(n), num_h_nodes):
        mapping = {H_vertices[i]: p[i] for i in range(num_h_nodes)}
        edges = frozenset(tuple(sorted((mapping[u], mapping[v]))) for u, v in H_edges)
        edge_sets.add(edges)
        
    return [list(es) for es in edge_sets]

def calculate_total_threat(subgraphs, E_Red, E_Blue, W=100):
    """
    Calculates the potential threat score of a game state.
    """
    total = 0
    for sg in subgraphs:
        n_red = 0
        n_blue = 0
        for edge in sg:
            if edge in E_Red:
                n_red += 1
            elif edge in E_Blue:
                n_blue += 1
                
        # Threat for Red: if no Blue edges, threat is W^n_red
        if n_blue == 0:
            total += W ** n_red
        # Threat for Blue: if no Red edges, threat is W^n_blue
        if n_red == 0:
            total += W ** n_blue
            
    return total

def check_game_over(n, subgraphs, E_Red, E_Blue, H_edge_count):
    """
    Checks if there is a winner.
    Returns (status, winning_subgraph, winning_color)
    """
    # Check if Constructor won (monochromatic H exists)
    for sg in subgraphs:
        # Check Red
        if all(edge in E_Red for edge in sg):
            return "win_constructor", sg, "red"
        # Check Blue
        if all(edge in E_Blue for edge in sg):
            return "win_constructor", sg, "blue"
            
    # Check if Painter won (all Kn edges are drawn and colored, and no monochromatic H)
    total_kn_edges = n * (n - 1) // 2
    if len(E_Red) + len(E_Blue) == total_kn_edges:
        return "win_painter", None, None
        
    return "active", None, None

def get_all_possible_edges(n):
    return [tuple(sorted((u, v))) for u, v in itertools.combinations(range(n), 2)]

def get_constructor_move(n, subgraphs, E_Red, E_Blue, strategy):
    all_edges = get_all_possible_edges(n)
    colored_edges = E_Red | E_Blue
    uncolored_edges = [e for e in all_edges if e not in colored_edges]
    
    if not uncolored_edges:
        return None
        
    if strategy == "random":
        return random.choice(uncolored_edges)
        
    # Heuristic strategy: 1-step minimax maximizing the threat remaining after Painter minimizes it
    best_edges = []
    best_threat = -1
    
    for e in uncolored_edges:
        t_red = calculate_total_threat(subgraphs, E_Red | {e}, E_Blue)
        t_blue = calculate_total_threat(subgraphs, E_Red, E_Blue | {e})
        
        # Painter will choose the color that minimizes threat
        painter_min_threat = min(t_red, t_blue)
        
        if painter_min_threat > best_threat:
            best_threat = painter_min_threat
            best_edges = [e]
        elif painter_min_threat == best_threat:
            best_edges.append(e)
            
    return random.choice(best_edges)

def get_painter_move(e, subgraphs, E_Red, E_Blue, strategy):
    if strategy == "random":
        return random.choice(["red", "blue"])
        
    # Heuristic strategy: Choose color that minimizes the total threat
    t_red = calculate_total_threat(subgraphs, E_Red | {e}, E_Blue)
    t_blue = calculate_total_threat(subgraphs, E_Red, E_Blue | {e})
    
    if t_red < t_blue:
        return "red"
    elif t_blue < t_red:
        return "blue"
    else:
        return random.choice(["red", "blue"])

def serialize_edge_list(edges):
    return [[u, v] for u, v in edges]

def serialize_colored_edges(E_Red, E_Blue, last_drawn=None):
    res = []
    for u, v in E_Red:
        res.append({"u": u, "v": v, "color": "red"})
    for u, v in E_Blue:
        res.append({"u": u, "v": v, "color": "blue"})
    if last_drawn:
        res.append({"u": last_drawn[0], "v": last_drawn[1], "color": None})
    return res

def format_game_state(game):
    E_Red = game["E_Red"]
    E_Blue = game["E_Blue"]
    last_drawn = game["last_drawn"]
    subgraphs = game["subgraphs"]
    H_edge_count = len(game["h_edges"])
    
    status, winning_sub, winning_col = check_game_over(
        game["n"], subgraphs, E_Red, E_Blue, H_edge_count
    )
    
    return {
        "game_id": game["game_id"],
        "n": game["n"],
        "h_edges": game["h_edges"],
        "player_constructor": game["player_constructor"],
        "player_painter": game["player_painter"],
        "constructor_strategy": game["constructor_strategy"],
        "painter_strategy": game["painter_strategy"],
        "edges": serialize_colored_edges(E_Red, E_Blue, last_drawn),
        "last_drawn_edge": {"u": last_drawn[0], "v": last_drawn[1]} if last_drawn else None,
        "turn": game["turn"],
        "status": status,
        "winning_subgraph": serialize_edge_list(winning_sub) if winning_sub else None,
        "winning_color": winning_col
    }

@app.route("/api/presets", methods=["GET"])
def get_presets():
    return jsonify(PRESETS)

@app.route("/api/start_game", methods=["POST"])
def start_game():
    data = request.json or {}
    n = int(data.get("n", 6))
    h_type = data.get("h_type", "triangle")
    
    if h_type in PRESETS:
        h_vertices = PRESETS[h_type]["vertices"]
        h_edges = PRESETS[h_type]["edges"]
    else:
        # Custom graph H
        h_edges_raw = data.get("h_edges", [])
        h_edges = [tuple(sorted(e)) for e in h_edges_raw]
        h_vertices = list(set(itertools.chain(*h_edges)))
        if not h_vertices:
            h_vertices = [0, 1, 2]
            h_edges = [(0, 1), (1, 2), (2, 0)]
            
    player_constructor = data.get("player_constructor", "human")
    player_painter = data.get("player_painter", "human")
    constructor_strategy = data.get("constructor_strategy", "heuristic")
    painter_strategy = data.get("painter_strategy", "heuristic")
    
    # Pre-calculate subgraphs
    subgraphs_raw = find_subgraphs(n, h_vertices, h_edges)
    # Convert to sets of tuples for easier set operations
    subgraphs = [set(tuple(sorted(e)) for e in sg) for sg in subgraphs_raw]
    
    game_id = str(uuid.uuid4())
    game = {
        "game_id": game_id,
        "n": n,
        "h_edges": [[u, v] for u, v in h_edges],
        "subgraphs": subgraphs,
        "player_constructor": player_constructor,
        "player_painter": player_painter,
        "constructor_strategy": constructor_strategy,
        "painter_strategy": painter_strategy,
        "E_Red": set(),
        "E_Blue": set(),
        "last_drawn": None,
        "turn": "constructor"
    }
    
    GAMES[game_id] = game
    
    # If Constructor is computer, execute its move immediately
    if player_constructor == "computer":
        move = get_constructor_move(n, subgraphs, game["E_Red"], game["E_Blue"], constructor_strategy)
        if move:
            game["last_drawn"] = move
            game["turn"] = "painter"
            
            # If Painter is also computer, color it immediately
            if player_painter == "computer":
                color = get_painter_move(move, subgraphs, game["E_Red"], game["E_Blue"], painter_strategy)
                if color == "red":
                    game["E_Red"].add(move)
                else:
                    game["E_Blue"].add(move)
                game["last_drawn"] = None
                game["turn"] = "constructor"
                
                # Check game over, if not and Constructor is computer, repeat?
                # To keep it simple: we check state. If computer vs computer, start_game does the first step,
                # but for full simulation we use /api/simulate. For interactive, we run turn-by-turn.
                # If Constructor is computer and Painter is computer, let's keep looping until the game ends or a human turn is reached (none in this case, but just in case, we can run to completion).
                status, _, _ = check_game_over(n, subgraphs, game["E_Red"], game["E_Blue"], len(h_edges))
                while status == "active" and game["player_constructor"] == "computer" and game["player_painter"] == "computer":
                    # Constructor move
                    m = get_constructor_move(n, subgraphs, game["E_Red"], game["E_Blue"], constructor_strategy)
                    if not m:
                        break
                    # Painter move
                    c = get_painter_move(m, subgraphs, game["E_Red"], game["E_Blue"], painter_strategy)
                    if c == "red":
                        game["E_Red"].add(m)
                    else:
                        game["E_Blue"].add(m)
                    status, _, _ = check_game_over(n, subgraphs, game["E_Red"], game["E_Blue"], len(h_edges))
                
                game["turn"] = "constructor" # dummy, game is over or active
                
    return jsonify(format_game_state(game))

@app.route("/api/constructor_move", methods=["POST"])
def constructor_move():
    data = request.json or {}
    game_id = data.get("game_id")
    u = int(data.get("u"))
    v = int(data.get("v"))
    
    if game_id not in GAMES:
        return jsonify({"error": "Gra nie istnieje"}), 404
        
    game = GAMES[game_id]
    if game["turn"] != "constructor":
        return jsonify({"error": "To nie jest tura Konstruktora"}), 400
        
    edge = tuple(sorted((u, v)))
    if edge in game["E_Red"] or edge in game["E_Blue"]:
        return jsonify({"error": "Krawędź jest już pokolorowana"}), 400
        
    # Draw edge
    game["last_drawn"] = edge
    game["turn"] = "painter"
    
    # If Painter is computer, make the color choice immediately
    if game["player_painter"] == "computer":
        color = get_painter_move(edge, game["subgraphs"], game["E_Red"], game["E_Blue"], game["painter_strategy"])
        if color == "red":
            game["E_Red"].add(edge)
        else:
            game["E_Blue"].add(edge)
        game["last_drawn"] = None
        
        # Check if game is over
        status, _, _ = check_game_over(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], len(game["h_edges"]))
        
        if status == "active":
            game["turn"] = "constructor"
            # If Constructor is also computer, it should make its move
            if game["player_constructor"] == "computer":
                # Wait, this case would only happen if one of them is human but wait, if player_constructor is computer,
                # it should make a move. Let's make it recursive: if active and constructor is computer, do it!
                while status == "active" and game["player_constructor"] == "computer":
                    m = get_constructor_move(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], game["constructor_strategy"])
                    if not m:
                        break
                    game["last_drawn"] = m
                    game["turn"] = "painter"
                    
                    if game["player_painter"] == "computer":
                        c = get_painter_move(m, game["subgraphs"], game["E_Red"], game["E_Blue"], game["painter_strategy"])
                        if c == "red":
                            game["E_Red"].add(m)
                        else:
                            game["E_Blue"].add(m)
                        game["last_drawn"] = None
                        game["turn"] = "constructor"
                        status, _, _ = check_game_over(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], len(game["h_edges"]))
                    else:
                        # Painter is human, break out to let human decide
                        break
        else:
            # Game is over
            game["turn"] = "finished"
            
    return jsonify(format_game_state(game))

@app.route("/api/painter_move", methods=["POST"])
def painter_move():
    data = request.json or {}
    game_id = data.get("game_id")
    color = data.get("color") # "red" or "blue"
    
    if game_id not in GAMES:
        return jsonify({"error": "Gra nie istnieje"}), 404
        
    game = GAMES[game_id]
    if game["turn"] != "painter":
        return jsonify({"error": "To nie jest tura Malarza"}), 400
        
    edge = game["last_drawn"]
    if not edge:
        return jsonify({"error": "Brak narysowanej krawędzi do pokolorowania"}), 400
        
    if color not in ["red", "blue"]:
        return jsonify({"error": "Niepoprawny kolor"}), 400
        
    # Color edge
    if color == "red":
        game["E_Red"].add(edge)
    else:
        game["E_Blue"].add(edge)
    game["last_drawn"] = None
    
    # Check if game is over
    status, _, _ = check_game_over(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], len(game["h_edges"]))
    
    if status == "active":
        game["turn"] = "constructor"
        # If Constructor is computer, make its move immediately
        if game["player_constructor"] == "computer":
            status_curr = "active"
            while status_curr == "active" and game["player_constructor"] == "computer":
                m = get_constructor_move(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], game["constructor_strategy"])
                if not m:
                    break
                game["last_drawn"] = m
                game["turn"] = "painter"
                
                # If Painter is also computer (shouldn't happen in human turn unless configured), color it
                if game["player_painter"] == "computer":
                    c = get_painter_move(m, game["subgraphs"], game["E_Red"], game["E_Blue"], game["painter_strategy"])
                    if c == "red":
                        game["E_Red"].add(m)
                    else:
                        game["E_Blue"].add(m)
                    game["last_drawn"] = None
                    game["turn"] = "constructor"
                    status_curr, _, _ = check_game_over(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], len(game["h_edges"]))
                else:
                    break
    else:
        game["turn"] = "finished"
        
    return jsonify(format_game_state(game))

@app.route("/api/simulate", methods=["POST"])
def simulate():
    data = request.json or {}
    n = int(data.get("n", 6))
    h_type = data.get("h_type", "triangle")
    
    if h_type in PRESETS:
        h_vertices = PRESETS[h_type]["vertices"]
        h_edges = PRESETS[h_type]["edges"]
    else:
        h_edges_raw = data.get("h_edges", [])
        h_edges = [tuple(sorted(e)) for e in h_edges_raw]
        h_vertices = list(set(itertools.chain(*h_edges)))
        if not h_vertices:
            h_vertices = [0, 1, 2]
            h_edges = [(0, 1), (1, 2), (2, 0)]
            
    constructor_strategy = data.get("constructor_strategy", "heuristic")
    painter_strategy = data.get("painter_strategy", "heuristic")
    num_runs = int(data.get("num_runs", 10))
    
    # Pre-calculate subgraphs
    subgraphs_raw = find_subgraphs(n, h_vertices, h_edges)
    subgraphs = [set(tuple(sorted(e)) for e in sg) for sg in subgraphs_raw]
    h_edge_count = len(h_edges)
    
    constructor_wins = 0
    painter_wins = 0
    total_turns_list = []
    runs_log = []
    
    # Limit runs to max 200 to avoid CPU exhaustion
    num_runs = min(num_runs, 200)
    
    for run in range(num_runs):
        E_Red = set()
        E_Blue = set()
        status = "active"
        turns = 0
        game_moves = []
        
        while status == "active":
            # Constructor move
            m = get_constructor_move(n, subgraphs, E_Red, E_Blue, constructor_strategy)
            if not m:
                # No more moves available
                break
                
            # Painter move
            c = get_painter_move(m, subgraphs, E_Red, E_Blue, painter_strategy)
            if c == "red":
                E_Red.add(m)
            else:
                E_Blue.add(m)
                
            turns += 1
            game_moves.append({"u": m[0], "v": m[1], "color": c})
            
            status, win_sg, win_c = check_game_over(n, subgraphs, E_Red, E_Blue, h_edge_count)
            
        if status == "win_constructor":
            constructor_wins += 1
            winner = "constructor"
        else:
            painter_wins += 1
            winner = "painter"
            win_sg = None
            win_c = None
            
        total_turns_list.append(turns)
        
        # Only log full details for the first 5 runs to keep response small
        if run < 5:
            runs_log.append({
                "run_index": run + 1,
                "winner": winner,
                "turns": turns,
                "moves": game_moves,
                "winning_subgraph": serialize_edge_list(win_sg) if win_sg else None,
                "winning_color": win_c
            })
            
    avg_turns = sum(total_turns_list) / len(total_turns_list) if total_turns_list else 0
    
    return jsonify({
        "n": n,
        "h_edges": [[u, v] for u, v in h_edges],
        "constructor_strategy": constructor_strategy,
        "painter_strategy": painter_strategy,
        "num_runs": num_runs,
        "constructor_wins": constructor_wins,
        "painter_wins": painter_wins,
        "constructor_win_rate": constructor_wins / num_runs if num_runs > 0 else 0,
        "painter_win_rate": painter_wins / num_runs if num_runs > 0 else 0,
        "avg_turns": avg_turns,
        "runs_log": runs_log
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

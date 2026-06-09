import uuid
import itertools
from flask import Flask, request, jsonify
from flask_cors import CORS

from presets import PRESETS
from game_logic import (
    find_subgraphs,
    check_game_over,
    get_constructor_move,
    get_painter_move
)

app = Flask(__name__)
CORS(app)

# In-memory storage for active games
GAMES = {}

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
                
                status, _, _ = check_game_over(n, subgraphs, game["E_Red"], game["E_Blue"], len(h_edges))
                while status == "active" and game["player_constructor"] == "computer" and game["player_painter"] == "computer":
                    m = get_constructor_move(n, subgraphs, game["E_Red"], game["E_Blue"], constructor_strategy)
                    if not m:
                        break
                    c = get_painter_move(m, subgraphs, game["E_Red"], game["E_Blue"], painter_strategy)
                    if c == "red":
                        game["E_Red"].add(m)
                    else:
                        game["E_Blue"].add(m)
                    status, _, _ = check_game_over(n, subgraphs, game["E_Red"], game["E_Blue"], len(h_edges))
                
                game["turn"] = "constructor"
                
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
        
        status, _, _ = check_game_over(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], len(game["h_edges"]))
        
        if status == "active":
            game["turn"] = "constructor"
            if game["player_constructor"] == "computer":
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
                        break
        else:
            game["turn"] = "finished"
            
    return jsonify(format_game_state(game))

@app.route("/api/painter_move", methods=["POST"])
def painter_move():
    data = request.json or {}
    game_id = data.get("game_id")
    color = data.get("color")
    
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
        
    if color == "red":
        game["E_Red"].add(edge)
    else:
        game["E_Blue"].add(edge)
    game["last_drawn"] = None
    
    status, _, _ = check_game_over(game["n"], game["subgraphs"], game["E_Red"], game["E_Blue"], len(game["h_edges"]))
    
    if status == "active":
        game["turn"] = "constructor"
        if game["player_constructor"] == "computer":
            status_curr = "active"
            while status_curr == "active" and game["player_constructor"] == "computer":
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
    
    subgraphs_raw = find_subgraphs(n, h_vertices, h_edges)
    subgraphs = [set(tuple(sorted(e)) for e in sg) for sg in subgraphs_raw]
    h_edge_count = len(h_edges)
    
    constructor_wins = 0
    painter_wins = 0
    total_turns_list = []
    runs_log = []
    
    num_runs = min(num_runs, 200)
    
    for run in range(num_runs):
        E_Red = set()
        E_Blue = set()
        status = "active"
        turns = 0
        game_moves = []
        
        while status == "active":
            m = get_constructor_move(n, subgraphs, E_Red, E_Blue, constructor_strategy)
            if not m:
                break
                
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

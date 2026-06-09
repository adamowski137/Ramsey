import itertools
import random

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
    if strategy == "random":
        return constructor_strategy_random(n, E_Red, E_Blue)
    # Default to heuristic
    return constructor_strategy_heuristic(n, subgraphs, E_Red, E_Blue)

def constructor_strategy_random(n, E_Red, E_Blue):
    all_edges = get_all_possible_edges(n)
    colored_edges = E_Red | E_Blue
    uncolored_edges = [e for e in all_edges if e not in colored_edges]
    if not uncolored_edges:
        return None
    return random.choice(uncolored_edges)

def constructor_strategy_heuristic(n, subgraphs, E_Red, E_Blue):
    all_edges = get_all_possible_edges(n)
    colored_edges = E_Red | E_Blue
    uncolored_edges = [e for e in all_edges if e not in colored_edges]
    
    if not uncolored_edges:
        return None
        
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
        return painter_strategy_random(e, subgraphs, E_Red, E_Blue)
    # Default to heuristic
    return painter_strategy_heuristic(e, subgraphs, E_Red, E_Blue)

def painter_strategy_random(e, subgraphs, E_Red, E_Blue):
    return random.choice(["red", "blue"])

def painter_strategy_heuristic(e, subgraphs, E_Red, E_Blue):
    t_red = calculate_total_threat(subgraphs, E_Red | {e}, E_Blue)
    t_blue = calculate_total_threat(subgraphs, E_Red, E_Blue | {e})
    
    if t_red < t_blue:
        return "red"
    elif t_blue < t_red:
        return "blue"
    else:
        return random.choice(["red", "blue"])

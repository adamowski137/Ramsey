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
            total += W**n_red
        # Threat for Blue: if no Red edges, threat is W^n_blue
        if n_red == 0:
            total += W**n_blue

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
        return painter_strategy_random()
    # Default to heuristic
    return painter_strategy_heuristic(e, subgraphs, E_Red, E_Blue)


def painter_strategy_random():
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


# -----------------------------
# Alpha-Beta based strategies
# -----------------------------

def evaluate_state(subgraphs, E_Red, E_Blue):
    """Evaluation function for alpha-beta: use total threat (higher -> better for Constructor)."""
    return calculate_total_threat(subgraphs, E_Red, E_Blue)


def constructor_strategy_alphabeta(n, subgraphs, E_Red, E_Blue, max_depth=3):
    """Choose an edge using a depth-limited minimax (alpha-beta) where Constructor maximizes threat
    and Painter immediately responds by choosing the color minimizing threat.

    The search alternates: Constructor picks an edge -> Painter picks a color -> next depth.
    """

    all_edges = get_all_possible_edges(n)
    colored_edges = E_Red | E_Blue
    uncolored_edges = [e for e in all_edges if e not in colored_edges]
    if not uncolored_edges:
        return None

    def recurse(cur_E_Red, cur_E_Blue, depth, alpha, beta):
        status, _, _ = check_game_over(n, subgraphs, cur_E_Red, cur_E_Blue, 0)
        if status == 'win_constructor':
            return float('inf')
        if status == 'win_painter':
            return -float('inf')
        if depth == 0:
            return evaluate_state(subgraphs, cur_E_Red, cur_E_Blue)

        value = -float('inf')
        # Constructor's turn: pick an edge, Painter will respond
        all_e = [e for e in get_all_possible_edges(n) if e not in (cur_E_Red | cur_E_Blue)]
        if not all_e:
            return evaluate_state(subgraphs, cur_E_Red, cur_E_Blue)

        for e in all_e:
            # Painter will choose color to minimize the resulting evaluation
            worst_for_constructor = float('inf')
            # try red
            new_ER = cur_E_Red | {e}
            new_EB = cur_E_Blue
            val_red = recurse(new_ER, new_EB, depth - 1, alpha, beta)
            if val_red < worst_for_constructor:
                worst_for_constructor = val_red
            # alpha-beta pruning for the minimizer side relative to alpha
            if worst_for_constructor <= alpha:
                # Painter can force <= alpha, so Constructor won't pick this edge
                pass
            # try blue
            new_ER2 = cur_E_Red
            new_EB2 = cur_E_Blue | {e}
            val_blue = recurse(new_ER2, new_EB2, depth - 1, alpha, beta)
            if val_blue < worst_for_constructor:
                worst_for_constructor = val_blue

            # Now worst_for_constructor is the value assuming Painter responds optimally
            if worst_for_constructor > value:
                value = worst_for_constructor
            if value >= beta:
                return value
            if value > alpha:
                alpha = value
        return value

    # Choose best edge with argmax of minimax value (tie-break randomly)
    best_edges = []
    best_val = -float('inf')
    for e in uncolored_edges:
        # Painter response
        val_red = recurse(E_Red | {e}, E_Blue, max_depth - 1, -float('inf'), float('inf'))
        val_blue = recurse(E_Red, E_Blue | {e}, max_depth - 1, -float('inf'), float('inf'))
        worst = min(val_red, val_blue)
        if worst > best_val:
            best_val = worst
            best_edges = [e]
        elif worst == best_val:
            best_edges.append(e)

    return random.choice(best_edges)


def painter_strategy_alphabeta(e, subgraphs, E_Red, E_Blue, max_depth=3):
    """For a freshly drawn edge `e`, choose a color by looking ahead using the same eval.
    Returns 'red' or 'blue'."""
    # If applying color results in terminal state, prefer immediate win/avoid loss
    status_r, _, _ = check_game_over(0, subgraphs, E_Red | {e}, E_Blue, 0)
    if status_r == 'win_constructor':
        # painting red would immediately cause constructor win -> avoid if possible
        # prefer blue unless blue also loses
        status_b, _, _ = check_game_over(0, subgraphs, E_Red, E_Blue | {e}, 0)
        if status_b == 'win_constructor':
            return random.choice(['red', 'blue'])
        return 'blue'

    status_b, _, _ = check_game_over(0, subgraphs, E_Red, E_Blue | {e}, 0)
    if status_b == 'win_constructor':
        return 'red'

    # Otherwise evaluate deeper
    val_red = evaluate_state(subgraphs, E_Red | {e}, E_Blue)
    val_blue = evaluate_state(subgraphs, E_Red, E_Blue | {e})

    # Lookahead: perform a shallow recurse for the resulting state
    def recurse(cur_E_Red, cur_E_Blue, depth, alpha, beta):
        status, _, _ = check_game_over(0, subgraphs, cur_E_Red, cur_E_Blue, 0)
        if status == 'win_constructor':
            return float('inf')
        if status == 'win_painter':
            return -float('inf')
        if depth == 0:
            return evaluate_state(subgraphs, cur_E_Red, cur_E_Blue)
        value = -float('inf')
        # constructor will play next (maximize)
        all_e = [ee for ee in get_all_possible_edges( max([v for sg in subgraphs for v in sg]+[0]) ) if ee not in (cur_E_Red | cur_E_Blue)]
        if not all_e:
            return evaluate_state(subgraphs, cur_E_Red, cur_E_Blue)
        for ee in all_e:
            # painter responses
            worst = float('inf')
            worst = min(worst, recurse(cur_E_Red | {ee}, cur_E_Blue, depth - 1, alpha, beta))
            worst = min(worst, recurse(cur_E_Red, cur_E_Blue | {ee}, depth - 1, alpha, beta))
            if worst > value:
                value = worst
            if value >= beta:
                return value
            if value > alpha:
                alpha = value
        return value

    # perform shallow lookahead
    try:
        look_red = recurse(E_Red | {e}, E_Blue, max_depth - 1, -float('inf'), float('inf'))
        look_blue = recurse(E_Red, E_Blue | {e}, max_depth - 1, -float('inf'), float('inf'))
    except Exception:
        # fallback to immediate evaluation
        look_red = val_red
        look_blue = val_blue

    if look_red < look_blue:
        return 'red'
    elif look_blue < look_red:
        return 'blue'
    else:
        return random.choice(['red', 'blue'])


# Integrate into existing strategy dispatchers
orig_get_constructor_move = get_constructor_move

def get_constructor_move(n, subgraphs, E_Red, E_Blue, strategy):
    # Support legacy id 'heuristic' and new 'maximin-threat'
    if strategy == 'random':
        return constructor_strategy_random(n, E_Red, E_Blue)
    if strategy == 'alphabeta':
        return constructor_strategy_alphabeta(n, subgraphs, E_Red, E_Blue, max_depth=3)
    if strategy in ('heuristic', 'maximin-threat'):
        return constructor_strategy_heuristic(n, subgraphs, E_Red, E_Blue)
    # Fallback
    return constructor_strategy_heuristic(n, subgraphs, E_Red, E_Blue)


orig_get_painter_move = get_painter_move

def get_painter_move(e, subgraphs, E_Red, E_Blue, strategy):
    # Support legacy id 'heuristic' and new 'min-threat'
    if strategy == 'random':
        return painter_strategy_random()
    if strategy == 'alphabeta':
        return painter_strategy_alphabeta(e, subgraphs, E_Red, E_Blue, max_depth=3)
    if strategy in ('heuristic', 'min-threat'):
        return painter_strategy_heuristic(e, subgraphs, E_Red, E_Blue)
    # Fallback
    return painter_strategy_heuristic(e, subgraphs, E_Red, E_Blue)


orig_get_painter_move = get_painter_move

def get_painter_move(e, subgraphs, E_Red, E_Blue, strategy):
    if strategy == 'random':
        return painter_strategy_random()
    if strategy == 'alphabeta':
        return painter_strategy_alphabeta(e, subgraphs, E_Red, E_Blue, max_depth=3)
    # Default to heuristic
    return painter_strategy_heuristic(e, subgraphs, E_Red, E_Blue)

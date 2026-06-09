import unittest
import json
from app import app, find_subgraphs, calculate_total_threat, check_game_over

class RamseyGameTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_find_subgraphs_triangle(self):
        # K3 inside K4 should find 4 subgraphs
        subgraphs = find_subgraphs(4, [0, 1, 2], [(0, 1), (1, 2), (2, 0)])
        self.assertEqual(len(subgraphs), 4)

    def test_find_subgraphs_cycle4(self):
        # C4 inside K4 should find 3 subgraphs
        subgraphs = find_subgraphs(4, [0, 1, 2, 3], [(0, 1), (1, 2), (2, 3), (3, 0)])
        self.assertEqual(len(subgraphs), 3)

    def test_calculate_total_threat(self):
        # Threat evaluation test
        # H = triangle, subgraphs of K3 is just 1 (the triangle itself)
        subgraphs = [{(0, 1), (1, 2), (2, 0)}]
        
        # Initially, with no colored edges, threat is 1 (Red threat: 100^0) + 1 (Blue threat: 100^0) = 2
        threat = calculate_total_threat(subgraphs, set(), set(), W=100)
        self.assertEqual(threat, 2)
        
        # One Red edge (0,1). Red threat = 100^1 = 100. Blue threat = 0 (blocked by Red). Total = 100
        threat = calculate_total_threat(subgraphs, {(0, 1)}, set(), W=100)
        self.assertEqual(threat, 100)

        # One Red edge (0,1), one Blue edge (1,2). Both threats blocked, total = 0
        threat = calculate_total_threat(subgraphs, {(0, 1)}, {(1, 2)}, W=100)
        self.assertEqual(threat, 0)

    def test_check_game_over(self):
        subgraphs = [{(0, 1), (1, 2), (2, 0)}]
        
        # Red wins
        status, winning_sg, winning_col = check_game_over(3, subgraphs, {(0, 1), (1, 2), (2, 0)}, set(), 3)
        self.assertEqual(status, "win_constructor")
        self.assertEqual(winning_col, "red")
        
        # Active game
        status, _, _ = check_game_over(3, subgraphs, {(0, 1)}, {(1, 2)}, 3)
        self.assertEqual(status, "active")
        
        # Painter wins (all edges of K3 colored, no monochromatic triangle)
        # Edges of K3: (0,1), (1,2), (2,0)
        # Red: (0,1), (1,2); Blue: (2,0) -> no monochromatic triangle, but all colored
        status, _, _ = check_game_over(3, subgraphs, {(0, 1), (1, 2)}, {(2, 0)}, 3)
        self.assertEqual(status, "win_painter")

    def test_api_presets(self):
        response = self.app.get('/api/presets')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('triangle', data)
        self.assertIn('clique4', data)

    def test_api_start_game(self):
        # Start a human vs computer game
        response = self.app.post('/api/start_game', json={
            "n": 6,
            "h_type": "triangle",
            "player_constructor": "human",
            "player_painter": "computer"
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["n"], 6)
        self.assertEqual(data["player_constructor"], "human")
        self.assertEqual(data["player_painter"], "computer")
        self.assertEqual(data["turn"], "constructor")
        self.assertEqual(data["status"], "active")

    def test_api_simulation(self):
        response = self.app.post('/api/simulate', json={
            "n": 5,
            "h_type": "triangle",
            "constructor_strategy": "heuristic",
            "painter_strategy": "heuristic",
            "num_runs": 5
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["num_runs"], 5)
        self.assertIn("constructor_wins", data)
        self.assertIn("painter_wins", data)
        self.assertIn("runs_log", data)
        self.assertTrue(len(data["runs_log"]) > 0)

if __name__ == '__main__':
    unittest.main()

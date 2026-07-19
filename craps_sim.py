import numpy as np
import matplotlib.pyplot as plt

def play_craps():
    # Initial roll
    roll = np.random.randint(1, 7) + np.random.randint(1, 7)
    if roll in (7, 11):
        return True # Win
    elif roll in (2, 3, 12):
        return False # Lose
    else:
        point = roll
        while True:
            roll = np.random.randint(1, 7) + np.random.randint(1, 7)
            if roll == point:
                return True
            elif roll == 7:
                return False

def simulate_craps(num_games):
    wins = 0
    win_probabilities = []
    
    for i in range(1, num_games + 1):
        if play_craps():
            wins += 1
        win_probabilities.append(wins / i)
        
    return win_probabilities

def visualize_craps(num_games=10000):
    win_probs = simulate_craps(num_games)
    final_prob = win_probs[-1]
    
    print(f"Probability of winning Craps after {num_games} games: {final_prob:.4f}")
    
    plt.figure(figsize=(10, 6))
    plt.plot(range(1, num_games + 1), win_probs, color='green')
    plt.axhline(y=0.4929, color='red', linestyle='--', label='Theoretical Probability (~49.29%)')
    plt.title("Convergence of Craps Winning Probability")
    plt.xlabel("Number of Games Played")
    plt.ylabel("Win Probability")
    plt.legend()
    plt.grid(True)
    plt.show()

if __name__ == "__main__":
    visualize_craps()

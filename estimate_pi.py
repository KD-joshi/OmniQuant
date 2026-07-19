import numpy as np
import matplotlib.pyplot as plt

def estimate_pi(num_darts):
    # Generate random x and y coordinates between -1 and 1
    x = np.random.uniform(-1, 1, num_darts)
    y = np.random.uniform(-1, 1, num_darts)

    # Calculate distance from origin
    distance = x**2 + y**2

    # Check if inside circle (radius 1)
    inside_circle = distance <= 1

    # Ratio of darts inside circle to total darts
    pi_estimate = 4 * np.sum(inside_circle) / num_darts
    
    return pi_estimate, x, y, inside_circle

def visualize_pi_estimation(num_darts=10000):
    pi_estimate, x, y, inside_circle = estimate_pi(num_darts)
    print(f"Estimated Pi with {num_darts} darts: {pi_estimate}")

    plt.figure(figsize=(8, 8))
    plt.scatter(x[inside_circle], y[inside_circle], color='blue', s=1, label='Inside Circle')
    plt.scatter(x[~inside_circle], y[~inside_circle], color='red', s=1, label='Outside Circle')
    
    circle = plt.Circle((0, 0), 1, color='black', fill=False, linewidth=2)
    plt.gca().add_patch(circle)
    
    plt.xlim(-1, 1)
    plt.ylim(-1, 1)
    plt.title(fr"Estimating $\pi$ (Estimate: {pi_estimate})")
    plt.legend(loc='upper right')
    plt.show()

if __name__ == "__main__":
    visualize_pi_estimation()

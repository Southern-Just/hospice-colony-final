import { Bed, Ant } from "@/types";

// Configuration stays mostly the same
interface ACOConfig {
  iterations: number;
  alpha: number;
  beta: number;
  evaporationRate: number;
  antCount: number;
}

const defaultConfig: ACOConfig = {
  iterations: 50,
  alpha: 1,
  beta: 2,
  evaporationRate: 0.5,
  antCount: 20,
};

// Persistent pheromones — stays across calls unless manually reset
let pheromones: Map<string, number> = new Map();
let initialized = false;

// Simple distance-based heuristic
const heuristic = (bedA: Bed, bedB: Bed): number => {
  const dx = bedA.position.x - bedB.position.x;
  const dy = bedA.position.y - bedB.position.y;
  return 1 / (Math.sqrt(dx * dx + dy * dy) + 1);
};

const initializePheromones = (beds: Bed[]) => {
  if (initialized) return; // Keep learning
  pheromones.clear();
  for (const a of beds) {
    for (const b of beds) {
      if (a.id !== b.id) {
        pheromones.set(`${a.id}-${b.id}`, 1);
      }
    }
  }
  initialized = true;
};

const selectNextBed = (
    current: Bed,
    unvisited: Bed[],
    alpha: number,
    beta: number
): Bed => {
  const probabilities = unvisited.map(bed => {
    const pheromone = pheromones.get(`${current.id}-${bed.id}`) || 1;
    const heuristicValue = heuristic(current, bed);
    return {
      bed,
      value: Math.pow(pheromone, alpha) * Math.pow(heuristicValue, beta),
    };
  });

  const total = probabilities.reduce((acc, item) => acc + item.value, 0);
  const rand = Math.random() * total;

  let sum = 0;
  for (const { bed, value } of probabilities) {
    sum += value;
    if (sum >= rand) return bed;
  }

  return unvisited[0]; // fallback
};

const evaluatePathFitness = (path: Bed[]): number => {
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += Math.hypot(
        path[i].position.x - path[i + 1].position.x,
        path[i].position.y - path[i + 1].position.y
    );
  }
  return -totalDistance; // Less distance is better
};

const updatePheromones = (ants: Ant[], evaporationRate: number) => {
  // Evaporation
  for (const key of pheromones.keys()) {
    pheromones.set(key, (pheromones.get(key) || 0) * (1 - evaporationRate));
  }

  // Reinforce better paths
  for (const ant of ants) {
    const deposit = 1 / Math.abs(ant.fitness || 1);
    for (let i = 0; i < ant.path.length - 1; i++) {
      const key = `${ant.path[i].id}-${ant.path[i + 1].id}`;
      const current = pheromones.get(key) || 0;
      pheromones.set(key, current + deposit);
    }
  }
};

// Main ACO run
export const runAntColonyOptimization = (
    beds: Bed[],
    config: ACOConfig = defaultConfig
): Bed[] => {
  initializePheromones(beds);
  let bestPath: Bed[] = beds;
  let bestFitness = -Infinity;

  for (let iter = 0; iter < config.iterations; iter++) {
    const ants: Ant[] = [];

    for (let k = 0; k < config.antCount; k++) {
      const unvisited = [...beds];
      const path: Bed[] = [];
      let current = unvisited.splice(Math.floor(Math.random() * unvisited.length), 1)[0];
      path.push(current);

      while (unvisited.length > 0) {
        const next = selectNextBed(current, unvisited, config.alpha, config.beta);
        path.push(next);
        unvisited.splice(unvisited.indexOf(next), 1);
        current = next;
      }

      const fitness = evaluatePathFitness(path);
      ants.push({ path, fitness });

      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestPath = path;
      }
    }

    updatePheromones(ants, config.evaporationRate);
  }

  return bestPath;
};

// Allow admission form to directly reinforce learning
export const reinforceAllocation = (path: Bed[]) => {
  const fitness = evaluatePathFitness(path);
  updatePheromones([{ path, fitness }], 0.1); // Small evaporation to blend old + new
};

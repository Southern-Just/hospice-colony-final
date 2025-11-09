// lib/server/bedOptimization.controller.ts
import { runAntColonyOptimization } from "@/model/AntColonyOptimization.model";
import { Bed } from "@/types";

/**
 * optimizeBedArrangement
 * - Takes an array of Bed objects
 * - Calls the ACO model (runAntColonyOptimization) which returns a path/order of beds
 * - Assigns coordinates for the layout based on the resulting order (grid)
 * - Returns the updated Bed[] with positions set
 */
export const optimizeBedArrangement = (beds: Bed[]): Bed[] => {
  if (!Array.isArray(beds) || beds.length === 0) return beds;

  // run the algorithm (model expects positions for heuristic; if positions are present it will use them)
  const optimized = runAntColonyOptimization(beds);

  // If the model returns a permutation (ordered beds), map positions onto a grid to create final coordinates.
  // We preserve other bed fields (id, status, ward, bedNumber, priority)
  const repositioned = optimized.map((bed, index) => ({
    ...bed,
    position: {
      x: (index % 8) * 100 + 50,
      y: Math.floor(index / 8) * 80 + 50,
    },
  }));

  return repositioned;
};

export interface GraphNode {
  id: string;
  name: string;
  x: number; // For visualization positioning (0-100%)
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  cost: number;
}

export const GRAPH_NODES: GraphNode[] = [
  { id: "Toshkent", name: "Toshkent (Start)", x: 5, y: 50 },
  { id: "Guliston", name: "Guliston", x: 18, y: 25 },
  { id: "Jizzax", name: "Jizzax", x: 22, y: 75 },
  { id: "Samarqand", name: "Samarqand", x: 38, y: 48 },
  { id: "Shahrisabz", name: "Shahrisabz", x: 42, y: 82 },
  { id: "Navoiy", name: "Navoiy", x: 54, y: 25 },
  { id: "Qarshi", name: "Qarshi", x: 58, y: 78 },
  { id: "Buxoro", name: "Buxoro", x: 70, y: 35 },
  { id: "Termiz", name: "Termiz", x: 74, y: 85 },
  { id: "Nukus", name: "Nukus", x: 84, y: 25 },
  { id: "Urganch", name: "Urganch", x: 86, y: 65 },
  { id: "Xiva", name: "Xiva (Marra)", x: 96, y: 50 },
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: "Toshkent", to: "Guliston", cost: 4 },
  { from: "Toshkent", to: "Jizzax", cost: 7 },
  { from: "Guliston", to: "Jizzax", cost: 2 },
  { from: "Guliston", to: "Samarqand", cost: 8 },
  { from: "Jizzax", to: "Samarqand", cost: 5 },
  { from: "Jizzax", to: "Shahrisabz", cost: 3 },
  { from: "Samarqand", to: "Navoiy", cost: 6 },
  { from: "Samarqand", to: "Qarshi", cost: 4 },
  { from: "Shahrisabz", to: "Qarshi", cost: 2 },
  { from: "Shahrisabz", to: "Termiz", cost: 8 },
  { from: "Navoiy", to: "Buxoro", cost: 5 },
  { from: "Navoiy", to: "Nukus", cost: 12 },
  { from: "Qarshi", to: "Buxoro", cost: 7 },
  { from: "Qarshi", to: "Termiz", cost: 3 },
  { from: "Buxoro", to: "Nukus", cost: 8 },
  { from: "Buxoro", to: "Urganch", cost: 4 },
  { from: "Termiz", to: "Urganch", cost: 10 },
  { from: "Termiz", to: "Xiva", cost: 15 },
  { from: "Nukus", to: "Xiva", cost: 6 },
  { from: "Urganch", to: "Xiva", cost: 2 },
];

// Optimal route: Toshkent -> Guliston -> Jizzax -> Shahrisabz -> Qarshi -> Buxoro -> Urganch -> Xiva
// Cost: 4 + 2 + 3 + 2 + 7 + 4 + 2 = 24
export const OPTIMAL_ROUTE = ["Toshkent", "Guliston", "Jizzax", "Shahrisabz", "Qarshi", "Buxoro", "Urganch", "Xiva"];
export const OPTIMAL_COST = 24;

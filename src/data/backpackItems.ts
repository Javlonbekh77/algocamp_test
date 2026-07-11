export interface BackpackItem {
  id: string;
  name: string;
  weight: number; // in kg
  value: number;  // in points
  iconName: string;
}

export const BACKPACK_ITEMS: BackpackItem[] = [
  { id: "laptop", name: "Laptop", weight: 5, value: 12, iconName: "Laptop" },
  { id: "kitob", name: "Kitob", weight: 3, value: 7, iconName: "BookOpen" },
  { id: "powerbank", name: "Powerbank", weight: 2, value: 6, iconName: "BatteryCharging" },
  { id: "suv", name: "Suv", weight: 4, value: 8, iconName: "Droplet" },
  { id: "kamera", name: "Kamera", weight: 6, value: 13, iconName: "Camera" },
  { id: "daftar", name: "Daftar", weight: 1, value: 2, iconName: "FileText" },
  { id: "router", name: "Router", weight: 2, value: 5, iconName: "Wifi" },
];

export interface BarItem {
  id: string;
  label: string;          // Category label below bar (e.g. "North", "Stop 1", "Silver")
  sublabel?: string;       // Secondary info (e.g. "09:58", "A-D056", "₹14.7k")
  value: number;           // Absolute numeric value for height scaling
  displayValue: string;    // Formatted label (e.g. "28.7m", "₹89.2L", "88k pts")
  isAlert?: boolean;       // Highlights bar in standout alert red (#ef4444 / #f43f5e)
  color?: string;          // Optional custom color
  percentage?: number;     // Share of total
}

export interface BarChartData {
  id: string;
  question: string;        // Question displayed in header (e.g. "Which customers owe us...?")
  title: string;           // Monospace uppercase title (e.g. "OVERDUE PAST 90 DAYS")
  metricValue: string;     // Big aggregate headline (e.g. "₹2.4 Cr", "87.6 mins")
  unit?: string;           // Unit annotation
  insight: string;         // Grounded sentence with alert bullet
  bars: BarItem[];         // Array of bar items
  activeFilterIndex: number;
  filterChips: string[];   // Quick chips below chart
}


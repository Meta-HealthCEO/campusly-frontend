// ─── Diagram Types ──────────────────────────────────────────────────────────

export type DiagramRenderStatus = 'pending' | 'rendered' | 'failed';

// ─── Supporting Types ───────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface LabeledPoint extends Point {
  label: string;
}

// ─── Diagram Data Variants ──────────────────────────────────────────────────

export interface CartesianGraphData {
  type: 'cartesian_graph';
  functions: string[];
  domain: [number, number];
  range: [number, number];
  points: LabeledPoint[];
}

export interface NumberLineData {
  type: 'number_line';
  min: number;
  max: number;
  points: LabeledPoint[];
}

export interface TriangleData {
  type: 'triangle';
  vertices: [LabeledPoint, LabeledPoint, LabeledPoint];
  labels: string[];
  rightAngle: boolean;
  sides: { label: string; length: number | null }[];
  angles: { label: string; degrees: number | null }[];
}

export interface CircleGeometryData {
  type: 'circle_geometry';
  center: Point;
  radius: number;
  theoremType: string;
  points: LabeledPoint[];
}

export interface VennDiagramData {
  type: 'venn_diagram';
  sets: { label: string; elements: string[] }[];
  intersection: string[];
  outside: string[];
}

export interface TrigGraphData {
  type: 'trig_graph';
  functions: string[];
  domain: [number, number];
  amplitude: number;
  period: number;
}

export interface BoxWhiskerData {
  type: 'box_whisker';
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

export interface BarChartData {
  type: 'bar_chart';
  categories: string[];
  values: number[];
  title: string;
}

export interface TransformationData {
  type: 'transformation';
  original: LabeledPoint[];
  transformed: LabeledPoint[];
  transformType: string;
}

export interface TreeDiagramData {
  type: 'tree_diagram';
  description: string;
}

export interface ScatterPlotData {
  type: 'scatter_plot';
  points: Point[];
}

export interface OgiveData {
  type: 'ogive';
  cumFrequencies: { upperBound: number; cumFrequency: number }[];
}

export interface GeometricShapeData {
  type: 'geometric_shape';
  description: string;
}

export interface Shape3dData {
  type: 'shape_3d';
  shapeType: string;
  dimensions: Record<string, number>;
}

export interface GenericDiagramData {
  type: 'generic';
  description: string;
}

// ─── Discriminated Union ────────────────────────────────────────────────────

export type DiagramData =
  | CartesianGraphData
  | NumberLineData
  | TriangleData
  | CircleGeometryData
  | VennDiagramData
  | TrigGraphData
  | BoxWhiskerData
  | BarChartData
  | TransformationData
  | TreeDiagramData
  | ScatterPlotData
  | OgiveData
  | GeometricShapeData
  | Shape3dData
  | GenericDiagramData;

// ─── Question Diagram ───────────────────────────────────────────────────────

export interface QuestionDiagram {
  tikz: string;
  data: DiagramData;
  alt: string;
  svgUrl: string | null;
  pdfUrl: string | null;
  hash: string;
  renderStatus: DiagramRenderStatus;
  renderError: string | null;
}

export type BoardTool = 
  | "select"
  | "hand"
  | "marker"
  | "sticky"
  | "frame"
  | "text"
  | "arrow";

export type BoardTextSize = "sm" | "md" | "lg" | "xl";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface BaseBoardElement {
  id: string;
  type: "stroke" | "sticky" | "frame" | "text" | "arrow" | "task_pill";
  x: number;
  y: number;
  width?: number;
  height?: number;
  frameId?: string | null; // ID del frame contenedor si está dentro de uno
  createdAt?: number;
}

export interface StrokeElement extends BaseBoardElement {
  type: "stroke";
  points: StrokePoint[];
  color: string;
  strokeWidth: number;
}

export interface StickyElement extends BaseBoardElement {
  type: "sticky";
  text: string;
  color: string; // Tono pastel
}

export interface FrameElement extends BaseBoardElement {
  type: "frame";
  title: string;
  backgroundColor: string;
  borderColor?: string;
}

export interface TextElement extends BaseBoardElement {
  type: "text";
  text: string;
  fontSize: BoardTextSize;
  color: string;
}

export interface ArrowElement extends BaseBoardElement {
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
}

export interface TaskPillElement extends BaseBoardElement {
  type: "task_pill";
  taskId: string;
  projectId: string;
  title: string;
  projectName: string;
  projectColor: string;
}

export type BoardElement = 
  | StrokeElement 
  | StickyElement 
  | FrameElement 
  | TextElement 
  | ArrowElement 
  | TaskPillElement;

export interface BoardViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Board {
  id: string;
  title: string;
  workspaceId: string;
  createdAt: any; // Firestore serverTimestamp or Timestamp or string
  updatedAt: any;
  elements: BoardElement[];
  viewport?: BoardViewport;
  previewColor?: string;
}

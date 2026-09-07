"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { playSound } from "@/app/taski/utils/audio";
import type {
  Board,
  BoardElement,
  BoardTool,
  BoardTextSize,
  StrokeElement,
  StickyElement,
  FrameElement,
  TextElement,
  ArrowElement,
  TaskPillElement,
  StrokePoint,
} from "@/lib/types/board";
import { BoardTopNav } from "./BoardTopNav";
import { BoardBottomLeftToolbar } from "./BoardBottomLeftToolbar";
import { BoardBottomCenterDock } from "./BoardBottomCenterDock";
import { BoardContextualToolbar, STICKY_COLORS } from "./BoardContextualToolbar";
import { BoardInsertTasksPopover } from "./BoardInsertTasksPopover";

interface InfiniteCanvasBoardProps {
  board: Board;
  boards: Board[];
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateElements: (elements: BoardElement[]) => void;
  onBackToCatalog: () => void;
  saveStatus?: "saved" | "saving" | "error";
}

export function InfiniteCanvasBoard({
  board,
  boards,
  onSelectBoard,
  onCreateBoard,
  onUpdateTitle,
  onUpdateElements,
  onBackToCatalog,
  saveStatus = "saved",
}: InfiniteCanvasBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── VIEWPORT STATE ──
  const [pan, setPan] = useState<{ x: number; y: number }>(() => board.viewport || { x: 80, y: 80 });
  const [zoom, setZoom] = useState<number>(() => board.viewport?.zoom || 1);

  // ── HERRAMIENTAS & PROPIEDADES ──
  const [activeTool, setActiveTool] = useState<BoardTool>("select");
  const [strokeColor, setStrokeColor] = useState<string>("#3B82F6");
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [stickyColor, setStickyColor] = useState<string>("#FCD34D");
  const [textSize, setTextSize] = useState<BoardTextSize>("md");
  const [textColor, setTextColor] = useState<string>("#FFFFFF");
  const [frameColor, setFrameColor] = useState<string>("rgba(255, 255, 255, 0.05)");

  // ── POPUP INSERTAR TAREAS ──
  const [isInsertTasksOpen, setIsInsertTasksOpen] = useState(false);

  // ── SELECCIÓN & ELEMENTOS ──
  const [elements, setElements] = useState<BoardElement[]>(board.elements || []);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : (selectedIds[selectedIds.length - 1] || null);
  const setSelectedId = useCallback((id: string | null) => setSelectedIds(id ? [id] : []), []);

  // Rectángulo de selección por arrastre (Marquee Box)
  const [selectionBox, setSelectionBox] = useState<{
    startWorld: { x: number; y: number };
    currentWorld: { x: number; y: number };
  } | null>(null);

  // Estado de edición de texto en línea
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const currentBoardIdRef = useRef(board.id);
  // Sincronizar SOLO cuando cambia el ID del tablero (para no reiniciar selectedIds durante auto-guardado)
  useEffect(() => {
    if (currentBoardIdRef.current !== board.id) {
      currentBoardIdRef.current = board.id;
      setElements(board.elements || []);
      setSelectedIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  // Estado de redimensionamiento con tiradores de esquina
  const [resizing, setResizing] = useState<{
    elementId: string;
    corner: "nw" | "ne" | "se" | "sw";
    startWorldPos: { x: number; y: number };
    startElBox: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // ── HISTORIAL DE DESHACER / REHACER (Undo / Redo) ──
  const [history, setHistory] = useState<BoardElement[][]>([board.elements || []]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = useCallback(
    (newEls: BoardElement[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newEls];
      });
      setHistoryIndex((prev) => prev + 1);
      onUpdateElements(newEls);
    },
    [historyIndex, onUpdateElements]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetEls = history[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      setElements(targetEls);
      onUpdateElements(targetEls);
    }
  }, [historyIndex, history, onUpdateElements]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetEls = history[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      setElements(targetEls);
      onUpdateElements(targetEls);
    }
  }, [historyIndex, history, onUpdateElements]);

  // ── INTERACCIÓN EN VIVO (Paneo, Dragging, Drawing) ──
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Dragging de elementos (soporta selección múltiple)
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [dragStartWorldPos, setDragStartWorldPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartPositions, setDragStartPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [dragContainedElements, setDragContainedElements] = useState<string[]>([]);

  // Trazado en curso (Marker)
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[] | null>(null);

  // Flecha en curso
  const [arrowDraft, setArrowDraft] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // ── COORDENADAS SCREEN <-> WORLD ──
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // ── OCTAVAS DINÁMICAS DEL FONDO DE PUNTOS (Adaptive Dot Grid) ──
  const gridStep = useMemo(() => {
    const baseGrid = 24;
    let step = baseGrid * zoom;
    while (step < 16) step *= 2;
    while (step > 64) step /= 2;
    return step;
  }, [zoom]);

  // ── ATAJOS DE TECLADO GLOBALES ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si se está escribiendo en un input o textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || editingTextId) return;

      if (e.code === "Space" && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleRedo();
      }

      // Eliminar elementos seleccionados (Delete / Backspace)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const next = elements.filter((el) => !selectedIds.includes(el.id));
          setElements(next);
          setSelectedIds([]);
          pushHistory(next);
          playSound("pop");
        }
      }

      // Enter para editar texto seleccionado
      if (e.key === "Enter" && selectedIds.length === 1) {
        const selEl = elements.find((el) => el.id === selectedIds[0]);
        if (selEl && selEl.type === "text") {
          e.preventDefault();
          setEditingTextId(selEl.id);
          return;
        }
      }

      // Herramientas rápidas
      if (e.key.toLowerCase() === "m") { setActiveTool("marker"); playSound("click"); }
      if (e.key.toLowerCase() === "v") { setActiveTool("select"); playSound("click"); }
      if (e.key.toLowerCase() === "h") { setActiveTool("hand"); playSound("click"); }
      if (e.key.toLowerCase() === "s") { setActiveTool("sticky"); playSound("click"); }
      if (e.key.toLowerCase() === "f") { setActiveTool("frame"); playSound("click"); }
      if (e.key.toLowerCase() === "t") { setActiveTool("text"); playSound("click"); }
      if (e.key.toLowerCase() === "a") { setActiveTool("arrow"); playSound("click"); }
      if (e.key === "Escape") {
        if (editingTextId) {
          setEditingTextId(null);
        } else {
          setSelectedIds([]);
          setActiveTool("select");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed, handleUndo, handleRedo, selectedIds, elements, pushHistory, editingTextId]);

  // ── ZOOM CON RUEDA DEL MOUSE (Trackpad Pinch / Ctrl+Wheel) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Si el evento ocurrió dentro de un popover, dock, toolbar o menú flotante, permitir el scroll nativo
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.closest(
          ".board-popover, .board-dock, .board-toolbar, .board-topnav, [data-prevent-canvas-scroll], .custom-scrollbar"
        )
      ) {
        return; // Permite el scroll nativo dentro del contenedor sin mover el canvas
      }

      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom centrado en el cursor del mouse
        const zoomDelta = -e.deltaY * 0.005;
        setZoom((prevZoom) => {
          const nextZoom = Math.min(Math.max(prevZoom + zoomDelta, 0.15), 2.5);
          const rect = el.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          setPan((prevPan) => ({
            x: mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom),
            y: mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom),
          }));

          return nextZoom;
        });
      } else {
        // Paneo con dos dedos en trackpad o rueda normal
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // ── MANEJADORES DE MOUSE DEL CANVAS ──
  const handleMouseDown = (e: React.MouseEvent) => {
    // Si se hace clic con botón central o si está activa la mano / barra espaciadora
    if (e.button === 1 || activeTool === "hand" || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Solo clic izquierdo para interactuar

    const worldPos = screenToWorld(e.clientX, e.clientY);

    // 1. Herramienta Sticky Note: crea una nota
    if (activeTool === "sticky") {
      const newSticky: StickyElement = {
        id: `sticky-${Date.now()}`,
        type: "sticky",
        x: Math.round(worldPos.x - 100),
        y: Math.round(worldPos.y - 80),
        width: 220,
        height: 180,
        text: "Jot something...",
        color: stickyColor,
      };
      const next = [...elements, newSticky];
      setElements(next);
      setSelectedId(newSticky.id);
      pushHistory(next);
      setActiveTool("select");
      playSound("pop");
      return;
    }

    // 2. Herramienta Frame: crea un frame
    if (activeTool === "frame") {
      const frameCount = elements.filter((el) => el.type === "frame").length + 1;
      const newFrame: FrameElement = {
        id: `frame-${Date.now()}`,
        type: "frame",
        title: `Frame ${frameCount}`,
        x: Math.round(worldPos.x - 220),
        y: Math.round(worldPos.y - 150),
        width: 460,
        height: 320,
        backgroundColor: frameColor,
        borderColor: "rgba(255, 255, 255, 0.15)",
      };
      const next = [...elements, newFrame];
      setElements(next);
      setSelectedId(newFrame.id);
      pushHistory(next);
      setActiveTool("select");
      playSound("pop");
      return;
    }

    // 3. Herramienta Text: crea un texto libre
    if (activeTool === "text") {
      const newText: TextElement = {
        id: `text-${Date.now()}`,
        type: "text",
        x: Math.round(worldPos.x),
        y: Math.round(worldPos.y),
        text: "Escribe algo...",
        fontSize: textSize,
        color: textColor,
      };
      const next = [...elements, newText];
      setElements(next);
      setSelectedId(newText.id);
      setEditingTextId(newText.id);
      pushHistory(next);
      setActiveTool("select");
      playSound("pop");
      return;
    }

    // 4. Herramienta Marker: inicia trazo
    if (activeTool === "marker") {
      setCurrentStroke([worldPos]);
      return;
    }

    // 5. Herramienta Flecha: inicia flecha
    if (activeTool === "arrow") {
      setArrowDraft({
        startX: worldPos.x,
        startY: worldPos.y,
        endX: worldPos.x,
        endY: worldPos.y,
      });
      return;
    }

    // Si hace clic en el fondo en modo Select: iniciar rectángulo de selección por arrastre (Marquee Box)
    if (activeTool === "select") {
      setSelectionBox({
        startWorld: worldPos,
        currentWorld: worldPos,
      });
      if (!e.shiftKey && !e.metaKey) {
        setSelectedIds([]);
      }
    } else {
      setSelectedIds([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);

    // Selección por arrastre en curso (Marquee Box)
    if (selectionBox) {
      const nextBox = { ...selectionBox, currentWorld: worldPos };
      setSelectionBox(nextBox);

      const boxX = Math.min(nextBox.startWorld.x, nextBox.currentWorld.x);
      const boxY = Math.min(nextBox.startWorld.y, nextBox.currentWorld.y);
      const boxW = Math.abs(nextBox.currentWorld.x - nextBox.startWorld.x);
      const boxH = Math.abs(nextBox.currentWorld.y - nextBox.startWorld.y);

      if (boxW > 6 || boxH > 6) {
        const matchedIds = elements
          .filter((el) => {
            const elW = el.width || (el.type === "sticky" ? 220 : el.type === "frame" ? 460 : 160);
            const elH = el.height || (el.type === "sticky" ? 180 : el.type === "frame" ? 320 : 40);
            return (
              el.x < boxX + boxW &&
              el.x + elW > boxX &&
              el.y < boxY + boxH &&
              el.y + elH > boxY
            );
          })
          .map((el) => el.id);

        setSelectedIds(matchedIds);
      }
      return;
    }

    // Redimensionamiento activo (Resize)
    if (resizing) {
      const target = elements.find((el) => el.id === resizing.elementId);
      if (!target) return;

      const deltaX = worldPos.x - resizing.startWorldPos.x;
      const deltaY = worldPos.y - resizing.startWorldPos.y;

      let newX = resizing.startElBox.x;
      let newY = resizing.startElBox.y;
      let newW = resizing.startElBox.width;
      let newH = resizing.startElBox.height;

      const minW = target.type === "sticky" ? 140 : target.type === "frame" ? 220 : 120;
      const minH = target.type === "sticky" ? 100 : target.type === "frame" ? 140 : 36;

      if (resizing.corner === "se") {
        newW = Math.max(resizing.startElBox.width + deltaX, minW);
        newH = Math.max(resizing.startElBox.height + deltaY, minH);
      } else if (resizing.corner === "sw") {
        newW = Math.max(resizing.startElBox.width - deltaX, minW);
        newH = Math.max(resizing.startElBox.height + deltaY, minH);
        newX = resizing.startElBox.x + (resizing.startElBox.width - newW);
      } else if (resizing.corner === "ne") {
        newW = Math.max(resizing.startElBox.width + deltaX, minW);
        newH = Math.max(resizing.startElBox.height - deltaY, minH);
        newY = resizing.startElBox.y + (resizing.startElBox.height - newH);
      } else if (resizing.corner === "nw") {
        newW = Math.max(resizing.startElBox.width - deltaX, minW);
        newH = Math.max(resizing.startElBox.height - deltaY, minH);
        newX = resizing.startElBox.x + (resizing.startElBox.width - newW);
        newY = resizing.startElBox.y + (resizing.startElBox.height - newH);
      }

      setElements((prev) =>
        prev.map((el) =>
          el.id === resizing.elementId
            ? { ...el, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) }
            : el
        )
      );
      return;
    }

    // Marker trazando
    if (currentStroke) {
      setCurrentStroke((prev) => (prev ? [...prev, worldPos] : [worldPos]));
      return;
    }

    // Flecha trazando
    if (arrowDraft) {
      setArrowDraft((prev) => (prev ? { ...prev, endX: worldPos.x, endY: worldPos.y } : null));
      return;
    }

    // Mover elemento(s) seleccionado(s) coordinadamente
    if (draggingElementId && Object.keys(dragStartPositions).length > 0) {
      const deltaX = worldPos.x - dragStartWorldPos.x;
      const deltaY = worldPos.y - dragStartWorldPos.y;

      setElements((prev) =>
        prev.map((el) => {
          const start = dragStartPositions[el.id];
          if (start) {
            return {
              ...el,
              x: Math.round(start.x + deltaX),
              y: Math.round(start.y + deltaY),
            };
          }
          return el;
        })
      );
      return;
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    // Finalizar Selección por Arrastre (Marquee Box)
    if (selectionBox) {
      const boxW = Math.abs(selectionBox.currentWorld.x - selectionBox.startWorld.x);
      const boxH = Math.abs(selectionBox.currentWorld.y - selectionBox.startWorld.y);

      if (boxW <= 6 && boxH <= 6) {
        setSelectedIds([]);
      } else if (selectedIds.length > 0) {
        playSound("pop");
      }
      setSelectionBox(null);
      return;
    }

    // Finalizar Resizing
    if (resizing) {
      setResizing(null);
      pushHistory(elements);
      return;
    }

    // Finalizar Marker
    if (currentStroke && currentStroke.length >= 1) {
      const pts =
        currentStroke.length === 1
          ? [currentStroke[0], { x: currentStroke[0].x + 0.1, y: currentStroke[0].y + 0.1 }]
          : currentStroke;

      // Calcular bounding box mínimo del trazo
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach((pt) => {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      });

      const newStroke: StrokeElement = {
        id: `stroke-${Date.now()}`,
        type: "stroke",
        points: pts,
        color: strokeColor,
        strokeWidth,
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(Math.round(maxX - minX), strokeWidth),
        height: Math.max(Math.round(maxY - minY), strokeWidth),
      };

      const next = [...elements, newStroke];
      setElements(next);
      setSelectedId(newStroke.id);
      pushHistory(next);
      setCurrentStroke(null);
      playSound("pop");
    } else {
      setCurrentStroke(null);
    }

    // Finalizar Flecha
    if (arrowDraft) {
      let { startX, startY, endX, endY } = arrowDraft;
      const dist = Math.hypot(endX - startX, endY - startY);
      if (dist < 8) {
        endX = startX + 120;
        endY = startY;
      }

      const newArrow: ArrowElement = {
        id: `arrow-${Date.now()}`,
        type: "arrow",
        startX: Math.round(startX),
        startY: Math.round(startY),
        endX: Math.round(endX),
        endY: Math.round(endY),
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.max(Math.abs(endX - startX), 20),
        height: Math.max(Math.abs(endY - startY), 20),
        color: strokeColor,
        strokeWidth,
      };

      const next = [...elements, newArrow];
      setElements(next);
      setSelectedId(newArrow.id);
      pushHistory(next);
      setArrowDraft(null);
      playSound("pop");
    }

    // Finalizar Dragging
    if (draggingElementId) {
      setDraggingElementId(null);
      setDragStartPositions({});
      setDragContainedElements([]);
      pushHistory(elements);
    }
  };

  // Iniciar drag de un elemento (soporte para selección individual o múltiple)
  const handleStartDragElement = (e: React.MouseEvent, el: BoardElement) => {
    if (activeTool !== "select" || isSpacePressed) return;
    e.stopPropagation();

    const worldPos = screenToWorld(e.clientX, e.clientY);

    let nextSelectedIds: string[];
    if (e.shiftKey || e.metaKey) {
      nextSelectedIds = selectedIds.includes(el.id)
        ? selectedIds.filter((id) => id !== el.id)
        : [...selectedIds, el.id];
      setSelectedIds(nextSelectedIds);
    } else {
      if (selectedIds.includes(el.id)) {
        nextSelectedIds = selectedIds;
      } else {
        nextSelectedIds = [el.id];
        setSelectedIds(nextSelectedIds);
      }
    }

    setDraggingElementId(el.id);
    setDragStartWorldPos(worldPos);

    // Mapear posiciones iniciales de todos los elementos seleccionados + contenidos en frames
    const startPositions: { [id: string]: { x: number; y: number } } = {};
    const containedMap: string[] = [];

    elements.forEach((item) => {
      if (nextSelectedIds.includes(item.id)) {
        startPositions[item.id] = { x: item.x, y: item.y };

        if (item.type === "frame") {
          const fW = item.width || 460;
          const fH = item.height || 320;
          elements.forEach((other) => {
            if (
              other.id !== item.id &&
              !nextSelectedIds.includes(other.id) &&
              other.x >= item.x &&
              other.x <= item.x + fW &&
              other.y >= item.y &&
              other.y <= item.y + fH
            ) {
              containedMap.push(other.id);
              startPositions[other.id] = { x: other.x, y: other.y };
            }
          });
        }
      }
    });

    setDragContainedElements(containedMap);
    setDragStartPositions(startPositions);
  };

  // Iniciar redimensionamiento desde una esquina
  const handleStartResize = (
    e: React.MouseEvent,
    el: BoardElement,
    corner: "nw" | "ne" | "se" | "sw"
  ) => {
    if (activeTool === "hand" || isSpacePressed) return;
    e.stopPropagation();
    setSelectedId(el.id);
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const defW = el.width || (el.type === "sticky" ? 220 : el.type === "frame" ? 460 : 160);
    const defH = el.height || (el.type === "sticky" ? 180 : el.type === "frame" ? 320 : 36);

    setResizing({
      elementId: el.id,
      corner,
      startWorldPos: worldPos,
      startElBox: { x: el.x, y: el.y, width: defW, height: defH },
    });
  };

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    if (elements.length === 0 || !containerRef.current) {
      setPan({ x: 80, y: 80 });
      setZoom(1);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      const elW = el.width || (el.type === "sticky" ? 220 : el.type === "frame" ? 460 : 120);
      const elH = el.height || (el.type === "sticky" ? 180 : el.type === "frame" ? 320 : 60);
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + elW);
      maxY = Math.max(maxY, el.y + elH);
    });

    const rect = containerRef.current.getBoundingClientRect();
    const contentW = maxX - minX + 160;
    const contentH = maxY - minY + 160;

    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.2);

    setZoom(targetZoom);
    setPan({
      x: rect.width / 2 - (minX + (maxX - minX) / 2) * targetZoom,
      y: rect.height / 2 - (minY + (maxY - minY) / 2) * targetZoom,
    });
  }, [elements]);

  // Auto-ordenar Frame (Tidy)
  const handleFrameTidy = useCallback(() => {
    const frame = elements.find((el) => el.id === selectedId && el.type === "frame");
    if (!frame) return;

    const fW = frame.width || 460;
    const fH = frame.height || 320;
    const contained = elements.filter(
      (other) =>
        other.id !== frame.id &&
        other.x >= frame.x &&
        other.x <= frame.x + fW &&
        other.y >= frame.y &&
        other.y <= frame.y + fH
    );

    if (contained.length === 0) return;

    // Alinear en fila/cuadrícula dentro del frame
    let curX = frame.x + 20;
    let curY = frame.y + 30;
    const pad = 15;

    const updated = elements.map((el) => {
      if (contained.some((c) => c.id === el.id)) {
        const itemW = el.width || 180;
        const itemH = el.height || 140;

        if (curX + itemW > frame.x + fW - 20) {
          curX = frame.x + 20;
          curY += itemH + pad;
        }

        const res = { ...el, x: curX, y: curY };
        curX += itemW + pad;
        return res;
      }
      return el;
    });

    setElements(updated);
    pushHistory(updated);
  }, [elements, selectedId, pushHistory]);

  // Insertar píldora de tarea desde el popover
  const handleInsertTaskPill = useCallback(
    (taskData: { taskId: string; projectId: string; title: string; projectName: string; projectColor: string }) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerWorld = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);

      // Offset en cascada para que tareas añadidas sucesivamente no se superpongan directamente
      const taskPillsCount = elements.filter((e) => e.type === "task_pill").length;
      const cascadeOffset = (taskPillsCount % 8) * 24;

      const newPill: TaskPillElement = {
        id: `task-pill-${Date.now()}`,
        type: "task_pill",
        taskId: taskData.taskId,
        projectId: taskData.projectId,
        title: taskData.title,
        projectName: taskData.projectName,
        projectColor: taskData.projectColor,
        x: Math.round(centerWorld.x - 100 + cascadeOffset),
        y: Math.round(centerWorld.y - 20 + cascadeOffset),
        width: 220,
        height: 40,
      };

      const next = [...elements, newPill];
      setElements(next);
      setSelectedId(newPill.id);
      pushHistory(next);
    },
    [elements, screenToWorld, pushHistory, setSelectedId]
  );

  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedId),
    [elements, selectedId]
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative w-full h-full overflow-hidden select-none bg-[#0d0d0d] ${
        activeTool === "hand" || isSpacePressed
          ? isPanning
            ? "cursor-grabbing"
            : "cursor-grab"
          : activeTool === "marker"
          ? "cursor-crosshair"
          : activeTool === "arrow"
          ? "cursor-crosshair"
          : activeTool === "sticky" || activeTool === "frame" || activeTool === "text"
          ? "cursor-cell"
          : "cursor-default"
      }`}
      style={{
        backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.16) 1px, transparent 1px)`,
        backgroundSize: `${gridStep}px ${gridStep}px`,
        backgroundPosition: `${pan.x % gridStep}px ${pan.y % gridStep}px`,
      }}
    >
      {/* ── 1. HEADER FLOTANTE SUPERIOR IZQUIERDO ── */}
      <BoardTopNav
        board={board}
        boards={boards}
        onSelectBoard={onSelectBoard}
        onCreateBoard={onCreateBoard}
        onUpdateTitle={onUpdateTitle}
        onBackToCatalog={onBackToCatalog}
        saveStatus={saveStatus}
      />

      {/* ── 2. BOTONERA VERTICAL FLOTANTE INFERIOR IZQUIERDA ── */}
      <BoardBottomLeftToolbar
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFitToScreen={handleFitToScreen}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.15, 0.15))}
        onResetZoom={() => setZoom(1)}
      />

      {/* ── 3. DOCK HORIZONTAL FLOTANTE INFERIOR ── */}
      <BoardBottomCenterDock
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        strokeColor={strokeColor}
        onStrokeColorChange={(c) => {
          setStrokeColor(c);
          if (selectedIds.length > 0) {
            const next = elements.map((el) =>
              selectedIds.includes(el.id) && (el.type === "stroke" || el.type === "arrow")
                ? { ...el, color: c }
                : el
            );
            setElements(next);
            pushHistory(next);
          }
        }}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={(w) => {
          setStrokeWidth(w);
          if (selectedIds.length > 0) {
            const next = elements.map((el) =>
              selectedIds.includes(el.id) && (el.type === "stroke" || el.type === "arrow")
                ? { ...el, strokeWidth: w }
                : el
            );
            setElements(next);
            pushHistory(next);
          }
        }}
        stickyColor={stickyColor}
        onStickyColorChange={(c) => {
          setStickyColor(c);
          if (selectedIds.length > 0) {
            const next = elements.map((el) =>
              selectedIds.includes(el.id) && el.type === "sticky" ? { ...el, color: c } : el
            );
            setElements(next);
            pushHistory(next);
          }
        }}
        textSize={textSize}
        onTextSizeChange={(s) => {
          setTextSize(s);
          if (selectedIds.length > 0) {
            const next = elements.map((el) =>
              selectedIds.includes(el.id) && el.type === "text" ? { ...el, fontSize: s } : el
            );
            setElements(next);
            pushHistory(next);
          }
        }}
        textColor={textColor}
        onTextColorChange={(c) => {
          setTextColor(c);
          if (selectedIds.length > 0) {
            const next = elements.map((el) =>
              selectedIds.includes(el.id) && el.type === "text" ? { ...el, color: c } : el
            );
            setElements(next);
            pushHistory(next);
          }
        }}
        frameColor={frameColor}
        onFrameColorChange={(c) => {
          setFrameColor(c);
          if (selectedIds.length > 0) {
            const next = elements.map((el) =>
              selectedIds.includes(el.id) && el.type === "frame" ? { ...el, backgroundColor: c } : el
            );
            setElements(next);
            pushHistory(next);
          }
        }}
        onFrameTidy={handleFrameTidy}
        selectedElement={selectedElement}
        onToggleInsertTasks={() => setIsInsertTasksOpen((prev) => !prev)}
        isInsertTasksOpen={isInsertTasksOpen}
      />

      {/* ── 4. POPOVER INSERTAR TAREAS (Del botón Plus +) ── */}
      <BoardInsertTasksPopover
        isOpen={isInsertTasksOpen}
        onClose={() => setIsInsertTasksOpen(false)}
        onInsertTask={handleInsertTaskPill}
      />

      {/* ── 5. CAPA ÚNICA DE MUNDO (World Transform Layer) ── */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {/* SVG Layer para trazos libres y flechas */}
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-10">
          {/* Trazos guardados */}
          {elements
            .filter((el) => el.type === "stroke")
            .map((el: any) => {
              const isSelected = selectedIds.includes(el.id);
              const pathData = el.points.reduce((acc: string, pt: any, i: number) => {
                return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
              }, "");

              return (
                <g
                  key={el.id}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey || e.metaKey) {
                      setSelectedIds((prev) =>
                        prev.includes(el.id) ? prev.filter((id) => id !== el.id) : [...prev, el.id]
                      );
                    } else {
                      setSelectedIds([el.id]);
                    }
                  }}
                >
                  {/* Trazo invisible más ancho para facilitar la selección al hacer clic */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max((el.strokeWidth || 4) + 12, 16)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={pathData}
                    fill="none"
                    stroke={el.color || "#3B82F6"}
                    strokeWidth={el.strokeWidth || 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {isSelected && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#60A5FA"
                      strokeWidth={(el.strokeWidth || 4) + 6}
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            })}

          {/* Trazo en curso actual */}
          {currentStroke && currentStroke.length > 0 && (
            currentStroke.length === 1 ? (
              <circle
                cx={currentStroke[0].x}
                cy={currentStroke[0].y}
                r={Math.max(strokeWidth / 2, 2)}
                fill={strokeColor}
              />
            ) : (
              <path
                d={currentStroke.reduce((acc: string, pt: any, i: number) => {
                  return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                }, "")}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          )}

          {/* Flechas guardadas */}
          {elements
            .filter((el) => el.type === "arrow")
            .map((el: any) => {
              const isSelected = selectedIds.includes(el.id);
              return (
                <g
                  key={el.id}
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey || e.metaKey) {
                      setSelectedIds((prev) =>
                        prev.includes(el.id) ? prev.filter((id) => id !== el.id) : [...prev, el.id]
                      );
                    } else {
                      setSelectedIds([el.id]);
                    }
                  }}
                >
                  <defs>
                    <marker
                      id={`arrowhead-${el.id}`}
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="4"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 4, 0 8" fill={el.color || "#3B82F6"} />
                    </marker>
                  </defs>
                  {/* Línea invisible más ancha para facilitar el clic/selección */}
                  <line
                    x1={el.startX}
                    y1={el.startY}
                    x2={el.endX}
                    y2={el.endY}
                    stroke="transparent"
                    strokeWidth={Math.max((el.strokeWidth || 3) + 12, 16)}
                  />
                  <line
                    x1={el.startX}
                    y1={el.startY}
                    x2={el.endX}
                    y2={el.endY}
                    stroke={el.color || "#3B82F6"}
                    strokeWidth={el.strokeWidth || 3}
                    strokeLinecap="round"
                    markerEnd={`url(#arrowhead-${el.id})`}
                  />
                  {isSelected && (
                    <line
                      x1={el.startX}
                      y1={el.startY}
                      x2={el.endX}
                      y2={el.endY}
                      stroke="#60A5FA"
                      strokeWidth={(el.strokeWidth || 3) + 6}
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}

          {/* Flecha en borrador actual */}
          {arrowDraft && (
            <g>
              <defs>
                <marker
                  id="arrowhead-draft"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" fill={strokeColor} />
                </marker>
              </defs>
              <line
                x1={arrowDraft.startX}
                y1={arrowDraft.startY}
                x2={
                  Math.hypot(arrowDraft.endX - arrowDraft.startX, arrowDraft.endY - arrowDraft.startY) < 4
                    ? arrowDraft.startX + 14
                    : arrowDraft.endX
                }
                y2={
                  Math.hypot(arrowDraft.endX - arrowDraft.startX, arrowDraft.endY - arrowDraft.startY) < 4
                    ? arrowDraft.startY
                    : arrowDraft.endY
                }
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                markerEnd="url(#arrowhead-draft)"
              />
            </g>
          )}
        </svg>

        {/* ── 1. FRAMES (Capa base de contenedores) ── */}
        {elements
          .filter((el) => el.type === "frame")
          .map((el: any) => {
            const isSelected = selectedIds.includes(el.id);

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleStartDragElement(e, el)}
                className={`absolute rounded-2xl pointer-events-auto transition-shadow group ${
                  isSelected
                    ? "ring-2 ring-blue-500 shadow-2xl shadow-black/80"
                    : "hover:ring-1 hover:ring-white/20"
                }`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width || 460}px`,
                  height: `${el.height || 320}px`,
                  backgroundColor: el.backgroundColor || "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${el.borderColor || "rgba(255, 255, 255, 0.15)"}`,
                  cursor: activeTool === "select" ? "move" : "default",
                }}
              >
                {/* Etiqueta superior del Frame */}
                <span className="absolute -top-6 left-1 text-[13px] font-medium text-white/60 select-none">
                  {el.title || "Frame"}
                </span>

                {/* 4 Tiradores de esquina interactivos cuando está seleccionado */}
                {isSelected && (
                  <>
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "nw")}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nwse-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "ne")}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nesw-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "sw")}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nesw-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "se")}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nwse-resize z-30 shadow-sm"
                    />
                  </>
                )}
              </div>
            );
          })}

        {/* ── 2. STICKY NOTES ── */}
        {elements
          .filter((el) => el.type === "sticky")
          .map((el: any) => {
            const isSelected = selectedIds.includes(el.id);

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleStartDragElement(e, el)}
                className={`absolute rounded-xl p-3.5 flex flex-col pointer-events-auto transition-shadow ${
                  isSelected
                    ? "ring-2 ring-blue-500 shadow-2xl shadow-black/60"
                    : "shadow-lg hover:shadow-xl"
                }`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width || 220}px`,
                  height: `${el.height || 180}px`,
                  backgroundColor: el.color || "#FCD34D",
                  cursor: activeTool === "select" ? "move" : "default",
                }}
              >
                {/* Textarea editable de la nota */}
                <textarea
                  value={el.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    const next = elements.map((item) =>
                      item.id === el.id ? { ...item, text: newText } : item
                    );
                    setElements(next);
                    pushHistory(next);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Jot something..."
                  className="w-full h-full bg-transparent resize-none outline-none font-medium text-[14px] text-black/80 placeholder-black/40 leading-snug custom-scrollbar"
                />

                {/* 4 Tiradores de esquina interactivos */}
                {isSelected && (
                  <>
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "nw")}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nwse-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "ne")}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nesw-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "sw")}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nesw-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "se")}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-nwse-resize z-30 shadow-sm"
                    />
                  </>
                )}
              </div>
            );
          })}

        {/* ── 3. TASK PILLS (Píldoras de tareas arrastrables con color de proyecto) ── */}
        {elements
          .filter((el) => el.type === "task_pill")
          .map((el: any) => {
            const isSelected = selectedIds.includes(el.id);

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleStartDragElement(e, el)}
                className={`absolute px-3 py-2 rounded-xl flex items-center gap-2 pointer-events-auto transition-shadow shadow-md ${
                  isSelected ? "ring-2 ring-blue-500 shadow-xl" : "hover:shadow-lg"
                }`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: el.width ? `${el.width}px` : undefined,
                  height: el.height ? `${el.height}px` : undefined,
                  backgroundColor: el.projectColor || "#3B82F6",
                  cursor: activeTool === "select" ? "move" : "default",
                }}
              >
                <span className="text-[13px] font-semibold text-white whitespace-nowrap truncate">
                  {el.title}
                </span>

                {isSelected && (
                  <>
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "nw")}
                      className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white cursor-nwse-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "ne")}
                      className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white cursor-nesw-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "sw")}
                      className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white cursor-nesw-resize z-30 shadow-sm"
                    />
                    <span
                      onMouseDown={(e) => handleStartResize(e, el, "se")}
                      className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white cursor-nwse-resize z-30 shadow-sm"
                    />
                  </>
                )}
              </div>
            );
          })}

        {/* ── 4. TEXT ELEMENTS ── */}
        {elements
          .filter((el) => el.type === "text")
          .map((el: any) => {
            const isSelected = selectedIds.includes(el.id);
            const isEditing = editingTextId === el.id;
            const fontClass =
              el.fontSize === "xl"
                ? "text-[26px] font-extrabold"
                : el.fontSize === "lg"
                ? "text-[20px] font-bold"
                : el.fontSize === "sm"
                ? "text-[12px] font-medium"
                : "text-[15px] font-semibold";

            return (
              <div
                key={el.id}
                onMouseDown={(e) => {
                  if (!isEditing) {
                    handleStartDragElement(e, el);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingTextId(el.id);
                }}
                className={`absolute pointer-events-auto px-2 py-1 rounded-lg transition-shadow select-none ${
                  isSelected ? "ring-2 ring-blue-500 shadow-lg" : "hover:ring-1 hover:ring-white/20"
                } ${isEditing ? "cursor-text" : activeTool === "select" ? "cursor-move" : "cursor-default"}`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  color: el.color || "#ffffff",
                }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    defaultValue={el.text === "Escribe algo..." || el.text === "Type something..." ? "" : el.text}
                    onChange={(e) => {
                      const newText = e.target.value;
                      const next = elements.map((item) =>
                        item.id === el.id ? { ...item, text: newText } : item
                      );
                      setElements(next);
                    }}
                    onBlur={(e) => {
                      const finalVal = e.target.value.trim() || "Texto";
                      const next = elements.map((item) =>
                        item.id === el.id ? { ...item, text: finalVal } : item
                      );
                      setElements(next);
                      pushHistory(next);
                      setEditingTextId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        e.currentTarget.blur();
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Escribe algo..."
                    className={`bg-transparent outline-none border-b border-blue-500/50 min-w-[80px] ${fontClass}`}
                  />
                ) : (
                  <span className={`inline-block select-none whitespace-pre-wrap ${fontClass}`}>
                    {el.text || "Escribe algo..."}
                  </span>
                )}

                {isSelected && !isEditing && (
                  <>
                    <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white" />
                    <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white" />
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-sm bg-blue-500 border border-white" />
                  </>
                )}
              </div>
            );
          })}

        {/* ── RECTÁNGULO DE SELECCIÓN POR ARRASTRE (Marquee Selection Box) ── */}
        {selectionBox && (
          <div
            className="absolute pointer-events-none border border-blue-500 bg-blue-500/15 rounded-sm z-50 transition-none"
            style={{
              left: `${Math.min(selectionBox.startWorld.x, selectionBox.currentWorld.x)}px`,
              top: `${Math.min(selectionBox.startWorld.y, selectionBox.currentWorld.y)}px`,
              width: `${Math.abs(selectionBox.currentWorld.x - selectionBox.startWorld.x)}px`,
              height: `${Math.abs(selectionBox.currentWorld.y - selectionBox.startWorld.y)}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}

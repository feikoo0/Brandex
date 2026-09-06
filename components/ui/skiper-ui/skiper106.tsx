"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import React, {
  type ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

const SPRING_CONFIG = {
  stiffness: 480,
  damping: 32,
  mass: 0.4,
};

const REDUCED_SPRING_CONFIG = {
  stiffness: 10000,
  damping: 100,
  mass: 0.1,
};

const PASSWORD_CHAR =
  typeof navigator !== "undefined" &&
  navigator.userAgent.match(/firefox|fxios/i)
    ? "\u25CF"
    : "\u2022";

export type SmoothInputProps = ComponentPropsWithoutRef<"input"> & {
  wrapperClassName?: string;
  caretClassName?: string;
  unstyled?: boolean;
};

/**
 * SmoothInput - Componente de input con cursor fluido animado mediante resorte (Skiper 106).
 * Mide la posición exacta del cursor en tiempo real mediante elemento espejo DOM y métricas de Canvas.
 */
export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  (
    {
      className,
      wrapperClassName,
      caretClassName,
      unstyled = false,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      type = "text",
      style,
      placeholder,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState<string>(
      (defaultValue as string) ?? ""
    );
    const caretX = useMotionValue(0);
    const caretOpacity = useMotionValue(0);
    const [isFocused, setIsFocused] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const measureSpanRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const isControlled = value !== undefined;
    const inputValue = isControlled ? String(value ?? "") : internalValue;

    const springCaretX = useSpring(
      caretX,
      prefersReducedMotion ? REDUCED_SPRING_CONFIG : SPRING_CONFIG
    );

    const getCaretIndex = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      return target.selectionDirection === "backward"
        ? selectionStart
        : selectionEnd;
    };

    const updateCaretFromInput = (target: HTMLInputElement) => {
      if (!isFocused && document.activeElement !== target) {
        caretOpacity.set(0);
        return;
      }

      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;

      if (hasSelection || disabled) {
        caretOpacity.set(0);
        return;
      }

      const measureSpan = measureSpanRef.current;
      if (!measureSpan) return;

      const caretIndex = getCaretIndex(target);
      const isPassword = target.type === "password";
      const fullText = target.value || "";
      const textBeforeCaret = isPassword
        ? PASSWORD_CHAR.repeat(caretIndex)
        : fullText.slice(0, caretIndex);

      const styles = window.getComputedStyle(target);
      const font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      measureSpan.style.font = font;
      measureSpan.style.letterSpacing = styles.letterSpacing;
      measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
      measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
      measureSpan.style.textTransform = styles.textTransform;

      // Medir prefijo
      measureSpan.textContent = textBeforeCaret;
      const prefixWidth = measureSpan.offsetWidth;

      // Medir total
      measureSpan.textContent = fullText;
      const totalWidth = measureSpan.offsetWidth;

      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const textAlign = styles.textAlign;
      const clientWidth = target.clientWidth;

      let caretPosition = 0;

      if (textAlign === "center") {
        const availableWidth = clientWidth - paddingLeft - paddingRight;
        const startX = Math.max(paddingLeft, paddingLeft + (availableWidth - totalWidth) / 2);
        caretPosition = startX + prefixWidth - target.scrollLeft;
      } else if (textAlign === "right") {
        caretPosition =
          clientWidth - paddingRight - (totalWidth - prefixWidth) - target.scrollLeft;
      } else {
        caretPosition = paddingLeft + prefixWidth - target.scrollLeft;
      }

      const minX = paddingLeft;
      const maxX = clientWidth - paddingRight;

      caretX.set(Math.min(Math.max(caretPosition, minX - 1), maxX + 1));
      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromInput);
    updateCaretRef.current = updateCaretFromInput;

    useEffect(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        updateCaretRef.current(input);
      }
    }, [inputValue]);

    useEffect(() => {
      const input = inputRef.current;
      const container = containerRef.current;
      if (!input || !container) return;

      const update = () => {
        if (document.activeElement === input) {
          updateCaretRef.current(input);
        }
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== input) return;
        requestAnimationFrame(update);
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      if (document.fonts) {
        document.fonts.addEventListener("loadingdone", update);
        void document.fonts.ready.then(update);
      }
      input.addEventListener("scroll", update);

      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(container);
      resizeObserver.observe(input);

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        if (document.fonts) {
          document.fonts.removeEventListener("loadingdone", update);
        }
        input.removeEventListener("scroll", update);
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex items-center min-w-0 w-full",
          unstyled
            ? ""
            : "rounded-xl border border-white/10 bg-white/[0.03] transition-colors focus-within:border-white/30",
          wrapperClassName
        )}
      >
        <input
          {...props}
          ref={inputRef}
          type={type}
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            ...style,
            caretColor: "transparent",
          }}
          className={cn(
            "w-full bg-transparent outline-none border-none ring-0 focus:outline-none focus:ring-0 p-0 text-inherit leading-normal placeholder:text-white/30 caret-transparent",
            className
          )}
          onChange={(e) => {
            if (!isControlled) setInternalValue(e.target.value);
            onChange?.(e);
            requestAnimationFrame(() => {
              updateCaretRef.current(e.target);
            });
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
            requestAnimationFrame(() => {
              updateCaretRef.current(e.target);
            });
          }}
          onBlur={(e) => {
            setIsFocused(false);
            caretOpacity.set(0);
            onBlur?.(e);
          }}
        />

        {/* Elemento de medición de texto fuera de pantalla */}
        <span
          ref={measureSpanRef}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre opacity-0 select-none"
        />

        {/* Smooth spring animated caret */}
        <motion.div
          aria-hidden
          className={cn(
            "pointer-events-none absolute z-30 w-[1.5px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]",
            caretClassName
          )}
          style={{
            x: springCaretX,
            opacity: caretOpacity,
            height: "1.15em",
          }}
        />
      </div>
    );
  }
);
SmoothInput.displayName = "SmoothInput";

export type SmoothTextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  wrapperClassName?: string;
  caretClassName?: string;
  unstyled?: boolean;
};

/**
 * SmoothTextarea - Componente textarea con cursor fluido animado en 2 dimensiones (x, y) con físicas de resorte.
 * Mide con precisión milimétrica la posición del cursor mediante un contenedor espejo que alberga el texto completo
 * para preservar perfectamente alineaciones centradas, derechas o multilíneas.
 */
export const SmoothTextarea = forwardRef<HTMLTextAreaElement, SmoothTextareaProps>(
  (
    {
      className,
      wrapperClassName,
      caretClassName,
      unstyled = false,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      style,
      placeholder,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState<string>(
      (defaultValue as string) ?? ""
    );
    const caretX = useMotionValue(0);
    const caretY = useMotionValue(0);
    const caretHeight = useMotionValue(16);
    const caretOpacity = useMotionValue(0);
    const [isFocused, setIsFocused] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const isControlled = value !== undefined;
    const inputValue = isControlled ? String(value ?? "") : internalValue;

    const springCaretX = useSpring(
      caretX,
      prefersReducedMotion ? REDUCED_SPRING_CONFIG : SPRING_CONFIG
    );
    const springCaretY = useSpring(
      caretY,
      prefersReducedMotion ? REDUCED_SPRING_CONFIG : SPRING_CONFIG
    );

    const syncMirrorStyles = () => {
      const textarea = textareaRef.current;
      const mirror = mirrorRef.current;
      if (!textarea || !mirror) return;

      const styles = window.getComputedStyle(textarea);
      mirror.style.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      mirror.style.fontSize = styles.fontSize;
      mirror.style.fontFamily = styles.fontFamily;
      mirror.style.fontWeight = styles.fontWeight;
      mirror.style.letterSpacing = styles.letterSpacing;
      mirror.style.lineHeight = styles.lineHeight;
      mirror.style.paddingLeft = styles.paddingLeft;
      mirror.style.paddingRight = styles.paddingRight;
      mirror.style.paddingTop = styles.paddingTop;
      mirror.style.paddingBottom = styles.paddingBottom;
      mirror.style.borderWidth = styles.borderWidth;
      mirror.style.boxSizing = styles.boxSizing;
      mirror.style.width = `${textarea.clientWidth}px`;
      mirror.style.textAlign = styles.textAlign;
      mirror.style.wordBreak = "break-word";
      mirror.style.whiteSpace = "pre-wrap";
    };

    const updateCaretFromTextarea = (target: HTMLTextAreaElement) => {
      if (!isFocused && document.activeElement !== target) {
        caretOpacity.set(0);
        return;
      }

      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;

      if (hasSelection || disabled) {
        caretOpacity.set(0);
        return;
      }

      const mirror = mirrorRef.current;
      const marker = markerRef.current;
      if (!mirror || !marker) return;

      syncMirrorStyles();

      const text = target.value || "";
      const textBefore = text.slice(0, selectionStart);
      const textAfter = text.slice(selectionStart);

      // Limpiar espejo y estructurar con el texto completo para alineación idéntica
      mirror.textContent = "";
      const spanBefore = document.createTextNode(textBefore);
      const spanAfter = document.createTextNode(textAfter);

      marker.textContent = "\uFEFF"; // zero-width character para medición precisa
      marker.style.visibility = "hidden";

      mirror.appendChild(spanBefore);
      mirror.appendChild(marker);
      mirror.appendChild(spanAfter);

      const styles = window.getComputedStyle(target);
      const computedLineHeight =
        parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2 || 16;
      const h = computedLineHeight * 0.9;
      caretHeight.set(h);

      const posX = marker.offsetLeft - target.scrollLeft;
      const posY = marker.offsetTop - target.scrollTop + (computedLineHeight - h) / 2;

      const minX = parseFloat(styles.paddingLeft) || 0;
      const maxX = target.clientWidth - (parseFloat(styles.paddingRight) || 0);

      caretX.set(Math.min(Math.max(posX, minX - 1), maxX + 1));
      caretY.set(posY);
      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromTextarea);
    updateCaretRef.current = updateCaretFromTextarea;

    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea && document.activeElement === textarea) {
        updateCaretRef.current(textarea);
      }
    }, [inputValue]);

    useEffect(() => {
      const textarea = textareaRef.current;
      const container = containerRef.current;
      if (!textarea || !container) return;

      const update = () => {
        if (document.activeElement === textarea) {
          updateCaretRef.current(textarea);
        }
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== textarea) return;
        requestAnimationFrame(update);
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      if (document.fonts) {
        document.fonts.addEventListener("loadingdone", update);
        void document.fonts.ready.then(update);
      }
      textarea.addEventListener("scroll", update);

      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(container);
      resizeObserver.observe(textarea);

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        if (document.fonts) {
          document.fonts.removeEventListener("loadingdone", update);
        }
        textarea.removeEventListener("scroll", update);
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex min-w-0 w-full overflow-hidden",
          unstyled
            ? ""
            : "rounded-xl border border-white/10 bg-white/[0.03] transition-colors focus-within:border-white/30",
          wrapperClassName
        )}
      >
        <textarea
          {...props}
          ref={textareaRef}
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            ...style,
            caretColor: "transparent",
          }}
          className={cn(
            "w-full bg-transparent outline-none border-none ring-0 focus:outline-none focus:ring-0 p-0 text-inherit leading-normal placeholder:text-white/30 resize-none caret-transparent",
            className
          )}
          onChange={(e) => {
            if (!isControlled) setInternalValue(e.target.value);
            onChange?.(e);
            requestAnimationFrame(() => {
              updateCaretRef.current(e.target);
            });
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
            requestAnimationFrame(() => {
              updateCaretRef.current(e.target);
            });
          }}
          onBlur={(e) => {
            setIsFocused(false);
            caretOpacity.set(0);
            onBlur?.(e);
          }}
        />

        {/* Hidden measurement mirror div */}
        <div
          ref={mirrorRef}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 overflow-hidden select-none opacity-0"
          style={{ visibility: "hidden", pointerEvents: "none" }}
        >
          <span ref={markerRef}>{"\uFEFF"}</span>
        </div>

        {/* Smooth 2D spring animated caret */}
        <motion.div
          aria-hidden
          className={cn(
            "pointer-events-none absolute z-30 w-[1.5px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]",
            caretClassName
          )}
          style={{
            x: springCaretX,
            y: springCaretY,
            height: caretHeight,
            opacity: caretOpacity,
          }}
        />
      </div>
    );
  }
);
SmoothTextarea.displayName = "SmoothTextarea";

export const Input = SmoothInput;
export const Skiper106 = SmoothInput;

export default SmoothInput;

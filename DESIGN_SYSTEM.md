# Sistema de Diseño Oficial de Taski (Taski Design System)

Este documento define la guía oficial de colores, superficies, trazos y tipografías para mantener consistencia visual en todas las vistas y futuras implementaciones de Taski.

---

## 1. Jerarquía de Capas y Superficies (Capas Sólidas)

| Capa | Elemento / Componente | Color de Fondo | Trazo / Borde | Curvatura (Radius) |
| :--- | :--- | :--- | :--- | :--- |
| **Capa 0** | Marco exterior / Base Canvas | `#181817` (`bg-[#181817]`) | Sin borde | `rounded-none` |
| **Capa 1** | Lienzo de Trabajo principal (/taski, Admin, Vistas) | `#121212` (`bg-[#121212]`) | `border-white/[0.08]` (8% opacidad) | `rounded-[24px]` (24px) |
| **Capa 2A** | Módulos de sección (ej. Contenedor de Sesiones) | `#1f1f1f` (`bg-[#1f1f1f]`) | Sin borde explícito | `rounded-[28px]` (28px) |
| **Capa 2B** | Tarjetas contenedoras estándar (Login, Modales, Cards) | `#181818` (`bg-[#181818]`) | `border border-white/10` (10% opacidad) | `rounded-[24px]` o `rounded-3xl` |
| **Capa 3** | Inputs, Sub-paneles y Botones secundarios | `#222222` (`bg-[#222222]`) | `border border-white/10` (10% opacidad) | `rounded-xl` (12px) |
| **Capa 4** | Micro-tarjetas / Items de sesión / Historial | Reposo: `bg-white/[0.025]`<br>Hover: `hover:bg-white/[0.045]` | `border-white/5` | `rounded-2xl` (16px) |

---

## 2. Menú Desplegable Lateral (Sidebar)

* **Fondo del contenedor lateral:** Transparente (`bg-transparent`), descansa directamente sobre el marco `#181817`.
* **Botón "Nuevo proyecto" / Píldora Activa:** `bg-white/10` (`rgba(255, 255, 255, 0.10)`) con borde `border-[#ffffff1f]`.
* **Ítems en Hover:** `bg-white/5` (`rgba(255, 255, 255, 0.05)`).
* **Ítems en Reposo:** Transparente (`bg-transparent`).

---

## 3. Tipografía y Contraste de Texto

* **Texto Principal / Títulos:** `#ffffffd6` (`text-[#ffffffd6]` — blanco al 84% de opacidad). **Nunca usar blanco puro `#ffffff` en títulos**.
* **Subtítulos y Metadatos:** `#ffffff6b` (`text-[#ffffff6b]` — blanco al 42% de opacidad) o `text-white/40`.
* **Botón de Acción Principal:** Azul Taski `#3a7bd5` (`var(--blue)`).
* **Píldoras de Estado Semántico:**
  * **Urgente:** `bg-rose-500/20 text-rose-400 border-rose-500/40`
  * **Alta:** `bg-orange-500/20 text-orange-400 border-orange-500/40`
  * **Media:** `bg-yellow-500/20 text-yellow-400 border-yellow-500/40`
  * **Baja / Completado:** `bg-emerald-500/20 text-emerald-400 border-emerald-500/40`

---

## 4. Filosofía Visual

1. **Superficies Sólidas Minimalistas:** Se evitan efectos pesados de glassmorphism, blur excesivo o gradientes saturados en tarjetas.
2. **Trazos Finos (Crisp Strokes):** Todos los elementos interactivos o contenedores cuentan con bordes finos de entre 8% y 10% de opacidad blanca (`border-white/[0.08]` o `border-white/10`).
3. **Sombras Suaves:** Sombras sutiles sin brillos fluorescentes.

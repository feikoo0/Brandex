# Rules for Taski Development

## Dev Server & Build Management

To prevent desynchronization errors and 404 resource crashes in the Next.js development server:

1. **Avoid running `npm run build` or `next build` while `npm run dev` is active.**
   - Running them concurrently overwrites `.next` manifests and compiled assets, causing the running development server to return `404` for all hot-reloaded chunks requested by the browser.
2. **Checking Types and Linting Safely**:
   - To verify code formatting and compilation validity, do NOT run `npm run build`.
   - Instead, use the following non-modifying commands:
     - Check TypeScript compiler errors: `npx tsc --noEmit`
     - Check ESLint issues: `npm run lint`
3. **Recovery Procedure**:
   - If a build check is run and causes 404 styling/javascript issues on the client:
     - Stop the running development server process.
     - Clean the Next.js cache directory: `rm -rf .next`
     - Restart the server: `npm run dev`


## Taski Aesthetic & Design System Protocol

To maintain complete visual harmony across Taski (matching the Work page and navigation menu):

1. **Minimalist Solid Surface Strategy**:
   - Do NOT use heavy glassmorphism, background blurs, neon gradients, or bright saturated card backgrounds.
   - Use clean, solid dark surfaces: `#181817` for outer frame, `#121212` for main page canvas container, `#181818` for card containers, `#222222` for sub-panels and inputs.
2. **Crisp Stroke Lines & Outlines (Trazos Finos)**:
   - All cards, pills, buttons, inputs, and popovers MUST have a crisp, fine stroke border (`border border-white/10` or `border-black/10`).
   - Shadows should be subtle and soft (`shadow-sm` or `shadow-md`), avoiding large glowing drop-shadows.
3. **Color Palette Harmony (3 Main Layers)**:
   - Layer 1 (Canvas): Neutral dark (`#181817` main frame, `#121212` main container).
   - Layer 2 (Containers & Cards): Solid surface (`#181818` with `border border-white/10`).
   - Layer 3 (Contrast & Accents): Title/Header text MUST use `text-[#ffffffd6]` (NEVER pure `#ffffff`), muted subtext uses `text-[#ffffff6b]` or `text-white/40`, and semantically controlled accents:
     - Priority/Status Pills: Urgente = `bg-rose-500/20 text-rose-400 border-rose-500/40`, Alta = `bg-orange-500/20 text-orange-400 border-orange-500/40`, Media = `bg-yellow-500/20 text-yellow-400 border-yellow-500/40`, Baja / Done = `bg-emerald-500/20 text-emerald-400 border-emerald-500/40`.
     - Action Buttons: `var(--blue)` (`#3a7bd5`) or solid dark `#1c1c24` with fine stroke.
4. **Typography & Geometry**:
   - Font: `Aeonik` / `NB International Pro`.
   - Headers: `font-bold` or `font-black` with `tracking-tight`.
   - Meta/Labels: `text-[10px]` or `text-[11px]`, `font-bold`, `uppercase tracking-widest text-white/40`.
   - Corner Radius: `rounded-3xl` for project cards (`rounded-[24px]`), `rounded-2xl` for sub-cards, `rounded-xl` for buttons/inputs, `rounded-full` for status/client pills.
5. **Project Card Architecture (Matching User Reference Designs)**:
   - **Style 1 (Portada)**: Top banner in solid project color (`projColor`) containing white stroke outline task format shapes (`ProjectCoverFormats`), bottom dark body `#1a1a1a` with title in `text-[#ffffffd6]`, client name + date in `text-[#ffffff6b]`, and bottom segmented progress bar (`Tarea X de Y` + flex segments).
   - **Style 2 (Color Completo)**: Full vibrant project color background, top meta `Cliente • Entrega X`, white stroke format icon box, title + subtitle, and bottom segmented progress bar.


## Figma Integration Protocol

1. **Authentication**: Conectado mediante `FIGMA_PERSONAL_ACCESS_TOKEN` almacenado en `.env.local` para el usuario Feiko (`contacto.milenial@gmail.com`).
2. **Lectura de Diseños**: Al recibir la URL de un archivo de Figma (`https://www.figma.com/design/:file_key/...`), Antigravity extraerá las capas, coordenadas, espaciados y vectores a través de la API REST de Figma (`https://api.figma.com/v1/files/:file_key`).
3. **Conversión a Código**: Traducir directamente los marcos y formas de Figma a componentes React + Tailwind CSS preservando dimensiones, curvaturas y paletas exactas.

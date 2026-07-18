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



## Figma Integration Protocol

1. **Authentication**: Conectado mediante `FIGMA_PERSONAL_ACCESS_TOKEN` almacenado en `.env.local` para el usuario Feiko (`contacto.milenial@gmail.com`).
2. **Lectura de Diseños**: Al recibir la URL de un archivo de Figma (`https://www.figma.com/design/:file_key/...`), Antigravity extraerá las capas, coordenadas, espaciados y vectores a través de la API REST de Figma (`https://api.figma.com/v1/files/:file_key`).
3. **Conversión a Código**: Traducir directamente los marcos y formas de Figma a componentes React + Tailwind CSS preservando dimensiones, curvaturas y paletas exactas.






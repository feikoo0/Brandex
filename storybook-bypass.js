const Module = require('module');
const path = require('path');

// Intercept webpack imports to bypass Next.js custom prebundled webpack hook
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  // If Next.js hijacked and resolved it to its prebundled webpack version,
  // redirect it back to the clean root webpack 5 module.
  if (request.includes('next/dist/compiled/webpack') || request.includes('next\\dist\\compiled\\webpack')) {
    try {
      // If it's looking for the main bundle, map to webpack root
      if (request.endsWith('bundle5.js') || request.endsWith('bundle5')) {
        return originalResolveFilename.apply(this, [
          require.resolve('webpack', { paths: [process.cwd()] }),
          parent,
          isMain
        ]);
      }
      // If it's looking for submodules/loaders within the webpack bundle
      const subpathMatch = request.match(/webpack\/v4\/v5\/(.+)$/) || request.match(/webpack\/v5\/(.+)$/) || request.match(/webpack\/(.+)$/);
      if (subpathMatch && subpathMatch[1] && !subpathMatch[1].endsWith('bundle5') && !subpathMatch[1].endsWith('bundle5.js')) {
        return originalResolveFilename.apply(this, [
          require.resolve('webpack/' + subpathMatch[1], { paths: [process.cwd()] }),
          parent,
          isMain
        ]);
      }
    } catch (err) {}
  }

  if (request === 'webpack' || request.startsWith('webpack/')) {
    try {
      return originalResolveFilename.apply(this, [
        require.resolve(request, { paths: [process.cwd()] }),
        parent,
        isMain
      ]);
    } catch (err) {}
  }
  return originalResolveFilename.apply(this, arguments);
};

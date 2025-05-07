/**
 * A utility script to print out all registered routes in the Express application
 *
 * To run: node scripts/print-routes.js
 */

import { app } from '../dist/server';

function printRoutes() {
  // Function to print all routes in Express
  function print(path, layer) {
    if (layer.route) {
      layer.route.stack.forEach(print.bind(null, path));
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach(
        print.bind(
          null,
          path +
            (path ? '' : '') +
            (layer.regexp
              ? layer.regexp
                  .toString()
                  .replace('\\/?(?=\\/|$)', '')
                  .replace('\\/?$', '')
                  .replace('^', '')
                  .replace('$', '')
              : ''),
        ),
      );
    } else if (layer.method) {
      console.log(
        '%s %s',
        layer.method.toUpperCase(),
        path +
          (path ? '' : '') +
          (layer.regexp
            ? layer.regexp
                .toString()
                .replace('\\/?(?=\\/|$)', '')
                .replace('\\/?$', '')
                .replace('^', '')
                .replace('$', '')
            : ''),
      );
    }
  }

  app._router.stack.forEach(print.bind(null, ''));
}

try {
  console.log('Registered Express Routes:');
  printRoutes();
} catch (err) {
  console.error('Error printing routes:', err);
  console.log(
    'This script needs to be run after the server is built. Make sure to run "npm run build" first.',
  );
}

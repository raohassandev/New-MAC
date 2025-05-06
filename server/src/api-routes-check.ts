// Route verification utility to be run at server startup
import { Express } from 'express';

export function verifyRoutes(app: Express): void {
  console.log('\n[Route Verification] Checking critical API routes...');
  
  try {
    // Function to find a route in the Express app
    function findRoute(method: string, path: string): boolean {
      let found = false;
      
      // Helper to check a layer
      function checkLayer(layer: any, basePath: string = '') {
        if (layer.route) {
          // This is a route layer
          const fullPath = basePath + layer.route.path;
          const routeMethods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
          
          // Check if this route matches our search
          if (routeMethods.includes(method.toUpperCase()) && 
              (fullPath === path || 
               (path.includes(':') && new RegExp('^' + fullPath.replace(/:[^/]+/g, '[^/]+') + '$').test(path)))) {
            found = true;
            console.log(`[Route Verification] ✅ Found route: ${method.toUpperCase()} ${fullPath}`);
          }
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // This is a router middleware
          const routerPath = basePath + (layer.regexp ? decodeURIComponent(layer.regexp.toString()
            .replace('\\/?(?=\\/|$)', '')
            .replace('\\/?$', '')
            .replace('^', '')
            .replace('$', '')
            .replace(/\\\//g, '/')) : '');
            
          // Search each route in this router
          layer.handle.stack.forEach((subLayer: any) => checkLayer(subLayer, routerPath));
        }
      }
      
      // Check all layers in the app router
      if (app._router && app._router.stack) {
        app._router.stack.forEach((layer: any) => checkLayer(layer));
      }
      
      return found;
    }
    
    // Verify critical API endpoints
    const criticalRoutes = [
      { method: 'POST', path: '/client/api/devices/:id/test' },
      { method: 'GET', path: '/client/api/devices/:id/read' },
      // Add more critical routes as needed
    ];
    
    let allFound = true;
    
    criticalRoutes.forEach(route => {
      const isFound = findRoute(route.method, route.path);
      if (!isFound) {
        allFound = false;
        console.log(`[Route Verification] ❌ Missing route: ${route.method} ${route.path}`);
      }
    });
    
    if (allFound) {
      console.log('[Route Verification] ✅ All critical API routes verified!');
    } else {
      console.log('[Route Verification] ⚠️ Some critical API routes are missing. Check route configuration.');
    }
  } catch (error) {
    console.error('[Route Verification] Error checking routes:', error);
  }
}
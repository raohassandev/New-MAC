/**
 * TypeScript adapter for test files
 * This file provides type definitions to help with the test environment
 */

import { ObjectId } from 'mongoose';

// Declare mongoose globally to avoid importing in individual test files
declare global {
  // Add or augment properties in the global namespace
  namespace NodeJS {
    interface Global {
      // Any global properties used in tests
    }
  }

  // Declare mongoose as a global variable
  var mongoose: {
    connect: (uri: string, options?: any) => Promise<any>;
    connection: {
      db: {
        dropDatabase: () => Promise<boolean>;
      };
      close: () => Promise<void>;
      readyState: number;
    };
    Schema: (definition: any, options?: any) => any;
    model: (name: string, schema?: any) => any;
    Types: {
      ObjectId: {
        new (id?: string): ObjectId;
      };
      String: StringConstructor;
      Number: NumberConstructor;
      Boolean: BooleanConstructor;
      Array: ArrayConstructor;
      Map: MapConstructor;
    };
  };
}

// Export empty object to make this a module
export {};

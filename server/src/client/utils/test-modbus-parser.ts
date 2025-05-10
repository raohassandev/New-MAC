/**
 * Test script for verifying the modbus parsing logic
 */

import { 
  processFloat32, 
  processInt32, 
  processUInt32,
  testModbusParser 
} from '../services/device.service';

// Test cases for FLOAT32 - Common values used in industrial applications
const float32TestCases = [
  {
    description: 'Simple positive value (123.456)',
    registers: [16968, 17096], // Hex: 0x4237, 0x42C8 (for ABCD order)
    expectedValue: 123.456,
    byteOrder: 'ABCD'
  },
  {
    description: 'Simple negative value (-123.456)',
    registers: [49736, 17096], // Hex: 0xC237, 0x42C8 (for ABCD order)
    expectedValue: -123.456,
    byteOrder: 'ABCD'
  },
  {
    description: 'Small positive value (0.123)',
    registers: [15795, 53052], // Hex: 0x3DF3, 0xCF5C (for ABCD order)
    expectedValue: 0.123,
    byteOrder: 'ABCD'
  },
  {
    description: 'Zero value',
    registers: [0, 0],
    expectedValue: 0,
    byteOrder: 'ABCD'
  },
  {
    description: 'Temperature (25.5 degrees C)',
    registers: [16755, 0], // Hex: 0x41CC, 0x0000 (for ABCD order)
    expectedValue: 25.5,
    byteOrder: 'ABCD'
  },
  // Test CDAB byte order (commonly used in some devices)
  {
    description: 'CDAB byte order (123.456)',
    registers: [17096, 16968], // Swapped from ABCD
    expectedValue: 123.456,
    byteOrder: 'CDAB'
  }
];

// Test cases for INT32
const int32TestCases = [
  {
    description: 'Positive 32-bit integer (123456)',
    registers: [1, 57920], // 0x0001, 0xE240 in ABCD order
    expectedValue: 123456,
    byteOrder: 'ABCD'
  },
  {
    description: 'Negative 32-bit integer (-123456)',
    registers: [65535, 7615], // 0xFFFF, 0x1DBF in ABCD order
    expectedValue: -123456,
    byteOrder: 'ABCD'
  },
  {
    description: 'Zero value',
    registers: [0, 0],
    expectedValue: 0,
    byteOrder: 'ABCD'
  },
  // CDAB byte order
  {
    description: 'CDAB byte order (123456)',
    registers: [57920, 1], // Swapped from ABCD
    expectedValue: 123456,
    byteOrder: 'CDAB'
  }
];

// Test cases for UINT32
const uint32TestCases = [
  {
    description: 'Positive 32-bit unsigned integer (123456)',
    registers: [1, 57920], // 0x0001, 0xE240 in ABCD order
    expectedValue: 123456,
    byteOrder: 'ABCD'
  },
  {
    description: 'Large 32-bit unsigned integer (4294967295 - max value)',
    registers: [65535, 65535], // 0xFFFF, 0xFFFF in ABCD order
    expectedValue: 4294967295,
    byteOrder: 'ABCD'
  },
  {
    description: 'Zero value',
    registers: [0, 0],
    expectedValue: 0,
    byteOrder: 'ABCD'
  },
  // CDAB byte order
  {
    description: 'CDAB byte order (123456)',
    registers: [57920, 1], // Swapped from ABCD
    expectedValue: 123456,
    byteOrder: 'CDAB'
  }
];

// Function to run all tests and report results
function runTests() {
  console.log('=== RUNNING MODBUS PARSER TESTS ===\n');
  
  console.log('=== FLOAT32 TESTS ===');
  let float32Passed = 0;
  for (const test of float32TestCases) {
    console.log(`\nTest: ${test.description}`);
    const result = testModbusParser(test.registers, 'FLOAT32', test.byteOrder);
    const passed = Math.abs(result - test.expectedValue) < 0.0001; // Allow small floating point error
    
    if (passed) {
      console.log(`✅ PASSED: Expected ${test.expectedValue}, got ${result}`);
      float32Passed++;
    } else {
      console.log(`❌ FAILED: Expected ${test.expectedValue}, got ${result}`);
    }
  }
  
  console.log('\n=== INT32 TESTS ===');
  let int32Passed = 0;
  for (const test of int32TestCases) {
    console.log(`\nTest: ${test.description}`);
    const result = testModbusParser(test.registers, 'INT32', test.byteOrder);
    const passed = result === test.expectedValue;
    
    if (passed) {
      console.log(`✅ PASSED: Expected ${test.expectedValue}, got ${result}`);
      int32Passed++;
    } else {
      console.log(`❌ FAILED: Expected ${test.expectedValue}, got ${result}`);
    }
  }
  
  console.log('\n=== UINT32 TESTS ===');
  let uint32Passed = 0;
  for (const test of uint32TestCases) {
    console.log(`\nTest: ${test.description}`);
    const result = testModbusParser(test.registers, 'UINT32', test.byteOrder);
    const passed = result === test.expectedValue;
    
    if (passed) {
      console.log(`✅ PASSED: Expected ${test.expectedValue}, got ${result}`);
      uint32Passed++;
    } else {
      console.log(`❌ FAILED: Expected ${test.expectedValue}, got ${result}`);
    }
  }
  
  // Report summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`FLOAT32: ${float32Passed}/${float32TestCases.length} tests passed`);
  console.log(`INT32: ${int32Passed}/${int32TestCases.length} tests passed`);
  console.log(`UINT32: ${uint32Passed}/${uint32TestCases.length} tests passed`);
  console.log(`TOTAL: ${float32Passed + int32Passed + uint32Passed}/${float32TestCases.length + int32TestCases.length + uint32TestCases.length} tests passed`);
}

// Run the tests
console.log('Starting modbus parser tests...');
runTests();
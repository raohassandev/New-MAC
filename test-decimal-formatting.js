// Test script to verify decimal formatting fixes
const { formatModbusValue, formatByDataType } = require('./client/src/utils/modbusValueFormatter.ts');

console.log('Testing decimal formatting fixes...\n');

// Test the problematic value that was showing 16.399999618530273
const testValue = 16.399999618530273;

console.log('Original value:', testValue);
console.log('Formatted with formatModbusValue:', formatModbusValue(testValue));
console.log('Formatted with formatByDataType (FLOAT32):', formatByDataType(testValue, 'FLOAT32'));

// Test other common values
const testValues = [
  25.12345678,
  100.999999,
  0.123456789,
  1234.567890123,
  0.1,
  0.01,
  0.001
];

console.log('\nTesting various values:');
testValues.forEach(value => {
  console.log(`${value} -> ${formatModbusValue(value)} (FLOAT32: ${formatByDataType(value, 'FLOAT32')})`);
});

console.log('\nFormatting test complete!');
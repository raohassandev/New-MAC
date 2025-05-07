// client/src/components/devices/NewTemplateForm/types/form.types.ts

// Register range type for the template form
export interface RegisterRange {
  rangeName: string;
  startRegister: number;
  length: number;
  functionCode: number;
  dataParser?: ParameterConfig[]; // Optional array of parameter configurations
}

// Data types supported by modbus and buffer-parser
export type DataType =
  | 'INT8'
  | 'UINT8' // 8-bit integer types (1 byte)
  | 'INT16'
  | 'UINT16' // 16-bit integer types (1 register)
  | 'INT32'
  | 'UINT32' // 32-bit integer types (2 registers)
  | 'INT64'
  | 'UINT64' // 64-bit integer types (4 registers)
  | 'FLOAT32'
  | 'FLOAT' // 32-bit float (2 registers)
  | 'DOUBLE'
  | 'FLOAT64' // 64-bit double (4 registers)
  | 'STRING'
  | 'ASCII' // String types
  | 'BCD' // Binary Coded Decimal
  | 'BOOLEAN'
  | 'BIT'; // Boolean/bit value

// Byte order options for register data interpretation
export type ByteOrder =
  | 'AB' // Big-endian (1 register)
  | 'BA' // Little-endian (1 register)
  | 'ABCD' // Big-endian (2 registers)
  | 'DCBA' // Little-endian (2 registers)
  | 'BADC' // Mixed-endian (2 registers)
  | 'CDAB'; // Mixed-endian (2 registers)

// Parameter configuration interface with enhanced parsing options
export interface ParameterConfig {
  name: string; // Parameter name
  dataType: DataType; // Data type for parsing
  scalingFactor: number; // Multiplier for the parsed value
  scalingEquation?: string; // Optional advanced scaling equation (e.g., 'x * 0.1 + 32')
  decimalPoint: number; // Number of decimal places for display
  byteOrder: ByteOrder; // Byte order for multi-byte values
  bitmask?: string; // Optional bit mask (e.g., '0xFF00')
  bitPosition?: number; // Bit position for boolean extraction
  signed?: boolean; // Whether to interpret as signed (for integer types)
  registerRange?: string; // Register range name this parameter belongs to
  registerIndex: number; // Index within the register range (Legacy field for backward compatibility)
  bufferIndex: number; // Index within the buffer for response parsing
  unit?: string; // Unit of measurement (e.g., '°C', 'bar')
  description?: string; // Optional description
  // For handling complex multi-register values
  wordCount?: number; // How many words (registers) to use
  maxValue?: number; // Maximum valid value
  minValue?: number; // Minimum valid value
  formatString?: string; // Format string for display (e.g., '0.00')
}

// Template form data interface
export interface TemplateFormData {
  name: string;
  deviceType: string;
  make: string;
  model: string;
  description: string;
  ip: string;
  port: string;
  slaveId: string;
  serialPort: string;
  baudRate: string;
  dataBits: string;
  stopBits: string;
  parity: string;
  enabled: boolean;
  tags: string[];
  isTemplate: boolean;
}

// Form field validation state interface
export interface FieldValidation {
  valid: boolean;
  message: string;
}

// Form validation state interface
export interface FormValidation {
  [key: string]: FieldValidation;
}

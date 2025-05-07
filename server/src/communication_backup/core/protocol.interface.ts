/**
 * Protocol interface definitions for the Communication Module
 */
import { Parameter, RequestResult, ReadOptions, WriteOptions, ModbusResponse } from './types';

/**
 * Interface for low-level protocol operations
 */
export interface RawOperations {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Raw read operations
  readCoils(address: number, quantity: number, options?: ReadOptions): Promise<ModbusResponse>;
  readDiscreteInputs(
    address: number,
    quantity: number,
    options?: ReadOptions,
  ): Promise<ModbusResponse>;
  readHoldingRegisters(
    address: number,
    quantity: number,
    options?: ReadOptions,
  ): Promise<ModbusResponse>;
  readInputRegisters(
    address: number,
    quantity: number,
    options?: ReadOptions,
  ): Promise<ModbusResponse>;

  // Raw write operations
  writeSingleCoil(address: number, value: boolean, options?: WriteOptions): Promise<ModbusResponse>;
  writeSingleRegister(
    address: number,
    value: number,
    options?: WriteOptions,
  ): Promise<ModbusResponse>;
  writeMultipleCoils(
    address: number,
    values: boolean[],
    options?: WriteOptions,
  ): Promise<ModbusResponse>;
  writeMultipleRegisters(
    address: number,
    values: number[],
    options?: WriteOptions,
  ): Promise<ModbusResponse>;
}

/**
 * Interface for high-level protocol operations
 */
export interface Protocol extends RawOperations {
  // High-level parameter operations
  readParameter(parameter: Parameter, options?: ReadOptions): Promise<RequestResult>;
  writeParameter(parameter: Parameter, value: any, options?: WriteOptions): Promise<RequestResult>;

  // Protocol information
  getProtocolInfo(): { name: string; version: string; capabilities: string[] };
}

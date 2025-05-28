/**
 * Event-Driven Polling Service
 * Eliminates continuous polling in favor of true event-driven architecture
 * Handles all edge cases: device health, missed events, compliance, etc.
 */

import chalk from 'chalk';
import mongoose from 'mongoose';
import { DatabaseModelManager } from '../utils/databaseModelManager';
import { ModbusConnectionManager } from '../utils/modbusConnectionManager';
import { readHoldingRegistersWithTimeout, readInputRegistersWithTimeout } from '../utils/modbusHelper';
import { websocketManager } from '../../utils/websocketManager';

interface DeviceState {
  deviceId: string;
  lastValues: Map<number, any>; // address -> value
  lastSeen: Date;
  isOnline: boolean;
  consecutiveErrors: number;
  lastSync: Date;
  pendingChanges: Set<number>; // addresses with pending changes
  lastLogTime?: number; // timestamp for rate-limiting logs
}

interface ChangeEvent {
  deviceId: string;
  address: number;
  registerName: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: 'modbus' | 'api' | 'sync' | 'heartbeat';
}

interface DeviceHealthMetrics {
  deviceId: string;
  lastSeen: Date;
  uptime: number;
  errorRate: number;
  responseTime: number;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
}

class EventDrivenPollingService {
  private deviceStates = new Map<string, DeviceState>();
  private connectionPool = new Map<string, any>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  private syncIntervals = new Map<string, NodeJS.Timeout>();
  private isRunning = false;
  private changeQueue: ChangeEvent[] = [];
  private processingQueue = false;

  // Configuration - now controllable via parameters
  private CHANGE_MONITORING_INTERVAL = 10000; // 10 seconds - change detection interval
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds - minimal health check
  private readonly SYNC_INTERVAL = 300000; // 5 minutes - compliance snapshot
  private readonly MAX_CONSECUTIVE_ERRORS = 3;
  private readonly CONNECTION_TIMEOUT = 5000;
  private readonly OFFLINE_THRESHOLD = 60000; // 1 minute
  private readonly CHANGE_DETECTION_THRESHOLD = 0.01; // For floating point comparison

  /**
   * Start the event-driven service with smart time-based initialization
   * @param monitoringIntervalMs - Optional monitoring interval in milliseconds (default: 10000ms)
   * @param timeoutMs - Optional timeout for initialization in milliseconds (default: 30000ms)
   */
  async start(monitoringIntervalMs?: number, timeoutMs: number = 30000): Promise<void> {
    if (this.isRunning) {
      console.log(chalk.yellow('[EventDriven] Service already running'));
      return;
    }

    // Set monitoring interval if provided
    if (monitoringIntervalMs !== undefined) {
      this.setChangeMonitoringInterval(monitoringIntervalMs);
    }

    console.log(chalk.green(`[EventDriven] 🚀 Starting Smart Event-Driven Architecture (${this.CHANGE_MONITORING_INTERVAL}ms intervals, ${timeoutMs}ms timeout)`));
    const startTime = Date.now();
    this.isRunning = true;

    try {
      // Start core services immediately (0-2 seconds)
      console.log(chalk.blue('[EventDriven] 🔧 Starting core services...'));
      this.startChangeProcessor();
      this.setupHealthMonitoring();
      console.log(chalk.green('[EventDriven] ✅ Core services ready'));
      
      // Smart device initialization based on time vs device ratio
      console.log(chalk.blue('[EventDriven] 📊 Starting smart device initialization...'));
      const initResult = await this.smartInitializeDevices(timeoutMs, startTime);
      
      const elapsedTime = Date.now() - startTime;
      console.log(chalk.green(`[EventDriven] ✅ Smart initialization completed in ${elapsedTime}ms`));
      console.log(chalk.cyan(`[EventDriven] 📈 Strategy: ${initResult.strategy}`));
      console.log(chalk.cyan(`[EventDriven] 📊 Devices processed: ${initResult.processedDevices}/${initResult.totalDevices}`));
      console.log(chalk.cyan(`[EventDriven] 🔥 Online devices: ${initResult.onlineDevices}`));
      console.log(chalk.cyan(`[EventDriven] 📋 Background devices: ${initResult.backgroundDevices}`));
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to start service:', error));
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the event-driven service
   */
  async stop(): Promise<void> {
    console.log(chalk.yellow('[EventDriven] Stopping event-driven service'));
    this.isRunning = false;

    // Clear all intervals
    this.heartbeatIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.heartbeatIntervals.clear();
    this.syncIntervals.clear();

    // Close all connections
    for (const [deviceId, connection] of this.connectionPool) {
      try {
        await ModbusConnectionManager.disconnect(connection);
      } catch (error) {
        console.warn(chalk.yellow(`[EventDriven] Error closing connection for ${deviceId}:`, error));
      }
    }
    this.connectionPool.clear();

    // Process remaining changes
    if (this.changeQueue.length > 0) {
      console.log(chalk.cyan(`[EventDriven] Processing ${this.changeQueue.length} remaining changes`));
      await this.processChangeQueue();
    }

    console.log(chalk.green('[EventDriven] Service stopped'));
  }

  /**
   * Smart device initialization based on available time vs number of devices
   */
  private async smartInitializeDevices(timeoutMs: number, startTime: number): Promise<{
    strategy: string;
    totalDevices: number;
    processedDevices: number;
    onlineDevices: number;
    backgroundDevices: number;
  }> {
    // Edge case: Invalid timeout
    if (timeoutMs <= 0) {
      console.warn(chalk.yellow(`[EventDriven] ⚠️ Invalid timeout ${timeoutMs}ms, using default 30000ms`));
      timeoutMs = 30000;
    }
    
    // Edge case: Timeout too small
    if (timeoutMs < 1000) {
      console.warn(chalk.yellow(`[EventDriven] ⚠️ Timeout too small (${timeoutMs}ms), using minimum 1000ms`));
      timeoutMs = 1000;
    }
    
    try {
      console.log(chalk.blue('[EventDriven] 🔍 Getting device model...'));
      
      // Edge case: Database connection issues
      let DeviceModel;
      try {
        DeviceModel = await this.getDeviceModel();
      } catch (dbError: any) {
        console.error(chalk.red('[EventDriven] ❌ Database connection failed:', dbError));
        throw new Error(`Database connection failed: ${dbError.message || dbError}`);
      }
      
      console.log(chalk.blue('[EventDriven] 📋 Querying enabled devices...'));
      
      // Edge case: Database query timeout
      let devices;
      try {
        const queryTimeout = Math.min(timeoutMs * 0.1, 5000); // Max 5 seconds for DB query
        devices = await Promise.race([
          DeviceModel.find({ enabled: true }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), queryTimeout)
          )
        ]);
      } catch (queryError: any) {
        console.error(chalk.red('[EventDriven] ❌ Database query failed:', queryError));
        throw new Error(`Database query failed: ${queryError.message || queryError}`);
      }

      console.log(chalk.cyan(`[EventDriven] Database query completed`));
      console.log(chalk.cyan(`[EventDriven] Found ${devices.length} enabled devices`));
      
      // Edge case: No devices
      if (!devices || devices.length === 0) {
        console.warn(chalk.yellow('[EventDriven] ⚠️ No enabled devices found in database!'));
        console.log(chalk.yellow('[EventDriven] Edge case handling:'));
        console.log(chalk.yellow('  1. Checking if there are ANY devices in database...'));
        
        try {
          const totalDevices = await DeviceModel.countDocuments({});
          const enabledDevices = await DeviceModel.countDocuments({ enabled: true });
          
          console.log(chalk.yellow(`[EventDriven]   Total devices: ${totalDevices}`));
          console.log(chalk.yellow(`[EventDriven]   Enabled devices: ${enabledDevices}`));
          
          if (totalDevices === 0) {
            console.log(chalk.yellow('  ➡️ No devices exist in database'));
          } else if (enabledDevices === 0) {
            console.log(chalk.yellow('  ➡️ All devices are disabled'));
          }
        } catch (countError: any) {
          console.log(chalk.yellow('  ➡️ Unable to check device counts:', countError.message));
        }
        
        return { strategy: 'no-devices', totalDevices: 0, processedDevices: 0, onlineDevices: 0, backgroundDevices: 0 };
      }
      
      // Edge case: Too many devices for available time
      if (devices.length > 100) {
        console.warn(chalk.yellow(`[EventDriven] ⚠️ Large number of devices (${devices.length}), this may take time`));
      }

      if (devices.length > 0) {
        console.log(chalk.blue('[EventDriven] 📱 Devices found:'));
        devices.slice(0, 10).forEach((device: any) => { // Show first 10 only
          console.log(chalk.gray(`  - ${device.name} (${device._id}) - enabled: ${device.enabled}`));
        });
        if (devices.length > 10) {
          console.log(chalk.gray(`  ... and ${devices.length - 10} more devices`));
        }
      }

      // Calculate available time (reserve 2 seconds for core services)
      const coreTime = Date.now() - startTime;
      const reserveTime = Math.max(coreTime + 2000, 3000); // At least 3 seconds reserve
      const availableTime = Math.max(timeoutMs - reserveTime, 1000); // At least 1 second
      const timePerDevice = availableTime / devices.length;
      
      console.log(chalk.magenta(`[EventDriven] 🧮 Smart Analysis:`));
      console.log(chalk.magenta(`[EventDriven]   Total timeout: ${timeoutMs}ms`));
      console.log(chalk.magenta(`[EventDriven]   Core time used: ${coreTime}ms`));
      console.log(chalk.magenta(`[EventDriven]   Reserve time: ${reserveTime}ms`));
      console.log(chalk.magenta(`[EventDriven]   Available time: ${availableTime}ms`));
      console.log(chalk.magenta(`[EventDriven]   Devices to process: ${devices.length}`));
      console.log(chalk.magenta(`[EventDriven]   Time per device: ${timePerDevice.toFixed(1)}ms`));
      
      // Edge case: Extremely tight time constraints
      if (availableTime < 1000) {
        console.warn(chalk.yellow(`[EventDriven] ⚠️ Extremely tight time (${availableTime}ms), using emergency mode`));
        return await this.emergencyInitialization(devices, availableTime, startTime);
      }
      
      // Decide strategy based on time vs devices ratio
      if (timePerDevice >= 1000) {
        console.log(chalk.green(`[EventDriven] 📈 Strategy Decision: BATCH SEQUENTIAL (sufficient time)`));
        return await this.batchSequentialInitialization(devices, availableTime, startTime);
      } else {
        console.log(chalk.green(`[EventDriven] 📈 Strategy Decision: PARALLEL + BACKGROUND (tight time)`));
        return await this.parallelBackgroundInitialization(devices, availableTime, startTime);
      }

    } catch (error: any) {
      const errorMessage = error.message || error;
      console.error(chalk.red('[EventDriven] ❌ Critical error in smart initialization:', errorMessage));
      
      // Edge case: Try graceful degradation
      try {
        console.log(chalk.yellow('[EventDriven] 🆘 Attempting graceful degradation...'));
        return await this.gracefulDegradation(error, timeoutMs);
      } catch (degradationError: any) {
        console.error(chalk.red('[EventDriven] ❌ Graceful degradation also failed:', degradationError));
        throw new Error(`Smart initialization failed: ${errorMessage}. Graceful degradation failed: ${degradationError.message || degradationError}`);
      }
    }
  }

  /**
   * Batch Sequential Initialization - for when we have sufficient time
   */
  private async batchSequentialInitialization(devices: any[], availableTime: number, startTime: number): Promise<{
    strategy: string;
    totalDevices: number;
    processedDevices: number;
    onlineDevices: number;
    backgroundDevices: number;
  }> {
    const strategy = 'batch-sequential';
    const totalDevices = devices.length;
    let processedDevices = 0;
    let onlineDevices = 0;
    const timePerBatch = availableTime / 2; // Split into 2 batches
    const devicesPerBatch = Math.ceil(devices.length / 2);
    
    console.log(chalk.green(`[EventDriven] 📦 Using BATCH SEQUENTIAL strategy`));
    console.log(chalk.cyan(`[EventDriven]   Batch 1: ${devicesPerBatch} devices (${timePerBatch}ms)`));
    console.log(chalk.cyan(`[EventDriven]   Batch 2: ${devices.length - devicesPerBatch} devices (${timePerBatch}ms)`));
    
    try {
      // Batch 1 - First half of devices
      const batch1 = devices.slice(0, devicesPerBatch);
      const batch1StartTime = Date.now();
      
      console.log(chalk.blue(`[EventDriven] 📦 Processing Batch 1: ${batch1.length} devices`));
      for (const device of batch1) {
        const deviceStartTime = Date.now();
        try {
          await this.initializeDevice(device);
          processedDevices++;
          onlineDevices++;
          const deviceTime = Date.now() - deviceStartTime;
          console.log(chalk.green(`[EventDriven] ✅ Batch 1: ${device.name} ready (${deviceTime}ms)`));
        } catch (error) {
          console.warn(chalk.yellow(`[EventDriven] ⚠️ Batch 1: ${device.name} failed, will retry in background`));
          this.scheduleBackgroundInitialization(device);
        }
        
        // Check if we're running out of time
        const elapsedBatch1 = Date.now() - batch1StartTime;
        if (elapsedBatch1 > timePerBatch) {
          console.log(chalk.yellow(`[EventDriven] ⏰ Batch 1 time limit reached, moving to Batch 2`));
          break;
        }
      }
      
      const batch1Time = Date.now() - batch1StartTime;
      console.log(chalk.cyan(`[EventDriven] 📦 Batch 1 completed in ${batch1Time}ms`));
      
      // Batch 2 - Second half of devices
      const batch2 = devices.slice(devicesPerBatch);
      const batch2StartTime = Date.now();
      const remainingTime = Math.max(availableTime - (Date.now() - startTime), 1000);
      
      if (batch2.length > 0 && remainingTime > 1000) {
        console.log(chalk.blue(`[EventDriven] 📦 Processing Batch 2: ${batch2.length} devices (${remainingTime}ms remaining)`));
        
        for (const device of batch2) {
          const deviceStartTime = Date.now();
          try {
            await this.initializeDevice(device);
            processedDevices++;
            onlineDevices++;
            const deviceTime = Date.now() - deviceStartTime;
            console.log(chalk.green(`[EventDriven] ✅ Batch 2: ${device.name} ready (${deviceTime}ms)`));
          } catch (error) {
            console.warn(chalk.yellow(`[EventDriven] ⚠️ Batch 2: ${device.name} failed, will retry in background`));
            this.scheduleBackgroundInitialization(device);
          }
          
          // Check remaining time
          const totalElapsed = Date.now() - startTime;
          if (totalElapsed > availableTime * 0.9) { // Use 90% of available time
            console.log(chalk.yellow(`[EventDriven] ⏰ Batch 2 time limit reached`));
            // Schedule remaining devices for background processing
            const remainingDevices = batch2.slice(batch2.indexOf(device) + 1);
            remainingDevices.forEach(dev => this.scheduleBackgroundInitialization(dev));
            break;
          }
        }
        
        const batch2Time = Date.now() - batch2StartTime;
        console.log(chalk.cyan(`[EventDriven] 📦 Batch 2 completed in ${batch2Time}ms`));
      } else {
        console.log(chalk.yellow(`[EventDriven] ⏰ No time for Batch 2, scheduling ${batch2.length} devices for background`));
        batch2.forEach(device => this.scheduleBackgroundInitialization(device));
      }
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Error in batch sequential initialization:', error));
    }
    
    const backgroundDevices = totalDevices - processedDevices;
    return { strategy, totalDevices, processedDevices, onlineDevices, backgroundDevices };
  }

  /**
   * Parallel Background Initialization - for when time is tight
   */
  private async parallelBackgroundInitialization(devices: any[], availableTime: number, startTime: number): Promise<{
    strategy: string;
    totalDevices: number;
    processedDevices: number;
    onlineDevices: number;
    backgroundDevices: number;
  }> {
    const strategy = 'parallel-background';
    const totalDevices = devices.length;
    let processedDevices = 0;
    let onlineDevices = 0;
    
    console.log(chalk.green(`[EventDriven] ⚡ Using PARALLEL + BACKGROUND strategy`));
    
    try {
      // Phase 1: Quick health check for all devices (parallel)
      const healthCheckTime = Math.min(availableTime * 0.3, 5000); // Max 5 seconds for health checks
      console.log(chalk.blue(`[EventDriven] 🏥 Phase 1: Health check all devices (${healthCheckTime}ms)`));
      
      const healthResults = await this.parallelHealthCheck(devices, healthCheckTime);
      const onlineDevicesList = healthResults.filter(result => result.isOnline);
      const offlineDevicesList = healthResults.filter(result => !result.isOnline);
      
      console.log(chalk.cyan(`[EventDriven] 🏥 Health check completed: ${onlineDevicesList.length} online, ${offlineDevicesList.length} offline`));
      
      // Phase 2: Parallel initialization of online devices
      const remainingTime = Math.max(availableTime - (Date.now() - startTime), 1000);
      const initializationTime = Math.min(remainingTime * 0.8, remainingTime - 1000); // Reserve 1s buffer
      const maxParallelDevices = Math.min(5, onlineDevicesList.length); // Limit to 5 parallel
      const devicesToInitialize = onlineDevicesList.slice(0, maxParallelDevices);
      
      console.log(chalk.blue(`[EventDriven] ⚡ Phase 2: Parallel initialization of ${devicesToInitialize.length} devices (${initializationTime}ms)`));
      
      if (devicesToInitialize.length > 0) {
        const initPromises = devicesToInitialize.map(async (deviceInfo) => {
          try {
            const device = devices.find(d => d._id.toString() === deviceInfo.deviceId);
            if (device) {
              await this.initializeDevice(device);
              return { deviceId: deviceInfo.deviceId, success: true, device };
            }
          } catch (error) {
            console.warn(chalk.yellow(`[EventDriven] ⚠️ Parallel init failed for ${deviceInfo.deviceId}`));
            return { deviceId: deviceInfo.deviceId, success: false, device: deviceInfo.device };
          }
          return null;
        });
        
        // Wait for parallel initialization with timeout
        const initResults = await Promise.allSettled(initPromises);
        
        for (const result of initResults) {
          if (result.status === 'fulfilled' && result.value?.success) {
            processedDevices++;
            onlineDevices++;
            console.log(chalk.green(`[EventDriven] ✅ Parallel: Device ready`));
          }
        }
      }
      
      // Phase 3: Schedule remaining devices for background processing
      const processedDeviceIds = new Set(devicesToInitialize.map(d => d.deviceId));
      const backgroundDevicesList = devices.filter(device => !processedDeviceIds.has(device._id.toString()));
      
      console.log(chalk.blue(`[EventDriven] 🔄 Phase 3: Scheduling ${backgroundDevicesList.length} devices for background processing`));
      backgroundDevicesList.forEach((device: any) => this.scheduleBackgroundInitialization(device));
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Error in parallel background initialization:', error));
    }
    
    const backgroundDevices = totalDevices - processedDevices;
    return { strategy, totalDevices, processedDevices, onlineDevices, backgroundDevices };
  }

  /**
   * Parallel health check for multiple devices
   */
  private async parallelHealthCheck(devices: any[], timeoutMs: number): Promise<Array<{
    deviceId: string;
    deviceName: string;
    isOnline: boolean;
    responseTime: number;
    device: any;
  }>> {
    const batchSize = 5; // Process 5 devices at a time
    const results: Array<{
      deviceId: string;
      deviceName: string;
      isOnline: boolean;
      responseTime: number;
      device: any;
    }> = [];
    
    for (let i = 0; i < devices.length; i += batchSize) {
      const batch = devices.slice(i, i + batchSize);
      const batchPromises = batch.map(async (device) => {
        const startTime = Date.now();
        try {
          const connection = await this.getDeviceConnection(device);
          const testAddress = this.getTestAddress(device);
          
          if (testAddress !== null) {
            await readHoldingRegistersWithTimeout(connection.client, testAddress, 1, 2000);
            const responseTime = Date.now() - startTime;
            return {
              deviceId: device._id.toString(),
              deviceName: device.name,
              isOnline: true,
              responseTime,
              device
            };
          }
        } catch (error) {
          // Device is offline or has connection issues
        }
        
        return {
          deviceId: device._id.toString(),
          deviceName: device.name,
          isOnline: false,
          responseTime: Date.now() - startTime,
          device
        };
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
      
      // Check if we're running out of time
      if (Date.now() - (Date.now() - timeoutMs) > timeoutMs * 0.8) {
        console.log(chalk.yellow(`[EventDriven] ⏰ Health check time limit reached`));
        break;
      }
    }
    
    return results;
  }

  /**
   * Schedule device for background initialization
   */
  private scheduleBackgroundInitialization(device: any): void {
    console.log(chalk.gray(`[EventDriven] 🔄 Scheduling background init for ${device.name}`));
    
    // Schedule for immediate background processing
    setImmediate(async () => {
      try {
        await this.initializeDevice(device);
        console.log(chalk.green(`[EventDriven] ✅ Background: ${device.name} ready`));
      } catch (error) {
        console.warn(chalk.yellow(`[EventDriven] ⚠️ Background: ${device.name} failed, will retry in 5 minutes`));
        // Schedule retry in 5 minutes
        setTimeout(() => {
          this.scheduleBackgroundInitialization(device);
        }, 5 * 60 * 1000);
      }
    });
  }

  /**
   * Legacy method for backward compatibility
   */
  private async initializeDevices(): Promise<void> {
    const result = await this.smartInitializeDevices(30000, Date.now());
    console.log(chalk.cyan(`[EventDriven] Legacy initialization completed: ${result.processedDevices}/${result.totalDevices} devices`));
  }

  /**
   * Initialize a single device with initial state sync
   */
  private async initializeDevice(device: any): Promise<void> {
    const deviceId = device._id.toString();
    
    try {
      console.log(chalk.cyan(`[EventDriven] Initializing device ${device.name} (${deviceId})`));

      // More permissive device validation - try to read regardless of configuration
      console.log(chalk.blue(`[EventDriven] Attempting to initialize device ${device.name}:`));
      console.log(chalk.gray(`  - Driver ID: ${device.deviceDriverId || 'none'}`));
      console.log(chalk.gray(`  - Data Points: ${device.dataPoints?.length || 0}`));
      console.log(chalk.gray(`  - Registers: ${device.registers?.length || 0}`));
      console.log(chalk.gray(`  - Template: ${device.template || 'none'}`));

      // Check for missing device driver and try to load from template collection
      if (device.deviceDriverId && (!device.dataPoints || device.dataPoints.length === 0)) {
        console.log(chalk.blue(`[EventDriven] Device ${device.name} has no dataPoints, checking AMX template collection...`));
        
        try {
          // Load device driver using exact same logic as device.service.ts
          const deviceDriver = await this.loadTemplateFromAMX(device.deviceDriverId);
          
          // Always use the latest device driver configuration
          device.dataPoints = deviceDriver.dataPoints || [];
          device.writableRegisters = deviceDriver.writableRegisters || [];
          device.controlParameters = deviceDriver.controlParameters || [];
          
          // Don't save here to avoid unnecessary writes
          // The configuration is applied in-memory for this read operation
          console.log(chalk.cyan(`[EventDriven] Applied driver configuration to ${device.name} - ${device.dataPoints.length} dataPoints`));
          
        } catch (driverError: any) {
          console.error(chalk.red(`[EventDriven] Error loading device driver: ${driverError}`));
          throw new Error(`Failed to load device driver configuration: ${driverError.message || driverError}`);
        }
      }

      // Create device state
      const deviceState: DeviceState = {
        deviceId,
        lastValues: new Map(),
        lastSeen: new Date(),
        isOnline: false,
        consecutiveErrors: 0,
        lastSync: new Date(),
        pendingChanges: new Set()
      };

      // Initial sync to get current values
      await this.performInitialSync(device, deviceState);

      // Proceed with monitoring even if initial sync failed - might work during runtime
      if (deviceState.lastValues.size === 0) {
        console.warn(chalk.yellow(`[EventDriven] ⚠️ Device ${device.name} has no initial registers, but will try monitoring anyway`));
        console.log(chalk.blue(`[EventDriven] 🔄 Device might have configuration issues but monitoring will continue`));
      }

      // Store device state
      this.deviceStates.set(deviceId, deviceState);

      // Setup heartbeat monitoring
      this.setupDeviceHeartbeat(deviceId);

      // Setup compliance snapshots if required
      this.setupComplianceSnapshots(deviceId);

      console.log(chalk.green(`[EventDriven] ✅ Device ${device.name} initialized successfully with ${deviceState.lastValues.size} registers`));

    } catch (error: any) {
      // Handle initialization errors more gracefully - still try to monitor
      console.warn(chalk.yellow(`[EventDriven] ⚠️ Device ${device.name} initialization had issues: ${error.message}`));
      console.log(chalk.blue(`[EventDriven] 🔄 Still attempting to monitor device ${device.name} with basic setup`));
      
      // Create basic device state and try monitoring anyway
      const basicDeviceState: DeviceState = {
        deviceId,
        lastValues: new Map(),
        lastSeen: new Date(),
        isOnline: false,
        consecutiveErrors: 1, // Start with 1 error but still monitor
        lastSync: new Date(),
        pendingChanges: new Set()
      };
      
      this.deviceStates.set(deviceId, basicDeviceState);
      
      // Setup monitoring even if initialization failed - might work during runtime
      this.setupDeviceHeartbeat(deviceId);
      this.setupComplianceSnapshots(deviceId);
      
      console.log(chalk.green(`[EventDriven] ✅ Device ${device.name} setup with basic monitoring (will retry during runtime)`));
    }
  }

  /**
   * Perform initial sync to get current device values
   */
  private async performInitialSync(device: any, deviceState: DeviceState): Promise<void> {
    try {
      console.log(chalk.blue(`[EventDriven] 🔄 Initial sync for device ${device.name}`));

      // Get or create connection
      const connection = await this.getDeviceConnection(device);
      
      // Read all configured registers
      const currentValues = await this.readAllRegisters(device, connection);
      
      // Store initial values
      for (const [address, value] of currentValues) {
        deviceState.lastValues.set(address, value);
      }

      deviceState.isOnline = true;
      deviceState.lastSeen = new Date();
      deviceState.lastSync = new Date();
      deviceState.consecutiveErrors = 0;

      console.log(chalk.green(`[EventDriven] ✅ Initial sync completed: ${currentValues.size} registers`));

      // Store initial data in database
      await this.storeInitialData(device, currentValues);

    } catch (error) {
      console.error(chalk.red(`[EventDriven] Initial sync failed for ${device.name}:`, error));
      deviceState.isOnline = false;
      deviceState.consecutiveErrors++;
      throw error;
    }
  }

  /**
   * Get or create a persistent connection for a device
   */
  private async getDeviceConnection(device: any): Promise<any> {
    const deviceId = device._id.toString();
    
    // Check if we have an existing connection
    let connection = this.connectionPool.get(deviceId);
    
    if (connection && this.isConnectionValid(connection)) {
      return connection;
    }

    // Create new connection
    try {
      console.log(chalk.blue(`[EventDriven] Creating new connection for ${device.name}`));
      connection = await ModbusConnectionManager.connectLegacy(device);
      this.connectionPool.set(deviceId, connection);
      return connection;
      
    } catch (error) {
      console.error(chalk.red(`[EventDriven] Failed to create connection for ${device.name}:`, error));
      throw error;
    }
  }

  /**
   * Check if a connection is still valid
   */
  private isConnectionValid(connection: any): boolean {
    try {
      return connection && connection.client && connection.client.isOpen;
    } catch {
      return false;
    }
  }

  /**
   * Read all configured registers for a device
   */
  private async readAllRegisters(device: any, connection: any): Promise<Map<number, any>> {
    const values = new Map<number, any>();
    const client = connection.client;

    try {
      // Process dataPoints (new format)
      if (device.dataPoints && Array.isArray(device.dataPoints)) {
        for (const dataPoint of device.dataPoints) {
          try {
            const range = dataPoint.range;
            const parser = dataPoint.parser;

            // Read the range
            let result;
            switch (range.fc) {
              case 3:
                result = await readHoldingRegistersWithTimeout(client, range.startAddress, range.count, this.CONNECTION_TIMEOUT);
                break;
              case 4:
                result = await readInputRegistersWithTimeout(client, range.startAddress, range.count, this.CONNECTION_TIMEOUT);
                break;
              default:
                continue;
            }

            // Process parameters
            if (parser && parser.parameters) {
              for (const param of parser.parameters) {
                const relativeIndex = param.registerIndex - range.startAddress;
                if (relativeIndex >= 0 && relativeIndex < range.count) {
                  const rawValue = result.data[relativeIndex];
                  const processedValue = this.processParameterValue(param, rawValue, result.data, relativeIndex);
                  values.set(param.registerIndex, processedValue);
                }
              }
            }

          } catch (rangeError) {
            console.warn(chalk.yellow(`[EventDriven] Failed to read range ${dataPoint.range.startAddress}:`, rangeError));
          }
        }
      }

      // Process legacy registers
      if (device.registers && Array.isArray(device.registers)) {
        for (const register of device.registers) {
          try {
            const result = await readHoldingRegistersWithTimeout(client, register.address, register.length || 1, this.CONNECTION_TIMEOUT);
            let value = result.data[0];
            
            // Apply scaling
            if (register.scaleFactor && register.scaleFactor !== 1) {
              value = Number(value) / Number(register.scaleFactor);
            }
            
            values.set(register.address, value);
            
          } catch (regError) {
            console.warn(chalk.yellow(`[EventDriven] Failed to read register ${register.address}:`, regError));
          }
        }
      }

    } catch (error) {
      console.error(chalk.red('[EventDriven] Error reading registers:', error));
      throw error;
    }

    return values;
  }

  /**
   * Process parameter value based on data type
   */
  private processParameterValue(param: any, rawValue: any, allData: any[], relativeIndex: number): any {
    try {
      let value = rawValue;

      switch (param.dataType) {
        case 'FLOAT32':
          if (relativeIndex + 1 < allData.length) {
            const buffer = Buffer.alloc(4);
            const reg1 = Number(allData[relativeIndex]);
            const reg2 = Number(allData[relativeIndex + 1]);
            
            const byteOrder = param.byteOrder || 'ABCD';
            if (byteOrder === 'ABCD') {
              buffer.writeUInt16BE(reg1, 0);
              buffer.writeUInt16BE(reg2, 2);
            } else if (byteOrder === 'CDAB') {
              buffer.writeUInt16BE(reg2, 0);
              buffer.writeUInt16BE(reg1, 2);
            }
            
            value = buffer.readFloatBE(0);
            if (!isFinite(value)) value = null;
          }
          break;
          
        case 'INT16':
          value = Number(rawValue);
          if (value > 32767) value = value - 65536;
          break;
          
        case 'UINT16':
          value = Number(rawValue);
          break;
          
        default:
          value = rawValue;
      }

      // Apply scaling
      if (param.scalingFactor && param.scalingFactor !== 1 && typeof value === 'number') {
        value = value * param.scalingFactor;
      }

      // Apply decimal precision
      if (typeof value === 'number' && isFinite(value)) {
        const decimalPlaces = (param.decimalPoint !== undefined && param.decimalPoint >= 0) ? param.decimalPoint : 2;
        value = parseFloat(value.toFixed(decimalPlaces));
      }

      return value;

    } catch (error) {
      console.warn(chalk.yellow(`[EventDriven] Error processing parameter ${param.name}:`, error));
      return null;
    }
  }

  /**
   * Setup continuous change monitoring for device
   * This replaces periodic polling with continuous monitoring
   */
  private setupDeviceHeartbeat(deviceId: string): void {
    // Start with immediate monitoring, then continue at configured interval for change detection
    const changeMonitoring = setInterval(async () => {
      await this.monitorDeviceChanges(deviceId);
    }, this.CHANGE_MONITORING_INTERVAL); // Configurable interval for responsive change detection

    this.heartbeatIntervals.set(deviceId, changeMonitoring);
    
    // Start immediate monitoring
    setImmediate(() => this.monitorDeviceChanges(deviceId));
  }

  /**
   * Setup compliance snapshots for regulatory requirements
   */
  private setupComplianceSnapshots(deviceId: string): void {
    const snapshot = setInterval(async () => {
      await this.performComplianceSnapshot(deviceId);
    }, this.SYNC_INTERVAL);

    this.syncIntervals.set(deviceId, snapshot);
  }

  /**
   * Monitor device for changes - this is the core change detection logic
   */
  private async monitorDeviceChanges(deviceId: string): Promise<void> {
    const deviceState = this.deviceStates.get(deviceId);
    if (!deviceState) return;

    try {
      const DeviceModel = await this.getDeviceModel();
      let device = await DeviceModel.findById(deviceId);
      
      if (!device || !device.enabled) {
        deviceState.isOnline = false;
        return;
      }

      // Ensure device has proper template configuration for register name lookup
      if (device.deviceDriverId && (!device.dataPoints || device.dataPoints.length === 0)) {
        try {
          const deviceDriver = await this.loadTemplateFromAMX(device.deviceDriverId);
          device.dataPoints = deviceDriver.dataPoints || [];
          device.writableRegisters = deviceDriver.writableRegisters || [];
          device.controlParameters = deviceDriver.controlParameters || [];
        } catch (driverError) {
          console.warn(`[EventDriven] Could not load template for register names: ${driverError}`);
        }
      }

      // Read current values from device with comprehensive error handling
      const currentValues = await this.readDeviceValues(device);
      if (!currentValues) {
        deviceState.consecutiveErrors++;
        
        // Only stop monitoring after many failures and for specific error types
        if (deviceState.consecutiveErrors >= 10) {
          deviceState.isOnline = false;
          console.warn(chalk.yellow(`[EventDriven] ⚠️ Temporarily stopping monitoring for ${device.name} due to persistent errors (${deviceState.consecutiveErrors} failures)`));
          
          // Backoff for 5 minutes then try again
          setTimeout(() => {
            console.log(chalk.blue(`[EventDriven] 🔄 Retrying monitoring for ${device.name} after backoff`));
            deviceState.consecutiveErrors = 0; // Reset error count
            this.monitorDeviceChanges(deviceId);
          }, 300000); // 5 minute backoff
          return;
        }
        
        // Light exponential backoff for retries - but keep trying
        if (deviceState.consecutiveErrors > 2) {
          const backoffTime = Math.min(deviceState.consecutiveErrors * 5000, 30000); // Max 30 seconds
          console.log(chalk.yellow(`[EventDriven] ⏱️ Brief backoff for ${device.name} (${backoffTime}ms, attempt ${deviceState.consecutiveErrors})`));
          setTimeout(() => {
            this.monitorDeviceChanges(deviceId);
          }, backoffTime);
          return;
        }
        return;
      }

      // Reset error counter on successful read
      deviceState.consecutiveErrors = 0;
      deviceState.isOnline = true;
      deviceState.lastSeen = new Date();

      // Compare with stored values to detect changes
      const changes: ChangeEvent[] = [];
      
      
      for (const [address, newValue] of currentValues.entries()) {
        const oldValue = deviceState.lastValues.get(address);
        
        const registerName = this.getRegisterName(device, address);
        
        if (oldValue === undefined) {
          // First time seeing this address
          deviceState.lastValues.set(address, newValue);
          changes.push({
            deviceId,
            address,
            registerName,
            oldValue: null,
            newValue,
            timestamp: new Date(),
            source: 'modbus'
          });
          console.log(chalk.blue(`[EventDriven] 🆕 NEW REGISTER: ${device.name} - ${registerName}: ${newValue}`));
        } else if (this.hasValueChanged(oldValue, newValue)) {
          // Value has changed
          deviceState.lastValues.set(address, newValue);
          changes.push({
            deviceId,
            address,
            registerName,
            oldValue,
            newValue,
            timestamp: new Date(),
            source: 'modbus'
          });
          
          console.log(chalk.green.bold(`[EventDriven] 🔥 CHANGE DETECTED: ${device.name} - ${registerName}: ${oldValue} → ${newValue}`));
        }
      }

      // Process any detected changes
      if (changes.length > 0) {
        console.log(chalk.cyan(`[EventDriven] 📊 Processing ${changes.length} changes for ${device.name}`));
        await this.processDeviceChanges(deviceId, changes);
      } else {
        // Quiet monitoring - minimal logging
        const now = Date.now();
        if (!deviceState.lastLogTime || (now - deviceState.lastLogTime) > 120000) { // Log every 2 minutes
          console.log(chalk.gray(`[EventDriven] ✓ Monitoring ${device.name}`));
          (deviceState as any).lastLogTime = now;
        }
      }

    } catch (error) {
      console.error(chalk.red(`[EventDriven] Error monitoring device ${deviceId}:`, error));
      deviceState.consecutiveErrors++;
      if (deviceState.consecutiveErrors >= 3) {
        deviceState.isOnline = false;
      }
    }
  }

  /**
   * Check device health without full polling
   */
  private async checkDeviceHealth(deviceId: string): Promise<void> {
    const deviceState = this.deviceStates.get(deviceId);
    if (!deviceState) return;

    try {
      const DeviceModel = await DatabaseModelManager.getDeviceModel();
      const device = await DeviceModel.findById(deviceId);
      
      if (!device || !device.enabled) {
        deviceState.isOnline = false;
        return;
      }

      // Quick connection test (read 1 register)
      const connection = await this.getDeviceConnection(device);
      const testAddress = this.getTestAddress(device);
      
      if (testAddress !== null) {
        const startTime = Date.now();
        await readHoldingRegistersWithTimeout(connection.client, testAddress, 1, 2000);
        const responseTime = Date.now() - startTime;

        // Device is alive
        deviceState.isOnline = true;
        deviceState.lastSeen = new Date();
        deviceState.consecutiveErrors = 0;

        // Update health metrics
        await this.updateHealthMetrics(deviceId, {
          deviceId,
          lastSeen: deviceState.lastSeen,
          uptime: Date.now() - deviceState.lastSync.getTime(),
          errorRate: 0,
          responseTime,
          status: 'online'
        });

        console.log(chalk.gray(`[EventDriven] ❤️ Heartbeat OK: ${device.name} (${responseTime}ms)`));
      }

    } catch (error) {
      console.warn(chalk.yellow(`[EventDriven] Heartbeat failed for ${deviceId}:`, error));
      
      deviceState.consecutiveErrors++;
      
      if (deviceState.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
        deviceState.isOnline = false;
        
        await this.updateHealthMetrics(deviceId, {
          deviceId,
          lastSeen: deviceState.lastSeen,
          uptime: 0,
          errorRate: deviceState.consecutiveErrors / this.MAX_CONSECUTIVE_ERRORS,
          responseTime: -1,
          status: 'offline'
        });

        console.warn(chalk.red(`[EventDriven] 💀 Device ${deviceId} marked offline after ${deviceState.consecutiveErrors} consecutive errors`));
      }
    }
  }

  /**
   * Get a test address for health check
   */
  private getTestAddress(device: any): number | null {
    // Try to find the first available register address
    if (device.dataPoints && device.dataPoints.length > 0) {
      return device.dataPoints[0].range?.startAddress || null;
    }
    
    if (device.registers && device.registers.length > 0) {
      return device.registers[0].address || null;
    }
    
    return null; // No registers configured
  }

  /**
   * Perform compliance snapshot (periodic sync for regulatory requirements)
   */
  private async performComplianceSnapshot(deviceId: string): Promise<void> {
    const deviceState = this.deviceStates.get(deviceId);
    if (!deviceState || !deviceState.isOnline) return;

    try {
      console.log(chalk.blue(`[EventDriven] 📸 Compliance snapshot for ${deviceId}`));
      
      const DeviceModel = await DatabaseModelManager.getDeviceModel();
      const device = await DeviceModel.findById(deviceId);
      
      if (!device) return;

      // Full sync to detect any missed changes
      const connection = await this.getDeviceConnection(device);
      const currentValues = await this.readAllRegisters(device, connection);
      
      // Compare with last known values and detect changes
      let changesDetected = 0;
      for (const [address, newValue] of currentValues) {
        const oldValue = deviceState.lastValues.get(address);
        
        if (this.hasValueChanged(oldValue, newValue)) {
          changesDetected++;
          
          // Queue change event
          this.queueChangeEvent({
            deviceId,
            address,
            registerName: this.getRegisterName(device, address),
            oldValue,
            newValue,
            timestamp: new Date(),
            source: 'sync'
          });
          
          deviceState.lastValues.set(address, newValue);
        }
      }

      deviceState.lastSync = new Date();

      if (changesDetected > 0) {
        console.log(chalk.yellow(`[EventDriven] 📸 Snapshot detected ${changesDetected} missed changes for ${deviceId}`));
      } else {
        console.log(chalk.gray(`[EventDriven] 📸 Snapshot: No changes for ${deviceId}`));
      }

      // Always store snapshot for compliance (even if no changes)
      await this.storeComplianceSnapshot(device, currentValues);

    } catch (error) {
      console.error(chalk.red(`[EventDriven] Compliance snapshot failed for ${deviceId}:`, error));
    }
  }

  /**
   * Check if a value has changed (handles floating point comparison)
   */
  private hasValueChanged(oldValue: any, newValue: any): boolean {
    if (oldValue === undefined || oldValue === null) return true;
    if (newValue === undefined || newValue === null) return oldValue !== newValue;
    
    // For numbers, use threshold comparison
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      return Math.abs(oldValue - newValue) > this.CHANGE_DETECTION_THRESHOLD;
    }
    
    // For other types, direct comparison
    return oldValue !== newValue;
  }

  /**
   * Get register name for an address
   */
  private getRegisterName(device: any, address: number): string {
    // Check dataPoints for parameter names
    if (device.dataPoints && Array.isArray(device.dataPoints)) {
      for (const dataPoint of device.dataPoints) {
        if (dataPoint.parser?.parameters && dataPoint.range) {
          for (const param of dataPoint.parser.parameters) {
            // Calculate absolute address: range start + parameter's relative index
            const absoluteAddress = dataPoint.range.startAddress + (param.registerIndex || 0);
            if (absoluteAddress === address) {
              return param.name || `Register ${address}`;
            }
          }
        }
      }
    }
    
    // Check legacy registers
    if (device.registers && Array.isArray(device.registers)) {
      for (const register of device.registers) {
        if (register.address === address) {
          return register.name || `Register ${address}`;
        }
      }
    }
    
    return `Register ${address}`;
  }

  /**
   * Queue a change event for processing
   */
  private queueChangeEvent(event: ChangeEvent): void {
    this.changeQueue.push(event);
    console.log(chalk.green(`[EventDriven] 🎯 Change queued: ${event.registerName} ${event.oldValue} → ${event.newValue}`));
    
    // Process queue if not already processing
    if (!this.processingQueue) {
      setImmediate(() => this.processChangeQueue());
    }
  }

  /**
   * Start the change queue processor
   */
  private startChangeProcessor(): void {
    // Process change queue every 100ms for batching
    setInterval(async () => {
      if (this.changeQueue.length > 0 && !this.processingQueue) {
        await this.processChangeQueue();
      }
    }, 100);
  }

  /**
   * Process the change queue with parallel operations
   */
  private async processChangeQueue(): Promise<void> {
    if (this.processingQueue || this.changeQueue.length === 0) return;
    
    this.processingQueue = true;
    const batch = this.changeQueue.splice(0); // Take all pending changes
    
    try {
      console.log(chalk.cyan(`[EventDriven] 🚀 Processing ${batch.length} change events`));
      
      // Group changes by device for efficient processing
      const deviceChanges = new Map<string, ChangeEvent[]>();
      for (const change of batch) {
        if (!deviceChanges.has(change.deviceId)) {
          deviceChanges.set(change.deviceId, []);
        }
        deviceChanges.get(change.deviceId)!.push(change);
      }
      
      // Process each device's changes in parallel
      const processingPromises = Array.from(deviceChanges.entries()).map(([deviceId, changes]) => 
        this.processDeviceChanges(deviceId, changes)
      );
      
      await Promise.all(processingPromises);
      
      console.log(chalk.green(`[EventDriven] ✅ Processed ${batch.length} changes successfully`));
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Error processing change queue:', error));
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process changes for a specific device with parallel operations
   */
  private async processDeviceChanges(deviceId: string, changes: ChangeEvent[]): Promise<void> {
    try {
      const DeviceModel = await DatabaseModelManager.getDeviceModel();
      let device = await DeviceModel.findById(deviceId);
      
      if (!device) {
        console.warn(chalk.yellow(`[EventDriven] Device ${deviceId} not found for change processing`));
        return;
      }

      // Ensure device has proper template configuration for register name lookup
      if (device.deviceDriverId && (!device.dataPoints || device.dataPoints.length === 0)) {
        try {
          const deviceDriver = await this.loadTemplateFromAMX(device.deviceDriverId);
          device.dataPoints = deviceDriver.dataPoints || [];
          device.writableRegisters = deviceDriver.writableRegisters || [];
          device.controlParameters = deviceDriver.controlParameters || [];
        } catch (driverError) {
          console.warn(`[EventDriven] Could not load template for register names: ${driverError}`);
        }
      }

      // Prepare data for parallel operations - changes already have correct register names
      const realtimeData = {
        deviceId,
        deviceName: device.name,
        timestamp: new Date(),
        readings: changes.map(change => ({
          name: change.registerName, // This now has the correct parameter name
          registerIndex: change.address,
          address: change.address,
          value: change.newValue,
          unit: '',
          dataType: typeof change.newValue === 'number' ? 'FLOAT32' : 'STRING'
        }))
      };

      // Execute three parallel operations
      const operations = [
        // 1. Update realtime collection
        this.updateRealtimeCollection(realtimeData),
        
        // 2. Emit WebSocket event to frontend
        this.emitWebSocketEvent(realtimeData),
        
        // 3. Update historical collection
        this.updateHistoricalCollection(changes)
      ];

      await Promise.all(operations);
      
      console.log(chalk.green(`[EventDriven] ✅ ${device.name}: ${changes.length} changes processed in parallel`));

    } catch (error) {
      console.error(chalk.red(`[EventDriven] Error processing device changes for ${deviceId}:`, error));
    }
  }

  /**
   * Update realtime collection with complete device state
   */
  private async updateRealtimeCollection(data: any): Promise<void> {
    try {
      // Get complete current device state instead of just changes
      const deviceState = this.deviceStates.get(data.deviceId);
      if (!deviceState) {
        console.warn(chalk.yellow(`[EventDriven] No device state found for ${data.deviceId}`));
        return;
      }

      // Get device info with proper template loading
      const deviceModel = await this.getDeviceModel();
      let device = await deviceModel.findById(data.deviceId);
      if (!device) {
        console.warn(chalk.yellow(`[EventDriven] Device not found: ${data.deviceId}`));
        return;
      }

      // Ensure device has proper template configuration for register name lookup
      if (device.deviceDriverId && (!device.dataPoints || device.dataPoints.length === 0)) {
        try {
          const deviceDriver = await this.loadTemplateFromAMX(device.deviceDriverId);
          device.dataPoints = deviceDriver.dataPoints || [];
          device.writableRegisters = deviceDriver.writableRegisters || [];
          device.controlParameters = deviceDriver.controlParameters || [];
        } catch (driverError) {
          console.warn(`[EventDriven] Could not load template for register names in realtime: ${driverError}`);
        }
      }

      // Build complete readings from current device state
      const completeReadings = Array.from(deviceState.lastValues.entries()).map(([address, value]) => ({
        name: this.getRegisterName(device, address),
        registerIndex: address,
        address,
        value,
        unit: '',
        dataType: typeof value === 'number' ? 'FLOAT32' : 'STRING'
      }));

      const completeData = {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        timestamp: new Date(),
        readings: completeReadings
      };

      // Import and use existing storage function to maintain cache consistency
      const { storeRealtimeData } = await import('./polling.service');
      await storeRealtimeData(data.deviceId, completeData);
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to update realtime collection:', error));
      throw error;
    }
  }

  /**
   * Emit WebSocket event to frontend with complete device state
   */
  private async emitWebSocketEvent(data: any): Promise<void> {
    try {
      // Get complete current device state for WebSocket emission
      const deviceState = this.deviceStates.get(data.deviceId);
      if (!deviceState) {
        console.warn(chalk.yellow(`[EventDriven] No device state found for WebSocket emission: ${data.deviceId}`));
        return;
      }

      // Get device info with proper template loading  
      const deviceModel = await this.getDeviceModel();
      let device = await deviceModel.findById(data.deviceId);
      if (!device) {
        console.warn(chalk.yellow(`[EventDriven] Device not found for WebSocket: ${data.deviceId}`));
        return;
      }

      // Ensure device has proper template configuration for register name lookup
      if (device.deviceDriverId && (!device.dataPoints || device.dataPoints.length === 0)) {
        try {
          const deviceDriver = await this.loadTemplateFromAMX(device.deviceDriverId);
          device.dataPoints = deviceDriver.dataPoints || [];
          device.writableRegisters = deviceDriver.writableRegisters || [];
          device.controlParameters = deviceDriver.controlParameters || [];
        } catch (driverError) {
          console.warn(`[EventDriven] Could not load template for register names in WebSocket: ${driverError}`);
        }
      }

      // Build complete readings for frontend
      const completeReadings = Array.from(deviceState.lastValues.entries()).map(([address, value]) => ({
        name: this.getRegisterName(device, address),
        registerIndex: address,
        address,
        value,
        unit: '',
        dataType: typeof value === 'number' ? 'FLOAT32' : 'STRING'
      }));

      const completeWebSocketData = {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        timestamp: new Date(),
        readings: completeReadings
      };

      if (websocketManager && websocketManager.isAvailable()) {
        
        const success = websocketManager.emitRealtimeDataUpdate(completeWebSocketData);
        
        if (success) {
          console.log(chalk.green(`[EventDriven] ✅ WebSocket event sent for ${data.deviceName}`));
        } else {
          console.warn(chalk.red(`[EventDriven] ❌ WebSocket FAILED for ${data.deviceName}`));
        }
      } else {
        console.warn(chalk.yellow('[EventDriven] WebSocket manager not available'));
        console.log(chalk.yellow(`[EventDriven] 🔍 WebSocket manager state: available=${websocketManager?.isAvailable()}, exists=${!!websocketManager}`));
      }
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to emit WebSocket event:', error));
      throw error;
    }
  }

  /**
   * Update historical collection
   */
  private async updateHistoricalCollection(changes: ChangeEvent[]): Promise<void> {
    try {
      const HistoricalDataModel = await this.getHistoricalDataModel();
      if (!HistoricalDataModel) return;

      const historyEntries = changes.map(change => ({
        deviceId: new mongoose.Types.ObjectId(change.deviceId),
        parameterName: change.registerName,
        value: change.newValue,
        unit: '',
        timestamp: change.timestamp,
        quality: 'good',
        source: change.source,
        oldValue: change.oldValue // Store old value for change tracking
      }));

      await HistoricalDataModel.insertMany(historyEntries, { ordered: false });
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to update historical collection:', error));
      throw error;
    }
  }

  /**
   * Store initial data in database
   */
  private async storeInitialData(device: any, values: Map<number, any>): Promise<void> {
    try {
      const readings = Array.from(values.entries()).map(([address, value]) => ({
        name: this.getRegisterName(device, address),
        registerIndex: address,
        address,
        value,
        unit: '',
        dataType: typeof value === 'number' ? 'FLOAT32' : 'STRING'
      }));

      const realtimeData = {
        deviceId: device._id.toString(),
        deviceName: device.name,
        timestamp: new Date(),
        readings
      };

      // Store in both collections
      await Promise.all([
        this.updateRealtimeCollection(realtimeData),
        this.emitWebSocketEvent(realtimeData)
      ]);

    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to store initial data:', error));
    }
  }

  /**
   * Store compliance snapshot
   */
  private async storeComplianceSnapshot(device: any, values: Map<number, any>): Promise<void> {
    try {
      const HistoricalDataModel = await this.getHistoricalDataModel();
      if (!HistoricalDataModel) return;

      const entries = Array.from(values.entries()).map(([address, value]) => ({
        deviceId: new mongoose.Types.ObjectId(device._id),
        parameterName: this.getRegisterName(device, address),
        value,
        unit: '',
        timestamp: new Date(),
        quality: 'good',
        source: 'compliance_snapshot'
      }));

      await HistoricalDataModel.insertMany(entries, { ordered: false });
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to store compliance snapshot:', error));
    }
  }

  /**
   * Update health metrics
   */
  private async updateHealthMetrics(deviceId: string, metrics: DeviceHealthMetrics): Promise<void> {
    try {
      // Could store in a dedicated health metrics collection
      console.log(chalk.gray(`[EventDriven] Health: ${deviceId} - ${metrics.status} (${metrics.responseTime}ms)`));
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to update health metrics:', error));
    }
  }

  /**
   * Get HistoricalData model
   */
  private async getHistoricalDataModel(): Promise<any> {
    try {
      const appLocals = (global as any).appLocals;
      if (appLocals?.clientModels?.HistoricalData) {
        return appLocals.clientModels.HistoricalData;
      }
      
      return mongoose.model('HistoricalData');
    } catch {
      return null;
    }
  }

  /**
   * API: Force device initialization (for debugging)
   */
  async forceDeviceInitialization(): Promise<void> {
    console.log(chalk.blue('[EventDriven] 🔧 FORCE: Running device initialization'));
    await this.initializeDevices();
  }

  /**
   * API: Trigger immediate sync for a device
   */
  async triggerDeviceSync(deviceId: string): Promise<void> {
    const deviceState = this.deviceStates.get(deviceId);
    if (!deviceState) {
      throw new Error(`Device ${deviceId} not found in event-driven service`);
    }

    try {
      const DeviceModel = await DatabaseModelManager.getDeviceModel();
      const device = await DeviceModel.findById(deviceId);
      
      if (!device) {
        throw new Error(`Device ${deviceId} not found in database`);
      }

      await this.performInitialSync(device, deviceState);
      
    } catch (error) {
      console.error(chalk.red(`[EventDriven] Failed to trigger sync for ${deviceId}:`, error));
      throw error;
    }
  }

  /**
   * API: Get device health status
   */
  getDeviceHealth(deviceId: string): DeviceHealthMetrics | null {
    const deviceState = this.deviceStates.get(deviceId);
    if (!deviceState) return null;

    return {
      deviceId,
      lastSeen: deviceState.lastSeen,
      uptime: Date.now() - deviceState.lastSync.getTime(),
      errorRate: deviceState.consecutiveErrors / this.MAX_CONSECUTIVE_ERRORS,
      responseTime: -1, // Would need to track this
      status: deviceState.isOnline ? 'online' : 'offline'
    };
  }

  /**
   * API: Get service statistics
   */
  getServiceStats() {
    const totalDevices = this.deviceStates.size;
    const onlineDevices = Array.from(this.deviceStates.values()).filter(state => state.isOnline).length;
    const offlineDevices = totalDevices - onlineDevices;

    // Get detailed device info for debugging
    const deviceDetails = Array.from(this.deviceStates.entries()).map(([deviceId, state]) => ({
      deviceId,
      isOnline: state.isOnline,
      lastSeen: state.lastSeen,
      consecutiveErrors: state.consecutiveErrors,
      registersCount: state.lastValues.size,
      hasMonitoring: this.heartbeatIntervals.has(deviceId),
      lastValues: Array.from(state.lastValues.entries()).slice(0, 5).map(([address, value]) => ({
        address,
        value
      })) // Show first 5 values for debugging
    }));

    return {
      isRunning: this.isRunning,
      totalDevices,
      onlineDevices,
      offlineDevices,
      activeConnections: this.connectionPool.size,
      pendingChanges: this.changeQueue.length,
      heartbeatInterval: this.HEARTBEAT_INTERVAL,
      syncInterval: this.SYNC_INTERVAL,
      monitoredDevices: deviceDetails
    };
  }

  /**
   * Setup health monitoring for all devices
   */
  private setupHealthMonitoring(): void {
    console.log(chalk.cyan('[EventDriven] Setting up health monitoring'));
    
    // Health monitoring is handled per-device in setupDeviceHeartbeat
    // This method is for any global health monitoring setup
    
    // Could add global health checks here if needed
    console.log(chalk.green('[EventDriven] ✅ Health monitoring setup complete'));
  }

  /**
   * Get device model using DatabaseModelManager
   */
  private async getDeviceModel(): Promise<any> {
    try {
      const { DatabaseModelManager } = await import('../utils/databaseModelManager');
      
      // Try multiple approaches to get the device model
      let appLocals = (global as any).appLocals;
      
      if (!appLocals) {
        console.warn(chalk.yellow('[EventDriven] No appLocals found, using default context'));
        appLocals = {}; // Use empty context as fallback
      }
      
      const model = await DatabaseModelManager.getDeviceModel(appLocals);
      console.log(chalk.green(`[EventDriven] ✅ Got device model: ${model.modelName}`));
      return model;
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] Failed to get device model:', error));
      throw error;
    }
  }

  /**
   * Load template from AMX database - same logic as device.service.ts
   */
  private async loadTemplateFromAMX(templateId: string): Promise<any> {
    try {
      const mongoose = await import('mongoose');
      const appLocals = (global as any).appLocals;
      
      console.log(chalk.blue(`[EventDriven] Device has driver ID, fetching latest driver configuration`));
      
      // Get device driver from AMX database - exact same logic as device.service.ts
      let deviceDriver;
      
      // Try to get the device driver from the templates collection
      if (appLocals?.libraryDB) {
        const templatesCollection = appLocals.libraryDB.collection('templates');
        const objectId = new mongoose.Types.ObjectId(templateId);
        deviceDriver = await templatesCollection.findOne({ _id: objectId });
      } else if (appLocals?.libraryModels?.DeviceDriver) {
        // Fallback to DeviceDriver model if available
        const DeviceDriverModel = appLocals.libraryModels.DeviceDriver;
        console.log(chalk.bgRed("======================================templateId===================================" , templateId));
        deviceDriver = await DeviceDriverModel.findById(templateId);
      }
      
      if (deviceDriver) {
        console.log(chalk.green(`[EventDriven] Found device driver: ${deviceDriver.name}, applying latest configuration`));
        return deviceDriver;
      } else {
        throw new Error(`Device driver not found: ${templateId}`);
      }
      
    } catch (error: any) {
      console.error(chalk.red(`[EventDriven] Error loading device driver:`, error));
      throw new Error(`Failed to load device driver configuration: ${error.message || error}`);
    }
  }


  /**
   * Set change monitoring interval (in milliseconds)
   * @param intervalMs - Monitoring interval in milliseconds (minimum 500ms, maximum 60000ms)
   */
  setChangeMonitoringInterval(intervalMs: number): void {
    // Validate interval range
    if (intervalMs < 500) {
      console.warn(chalk.yellow(`[EventDriven] Interval too fast (${intervalMs}ms), setting to minimum 500ms`));
      intervalMs = 500;
    }
    if (intervalMs > 60000) {
      console.warn(chalk.yellow(`[EventDriven] Interval too slow (${intervalMs}ms), setting to maximum 60000ms`));
      intervalMs = 60000;
    }

    const oldInterval = this.CHANGE_MONITORING_INTERVAL;
    this.CHANGE_MONITORING_INTERVAL = intervalMs;
    
    console.log(chalk.green(`[EventDriven] 🔄 Change monitoring interval updated: ${oldInterval}ms → ${intervalMs}ms`));
    
    // If service is running, restart monitoring with new interval
    if (this.isRunning && this.deviceStates.size > 0) {
      console.log(chalk.cyan(`[EventDriven] 🔄 Monitoring interval changed to ${intervalMs}ms`));
      this.restartMonitoring();
    }
  }

  /**
   * Get current change monitoring interval
   */
  getChangeMonitoringInterval(): number {
    return this.CHANGE_MONITORING_INTERVAL;
  }

  /**
   * Set monitoring interval using preset speeds
   */
  setMonitoringSpeed(speed: 'very-fast' | 'fast' | 'normal' | 'slow' | 'very-slow'): void {
    const speeds = {
      'very-fast': 500,   // 0.5 seconds
      'fast': 1000,       // 1 second
      'normal': 2000,     // 2 seconds (default)
      'slow': 5000,       // 5 seconds
      'very-slow': 10000  // 10 seconds
    };
    
    this.setChangeMonitoringInterval(speeds[speed]);
  }

  /**
   * Restart monitoring with new interval for all devices
   */
  private restartMonitoring(): void {
    // Clear existing intervals
    this.heartbeatIntervals.forEach(interval => clearInterval(interval));
    this.heartbeatIntervals.clear();
    
    // Restart monitoring for all devices
    for (const deviceId of this.deviceStates.keys()) {
      this.setupDeviceHeartbeat(deviceId);
    }
    
    console.log(chalk.green(`[EventDriven] ✅ Monitoring restarted for all devices`));
  }

  /**
   * Read current values from device - requires valid configuration
   */
  private async readDeviceValues(device: any): Promise<Map<number, any> | null> {
    try {
      // Use the standard device reading infrastructure
      const { readDeviceRegisters } = await import('./device.service');
      
      // Create a mock request context with app locals
      const mockReq = {
        app: {
          locals: (global as any).appLocals
        }
      } as any;
      
      // This will fail if device driver is missing - which is expected behavior
      const reading = await readDeviceRegisters(device._id.toString(), mockReq);
      
      if (!reading || !reading.readings) {
        return null;
      }

      // Convert readings to Map for easy comparison
      const values = new Map<number, any>();
      for (const read of reading.readings) {
        if (read.address !== undefined) {
          values.set(read.address, read.value);
        } else if (read.registerIndex !== undefined) {
          values.set(read.registerIndex, read.value);
        }
      }

      return values;
      
    } catch (error: any) {
      // Don't handle missing driver errors - let them bubble up
      if (error.message?.includes('Device driver not found')) {
        console.error(chalk.red(`[EventDriven] ❌ DRIVER ERROR: Device ${device.name} has missing device driver: ${device.deviceDriverId}`));
        throw error; // Stop monitoring this device
      } else if (error.message?.includes('Failed to load device driver configuration')) {
        console.error(chalk.red(`[EventDriven] ❌ DRIVER ERROR: Device ${device.name} has invalid driver configuration`));
        throw error; // Stop monitoring this device
      } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
        console.warn(chalk.yellow(`[EventDriven] ⚠️ Device ${device.name} connection failed. Device may be offline.`));
      } else {
        console.error(chalk.red(`[EventDriven] Error reading device ${device.name}:`, error.message));
      }
      return null;
    }
  }

  /**
   * Emergency initialization for extremely tight time constraints
   */
  private async emergencyInitialization(devices: any[], availableTime: number, startTime: number): Promise<{
    strategy: string;
    totalDevices: number;
    processedDevices: number;
    onlineDevices: number;
    backgroundDevices: number;
  }> {
    console.log(chalk.red(`[EventDriven] 🆘 EMERGENCY MODE: ${availableTime}ms for ${devices.length} devices`));
    
    const strategy = 'emergency';
    const totalDevices = devices.length;
    
    try {
      // Only process 1-2 critical devices immediately, rest go to background
      const criticalDevices = devices.slice(0, Math.min(2, devices.length));
      const backgroundDevicesList = devices.slice(criticalDevices.length);
      
      console.log(chalk.yellow(`[EventDriven] 🆘 Emergency: Processing ${criticalDevices.length} critical devices, ${backgroundDevicesList.length} to background`));
      
      let processedDevices = 0;
      let onlineDevices = 0;
      
      // Quick process critical devices
      for (const device of criticalDevices) {
        try {
          const deviceStartTime = Date.now();
          await this.initializeDevice(device);
          processedDevices++;
          onlineDevices++;
          const deviceTime = Date.now() - deviceStartTime;
          console.log(chalk.green(`[EventDriven] ✅ Emergency: ${device.name} ready (${deviceTime}ms)`));
          
          // Check time constraint
          if (Date.now() - startTime > availableTime * 0.8) {
            console.log(chalk.yellow(`[EventDriven] ⏰ Emergency time limit, stopping critical processing`));
            break;
          }
        } catch (error) {
          console.warn(chalk.yellow(`[EventDriven] ⚠️ Emergency: ${device.name} failed`));
          backgroundDevicesList.push(device);
        }
      }
      
      // Schedule all remaining devices for background
      backgroundDevicesList.forEach((device: any) => this.scheduleBackgroundInitialization(device));
      
      const backgroundDevices = backgroundDevicesList.length;
      return { strategy, totalDevices, processedDevices, onlineDevices, backgroundDevices };
      
    } catch (error) {
      console.error(chalk.red('[EventDriven] ❌ Emergency initialization failed:', error));
      // Even emergency mode failed - schedule all devices for background
      devices.forEach(device => this.scheduleBackgroundInitialization(device));
      return { strategy: 'emergency-failed', totalDevices, processedDevices: 0, onlineDevices: 0, backgroundDevices: totalDevices };
    }
  }
  
  /**
   * Graceful degradation when initialization fails
   */
  private async gracefulDegradation(originalError: any, timeoutMs: number): Promise<{
    strategy: string;
    totalDevices: number;
    processedDevices: number;
    onlineDevices: number;
    backgroundDevices: number;
  }> {
    console.log(chalk.yellow('[EventDriven] 🆘 Graceful degradation: Starting with minimal functionality'));
    
    const strategy = 'graceful-degradation';
    
    try {
      // Try to get device count from alternative method
      let deviceCount = 0;
      try {
        const DeviceModel = await this.getDeviceModel();
        deviceCount = await DeviceModel.countDocuments({ enabled: true });
        console.log(chalk.cyan(`[EventDriven] 🆘 Found ${deviceCount} enabled devices via count query`));
      } catch (countError) {
        console.warn(chalk.yellow('[EventDriven] 🆘 Unable to get device count, assuming 0'));
        deviceCount = 0;
      }
      
      if (deviceCount > 0) {
        console.log(chalk.yellow(`[EventDriven] 🆘 Scheduling all ${deviceCount} devices for background processing`));
        
        // Schedule background initialization for all devices
        setImmediate(async () => {
          try {
            const DeviceModel = await this.getDeviceModel();
            const devices = await DeviceModel.find({ enabled: true });
            devices.forEach((device: any) => this.scheduleBackgroundInitialization(device));
            console.log(chalk.green(`[EventDriven] ✅ Graceful degradation: ${devices.length} devices scheduled for background`));
          } catch (bgError) {
            console.error(chalk.red('[EventDriven] ❌ Even background scheduling failed:', bgError));
          }
        });
      }
      
      return {
        strategy,
        totalDevices: deviceCount,
        processedDevices: 0,
        onlineDevices: 0,
        backgroundDevices: deviceCount
      };
      
    } catch (degradationError) {
      console.error(chalk.red('[EventDriven] ❌ Graceful degradation failed:', degradationError));
      throw degradationError;
    }
  }
}

// Export singleton instance
export const eventDrivenService = new EventDrivenPollingService();
export default eventDrivenService;
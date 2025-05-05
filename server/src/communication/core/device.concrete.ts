import { Device, AbstractDevice as BaseAbstractDevice } from './device.interface';
import { EventEmitter, Event, EventType } from './events';
import { 
    ConnectionOptions, 
    ConnectionState, 
    Parameter, 
    ParameterValue, 
    RequestResult, 
    Statistics 
} from './types';
import { Protocol } from './protocol.interface';

/**
 * Concrete implementation of AbstractDevice
 */
export class ConcreteDevice extends EventEmitter implements Device {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly protocol: Protocol;
    readonly parameters: Parameter[] = [];
    readonly values: Map<string, ParameterValue> = new Map();
    protected _statistics: Statistics = {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        uptime: 0
    };
    
    // Create and emit proper Event objects
    private createEvent(type: string): Event {
        return {
            type: type,
            timestamp: new Date(),
            source: this.id
        };
    }
    
    constructor(
        id: string,
        name: string,
        protocol: Protocol,
        parameters: Parameter[] = [],
        description: string = ''
    ) {
        super();
        this.id = id;
        this.name = name;
        this.description = description;
        this.protocol = protocol;
        this.parameters = [...parameters];
        
        // Forward protocol events
        this.protocol.on('connected', () => this.emit(this.createEvent(EventType.CONNECTED)));
        this.protocol.on('disconnected', () => this.emit(this.createEvent(EventType.DISCONNECTED)));
        this.protocol.on('error', () => this.emit(this.createEvent(EventType.ERROR)));
        this.protocol.on('stateChanged', () => this.emit(this.createEvent(EventType.DEVICE_STATE_CHANGED)));
    }
    
    /**
     * Get the current connection state
     */
    get connectionState(): ConnectionState {
        return this.protocol.connectionState;
    }
    
    /**
     * Get whether the device is connected
     */
    get isConnected(): boolean {
        return this.protocol.isConnected;
    }
    
    /**
     * Get the device configuration
     */
    get config() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            protocol: this.protocol.constructor.name,
            parameters: this.parameters
        };
    }
    
    /**
     * Get communication statistics
     */
    get statistics(): Statistics {
        return this._statistics;
    }
    
    /**
     * Get device ID
     */
    getId(): string {
        return this.id;
    }
    
    /**
     * Initialize the device
     */
    async initialize(): Promise<void> {
        // Connect to the device if not already connected
        if (!this.isConnected) {
            await this.connect();
        }
    }
    
    /**
     * Connect to the device
     * @param options Optional connection options
     */
    async connect(options?: ConnectionOptions): Promise<void> {
        await this.protocol.connect(options);
    }
    
    /**
     * Disconnect from the device
     */
    async disconnect(): Promise<void> {
        await this.protocol.disconnect();
    }
    
    /**
     * Read a parameter by name
     * @param parameterName Parameter name
     */
    async read(parameterName: string): Promise<ParameterValue> {
        const startTime = Date.now();
        const parameter = this.getParameter(parameterName);
        
        if (!parameter) {
            throw new Error(`Parameter '${parameterName}' not found`);
        }
        
        try {
            const value = await this.protocol.readParameter(parameter);
            
            const result = {
                parameter,
                value,
                timestamp: new Date(),
                quality: 'good' as const
            };
            
            this.updateValue(parameterName, result);
            this.updateStatistics(true, Date.now() - startTime);
            
            return result;
        } catch (error) {
            this.updateStatistics(false, Date.now() - startTime);
            
            const errorResult = {
                parameter,
                value: null,
                timestamp: new Date(),
                quality: 'bad' as const,
                error: error instanceof Error ? error : new Error(String(error))
            };
            
            this.updateValue(parameterName, errorResult);
            throw error;
        }
    }
    
    /**
     * Read multiple parameters by name
     * @param parameterNames Parameter names
     */
    async readMultiple(parameterNames: string[]): Promise<ParameterValue[]> {
        const startTime = Date.now();
        const parameters = parameterNames.map(name => {
            const param = this.getParameter(name);
            if (!param) {
                throw new Error(`Parameter '${name}' not found`);
            }
            return param;
        });
        
        try {
            const values = await this.protocol.readParameters(parameters);
            
            const results = parameters.map((param, index) => {
                const result = {
                    parameter: param,
                    value: values[index],
                    timestamp: new Date(),
                    quality: 'good' as const
                };
                
                this.updateValue(param.name, result);
                return result;
            });
            
            this.updateStatistics(true, Date.now() - startTime);
            
            return results;
        } catch (error) {
            this.updateStatistics(false, Date.now() - startTime);
            
            const errorResults = parameters.map(param => {
                const errorResult = {
                    parameter: param,
                    value: null,
                    timestamp: new Date(),
                    quality: 'bad' as const,
                    error: error instanceof Error ? error : new Error(String(error))
                };
                
                this.updateValue(param.name, errorResult);
                return errorResult;
            });
            
            throw error;
        }
    }
    
    /**
     * Read all parameters
     */
    async readAll(): Promise<ParameterValue[]> {
        return this.readMultiple(this.parameters.map(p => p.name));
    }
    
    /**
     * Write a value to a parameter
     * @param parameterName Parameter name
     * @param value Value to write
     */
    async write(parameterName: string, value: any): Promise<RequestResult> {
        const startTime = Date.now();
        const parameter = this.getParameter(parameterName);
        
        if (!parameter) {
            throw new Error(`Parameter '${parameterName}' not found`);
        }
        
        try {
            await this.protocol.writeParameter(parameter, value);
            
            const result: RequestResult = {
                success: true,
                timestamp: new Date(),
                duration: Date.now() - startTime
            };
            
            this.updateStatistics(true, result.duration);
            
            // Update the cached value
            this.updateValue(parameterName, {
                parameter,
                value,
                timestamp: new Date(),
                quality: 'good'
            });
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.updateStatistics(false, duration);
            
            const result: RequestResult = {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                timestamp: new Date(),
                duration
            };
            
            return result;
        }
    }
    
    /**
     * Write values to multiple parameters
     * @param parameterNames Parameter names
     * @param values Values to write
     */
    async writeMultiple(parameterNames: string[], values: any[]): Promise<RequestResult[]> {
        if (parameterNames.length !== values.length) {
            throw new Error('Parameter names and values arrays must have the same length');
        }
        
        const startTime = Date.now();
        const writeParams = parameterNames.map((name, index) => {
            const param = this.getParameter(name);
            if (!param) {
                throw new Error(`Parameter '${name}' not found`);
            }
            return {
                parameter: param,
                value: values[index]
            };
        });
        
        const results: RequestResult[] = [];
        
        for (const { parameter, value } of writeParams) {
            const paramStartTime = Date.now();
            
            try {
                await this.protocol.writeParameter(parameter, value);
                
                const result: RequestResult = {
                    success: true,
                    timestamp: new Date(),
                    duration: Date.now() - paramStartTime
                };
                
                this.updateStatistics(true, result.duration);
                
                // Update the cached value
                this.updateValue(parameter.name, {
                    parameter,
                    value,
                    timestamp: new Date(),
                    quality: 'good'
                });
                
                results.push(result);
            } catch (error) {
                const duration = Date.now() - paramStartTime;
                this.updateStatistics(false, duration);
                
                const result: RequestResult = {
                    success: false,
                    error: error instanceof Error ? error : new Error(String(error)),
                    timestamp: new Date(),
                    duration
                };
                
                results.push(result);
            }
        }
        
        return results;
    }
    
    /**
     * Get a parameter by name
     * @param name Parameter name
     */
    getParameter(name: string): Parameter | undefined {
        return this.parameters.find(p => p.name === name);
    }
    
    /**
     * Add a parameter
     * @param parameter Parameter to add
     */
    addParameter(parameter: Parameter): void {
        if (this.getParameter(parameter.name)) {
            throw new Error(`Parameter with name ${parameter.name} already exists`);
        }
        this.parameters.push(parameter);
    }
    
    /**
     * Remove a parameter
     * @param name Parameter name
     */
    removeParameter(name: string): boolean {
        const index = this.parameters.findIndex(p => p.name === name);
        if (index !== -1) {
            this.parameters.splice(index, 1);
            return true;
        }
        return false;
    }
    
    /**
     * Update a parameter
     * @param name Parameter name
     * @param parameter Updated parameter
     */
    updateParameter(name: string, parameter: Partial<Parameter>): boolean {
        const index = this.parameters.findIndex(p => p.name === name);
        if (index !== -1) {
            this.parameters[index] = { ...this.parameters[index], ...parameter };
            return true;
        }
        return false;
    }
    
    /**
     * Get the last value of a parameter
     * @param name Parameter name
     */
    getLastValue(name: string): ParameterValue | undefined {
        return this.values.get(name);
    }
    
    /**
     * Update the last value of a parameter
     * @param name Parameter name
     * @param value Parameter value
     */
    protected updateValue(name: string, value: ParameterValue): void {
        this.values.set(name, value);
    }
    
    /**
     * Update statistics
     * @param success Whether the request was successful
     * @param duration Request duration in ms
     */
    protected updateStatistics(success: boolean, duration?: number): void {
        this._statistics.requestCount++;
        
        if (success) {
            this._statistics.successCount++;
            this._statistics.lastSuccessTime = new Date();
        } else {
            this._statistics.errorCount++;
            this._statistics.lastErrorTime = new Date();
        }
        
        this._statistics.lastRequestTime = new Date();
        
        if (duration) {
            this._statistics.averageResponseTime = 
                (this._statistics.averageResponseTime * (this._statistics.requestCount - 1) + duration) / 
                this._statistics.requestCount;
        }
    }
}
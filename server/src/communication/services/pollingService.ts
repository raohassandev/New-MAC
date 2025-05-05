import { EventEmitter } from '../core/events';
import { Device } from '../core/device.interface';
import { Parameter, ParameterValue } from '../core/types';
import { createErrorFromException } from '../core/errors';

/**
 * Interface for poll group configuration
 */
export interface PollGroupConfig {
    id: string;
    deviceId: string;
    parameters: Parameter[] | string[]; // Parameter objects or parameter names
    interval: number; // Polling interval in milliseconds
    description?: string;
    enabled?: boolean;
}

/**
 * Interface for a poll group
 */
interface PollGroup {
    config: PollGroupConfig;
    timer: NodeJS.Timeout | null;
    device: Device;
    lastPollTime: Date | null;
    parameters: Parameter[];
}

/**
 * Interface for poll result
 */
export interface PollResult {
    groupId: string;
    deviceId: string;
    timestamp: Date;
    values: ParameterValue[];
    errors?: Error[];
    duration: number;
}

/**
 * Service for polling device parameters at regular intervals
 */
export class PollingService extends EventEmitter {
    private static instance: PollingService;
    private pollGroups: Map<string, PollGroup> = new Map();
    private deviceResolver: (deviceId: string) => Device | undefined;
    private parameterResolver: (deviceId: string, paramName: string) => Parameter | undefined;

    private constructor() {
        super();
    }

    /**
     * Get the PollingService instance
     */
    public static getInstance(): PollingService {
        if (!PollingService.instance) {
            PollingService.instance = new PollingService();
        }
        return PollingService.instance;
    }

    /**
     * Initialize the polling service
     * @param deviceResolver Function to resolve device ID to Device object
     * @param parameterResolver Function to resolve parameter name to Parameter object
     */
    public initialize(
        deviceResolver: (deviceId: string) => Device | undefined,
        parameterResolver: (deviceId: string, paramName: string) => Parameter | undefined
    ): void {
        this.deviceResolver = deviceResolver;
        this.parameterResolver = parameterResolver;
    }

    /**
     * Add a new poll group
     * @param config Poll group configuration
     */
    public addPollGroup(config: PollGroupConfig): void {
        if (this.pollGroups.has(config.id)) {
            throw new Error(`Poll group with ID ${config.id} already exists`);
        }

        const device = this.resolveDevice(config.deviceId);
        if (!device) {
            throw new Error(`Device with ID ${config.deviceId} not found`);
        }

        // Resolve parameters
        const parameters = this.resolveParameters(config.deviceId, config.parameters);

        const pollGroup: PollGroup = {
            config: {
                ...config,
                enabled: config.enabled !== false // Default to enabled if not specified
            },
            timer: null,
            device,
            lastPollTime: null,
            parameters
        };

        this.pollGroups.set(config.id, pollGroup);

        // Start polling if enabled
        if (pollGroup.config.enabled) {
            this.startPolling(config.id);
        }

        this.emit('pollGroupAdded', { groupId: config.id });
    }

    /**
     * Update an existing poll group
     * @param config Updated poll group configuration
     */
    public updatePollGroup(config: PollGroupConfig): void {
        const pollGroup = this.pollGroups.get(config.id);
        if (!pollGroup) {
            throw new Error(`Poll group with ID ${config.id} not found`);
        }

        const wasEnabled = pollGroup.config.enabled;
        const device = this.resolveDevice(config.deviceId);
        if (!device) {
            throw new Error(`Device with ID ${config.deviceId} not found`);
        }

        // Resolve parameters
        const parameters = this.resolveParameters(config.deviceId, config.parameters);

        // Stop polling if active
        if (pollGroup.timer) {
            clearInterval(pollGroup.timer);
            pollGroup.timer = null;
        }

        // Update the poll group
        pollGroup.config = {
            ...config,
            enabled: config.enabled !== undefined ? config.enabled : pollGroup.config.enabled
        };
        pollGroup.device = device;
        pollGroup.parameters = parameters;

        // Restart polling if enabled
        if (pollGroup.config.enabled) {
            this.startPolling(config.id);
        }

        this.pollGroups.set(config.id, pollGroup);
        this.emit('pollGroupUpdated', { groupId: config.id });
    }

    /**
     * Remove a poll group
     * @param groupId ID of the poll group to remove
     */
    public removePollGroup(groupId: string): void {
        const pollGroup = this.pollGroups.get(groupId);
        if (!pollGroup) {
            throw new Error(`Poll group with ID ${groupId} not found`);
        }

        // Stop polling if active
        if (pollGroup.timer) {
            clearInterval(pollGroup.timer);
        }

        this.pollGroups.delete(groupId);
        this.emit('pollGroupRemoved', { groupId });
    }

    /**
     * Get a poll group by ID
     * @param groupId ID of the poll group to get
     */
    public getPollGroup(groupId: string): PollGroupConfig | undefined {
        const pollGroup = this.pollGroups.get(groupId);
        return pollGroup?.config;
    }

    /**
     * Get all poll groups
     */
    public getAllPollGroups(): PollGroupConfig[] {
        return Array.from(this.pollGroups.values()).map(group => group.config);
    }

    /**
     * Start polling for a specific group
     * @param groupId ID of the poll group to start
     */
    public startPolling(groupId: string): void {
        const pollGroup = this.pollGroups.get(groupId);
        if (!pollGroup) {
            throw new Error(`Poll group with ID ${groupId} not found`);
        }

        // Stop existing timer if active
        if (pollGroup.timer) {
            clearInterval(pollGroup.timer);
            pollGroup.timer = null;
        }

        // Skip if no parameters to poll
        if (pollGroup.parameters.length === 0) {
            return;
        }

        // Enable the poll group
        pollGroup.config.enabled = true;

        // Execute one poll immediately
        this.executePoll(groupId).catch(error => {
            this.emit('error', {
                groupId,
                error: createErrorFromException(error)
            });
        });

        // Start the polling timer
        pollGroup.timer = setInterval(() => {
            this.executePoll(groupId).catch(error => {
                this.emit('error', {
                    groupId,
                    error: createErrorFromException(error)
                });
            });
        }, pollGroup.config.interval);

        this.emit('pollingStarted', { groupId });
    }

    /**
     * Stop polling for a specific group
     * @param groupId ID of the poll group to stop
     */
    public stopPolling(groupId: string): void {
        const pollGroup = this.pollGroups.get(groupId);
        if (!pollGroup) {
            throw new Error(`Poll group with ID ${groupId} not found`);
        }

        if (pollGroup.timer) {
            clearInterval(pollGroup.timer);
            pollGroup.timer = null;
        }

        pollGroup.config.enabled = false;
        this.emit('pollingStopped', { groupId });
    }

    /**
     * Execute a single poll for a specific group
     * @param groupId ID of the poll group to poll
     */
    public async executePoll(groupId: string): Promise<PollResult> {
        const pollGroup = this.pollGroups.get(groupId);
        if (!pollGroup) {
            throw new Error(`Poll group with ID ${groupId} not found`);
        }

        const startTime = Date.now();
        pollGroup.lastPollTime = new Date();

        try {
            // Check if device is connected
            if (!pollGroup.device.isConnected()) {
                try {
                    await pollGroup.device.connect();
                } catch (error) {
                    const result: PollResult = {
                        groupId,
                        deviceId: pollGroup.config.deviceId,
                        timestamp: new Date(),
                        values: [],
                        errors: [createErrorFromException(error)],
                        duration: Date.now() - startTime
                    };
                    this.emit('pollCompleted', result);
                    return result;
                }
            }

            // Read all parameters
            const paramValues = await pollGroup.device.readParameters(pollGroup.parameters);

            const result: PollResult = {
                groupId,
                deviceId: pollGroup.config.deviceId,
                timestamp: new Date(),
                values: paramValues,
                duration: Date.now() - startTime
            };

            this.emit('pollCompleted', result);
            return result;
        } catch (error) {
            const result: PollResult = {
                groupId,
                deviceId: pollGroup.config.deviceId,
                timestamp: new Date(),
                values: [],
                errors: [createErrorFromException(error)],
                duration: Date.now() - startTime
            };
            this.emit('pollError', result);
            return result;
        }
    }

    /**
     * Execute a single poll for all enabled groups
     */
    public async pollAll(): Promise<PollResult[]> {
        const enabledGroups = Array.from(this.pollGroups.values())
            .filter(group => group.config.enabled)
            .map(group => group.config.id);

        const pollPromises = enabledGroups.map(groupId => this.executePoll(groupId));
        return Promise.all(pollPromises);
    }

    /**
     * Start polling for all groups
     */
    public startAll(): void {
        for (const [groupId, pollGroup] of this.pollGroups.entries()) {
            if (pollGroup.config.enabled) {
                this.startPolling(groupId);
            }
        }
        this.emit('allPollingStarted');
    }

    /**
     * Stop polling for all groups
     */
    public stopAll(): void {
        for (const [groupId] of this.pollGroups.entries()) {
            this.stopPolling(groupId);
        }
        this.emit('allPollingStopped');
    }

    /**
     * Resolve a device ID to a Device object
     * @param deviceId Device ID to resolve
     */
    private resolveDevice(deviceId: string): Device | undefined {
        if (!this.deviceResolver) {
            throw new Error('Device resolver not initialized');
        }
        return this.deviceResolver(deviceId);
    }

    /**
     * Resolve parameters for a device
     * @param deviceId Device ID
     * @param parameters Parameters to resolve
     */
    private resolveParameters(deviceId: string, parameters: Parameter[] | string[]): Parameter[] {
        if (!this.parameterResolver) {
            throw new Error('Parameter resolver not initialized');
        }

        const resolvedParams: Parameter[] = [];

        for (const param of parameters) {
            if (typeof param === 'string') {
                const resolvedParam = this.parameterResolver(deviceId, param);
                if (resolvedParam) {
                    resolvedParams.push(resolvedParam);
                } else {
                    this.emit('warning', {
                        message: `Parameter "${param}" not found for device ${deviceId}`
                    });
                }
            } else {
                resolvedParams.push(param);
            }
        }

        return resolvedParams;
    }
}
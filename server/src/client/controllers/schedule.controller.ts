import { Request, Response } from 'express';
import ScheduleService from '../services/schedule.service';
import mongoose from 'mongoose';

// Create a system user ObjectId for unauthenticated requests
const SYSTEM_USER_ID = new mongoose.Types.ObjectId('000000000000000000000000');

// Define a custom request type that includes user information
interface AuthRequest extends Request {
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    username?: string;
    email?: string;
  };
}

/**
 * @desc    Create a new schedule template
 * @route   POST /api/schedules/templates
 * @access  Private
 */
export const createScheduleTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id || SYSTEM_USER_ID;
    
    // if (!userId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized - User not authenticated'
    //   });
    // }

    // Process rules to ensure they have proper defaults
    let processedBody = { ...req.body };
    
    if (processedBody.rules && Array.isArray(processedBody.rules)) {
      processedBody.rules = processedBody.rules.map((rule: any) => {
        // If rule has no days, it's a new rule - return only essential fields
        if (!rule.days) {
          return {
            startTime: rule.startTime || '00:00',
            endTime: rule.endTime || '00:00',
            setpoint: rule.setpoint || 0,
            // Don't include days for new rules
            enabled: rule.enabled !== undefined ? rule.enabled : true,
            parameter: rule.parameter || 'Temperature',
            returnToDefault: rule.returnToDefault || false
          };
        }
        // For existing rules with days, normalize the data
        return {
          ...rule,
          startTime: rule.startTime || '00:00',
          endTime: rule.endTime || '00:00',
          setpoint: rule.setpoint || 0,
          days: rule.days,  // Keep existing days
          enabled: rule.enabled !== undefined ? rule.enabled : true,
          parameter: rule.parameter || 'Temperature',
          returnToDefault: rule.returnToDefault || false
        };
      });
    }
    
    // Add creator information to the template data
    const templateData = {
      ...processedBody,
      createdBy: {
        userId,
        username: req.user?.name || req.user?.username || 'System',
        email: req.user?.email || 'system@localhost'
      }
    };

    const template = await ScheduleService.createScheduleTemplate(templateData, userId.toString(), req);

    return res.status(201).json({
      success: true,
      message: 'Schedule template created successfully',
      template
    });
  } catch (error: any) {
    console.error('[scheduleController] Error creating schedule template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get all schedule templates (user's own + public ones)
 * @route   GET /api/schedules/templates
 * @access  Private
 */
export const getScheduleTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id || SYSTEM_USER_ID;
    
    // if (!userId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized - User not authenticated'
    //   });
    // }

    const includePrivate = req.query.includePrivate !== 'false';
    const templates = await ScheduleService.getScheduleTemplates(userId.toString(), req, includePrivate);

    return res.json({
      success: true,
      message: 'Schedule templates retrieved successfully',
      templates,
      count: templates.length
    });
  } catch (error: any) {
    console.error('[scheduleController] Error getting schedule templates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get schedule template by ID
 * @route   GET /api/schedules/templates/:id
 * @access  Private
 */
export const getScheduleTemplateById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const template = await ScheduleService.getScheduleTemplateById(id, req);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Schedule template not found'
      });
    }

    return res.json({
      success: true,
      message: 'Schedule template retrieved successfully',
      template
    });
  } catch (error: any) {
    console.error('[scheduleController] Error getting schedule template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Update schedule template
 * @route   PUT /api/schedules/templates/:id
 * @access  Private (owner only)
 */
export const updateScheduleTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id || SYSTEM_USER_ID;
    const { id } = req.params;
    
    // if (!userId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized - User not authenticated'
    //   });
    // }

    // Process the rules to ensure new rules don't inherit days from existing rules
    let updates = { ...req.body };
    
    if (updates.rules && Array.isArray(updates.rules)) {
      // Process each rule
      updates.rules = updates.rules.map((rule: any, index: number) => {
        // If this is a new rule (identified by having no days property)
        // Return only essential fields without days
        if (!rule.days) {
          return {
            startTime: rule.startTime || '00:00',
            endTime: rule.endTime || '00:00',
            setpoint: rule.setpoint || 0,
            // Don't include days for new rules
            enabled: rule.enabled !== undefined ? rule.enabled : true,
            parameter: rule.parameter || 'Temperature',
            returnToDefault: rule.returnToDefault || false
          };
        }
        // For existing rules, keep them as is
        return rule;
      });
    }
    
    const template = await ScheduleService.updateScheduleTemplate(id, updates, userId.toString(), req);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Schedule template not found or you do not have permission to update it'
      });
    }

    return res.json({
      success: true,
      message: 'Schedule template updated successfully',
      template
    });
  } catch (error: any) {
    console.error('[scheduleController] Error updating schedule template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Delete schedule template
 * @route   DELETE /api/schedules/templates/:id
 * @access  Private (owner only)
 */
export const deleteScheduleTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id || SYSTEM_USER_ID;
    const { id } = req.params;
    
    // if (!userId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized - User not authenticated'
    //   });
    // }

    const success = await ScheduleService.deleteScheduleTemplate(id, userId.toString(), req);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Schedule template not found or you do not have permission to delete it'
      });
    }

    return res.json({
      success: true,
      message: 'Schedule template deleted successfully'
    });
  } catch (error: any) {
    console.error('[scheduleController] Error deleting schedule template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Apply schedule template to device
 * @route   POST /api/schedules/devices/:deviceId/apply
 * @access  Private
 */
export const applyTemplateToDevice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id || SYSTEM_USER_ID;
    const { deviceId } = req.params;
    const { templateId, customRules, startDate, endDate } = req.body;
    
    // if (!userId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized - User not authenticated'
    //   });
    // }

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Template ID is required'
      });
    }

    const schedule = await ScheduleService.applyTemplateToDevice(
      deviceId,
      templateId,
      customRules || [],
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      userId.toString(),
      req
    );

    return res.status(201).json({
      success: true,
      message: 'Schedule template applied to device successfully',
      schedule
    });
  } catch (error: any) {
    console.error('[scheduleController] Error applying template to device:', error);
    
    // Check if it's a scheduling validation error
    if (error.message && (error.message.includes('Scheduling is disabled') || 
                         error.message.includes('does not support scheduling') || 
                         error.message.includes('Unable to verify scheduling status'))) {
      return res.status(400).json({
        success: false,
        message: error.message,
        requiresScheduleBit: true
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get device schedule
 * @route   GET /api/schedules/devices/:deviceId
 * @access  Private
 */
export const getDeviceSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const schedule = await ScheduleService.getDeviceSchedule(deviceId, req);

    if (!schedule) {
      return res.json({
        success: true,
        message: 'No schedule found for this device',
        schedule: null
      });
    }

    return res.json({
      success: true,
      message: 'Device schedule retrieved successfully',
      schedule
    });
  } catch (error: any) {
    console.error('[scheduleController] Error getting device schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Update device schedule
 * @route   PUT /api/schedules/devices/:deviceId
 * @access  Private
 */
export const updateDeviceSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id || SYSTEM_USER_ID;
    const { deviceId } = req.params;
    
    // if (!userId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized - User not authenticated'
    //   });
    // }

    const schedule = await ScheduleService.updateDeviceSchedule(deviceId, req.body, userId.toString(), req);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Device schedule not found'
      });
    }

    return res.json({
      success: true,
      message: 'Device schedule updated successfully',
      schedule
    });
  } catch (error: any) {
    console.error('[scheduleController] Error updating device schedule:', error);
    
    // Check if it's a scheduling validation error
    if (error.message && (error.message.includes('Scheduling is disabled') || 
                         error.message.includes('does not support scheduling') || 
                         error.message.includes('Unable to verify scheduling status'))) {
      return res.status(400).json({
        success: false,
        message: error.message,
        requiresScheduleBit: true
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Deactivate device schedule
 * @route   DELETE /api/schedules/devices/:deviceId
 * @access  Private
 */
export const deactivateDeviceSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId } = req.params;
    const success = await ScheduleService.deactivateDeviceSchedule(deviceId, req);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Device schedule not found'
      });
    }

    return res.json({
      success: true,
      message: 'Device schedule deactivated successfully'
    });
  } catch (error: any) {
    console.error('[scheduleController] Error deactivating device schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get devices using a specific schedule template
 * @route   GET /api/schedules/templates/:templateId/devices
 * @access  Private
 */
export const getDevicesByTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.params;
    const schedules = await ScheduleService.getDeviceSchedulesByTemplate(templateId, req);

    return res.json({
      success: true,
      message: 'Devices using template retrieved successfully',
      schedules,
      count: schedules.length
    });
  } catch (error: any) {
    console.error('[scheduleController] Error getting devices by template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Process scheduled changes (for cron job or manual trigger)
 * @route   POST /api/schedules/process
 * @access  Private (Admin only)
 */
export const processScheduledChanges = async (req: AuthRequest, res: Response) => {
  try {
    // Get schedules that need processing (start or end times)
    const schedulesToProcess = await ScheduleService.getSchedulesToProcess(req);
    let processedCount = 0;
    let errors: string[] = [];
    
    for (const item of schedulesToProcess) {
      const { schedule, action, rule } = item;
      
      try {
        // Simply log the schedule processing - the actual processing is done by the ScheduleProcessorService
        console.log(`[scheduleController] Schedule processing requested for device ${schedule.deviceId}`);
        console.log(`[scheduleController] Action: ${action}, Value: ${action === 'start' ? rule.setpoint : (rule.defaultSetpoint || 0)}`);
        
        // Note: The actual processing is handled by the ScheduleProcessorService which runs automatically
        // This endpoint can be used to manually trigger processing or for testing
        
        processedCount++;
      } catch (error: any) {
        errors.push(`Failed to process ${action} for device ${schedule.deviceId}: ${error.message}`);
      }
    }

    return res.json({
      success: true,
      message: `Processed ${processedCount} scheduled changes`,
      processedCount,
      totalSchedules: schedulesToProcess.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('[scheduleController] Error processing scheduled changes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
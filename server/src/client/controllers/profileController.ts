import { Request, Response } from 'express';

import { IDevice } from '../models/Device'; // Import the Device interface
import ModbusRTU from 'modbus-serial';
import { Profile } from '../models';

// @desc    Get all profiles
// @route   GET /api/profiles
// @access  Private
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await Profile.find({}).populate('assignedDevices', 'name ip enabled');
    res.json(profiles);
  } catch (error: any) {
    console.error('Get profiles error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get a single profile
// @route   GET /api/profiles/:id
// @access  Private
export const getProfileById = async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findById(req.params.id).populate(
      'assignedDevices',
      'name ip enabled',
    );

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new profile
// @route   POST /api/profiles
// @access  Private
export const createProfile = async (req: Request, res: Response) => {
  try {
    const profile = await Profile.create(req.body);
    res.status(201).json(profile);
  } catch (error: any) {
    console.error('Create profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a profile
// @route   PUT /api/profiles/:id
// @access  Private
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Update profile
    const updatedProfile = await Profile.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json(updatedProfile);
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a profile
// @route   DELETE /api/profiles/:id
// @access  Private
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    await profile.deleteOne();

    res.json({ message: 'Profile removed', id: req.params.id });
  } catch (error: any) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Duplicate a profile
// @route   POST /api/profiles/:id/duplicate
// @access  Private
export const duplicateProfile = async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Create a copy of the profile
    const profileData = profile.toObject();
    delete profileData._id;
    profileData.name = `${profileData.name} (Copy)`;
    profileData.createdAt = new Date();
    profileData.updatedAt = new Date();

    const newProfile = await Profile.create(profileData);

    res.status(201).json(newProfile);
  } catch (error: any) {
    console.error('Duplicate profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Apply profile to assigned devices
// @route   POST /api/profiles/:id/apply
// @access  Private
export const applyProfile = async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findById(req.params.id).populate('assignedDevices');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (!profile.assignedDevices || profile.assignedDevices.length === 0) {
      return res.status(400).json({ message: 'No devices assigned to this profile' });
    }

    // Results of applying profile to each device
    const results = [];

    // Type assertion to tell TypeScript that these are full Device documents, not just ObjectIds
    const devices = profile.assignedDevices as unknown as IDevice[];

    // For each assigned device, apply the profile settings
    for (const device of devices) {
      if (!device.enabled) {
        results.push({
          deviceId: device._id,
          deviceName: device.name,
          success: false,
          message: 'Device is disabled',
        });
        continue;
      }

      const client = new ModbusRTU();

      try {
        // Connect to the device - check if ip and port are defined
        if (device.ip && device.port) {
          await client.connectTCP(device.ip, { port: device.port });
        } else {
          throw new Error('Missing device connection information');
        }

        // Set slave ID with default if not defined
        client.setID(device.slaveId || 1);

        // Apply profile settings (for demonstration - this would be custom per device type)
        // This is just an example - the actual implementation would depend on device specifics

        // Setting target temperature (assuming register address 100)
        await client.writeRegisters(100, [Math.round(profile.targetTemperature * 10)]);

        // Setting fan speed (assuming register address 101)
        await client.writeRegisters(101, [profile.fanSpeed]);

        // Setting mode (assuming register address 102)
        const modeMapping: { [key: string]: number } = {
          cooling: 1,
          heating: 2,
          auto: 3,
          dehumidify: 4,
        };
        const modeValue = modeMapping[profile.mode] || 1;

        await client.writeRegisters(102, [modeValue]);

        // Update device lastSeen timestamp
        device.lastSeen = new Date();
        await device.save();

        results.push({
          deviceId: device._id,
          deviceName: device.name,
          success: true,
          message: 'Profile applied successfully',
        });
      } catch (modbusError: any) {
        console.error(`Modbus error applying profile to device ${device.name}:`, modbusError);
        results.push({
          deviceId: device._id,
          deviceName: device.name,
          success: false,
          message: `Failed to apply profile: ${modbusError.message}`,
        });
      } finally {
        // Close the connection
        client.close();
      }
    }

    res.json({
      profileId: profile._id,
      profileName: profile.name,
      timestamp: new Date(),
      results,
    });
  } catch (error: any) {
    console.error('Apply profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all template profiles
// @route   GET /api/profiles/templates
// @access  Private
export const getTemplateProfiles = async (req: Request, res: Response) => {
  try {
    const templates = await Profile.find({ isTemplate: true });
    res.json(templates);
  } catch (error: any) {
    console.error('Get template profiles error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a profile from template
// @route   POST /api/profiles/from-template/:templateId
// @access  Private
export const createFromTemplate = async (req: Request, res: Response) => {
  try {
    const template = await Profile.findById(req.params.templateId);

    if (!template) {
      return res.status(404).json({ message: 'Template profile not found' });
    }

    if (!template.isTemplate) {
      return res.status(400).json({ message: 'Specified profile is not a template' });
    }

    // Create a new profile based on the template
    const profileData = template.toObject();
    delete profileData._id;

    // Override with user-provided values
    const { name, description, assignedDevices } = req.body;

    profileData.name = name || `${profileData.name} (Copy)`;
    if (description) profileData.description = description;

    // New profile is not a template
    profileData.isTemplate = false;

    // Set assigned devices if provided
    if (assignedDevices) {
      profileData.assignedDevices = assignedDevices;
    } else {
      profileData.assignedDevices = [];
    }

    // Reset timestamps
    profileData.createdAt = new Date();
    profileData.updatedAt = new Date();

    const newProfile = await Profile.create(profileData);

    res.status(201).json(newProfile);
  } catch (error: any) {
    console.error('Create from template error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

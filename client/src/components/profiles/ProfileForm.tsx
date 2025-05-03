import React, { useEffect, useState } from 'react';

import { Profile } from '../../types/profile.types';

interface ProfileFormProps {
  profile?: Partial<Profile>;
  onSubmit: (profile: Partial<Profile>) => void;
  onCancel?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  profile: initialProfile,
  onSubmit,
  onCancel,
}) => {
  const [profile, setProfile] = useState<Partial<Profile>>(
    initialProfile || {
      name: '',
      description: '',
      targetTemperature: 22,
      temperatureRange: [18, 28] as [number, number],
      fanSpeed: 50,
      mode: 'cooling',
    }
  );

  // Update form if initialProfile changes
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleRangeChange = (index: number, value: number) => {
    setProfile(prev => {
      const newRange = [...(prev.temperatureRange || [18, 28])] as [number, number];
      newRange[index] = value;
      return { ...prev, temperatureRange: newRange };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(profile);
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Profile Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={profile.name || ''}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={profile.description || ''}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="targetTemperature">Target Temperature (°C)</label>
        <input
          type="number"
          id="targetTemperature"
          name="targetTemperature"
          value={profile.targetTemperature || ''}
          onChange={handleNumberChange}
          min="0"
          max="40"
          step="0.5"
          required
        />
      </div>

      <div className="form-group">
        <label>Temperature Range (°C)</label>
        <div className="range-inputs">
          <input
            type="number"
            value={profile.temperatureRange?.[0] || 18}
            onChange={e => handleRangeChange(0, Number(e.target.value))}
            min="0"
            max="40"
            step="0.5"
          />
          <span> to </span>
          <input
            type="number"
            value={profile.temperatureRange?.[1] || 28}
            onChange={e => handleRangeChange(1, Number(e.target.value))}
            min="0"
            max="40"
            step="0.5"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="fanSpeed">Fan Speed (%)</label>
        <input
          type="number"
          id="fanSpeed"
          name="fanSpeed"
          value={profile.fanSpeed || ''}
          onChange={handleNumberChange}
          min="0"
          max="100"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="mode">Mode</label>
        <select
          id="mode"
          name="mode"
          value={profile.mode || 'cooling'}
          onChange={handleChange}
          required
        >
          <option value="cooling">Cooling</option>
          <option value="heating">Heating</option>
          <option value="auto">Auto</option>
          <option value="dehumidify">Dehumidify</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-btn">
          {initialProfile?._id ? 'Update Profile' : 'Create Profile'}
        </button>
        {onCancel && (
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ProfileForm;

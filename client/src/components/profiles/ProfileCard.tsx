import { Profile } from '../../types/profile.types';
import React from 'react';

interface ProfileCardProps {
  profile: Profile;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onApply?: (id: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onEdit, onDelete, onApply }) => {
  if (!profile) {
    return <div>No profile data</div>;
  }

  return (
    <div className="profile-card">
      <div className="profile-header">
        <h3>{profile.name}</h3>
        {profile.description && <p>{profile.description}</p>}
      </div>

      <div className="profile-details">
        <div className="detail-row">
          <span className="detail-label">Target Temp:</span>
          <span className="detail-value">
            {profile.targetTemperature !== undefined ? `${profile.targetTemperature}°C` : 'N/A'}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Temperature Range:</span>
          <span className="detail-value">
            {profile.temperatureRange?.length === 2
              ? `${profile.temperatureRange[0]}°C - ${profile.temperatureRange[1]}°C`
              : 'N/A'}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Fan Speed:</span>
          <span className="detail-value">
            {profile.fanSpeed !== undefined ? `${profile.fanSpeed}%` : 'N/A'}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Mode:</span>
          <span className="detail-value">{profile.mode || 'N/A'}</span>
        </div>
      </div>

      {(onEdit || onDelete || onApply) && (
        <div className="profile-actions">
          {onEdit && (
            <button className="edit-btn" onClick={() => onEdit(profile._id)}>
              Edit
            </button>
          )}

          {onDelete && (
            <button className="delete-btn" onClick={() => onDelete(profile._id)}>
              Delete
            </button>
          )}

          {onApply && (
            <button className="apply-btn" onClick={() => onApply(profile._id)}>
              Apply Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileCard;

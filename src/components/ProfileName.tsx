import React from 'react';

interface ProfileNameProps {
  profileName: string;
  textColor: string;
}

const ProfileName: React.FC<ProfileNameProps> = ({ profileName, textColor }) => {
  return (
    <div className="profile-name">
      <div className="profile-name-display" aria-label="Character Name" style={{ color: textColor }}>
        {profileName || ' '}
      </div>
    </div>
  );
};

export default ProfileName;

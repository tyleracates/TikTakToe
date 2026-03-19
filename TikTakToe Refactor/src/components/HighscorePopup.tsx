import React from 'react';

interface HighscorePopupProps {
  playerWins: number;
  profileName: string;
  onClose: () => void;
}

const HighscorePopup: React.FC<HighscorePopupProps> = ({ playerWins, profileName, onClose }) => {
  const name = profileName.trim() || 'Player';
  return (
    <div className="highscore-overlay">
      <div className="highscore-popup">
        <h2>🏆 Wins</h2>
        <div className="wins-total-display">
          <div className="wins-total-name">{name}</div>
          <div className="wins-total-count">{playerWins}</div>
          {playerWins === 0 && (
            <p className="wins-total-subtext">...not a single win. Incredible.</p>
          )}
          {playerWins > 0 && (
            <p className="wins-total-subtext">Somehow. Some way.</p>
          )}
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default HighscorePopup;

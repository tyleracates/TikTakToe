import React, { useEffect, useRef, useState } from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  profileName: string;
  setProfileName: (name: string) => void;
  screenColor: string;
  setScreenColor: (color: string) => void;
  difficulty: string;
  setDifficulty: (d: string) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  profileName,
  setProfileName,
  screenColor,
  setScreenColor,
  difficulty,
  setDifficulty,
}) => {
  const profileHelpText = 'Spell the name of the loser here!';
  const [expanded, setExpanded] = useState(false);
  const [showDifficultyMsg, setShowDifficultyMsg] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCowboyMsg, setShowCowboyMsg] = useState(false);
  const [committedName, setCommittedName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mirrorRef.current && inputRef.current) {
      const measureText = (!isFocused && !profileName)
        ? profileHelpText
        : (profileName || '\u00a0');
      mirrorRef.current.textContent = measureText;
      const w = mirrorRef.current.offsetWidth;
      inputRef.current.style.width = `${w + 28}px`;
    }
  }, [profileName, isFocused, profileHelpText]);
  const [activeDifficultyWord, setActiveDifficultyWord] = useState(0);

  const difficultyMessage = "LOL, losers don't get to choose the difficulty until they win! Get good bozo! 😂";
  const difficultyWords = difficultyMessage.split(' ');

  const handleRetryName = () => {
    setCommittedName('');
    setProfileName('');
    setIsFocused(false);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (!showDifficultyMsg) {
      return;
    }

    setActiveDifficultyWord(0);
    const intervalId = window.setInterval(() => {
      setActiveDifficultyWord(prev => (prev + 1) % difficultyWords.length);
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [showDifficultyMsg, difficultyWords.length]);

  const colorOptions = [
    { label: 'Default Black',          value: '#000000', textColor: '#ffffff' },
    { label: 'Opposite of Black',      value: '#ffffff', textColor: '#ffffff' },
    { label: 'Almost Black',           value: '#6b7280', textColor: '#6b7280' },
    { label: 'Not Black',              value: '#3b82f6', textColor: '#3b82f6' },
    { label: 'Also Not Black',         value: '#ef4444', textColor: '#ef4444' },
    { label: 'Dude... Seriously?',     value: '#22c55e', textColor: '#22c55e' },
    { label: 'Oh, Come Off It...',     value: '#eab308', textColor: '#eab308' },
    { label: 'Close Enough',           value: '#a855f7', textColor: '#a855f7' },
    { label: 'Please Just Choose Black', value: '#f97316', textColor: '#f97316' },
    { label: 'LOL, I dare you!',       value: '#ec4899', textColor: '#ec4899', disabled: true },
  ];

  return (
    <>
      {committedName && (
        <div className="profile-badge">
          <span className="profile-badge-name">{committedName}</span>
        </div>
      )}
      <div className="main-menu">
      <h1>Tik-Tak-Toe</h1>
      <p style={{ margin: '0', fontWeight: 'bold', color: '#111', textAlign: 'center', fontSize: '0.9rem', fontStyle: 'italic' }}>
        Name of the loser?
      </p>
      {!committedName ? (
        <>
          <span
            ref={mirrorRef}
            aria-hidden
            style={{
              position: 'absolute',
              visibility: 'hidden',
              whiteSpace: 'pre',
              fontSize: '1rem',
              fontFamily: 'inherit',
              padding: '0',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={!isFocused && !profileName ? profileHelpText : ''}
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' && profileName.trim()) {
                setCommittedName(profileName.trim());
                setIsFocused(false);
              }
            }}
            style={{ width: '80px', transition: 'width 0.15s ease' }}
          />
        </>
      ) : (
        <button className="start-btn rename-profile-btn" onClick={handleRetryName}>
          Butchered your own name? Omg...try again... 😒
        </button>
      )}

      <button onClick={() => setExpanded(v => !v)}>
        😎 Pimp out your game before you start losing! 😎
      </button>

      {expanded && (
        <div className="cascade-options">
          <div className="cascade-item" style={{ animationDelay: '0ms' }}>
            <div className="color-btn-wrapper">
              <button className="start-btn" onClick={() => setShowColorPicker(v => !v)}>🖌️ Set Screen Color 🎨</button>
              {showColorPicker && (
                <div className="color-picker-popup">
                  {colorOptions.map((opt, index) => (
                    <button
                      key={opt.label}
                      className={`color-option-btn ${screenColor === opt.value ? 'selected' : ''}`}
                      style={{ color: opt.textColor, animationDelay: `${index * 40}ms` } as React.CSSProperties}
                      onClick={() => {
                        if (opt.disabled) {
                          setShowCowboyMsg(v => !v);
                        } else {
                          setScreenColor(opt.value);
                          setShowCowboyMsg(false);
                        }
                      }}
                    >
                      {opt.label}
                      {opt.disabled && showCowboyMsg && (
                        <span className="cowboy-popup">
                          Not 'round here partner....<br />Not 'round here 🤠
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="cascade-item" style={{ animationDelay: '80ms' }}>
            <div className="difficulty-wrapper">
              <button className="start-btn" onClick={() => setShowDifficultyMsg(v => !v)}>😠 Difficulty 😠</button>
              {showDifficultyMsg && (
                <div className="difficulty-popup">
                  {difficultyWords.map((word, index) => (
                    <span
                      key={`${word}-${index}`}
                      className={`difficulty-word ${index === activeDifficultyWord ? 'active' : ''}`}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="cascade-item" style={{ animationDelay: '160ms' }}>
            <button className="start-btn" onClick={onStartGame}>💀 Start Game 😂</button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default MainMenu;

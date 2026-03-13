document.addEventListener('DOMContentLoaded', function() {
    try {
        // --- User Profile Name Logic ---
        function renderProfileName() {
            const name = localStorage.getItem('profileName') || '';
                        if (name) {
                                profileNameDisplay.innerHTML = `
                                    <div class="profile-flex-center">
                                        <span class="profile-x-icon">X</span>
                                        <span class="profile-name-text">${name}</span>
                                    </div>`;
                                profileNameDisplay.classList.add('has-profile');
                        } else {
                                profileNameDisplay.innerHTML = `
                                    <div class="profile-flex-center">
                                        <span class="profile-x-icon">X</span>
                                        <span class="profile-name-text">&nbsp;</span>
                                    </div>`;
                                profileNameDisplay.classList.remove('has-profile');
                        }
            renderScoreboard(); // Update scoreboard with new name
        }
        function openProfileNamePrompt() {
            const current = localStorage.getItem('profileName') || '';
            const name = prompt('Enter your profile name:', current);
            if (name !== null) {
                localStorage.setItem('profileName', name.trim());
                renderProfileName();
            }
        }
        const profileNameDisplay = document.getElementById('profile-name-display');
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userMenu = document.getElementById('user-menu');
        const setProfileNameBtn = document.getElementById('set-profile-name');
        const setScreenColorBtn = document.getElementById('set-screen-color');
        const colorPanel = document.getElementById('color-panel');
        const colorOptions = colorPanel ? colorPanel.querySelectorAll('.color-option') : [];

        setProfileNameBtn.addEventListener('click', openProfileNamePrompt);

        userMenuBtn.addEventListener('click', (e) => {
            userMenu.classList.toggle('open');
            e.stopPropagation();
        });


        // --- Screen Color Logic ---
        function setScreenColor(color) {
            // If 'Default' (color #222), reset to default background
            if (color === '#222') {
                document.body.style.backgroundColor = '';
                localStorage.removeItem('screenColor');
            } else {
                document.body.style.backgroundColor = color;
                localStorage.setItem('screenColor', color);
            }
            // Update title and scoreboard text color
            const title = document.querySelector('h1');
            const scoreTitle = document.getElementById('score-title');
            const scoreboard = document.getElementById('scoreboard');
            const status = document.getElementById('status');
            if (!color || color === '#222') {
                title && title.classList.remove('text-black');
                scoreTitle && scoreTitle.classList.remove('text-black');
                scoreboard && scoreboard.classList.remove('text-black');
                status && status.classList.remove('text-black');
                title && title.classList.add('text-white');
                scoreTitle && scoreTitle.classList.add('text-white');
                scoreboard && scoreboard.classList.add('text-white');
                status && status.classList.add('text-white');
            } else {
                title && title.classList.remove('text-white');
                scoreTitle && scoreTitle.classList.remove('text-white');
                scoreboard && scoreboard.classList.remove('text-white');
                status && status.classList.remove('text-white');
                title && title.classList.add('text-black');
                scoreTitle && scoreTitle.classList.add('text-black');
                scoreboard && scoreboard.classList.add('text-black');
                status && status.classList.add('text-black');
            }
        }

        // On page load, restore saved color
        const savedColor = localStorage.getItem('screenColor');
        if (savedColor) {
            setScreenColor(savedColor);
        } else {
            setScreenColor('#222');
        }

        setScreenColorBtn && setScreenColorBtn.addEventListener('click', (e) => {
            colorPanel.classList.toggle('open');
            e.stopPropagation();
        });
        colorOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                const color = opt.getAttribute('data-color');
                setScreenColor(color);
                colorPanel.classList.remove('open');
                e.stopPropagation();
            });
        });
        // Close color panel and user menu when clicking outside
        document.addEventListener('click', () => {
            if (colorPanel) {
                colorPanel.classList.remove('open');
            }
            if (userMenu) {
                userMenu.classList.remove('open');
            }
        });
        // Prevent menu close when clicking inside
        userMenu.addEventListener('click', e => e.stopPropagation());

        const boardElement = document.getElementById('game-board');
        const statusElement = document.getElementById('status');
        const resetButton = document.getElementById('reset');
        const scoreboardElement = document.getElementById('scoreboard');
        let scores = { X: 0, O: 0, Draws: 0 };
        let board = Array(9).fill(null);
        let currentPlayer = 'X';
        let gameActive = true;

        function renderScoreboard() {
            const name = localStorage.getItem('profileName') || 'Player X';
            scoreboardElement.innerHTML = `
                <span class="score-player">${name} - <span style="margin-left:6px;">${scores.X}</span></span>
                <span class="score-player">Player O - <span style="margin-left:6px;">${scores.O}</span></span>
                <span class="score-player">Draws - <span style="margin-left:6px;">${scores.Draws}</span></span>
            `;
        }

        function renderBoard() {
            boardElement.innerHTML = '';
            board.forEach((cell, idx) => {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell';
                cellDiv.textContent = cell || '';
                cellDiv.addEventListener('click', () => handleCellClick(idx));
                boardElement.appendChild(cellDiv);
            });
            // Show current player's turn if game is active
            if (gameActive) {
                statusElement.textContent = `${currentPlayer}'s turn`;
            }
        }

        function handleCellClick(idx) {
            if (!gameActive || board[idx] || currentPlayer !== 'X') return;
            board[idx] = 'X';
            renderBoard();
            if (checkWinner()) {
                statusElement.textContent = `Player X wins!`;
                scores['X']++;
                renderScoreboard();
                gameActive = false;
                launchVictoryEffects();
                return;
            } else if (board.every(cell => cell)) {
                statusElement.textContent = "It's a draw!";
                scores.Draws++;
                renderScoreboard();
                gameActive = false;
                launchVictoryEffects();
                return;
            }

            // Check if player is about to win (has two in a row and an empty cell)
            const imminentWin = imminentPlayerWin('X');
            if (imminentWin !== null) {
                // Lock the board and let the bot cheat!
                gameActive = false;
                setTimeout(() => botCheatOrDraw(), 600);
                return;
            }

            currentPlayer = 'O';
            renderBoard(); // Show O's turn
            setTimeout(() => botMove(), 350); // Let the bot move after a short delay
        }

        // Returns the index of the empty cell if player is about to win, else null
        function imminentPlayerWin(player) {
            const winPatterns = [
                [0,1,2],[3,4,5],[6,7,8],
                [0,3,6],[1,4,7],[2,5,8],
                [0,4,8],[2,4,6]
            ];
            for (const pattern of winPatterns) {
                const [a, b, c] = pattern;
                const line = [board[a], board[b], board[c]];
                if (line.filter(cell => cell === player).length === 2 && line.includes(null)) {
                    return pattern[line.indexOf(null)];
                }
            }
            return null;
        }

        // Bot cheats: if possible, instantly win; else, fill all remaining tiles for a draw
        function botCheatOrDraw() {
            // Try to win instantly by filling all needed O's in a win pattern
            const winPatterns = [
                [0,1,2],[3,4,5],[6,7,8],
                [0,3,6],[1,4,7],[2,5,8],
                [0,4,8],[2,4,6]
            ];
            let didWin = false;
            for (const pattern of winPatterns) {
                const [a, b, c] = pattern;
                const line = [board[a], board[b], board[c]];
                // If at least one O and no X's, fill only the empty cells in this pattern as O to win
                if (line.includes('X')) continue;
                if (line.filter(cell => cell === 'O').length >= 1 && line.includes(null)) {
                    pattern.forEach(idx => { if (!board[idx]) board[idx] = 'O'; });
                    didWin = true;
                    break;
                }
            }
            renderBoard();
            if (didWin && checkWinner()) {
                // Check the current screen color
                let screenColor = localStorage.getItem('screenColor');
                // If not set or is #222 (default black), use white text. Otherwise, use black text.
                let victoryClass = '';
                if (!screenColor || screenColor === '#222') {
                    victoryClass = 'victory-white-text';
                } else {
                    victoryClass = 'victory-black-text';
                }
                statusElement.classList.remove('victory-black-text', 'victory-white-text');
                statusElement.innerHTML = `<span class=\"status-flash status-flash-anim-a\">I win!</span> <span class=\"status-flash status-flash-anim-b\">You suck!</span>`;
                statusElement.classList.add(victoryClass);
                scores['O']++;
                renderScoreboard();
                launchVictoryEffects('o-victory');
                return;
            }
            // Otherwise, fill all remaining tiles for a draw
            for (let i = 0; i < 9; i++) {
                if (!board[i]) board[i] = 'O';
            }
            renderBoard();
            statusElement.textContent = "Nice try bud. If I can't win, nobodies winning today chief.";
            scores.Draws++;
            renderScoreboard();
            launchVictoryEffects();
        }

        // Launches confetti and balloon effects for 7 seconds, with extra confetti cannons from corners
        function launchVictoryEffects(victoryType) {
            // Flash Player O's tiles with inverted color for 7 seconds if O wins
            const cells = document.querySelectorAll('.cell');
            // Find the winning pattern (if any)
            let winningPattern = null;
            const winPatterns = [
                [0,1,2],[3,4,5],[6,7,8],
                [0,3,6],[1,4,7],[2,5,8],
                [0,4,8],[2,4,6]
            ];
            for (const pattern of winPatterns) {
                const [a, b, c] = pattern;
                if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                    winningPattern = pattern;
                    break;
                }
            }
            // O victory: alternate status text
            if (
                (victoryType === 'o-victory') ||
                statusElement.textContent.includes('O wins') ||
                statusElement.textContent.includes('I win')
            ) {
                if (winningPattern) {
                    winningPattern.forEach(idx => {
                        const cellDiv = cells[idx];
                        if (cellDiv && board[idx] === 'O') cellDiv.classList.add('o-flash');
                    });
                }
                // Add alternating flash classes to status children
                const a = statusElement.querySelector('.status-flash-a');
                const b = statusElement.querySelector('.status-flash-b');
                if (a && b) {
                    a.classList.add('status-flash-anim-a');
                    b.classList.add('status-flash-anim-b');
                } else {
                    statusElement.classList.add('o-flash');
                }
                // Remove the flash after 7 seconds
                setTimeout(function() {
                    if (winningPattern) {
                        winningPattern.forEach(idx => {
                            const cellDiv = cells[idx];
                            if (cellDiv) cellDiv.classList.remove('o-flash');
                        });
                    }
                    if (a && b) {
                        a.classList.remove('status-flash-anim-a');
                        b.classList.remove('status-flash-anim-b');
                    } else {
                        statusElement.classList.remove('o-flash');
                    }
                }, 7000);
            }

            // Confetti effect
            const confettiCanvas = document.createElement('canvas');
            confettiCanvas.id = 'confetti-canvas';
            confettiCanvas.style.position = 'fixed';
            confettiCanvas.style.left = '0';
            confettiCanvas.style.top = '0';
            confettiCanvas.style.width = '100vw';
            confettiCanvas.style.height = '100vh';
            confettiCanvas.style.pointerEvents = 'none';
            confettiCanvas.style.zIndex = 9998;
            document.body.appendChild(confettiCanvas);
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
            const ctx = confettiCanvas.getContext('2d');
            // Generate confetti pieces
            const confettiCount = 720; // doubled from 360
            const confettiPieces = [];
            for (let i = 0; i < confettiCount; i++) {
                confettiPieces.push({
                    x: Math.random() * confettiCanvas.width,
                    y: Math.random() * -confettiCanvas.height,
                    r: 6 + Math.random() * 6,
                    color: `hsl(${Math.random()*360},90%,60%)`,
                    speed: (2 + Math.random() * 3) * 0.75, // decrease speed by 0.25x
                    angle: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.2,
                    wavePhase: Math.random() * Math.PI * 2,
                    waveAmp: 18 + Math.random() * 18 // px
                });
            }
            let confettiStart = Date.now();
            function drawConfetti() {
                ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                let now = Date.now();
                let elapsed = (now - confettiStart) / 1000;
                // Main rain
                confettiPieces.forEach(p => {
                    // Fade out after 5.5s, regardless of position
                    let opacity = 1;
                    if (elapsed > 5.5) {
                        opacity = Math.max(0, 1 - (elapsed - 5.5) / 1.5);
                    }
                    // Wavy horizontal movement
                    let waveX = p.x + Math.sin((p.y / 60) + p.wavePhase) * p.waveAmp;
                    ctx.save();
                    ctx.globalAlpha = opacity;
                    ctx.translate(waveX, p.y);
                    ctx.rotate(p.angle);
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.r, p.r/2, 0, 0, 2*Math.PI);
                    ctx.fill();
                    ctx.restore();
                    p.y += p.speed;
                    p.angle += p.spin;
                    if (p.y > confettiCanvas.height) {
                        p.y = Math.random() * -40;
                        p.x = Math.random() * confettiCanvas.width;
                        p.wavePhase = Math.random() * Math.PI * 2;
                        p.waveAmp = 18 + Math.random() * 18;
                    }
                });
                if (elapsed < 7) {
                    requestAnimationFrame(drawConfetti);
                }
            }
            drawConfetti();

            // Balloons
            for (let i = 0; i < 40; i++) {
                // Staggered start: each balloon starts at a random time in the first 2 seconds
                const delay = Math.random() * 2000;
                setTimeout(() => {
                    let balloon = document.createElement('div');
                    balloon.className = 'balloon';
                    // Wavy path parameters
                    const baseLeft = 5 + Math.random() * 90;
                    const amplitude = 18 + Math.random() * 12;
                    const phase = Math.random() * Math.PI * 2;
                    balloon.style.left = baseLeft + 'vw';
                    // Generate a vibrant, shiny, elastic color
                    const hue = Math.floor(Math.random() * 360);
                    const mainColor = `hsl(${hue}, 98%, 52%)`;
                    const highlight = `hsla(${hue}, 100%, 90%, 0.95)`;
                    const mid = `hsla(${hue}, 100%, 70%, 0.85)`;
                    // Shiny radial gradient for balloon
                    balloon.style.background = `radial-gradient(circle at 65% 35%, ${highlight} 0%, ${mid} 30%, ${mainColor} 100%)`;
                    balloon.style.boxShadow = `0 0 32px 8px ${mainColor}55, 0 0 0 2px #fff4 inset`;
                    // Make balloon perfectly round
                    balloon.style.width = '64px';
                    balloon.style.height = '64px';
                    balloon.style.borderRadius = '50%';
                    balloon.style.position = 'fixed';
                    balloon.style.zIndex = 9999;

                    // Balloon string (SVG)
                    // Randomly pick string length multiplier: 0.75, 1, or 1.25
                    const multipliers = [0.75, 1, 1.25];
                    const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
                    const baseStringLength = 32; // half the balloon height
                    const stringLength = baseStringLength * multiplier;
                    let string = document.createElement('div');
                    string.style.position = 'absolute';
                    string.style.left = '50%';
                    string.style.top = '100%';
                    string.style.transform = 'translateX(-50%)';
                    string.style.width = '16px';
                    string.style.height = stringLength + 'px';
                    string.style.pointerEvents = 'none';
                    string.innerHTML = `<svg width="16" height="${stringLength}" viewBox="0 0 16 ${stringLength}" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path id="string-path" d="M8 0 Q12 ${stringLength/3}, 8 ${stringLength/2} Q4 ${stringLength*2/3}, 8 ${stringLength}" stroke="#222" stroke-width="4.2" fill="none" stroke-linecap="round"/>
                    </svg>`;
                    balloon.appendChild(string);

                    // Dramatic ascent speed multipliers
                    const speedMultipliers = [0.45, 1, 2.2];
                    const speedMultiplier = speedMultipliers[Math.floor(Math.random() * speedMultipliers.length)];

                    // Animate
                    document.body.appendChild(balloon);
                    let start = null;
                    // Use a separate sway speed for all balloons (constant)
                    const SWAY_CYCLES = 4; // number of left-right cycles during ascent
                    function animateBalloon(ts) {
                        if (!start) start = ts;
                        let elapsed = (ts - start) / 1000;
                        // Balloon rises from bottom to top in 7s (base duration), but ascent percent uses speedMultiplier
                        // Each balloon's vertical position is based on its own speed multiplier and time
                        let ascentTime = 7 / speedMultiplier;
                        let percent = Math.min(elapsed / ascentTime, 1);
                        let bottom = -80 + percent * (window.innerHeight + 80);
                        // Wavy horizontal movement: keep sway speed constant for all balloons
                        let swayElapsed = Math.min(elapsed / 7, 1); // always 7s for sway
                        let wave = Math.sin(swayElapsed * SWAY_CYCLES * Math.PI + phase) * amplitude;
                        balloon.style.transform = `translateX(${wave}px)`;
                        balloon.style.bottom = `${bottom}px`;

                        // Fade out after 5.5s (over last 1.5s), regardless of vertical position
                        let opacity = 1;
                        if (elapsed > 5.5) {
                            opacity = Math.max(0, 1 - (elapsed - 5.5) / 1.5);
                        }
                        balloon.style.opacity = opacity;

                        // Animate string sway in opposite direction (more dramatic)
                        const sway = -wave * 1.1; // much more dramatic sway
                        const svg = string.querySelector('svg');
                        const path = svg && svg.querySelector('#string-path');
                        if (path) {
                            // Control points for Q curves (bigger amplitude)
                            const c1x = 8 + sway * 0.55;
                            const c1y = stringLength/3;
                            const c2x = 8 - sway * 0.55;
                            const c2y = stringLength*2/3;
                            path.setAttribute('d', `M8 0 Q${c1x.toFixed(2)} ${c1y.toFixed(2)}, 8 ${(stringLength/2).toFixed(2)} Q${c2x.toFixed(2)} ${c2y.toFixed(2)}, 8 ${stringLength}`);
                        }

                        if (elapsed < 7) {
                            requestAnimationFrame(animateBalloon);
                        }
                    }
                    requestAnimationFrame(animateBalloon);
                    setTimeout(() => { if (balloon.parentNode) balloon.parentNode.removeChild(balloon); }, 7000);
                }, delay);
            }

            setTimeout(() => {
                if (confettiCanvas.parentNode) confettiCanvas.parentNode.removeChild(confettiCanvas);
            }, 7000);

            setTimeout(() => {
                if (confettiCanvas.parentNode) confettiCanvas.parentNode.removeChild(confettiCanvas);
            }, 7000);
        }

        function botMove() {
            if (!gameActive) return;
            const emptyCells = board.map((cell, idx) => cell ? null : idx).filter(idx => idx !== null);
            if (emptyCells.length === 0) return;

            // Helper to find a move for a given player to win/block
            function findWinningMove(player) {
                const winPatterns = [
                    [0,1,2],[3,4,5],[6,7,8],
                    [0,3,6],[1,4,7],[2,5,8],
                    [0,4,8],[2,4,6]
                ];
                for (const pattern of winPatterns) {
                    const [a, b, c] = pattern;
                    const line = [board[a], board[b], board[c]];
                    if (line.filter(cell => cell === player).length === 2 && line.includes(null)) {
                        const emptyIdx = pattern[line.indexOf(null)];
                        return emptyIdx;
                    }
                }
                return null;
            }

            // 1. Try to win
            let move = findWinningMove('O');
            // 2. Block player from winning
            if (move === null) move = findWinningMove('X');

            // 3. If center is open, take it
            if (move === null && board[4] === null) move = 4;

            // 4. Otherwise, take a corner if available
            if (move === null) {
                const corners = [0, 2, 6, 8].filter(idx => board[idx] === null);
                if (corners.length > 0) move = corners[Math.floor(Math.random() * corners.length)];
            }

            // 5. Otherwise, pick random
            if (move === null) move = emptyCells[Math.floor(Math.random() * emptyCells.length)];

            board[move] = 'O';
            renderBoard();
            if (checkWinner()) {
                statusElement.innerHTML = `<span class="status-flash status-flash-a">I win!</span> <span class="status-flash status-flash-b">You suck!</span>`;
                scores['O']++;
                renderScoreboard();
                gameActive = false;
                launchVictoryEffects('o-victory');
                return;
            } else if (board.every(cell => cell)) {
                statusElement.textContent = "It's a draw!";
                scores.Draws++;
                renderScoreboard();
                gameActive = false;
                return;
            }
            currentPlayer = 'X';
            statusElement.textContent = `X's turn`;
        }

        function checkWinner() {
            const winPatterns = [
                [0,1,2],[3,4,5],[6,7,8], // rows
                [0,3,6],[1,4,7],[2,5,8], // cols
                [0,4,8],[2,4,6]          // diags
            ];
            return winPatterns.some(pattern => {
                const [a, b, c] = pattern;
                return board[a] && board[a] === board[b] && board[a] === board[c];
            });
        }

        function resetGame() {
            board = Array(9).fill(null);
            currentPlayer = 'X';
            gameActive = true;
            statusElement.textContent = `Player ${currentPlayer}'s turn`;
            renderBoard();
            renderScoreboard();
        }


        resetButton.addEventListener('click', resetGame);

        // Initial render
        resetGame();

        // Ensure profile name is rendered on load
        renderProfileName();
    } catch (e) {
        alert('An error occurred: ' + e.message);
    }
});

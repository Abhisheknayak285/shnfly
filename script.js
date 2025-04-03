// --- script.js (Includes Auth, Game Logic, Dynamic Rocket, Potential Win, Backend Balance Sync, Continuous Loop Simulation, Wallet Restriction) ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwTHSE0FVn7XiuMlS2MydpVYi9srgm41Oe4fOLAhLxzDBH39QQ1fuiA0a6zTnIcZRn8/exec'; // <<< PASTE YOUR DEPLOYED WEB APP URL HERE
    const MAX_HISTORY_ITEMS_MAIN = 12;
    const BETTING_DURATION = 7000; // 7 seconds
    const START_COUNTDOWN_DURATION = 3000; // 3 seconds
    const CRASH_RESULT_DURATION = 3000; // 3 seconds
    const GAME_TICK_INTERVAL = 50; // Milliseconds
    const DEFAULT_BALANCE = 1000;

    // --- DOM Elements ---
    // Auth Elements
    const authContainer = document.getElementById('authContainer');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const registerUsernameInput = document.getElementById('registerUsername');
    const registerPasswordInput = document.getElementById('registerPassword');
    const registerConfirmPasswordInput = document.getElementById('registerConfirmPassword');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    // Game Wrapper
    const gameWrapper = document.getElementById('gameWrapper');

    // Game Elements
    const balanceDisplay = document.getElementById('balance');
    const playerCountDisplay = document.getElementById('playerCount');
    const mainHistoryDisplay = document.getElementById('mainHistoryDisplay');
    const multiplierDisplay = document.getElementById('multiplier');
    const gameStatusDisplay = document.getElementById('gameStatus');
    const rocket = document.getElementById('rocket');
    const betAmountInput = document.getElementById('betAmount');
    const decreaseBetBtn = document.getElementById('decreaseBet');
    const increaseBetBtn = document.getElementById('increaseBet');
    const quickBetBtns = document.querySelectorAll('.quick-bet-btn');
    const mainActionButton = document.getElementById('mainActionButton');
    const cloudsBackground = document.querySelector('.clouds-background');
    // Bet Display Elements
    const potentialWinDisplay = document.getElementById('potentialWinDisplay');
    const currencySymbol = document.querySelector('.bet-amount-display .currency');


    // Menu & Popups
    const menuIcon = document.getElementById('menuIcon');
    const mainMenuPopup = document.getElementById('mainMenuPopup');
    const closeMenuButton = document.getElementById('closeMenuButton');
    const menuWalletBtn = document.getElementById('menuWalletBtn');
    const menuAutoBtn = document.getElementById('menuAutoBtn');
    const menuSoundBtn = document.getElementById('menuSoundBtn');
    const menuSoundIcon = document.getElementById('menuSoundIcon');
    const menuHelpBtn = document.getElementById('menuHelpBtn');
    const logoutButton = document.getElementById('logoutButton');

    const autoPopup = document.getElementById('autoPopup');
    const closeAutoButton = document.getElementById('closeAutoButton');
    const autoBetEnabledCheckbox = document.getElementById('autoBetEnabled');
    const autoBetAmountInput = document.getElementById('autoBetAmount');
    const autoCashoutEnabledCheckbox = document.getElementById('autoCashoutEnabled');
    const autoCashoutMultiplierInput = document.getElementById('autoCashoutMultiplier');

    const walletPopup = document.getElementById('walletPopup');
    const closeWalletButton = document.getElementById('closeWalletButton');
    const showAddMoneyBtn = document.getElementById('showAddMoneyBtn');
    const showWithdrawMoneyBtn = document.getElementById('showWithdrawMoneyBtn');
    const addMoneySection = document.getElementById('addMoneySection');
    const withdrawMoneySection = document.getElementById('withdrawMoneySection');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const upiDetailsDiv = document.getElementById('upiDetails');
    const qrCodeDetailsDiv = document.getElementById('qrCodeDetails');
    const transactionIdSection = document.getElementById('transactionIdSection');
    const transactionIdInput = document.getElementById('transactionIdInput');
    const submitDepositButton = document.getElementById('submitDepositButton');
    const depositStatus = document.getElementById('depositStatus');
    const withdrawAmountInput = document.getElementById('withdrawAmountInput');
    const userUpiIdInput = document.getElementById('userUpiIdInput');
    const submitWithdrawalButton = document.getElementById('submitWithdrawalButton');
    const withdrawalStatus = document.getElementById('withdrawalStatus');

    // --- Game State Variables ---
    let balance = DEFAULT_BALANCE;
    let currentBet = null;
    let currentMultiplier = 1.00;
    let gameInterval = null;
    let gameStartTime = 0;
    let gameState = 'IDLE'; // Initial state before login
    let crashPoint = 0;
    let timeElapsed = 0;
    let hasCashedOut = false;
    let gameHistory = [];
    let soundEnabled = true;
    let mainLoopTimeoutId = null;
    let countdownIntervalId = null;
    let currentCountdown = 0;

    // Auto Play State
    let autoBetActive = false;
    let autoCashoutActive = false;
    let autoNextBetPlaced = false;


    // --- Authentication Logic ---

    function showAuth() {
        gameState = 'IDLE'; stopGame();
        authContainer.classList.remove('hidden'); gameWrapper.classList.add('hidden');
        loginError.classList.remove('show'); registerError.classList.remove('show');
        loginForm.reset(); registerForm.reset(); closeAllPopups();
    }

    function showGame() {
        authContainer.classList.add('hidden'); gameWrapper.classList.remove('hidden');
        initializeGameUI(); loadSoundPreference(); updateHistoryDisplay();
        console.log(`Welcome, ${sessionStorage.getItem('crashGameUser')}!`);
        updateBalanceDisplay();
        // Start the continuous game cycle
        gameState = 'BETTING'; mainGameCycle();
    }

    function setButtonLoading(button, isLoading) { /* ... (same) ... */ const originalText = button.dataset.originalText || button.textContent; if (!button.dataset.originalText) { button.dataset.originalText = originalText; } if (isLoading) { button.disabled = true; button.textContent = 'Loading...'; } else { button.disabled = false; button.textContent = originalText; } }
    function displayAuthError(type, message) { /* ... (same) ... */ const errorElement = type === 'login' ? loginError : registerError; errorElement.textContent = message; errorElement.classList.add('show'); }
    function clearAuthErrors() { /* ... (same) ... */ loginError.classList.remove('show'); registerError.classList.remove('show'); loginError.textContent = ''; registerError.textContent = ''; }

    async function fetchUserBalance(username) {
        if (!username || GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') { console.error("Cannot fetch balance: Username missing or GAS URL not set."); return DEFAULT_BALANCE; }
        console.log(`Workspaceing balance for user: ${username}`);
        try {
            const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getBalance', username: username }) });
            if (!response.ok) { console.error(`HTTP error fetching balance! status: ${response.status}`); return DEFAULT_BALANCE; }
            const result = await response.json();
            if (result.status === 'success' && result.balance !== undefined && !isNaN(parseFloat(result.balance))) { console.log("Balance successfully fetched:", result.balance); return parseFloat(result.balance); }
            else { console.error("Failed to fetch balance from backend:", result.message || "User not found or invalid balance."); return DEFAULT_BALANCE; }
        } catch (error) { console.error('Error fetching balance:', error); return DEFAULT_BALANCE; }
    }

    async function checkLoginStatus() {
        const loggedInUser = sessionStorage.getItem('crashGameUser');
        if (loggedInUser && GAS_WEB_APP_URL !== 'YOUR_DEPLOYED_WEB_APP_URL') {
            console.log('User logged in via session, fetching balance...');
            balance = await fetchUserBalance(loggedInUser); // Fetch balance on load
            showGame();
        } else {
            if (GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') { console.error("ERROR: Google Apps Script URL is not set in script.js!"); displayAuthError('login', 'Configuration Error: App Script URL missing.'); displayAuthError('register', 'Configuration Error: App Script URL missing.'); }
            console.log('No user logged in or config missing.');
            balance = DEFAULT_BALANCE; showAuth();
        }
    }

    loginForm.addEventListener('submit', async (e) => { /* ... (same login logic including balance load) ... */ e.preventDefault(); clearAuthErrors(); if (GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') { displayAuthError('login', 'Configuration Error: Cannot connect.'); return; } setButtonLoading(loginButton, true); const username = loginUsernameInput.value; const password = loginPasswordInput.value; try { const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'login', username, password }) }); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const result = await response.json(); if (result.status === 'success') { sessionStorage.setItem('crashGameUser', result.user.username); if (result.user && result.user.balance !== undefined && !isNaN(parseFloat(result.user.balance))) { balance = parseFloat(result.user.balance); console.log(`Balance loaded from backend: ${balance}`); } else { balance = DEFAULT_BALANCE; console.warn("Balance not found or invalid in login response, using default."); } showGame(); } else { displayAuthError('login', result.message || 'Login failed.'); } } catch (error) { console.error('Login Error:', error); displayAuthError('login', 'Login failed. Check connection or try again.'); } finally { setButtonLoading(loginButton, false); } });
    registerForm.addEventListener('submit', async (e) => { /* ... (same registration logic) ... */ e.preventDefault(); clearAuthErrors(); if (GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') { displayAuthError('register', 'Configuration Error: Cannot connect.'); return; } const username = registerUsernameInput.value; const password = registerPasswordInput.value; const confirmPassword = registerConfirmPasswordInput.value; if (password !== confirmPassword) { displayAuthError('register', 'Passwords do not match.'); return; } if (password.length < 6) { displayAuthError('register', 'Password must be >= 6 characters.'); return; } if (username.length < 3) { displayAuthError('register', 'Username must be >= 3 characters.'); return; } setButtonLoading(registerButton, true); try { const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'register', username, password }) }); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const result = await response.json(); if (result.status === 'success') { alert('Registration successful! Please log in.'); showLoginForm(); } else { displayAuthError('register', result.message || 'Registration failed.'); } } catch (error) { console.error('Registration Error:', error); displayAuthError('register', 'Registration failed. Check connection or try again.'); } finally { setButtonLoading(registerButton, false); } });
    logoutButton.addEventListener('click', () => { /* ... (same logout logic) ... */ sessionStorage.removeItem('crashGameUser'); showAuth(); console.log('User logged out.'); });
    function showLoginForm() { /* ... (same) ... */ loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); clearAuthErrors(); loginForm.reset(); }
    function showRegisterForm() { /* ... (same) ... */ loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); clearAuthErrors(); registerForm.reset(); }
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); }); showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

    // --- Function to save balance asynchronously ---
    async function saveBalanceToBackend(username, balanceToSave) { /* ... (same as before) ... */ if (!username || GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') { console.error("Cannot save balance: Username missing or GAS URL not set."); return; } const numericBalance = parseFloat(balanceToSave); if (isNaN(numericBalance)) { console.error("Cannot save balance: Invalid balance value.", balanceToSave); return; } console.log(`Attempting to save balance: ${numericBalance} for user: ${username}`); try { fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateBalance', username: username, newBalance: numericBalance }) }).then(response => response.json()).then(result => { if (result.status === 'success') { console.log("Balance saved successfully on backend."); } else { console.error("Failed to save balance on backend:", result.message); } }).catch(error => { console.error('Error saving balance:', error); }); } catch (error) { console.error('Error initiating balance save:', error); } }

    // --- UI Helper Functions ---
    function updateBalanceDisplay() { /* ... (same) ... */ balanceDisplay.textContent = Math.floor(balance); }
    function setBetControlsDisabled(disabled) { /* ... (same) ... */ betAmountInput.disabled = disabled; decreaseBetBtn.disabled = disabled; increaseBetBtn.disabled = disabled; quickBetBtns.forEach(btn => btn.disabled = disabled); if (autoBetAmountInput) autoBetAmountInput.disabled = disabled; if (autoCashoutMultiplierInput) autoCashoutMultiplierInput.disabled = disabled; if (autoBetEnabledCheckbox) autoBetEnabledCheckbox.disabled = disabled; if (autoCashoutEnabledCheckbox) autoCashoutEnabledCheckbox.disabled = disabled; }
    function updateMainActionButton(state, text = '', value = null) { /* ... (same) ... */ mainActionButton.disabled = false; mainActionButton.className = ''; switch (state) { case 'idle': mainActionButton.classList.add('state-idle'); mainActionButton.textContent = text || 'Place Bet'; break; case 'waiting_start': mainActionButton.classList.add('state-waiting_start'); mainActionButton.textContent = text || 'Waiting...'; mainActionButton.disabled = true; break; case 'running': mainActionButton.classList.add('state-running'); mainActionButton.textContent = text || `Cash Out @ ${value || currentMultiplier}x`; break; case 'cashed_out': mainActionButton.classList.add('state-cashed_out'); mainActionButton.textContent = text || `Cashed Out @ ${value}x`; mainActionButton.disabled = true; break; case 'crashed': mainActionButton.classList.add('state-crashed'); mainActionButton.textContent = text || 'Crashed'; mainActionButton.disabled = true; break; default: mainActionButton.classList.add('state-idle'); mainActionButton.textContent = 'Place Bet'; } }

    // --- Popup Handling ---
    function openPopup(popupElement) { /* ... (same) ... */ closeAllPopups(); if(popupElement) popupElement.classList.remove('hidden'); }
    function closePopup(popupElement) { /* ... (same) ... */ if(popupElement) popupElement.classList.add('hidden'); }
    function closeAllPopups() { /* ... (same) ... */ closePopup(mainMenuPopup); closePopup(autoPopup); closePopup(walletPopup); }

    // --- Wallet UI Logic (Placeholders) ---
    function setupWalletUI() { /* ... (same placeholder logic, including saves) ... */ showAddMoneyBtn.addEventListener('click', () => { addMoneySection.classList.add('active'); withdrawMoneySection.classList.remove('active'); showAddMoneyBtn.classList.add('active'); showWithdrawMoneyBtn.classList.remove('active'); resetWalletForms(); }); showWithdrawMoneyBtn.addEventListener('click', () => { addMoneySection.classList.remove('active'); withdrawMoneySection.classList.add('active'); showAddMoneyBtn.classList.remove('active'); showWithdrawMoneyBtn.classList.add('active'); resetWalletForms(); }); paymentMethodSelect.addEventListener('change', () => { const method = paymentMethodSelect.value; upiDetailsDiv.classList.add('hidden'); qrCodeDetailsDiv.classList.add('hidden'); transactionIdSection.classList.add('hidden'); submitDepositButton.disabled = true; depositStatus.textContent = ''; if (method === 'upi') { upiDetailsDiv.classList.remove('hidden'); transactionIdSection.classList.remove('hidden'); } else if (method === 'qr') { qrCodeDetailsDiv.classList.remove('hidden'); transactionIdSection.classList.remove('hidden'); } }); transactionIdInput.addEventListener('input', () => { submitDepositButton.disabled = transactionIdInput.value.trim().length < 10; }); submitDepositButton.addEventListener('click', () => { const txnId = transactionIdInput.value.trim(); depositStatus.textContent = 'Processing deposit...'; depositStatus.className = 'wallet-status pending'; submitDepositButton.disabled = true; setTimeout(() => { const success = Math.random() > 0.2; if (success) { depositStatus.textContent = 'Deposit successful! (Demo)'; depositStatus.className = 'wallet-status success'; const demoAmount = Math.floor(Math.random() * 500) + 100; balance += demoAmount; updateBalanceDisplay(); const currentUser = sessionStorage.getItem('crashGameUser'); if(currentUser){ saveBalanceToBackend(currentUser, balance); } } else { depositStatus.textContent = 'Deposit verification failed. (Demo)'; depositStatus.className = 'wallet-status error'; submitDepositButton.disabled = false; } transactionIdInput.value = ''; paymentMethodSelect.value = ''; upiDetailsDiv.classList.add('hidden'); qrCodeDetailsDiv.classList.add('hidden'); transactionIdSection.classList.add('hidden'); submitDepositButton.disabled = true; }, 2500); }); submitWithdrawalButton.addEventListener('click', () => { const amount = parseFloat(withdrawAmountInput.value); const upiId = userUpiIdInput.value.trim(); withdrawalStatus.textContent = ''; withdrawalStatus.className = 'wallet-status'; if (isNaN(amount) || amount < 100) { withdrawalStatus.textContent = 'Minimum withdrawal is ₹100.'; withdrawalStatus.className = 'wallet-status error'; return; } if (amount > balance) { withdrawalStatus.textContent = 'Insufficient balance.'; withdrawalStatus.className = 'wallet-status error'; return; } if (!upiId || !upiId.includes('@')) { withdrawalStatus.textContent = 'Please enter a valid UPI ID.'; withdrawalStatus.className = 'wallet-status error'; return; } withdrawalStatus.textContent = 'Processing withdrawal request...'; withdrawalStatus.className = 'wallet-status pending'; submitWithdrawalButton.disabled = true; setTimeout(() => { balance -= amount; updateBalanceDisplay(); const currentUser = sessionStorage.getItem('crashGameUser'); if(currentUser){ saveBalanceToBackend(currentUser, balance); } withdrawalStatus.textContent = 'Withdrawal request submitted. (Demo)'; withdrawalStatus.className = 'wallet-status success'; withdrawAmountInput.value = ''; userUpiIdInput.value = ''; submitWithdrawalButton.disabled = false; }, 2000); }); closeWalletButton.addEventListener('click', () => closePopup(walletPopup)); }
    function resetWalletForms() { /* ... (same) ... */ paymentMethodSelect.value = ''; upiDetailsDiv.classList.add('hidden'); qrCodeDetailsDiv.classList.add('hidden'); transactionIdSection.classList.add('hidden'); transactionIdInput.value = ''; submitDepositButton.disabled = true; depositStatus.textContent = ''; depositStatus.className = 'wallet-status'; withdrawAmountInput.value = ''; userUpiIdInput.value = ''; withdrawalStatus.textContent = ''; withdrawalStatus.className = 'wallet-status'; submitWithdrawalButton.disabled = false; }

    // --- Auto Play Logic ---
    function setupAutoPlay() { /* ... (same) ... */ autoBetEnabledCheckbox.addEventListener('change', (e) => { autoBetActive = e.target.checked; console.log('Auto Bet Active:', autoBetActive); if (autoBetActive && gameState === 'BETTING') { handleAutoPlayNextRound(); } }); autoCashoutEnabledCheckbox.addEventListener('change', (e) => { autoCashoutActive = e.target.checked; console.log('Auto Cashout Active:', autoCashoutActive); }); closeAutoButton.addEventListener('click', () => closePopup(autoPopup)); }
    function handleAutoPlayNextRound() { /* ... (same) ... */ if (autoBetActive && gameState === 'BETTING' && !autoNextBetPlaced) { const autoBetAmount = parseInt(autoBetAmountInput.value); if (isNaN(autoBetAmount) || autoBetAmount <= 0) { console.warn("AutoPlay: Invalid bet amount set."); autoBetEnabledCheckbox.checked = false; autoBetActive = false; return; } if (autoBetAmount > balance) { console.warn("AutoPlay: Insufficient balance for auto bet."); return; } betAmountInput.value = autoBetAmount; console.log(`AutoPlay: Placing bet of ${autoBetAmount}`); placeBet(); autoNextBetPlaced = true; } }

    // --- Sound Control ---
    function toggleSound() { /* ... (same) ... */ soundEnabled = !soundEnabled; localStorage.setItem('crashGameSound', soundEnabled); updateSoundIcon(); console.log('Sound Enabled:', soundEnabled); }
    function updateSoundIcon() { /* ... (same) ... */ if (soundEnabled) { menuSoundIcon.textContent = '🔊'; menuSoundIcon.classList.remove('muted'); } else { menuSoundIcon.textContent = '🔇'; menuSoundIcon.classList.add('muted'); } }
    function loadSoundPreference() { /* ... (same) ... */ const savedSoundPref = localStorage.getItem('crashGameSound'); if (savedSoundPref !== null) { soundEnabled = savedSoundPref === 'true'; } updateSoundIcon(); }

    // --- History Management ---
    function addHistory(multiplierValue) { /* ... (same) ... */ const newRecord = { multiplier: parseFloat(multiplierValue), timestamp: Date.now() }; gameHistory.unshift(newRecord); updateHistoryDisplay(); }
    function updateHistoryDisplay() { /* ... (same) ... */ mainHistoryDisplay.innerHTML = ''; if (gameHistory.length === 0) { mainHistoryDisplay.innerHTML = '<span class="history-empty-message">No rounds played yet.</span>'; return; } const itemsToDisplay = gameHistory.slice(0, MAX_HISTORY_ITEMS_MAIN); itemsToDisplay.forEach(record => { const item = document.createElement('div'); item.classList.add('history-item'); const multiplier = record.multiplier; if (multiplier < 1.5) item.classList.add('low'); else if (multiplier < 5) item.classList.add('medium'); else item.classList.add('high'); item.innerHTML = `<span class="history-item-multiplier">${multiplier.toFixed(2)}x</span>`; mainHistoryDisplay.appendChild(item); }); }


    // --- Main Game Cycle & Core Logic ---

    function resetRound() {
        currentBet = null; currentMultiplier = 1.00; crashPoint = 0; timeElapsed = 0; hasCashedOut = false;
        initializeGameUI();
    }

    function mainGameCycle() {
        clearTimeout(mainLoopTimeoutId); clearInterval(countdownIntervalId);
        console.log("Entering State:", gameState);

        switch (gameState) {
            case 'BETTING':
                resetRound();
                gameStatusDisplay.textContent = 'Place your Bet';
                setBetControlsDisabled(false);
                updateMainActionButton('idle');
                autoNextBetPlaced = false;
                handleAutoPlayNextRound();
                mainLoopTimeoutId = setTimeout(() => { gameState = 'STARTING'; mainGameCycle(); }, BETTING_DURATION);
                break;

            case 'STARTING':
                setBetControlsDisabled(true);
                updateMainActionButton('waiting_start', 'Launching...');
                currentCountdown = Math.floor(START_COUNTDOWN_DURATION / 1000);
                gameStatusDisplay.textContent = `Launching in ${currentCountdown}...`;
                countdownIntervalId = setInterval(() => {
                    currentCountdown--;
                    if (currentCountdown > 0) { gameStatusDisplay.textContent = `Launching in ${currentCountdown}...`; }
                    else { gameStatusDisplay.textContent = 'Launching...'; clearInterval(countdownIntervalId); }
                }, 1000);
                mainLoopTimeoutId = setTimeout(() => { startGame(); }, START_COUNTDOWN_DURATION);
                break;

            case 'RUNNING':
                 console.log("State: RUNNING (gameTick interval active)");
                break;

            case 'ENDED':
                setBetControlsDisabled(true);
                currentCountdown = Math.floor(CRASH_RESULT_DURATION / 1000);
                const crashMsgBase = `Crashed @ ${currentMultiplier.toFixed(2)}x`;
                gameStatusDisplay.textContent = `${crashMsgBase} | Next round in ${currentCountdown}...`;
                countdownIntervalId = setInterval(() => {
                    currentCountdown--;
                    if (currentCountdown > 0) { gameStatusDisplay.textContent = `${crashMsgBase} | Next round in ${currentCountdown}...`; }
                    else { gameStatusDisplay.textContent = `${crashMsgBase} | Starting next round...`; clearInterval(countdownIntervalId); }
                }, 1000);
                mainLoopTimeoutId = setTimeout(() => { gameState = 'BETTING'; mainGameCycle(); }, CRASH_RESULT_DURATION);
                break;

             default: // Includes 'IDLE' before login
                console.log("Unhandled/Idle game state:", gameState);
                break;
        }
    }

     function initializeGameUI() {
        multiplierDisplay.textContent = '---'; multiplierDisplay.className = 'multiplier-zone';
        gameStatusDisplay.textContent = 'Initializing...'; // Will be updated by mainGameCycle
        rocket.className = 'rocket-placeholder'; rocket.style.bottom = ''; rocket.style.left = ''; cloudsBackground.classList.remove('clouds-active');
        potentialWinDisplay.classList.add('hidden'); potentialWinDisplay.textContent = ''; betAmountInput.classList.remove('hidden');
        updateBalanceDisplay();
        updateMainActionButton('idle');
    }

    function resetGameVariables() { currentBet = null; currentMultiplier = 1.00; crashPoint = 0; timeElapsed = 0; hasCashedOut = false; autoNextBetPlaced = false; rocket.style.bottom = ''; rocket.style.left = ''; }
    function generateCrashPoint() { /* ... (same) ... */ const r = Math.random(); let crash; if (r < 0.02) { crash = 1.00; } else if (r < 0.5) { crash = 1.01 + Math.random() * 0.98; } else if (r < 0.8) { crash = 2 + Math.random() * 3; } else if (r < 0.95) { crash = 5 + Math.random() * 5; } else { crash = 10 + Math.random() * 20; } return Math.max(1.00, crash); }
    function calculateMultiplier(timeMillis) { /* ... (uses adjusted params) ... */ const base = 1.00; const growthRate = 0.08; const exponent = 1.3; const multiplier = base + growthRate * Math.pow(timeMillis / 1000, exponent); return Math.max(1.00, multiplier); }

    function gameTick() {
        if (gameState !== 'RUNNING') return;
        const now = Date.now(); timeElapsed = now - gameStartTime; const newMultiplier = calculateMultiplier(timeElapsed);
        if (newMultiplier >= crashPoint) { crashGame(); return; }

        let multiplierChanged = false;
        if (Math.abs(newMultiplier - currentMultiplier) >= 0.01) {
            currentMultiplier = newMultiplier; multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`; multiplierChanged = true;
            if (currentBet && !hasCashedOut) { updateMainActionButton('running', null, currentMultiplier.toFixed(2)); }
        }
        // Rocket Position Update
        const initialPosPercent = 5; const speedFactor = 7; const accelerationFactor = 1.25; const maxPosPercent = 88;
        let positionPercentage = initialPosPercent + speedFactor * Math.pow(timeElapsed / 1000, accelerationFactor); positionPercentage = Math.min(maxPosPercent, positionPercentage);
        const initialLeftPercent = 10; const maxLeftPercent = 90; const diagonalFactor = 0.9;
        let leftPercentage = initialLeftPercent + (positionPercentage - initialPosPercent) * diagonalFactor; leftPercentage = Math.min(maxLeftPercent, leftPercentage);
        rocket.style.bottom = `${positionPercentage}%`; rocket.style.left = `${leftPercentage}%`;
        // Potential Win Update
        if (multiplierChanged && currentBet && !hasCashedOut) { const potentialWin = currentBet.amount * currentMultiplier; potentialWinDisplay.textContent = potentialWin.toFixed(2); }
        // Auto Cashout Check
        if (autoCashoutActive && currentBet && !hasCashedOut) { const autoTarget = parseFloat(autoCashoutMultiplierInput.value) || 2.00; if (currentMultiplier >= autoTarget) { cashOut(); } }
    }

    function startGame() {
        if (gameState !== 'STARTING') { console.warn("startGame called in unexpected state:", gameState); return; }
        console.log('Starting game RUNNING phase...'); gameState = 'RUNNING'; gameStatusDisplay.textContent = '🚀 Rocket Launched!'; crashPoint = generateCrashPoint(); gameStartTime = Date.now(); timeElapsed = 0; currentMultiplier = 1.00;
        multiplierDisplay.textContent = '1.00x'; multiplierDisplay.classList.remove('crashed', 'cashed_out'); multiplierDisplay.classList.add('running');
        if (currentBet) {
            updateMainActionButton('running', null, '1.00'); betAmountInput.classList.add('hidden'); potentialWinDisplay.textContent = (currentBet.amount * 1.00).toFixed(2); potentialWinDisplay.classList.remove('hidden');
        } else { updateMainActionButton('running', 'In Progress', '1.00'); mainActionButton.disabled = true; betAmountInput.classList.remove('hidden'); potentialWinDisplay.classList.add('hidden'); }
        rocket.style.bottom = '5%'; rocket.style.left = '10%'; rocket.className = 'rocket-placeholder flying'; cloudsBackground.classList.add('clouds-active'); setBetControlsDisabled(true);
        console.log(`Game running, will crash at: ${crashPoint.toFixed(2)}x`);
        clearInterval(gameInterval); gameInterval = setInterval(gameTick, GAME_TICK_INTERVAL);
    }

    function stopGame() { clearInterval(gameInterval); gameInterval = null; clearTimeout(mainLoopTimeoutId); mainLoopTimeoutId = null; clearInterval(countdownIntervalId); countdownIntervalId = null; console.log('Game loop and cycle stopped.'); }

    function crashGame() {
        if(gameState === 'ENDED') return;
        clearInterval(gameInterval); gameInterval = null;
        const finalMultiplier = Math.max(1.00, crashPoint); currentMultiplier = finalMultiplier;
        gameState = 'ENDED'; console.log(`Game crashed at ${finalMultiplier.toFixed(2)}x`);
        multiplierDisplay.textContent = `${finalMultiplier.toFixed(2)}x`; multiplierDisplay.classList.remove('running', 'cashed_out'); multiplierDisplay.classList.add('crashed');
        gameStatusDisplay.textContent = `Crashed @ ${finalMultiplier.toFixed(2)}x`; // Base message for ENDED state
        updateMainActionButton('crashed');
        rocket.style.bottom = ''; rocket.style.left = ''; rocket.className = 'rocket-placeholder crashed'; cloudsBackground.classList.remove('clouds-active'); addHistory(finalMultiplier);
        const currentUser = sessionStorage.getItem('crashGameUser');
        if (currentBet && !hasCashedOut) { console.log(`Player lost bet of ${currentBet.amount}`); if(currentUser) { saveBalanceToBackend(currentUser, balance); } }
        betAmountInput.classList.remove('hidden'); potentialWinDisplay.classList.add('hidden'); potentialWinDisplay.textContent = '';
        currentBet = null; hasCashedOut = false;
        mainGameCycle(); // Immediately trigger cycle to handle ENDED state delay & countdown
    }

    function cashOut() {
        if (gameState !== 'RUNNING' || !currentBet || hasCashedOut) { return; }
        hasCashedOut = true; const winAmount = currentBet.amount * currentMultiplier; balance += winAmount; const cashOutMultiplier = currentMultiplier; console.log(`Cashed out at ${cashOutMultiplier.toFixed(2)}x. Won: ${winAmount.toFixed(2)}`); updateBalanceDisplay();
        const currentUser = sessionStorage.getItem('crashGameUser'); if(currentUser) { saveBalanceToBackend(currentUser, balance); }
        multiplierDisplay.classList.remove('running'); multiplierDisplay.classList.add('cashed_out'); gameStatusDisplay.textContent = `Cashed Out @ ${cashOutMultiplier.toFixed(2)}x`; updateMainActionButton('cashed_out', null, cashOutMultiplier.toFixed(2));
        betAmountInput.classList.remove('hidden'); potentialWinDisplay.classList.add('hidden'); potentialWinDisplay.textContent = '';
        currentBet = null; // Bet resolved
    }

    function placeBet() {
        if (gameState !== 'BETTING') { gameStatusDisplay.textContent = "Betting closed. Wait for next round."; setTimeout(() => { if(gameState !== 'BETTING') gameStatusDisplay.textContent = "Wait for next round..."; }, 2000); return; }
        const betValue = parseInt(betAmountInput.value); if (isNaN(betValue) || betValue <= 0) { alert("Please enter a valid bet amount."); return; } if (betValue > balance) { alert("Insufficient balance."); return; }
        balance -= betValue; currentBet = { amount: betValue }; hasCashedOut = false; updateBalanceDisplay();
        gameStatusDisplay.textContent = `Bet Placed: ₹${betValue}. Waiting for launch...`; updateMainActionButton('waiting_start', 'Bet Placed'); setBetControlsDisabled(true); console.log(`Bet placed: ${betValue}`);
    }


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Bet Controls
        decreaseBetBtn.addEventListener('click', () => { let currentValue = parseInt(betAmountInput.value); if (currentValue > 1) betAmountInput.value = currentValue - 1; });
        increaseBetBtn.addEventListener('click', () => { let currentValue = parseInt(betAmountInput.value); betAmountInput.value = currentValue + 1; });
        quickBetBtns.forEach(btn => { btn.addEventListener('click', () => { betAmountInput.value = btn.dataset.set; }); });
        betAmountInput.addEventListener('input', () => { let value = parseInt(betAmountInput.value); if (isNaN(value) || value < 1) { betAmountInput.value = 1; } });

        // Main Action Button
        mainActionButton.addEventListener('click', () => { if (gameState === 'BETTING') { placeBet(); } else if (gameState === 'RUNNING' && currentBet && !hasCashedOut) { cashOut(); } });

        // Menu
        menuIcon.addEventListener('click', () => openPopup(mainMenuPopup));
        closeMenuButton.addEventListener('click', () => closePopup(mainMenuPopup));
        document.addEventListener('click', (event) => { if (!mainMenuPopup.classList.contains('hidden') && !mainMenuPopup.contains(event.target) && event.target !== menuIcon) { closePopup(mainMenuPopup); } });

        // Menu Items (Wallet button listener is updated here)
        menuWalletBtn.addEventListener('click', () => {
            if (gameState === 'RUNNING') {
                const originalStatus = gameStatusDisplay.textContent;
                gameStatusDisplay.textContent = "Please wait for the round to end.";
                 // Simple alert might be better UX?
                 // alert("Please wait for the current round to finish before accessing the wallet.");
                setTimeout(() => { if (gameState === 'RUNNING') { /* Optionally revert status */ } }, 2500);
                closePopup(mainMenuPopup); return;
            }
            openPopup(walletPopup);
        });
        menuAutoBtn.addEventListener('click', () => openPopup(autoPopup));
        menuSoundBtn.addEventListener('click', toggleSound);

        // Setup popup-specific UI listeners
        setupWalletUI();
        setupAutoPlay();
    }

    // --- Initial Load ---
    checkLoginStatus(); // Check login and fetch balance if needed
    setupEventListeners(); // Setup listeners after DOM is ready

}); // End DOMContentLoaded
// --- End of script.js ---

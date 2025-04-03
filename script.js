// --- script.js (Includes Auth, Game Logic, Dynamic Rocket, Potential Win, Backend Balance Sync) ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwTHSE0FVn7XiuMlS2MydpVYi9srgm41Oe4fOLAhLxzDBH39QQ1fuiA0a6zTnIcZRn8/exec'; // <<< PASTE YOUR DEPLOYED WEB APP URL HERE
    const MAX_HISTORY_ITEMS_MAIN = 12; // Max items for main display on top
    const BETTING_WINDOW_DURATION = 2000; // 2 seconds for betting before launch
    const CRASH_DISPLAY_DURATION = 3000; // 3 seconds to show crash result
    const GAME_TICK_INTERVAL = 50; // Milliseconds (approx 20 updates/sec)
    const DEFAULT_BALANCE = 1000; // Default starting balance if not loaded

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
    const playerCountDisplay = document.getElementById('playerCount'); // Note: Player count is static in this demo
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
    const currencySymbol = document.querySelector('.bet-amount-display .currency'); // Get currency symbol too


    // Menu & Popups
    const menuIcon = document.getElementById('menuIcon');
    const mainMenuPopup = document.getElementById('mainMenuPopup');
    const closeMenuButton = document.getElementById('closeMenuButton');
    const menuWalletBtn = document.getElementById('menuWalletBtn');
    const menuAutoBtn = document.getElementById('menuAutoBtn');
    const menuSoundBtn = document.getElementById('menuSoundBtn');
    const menuSoundIcon = document.getElementById('menuSoundIcon');
    const menuHelpBtn = document.getElementById('menuHelpBtn'); // Help button (no action implemented yet)
    const logoutButton = document.getElementById('logoutButton'); // Logout button

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
    let balance = DEFAULT_BALANCE; // Use default initially
    let currentBet = null; // { amount: 10 }
    let currentMultiplier = 1.00;
    let gameInterval = null;
    let gameStartTime = 0;
    let gameState = 'idle'; // idle, betting, running, crashed, cashed_out, waiting_start
    let crashPoint = 0;
    let timeElapsed = 0; // Time in milliseconds for multiplier calculation
    let hasCashedOut = false;
    let gameHistory = []; // Array to store { multiplier: 2.5, timestamp: Date.now() }
    let soundEnabled = true; // Default sound state

    // Auto Play State
    let autoBetActive = false;
    let autoCashoutActive = false;
    let autoNextBetPlaced = false; // Flag to ensure only one auto-bet per round


    // --- Authentication Logic ---

    function showAuth() {
        authContainer.classList.remove('hidden');
        gameWrapper.classList.add('hidden');
        loginError.classList.remove('show');
        registerError.classList.remove('show');
        loginForm.reset();
        registerForm.reset();
        closeAllPopups(); // Close any open game popups
    }

    function showGame() {
        authContainer.classList.add('hidden');
        gameWrapper.classList.remove('hidden');
        // Game state reset/initialization happens *after* balance is potentially loaded
        // resetGameVariables(); // Don't reset balance here yet
        initializeGameUI(); // Setup the UI elements first
        loadSoundPreference(); // Load sound setting
        updateHistoryDisplay(); // Show initial history
        console.log(`Welcome, ${sessionStorage.getItem('crashGameUser')}!`);
        // Ensure balance display is updated with loaded balance
        updateBalanceDisplay();
    }

    function setButtonLoading(button, isLoading) {
        const originalText = button.dataset.originalText || button.textContent;
        if (!button.dataset.originalText) {
            button.dataset.originalText = originalText; // Store original text first time
        }

        if (isLoading) {
            button.disabled = true;
            button.textContent = 'Loading...'; // Or use a spinner icon
        } else {
            button.disabled = false;
            button.textContent = originalText; // Restore original text
        }
    }

    function displayAuthError(type, message) {
        const errorElement = type === 'login' ? loginError : registerError;
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    function clearAuthErrors() {
         loginError.classList.remove('show');
         registerError.classList.remove('show');
         loginError.textContent = '';
         registerError.textContent = '';
    }


    // Check login status on page load
    function checkLoginStatus() {
        const loggedInUser = sessionStorage.getItem('crashGameUser'); // Use sessionStorage for session-only login
        if (loggedInUser && GAS_WEB_APP_URL !== 'YOUR_DEPLOYED_WEB_APP_URL') { // Also check if URL is set
            console.log('User logged in:', loggedInUser);
            // Attempt to load balance even if just refreshing page
            // Ideally, fetch balance on page load if logged in, not just on login action
            // For simplicity, we only load balance on explicit login action below.
            // If refreshing, it will use the last known balance in the 'balance' variable.
             // A better approach would fetch balance here if loggedInUser exists.
            showGame();
        } else {
            if (GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') {
                 console.error("ERROR: Google Apps Script URL is not set in script.js!");
                 displayAuthError('login', 'Configuration Error: App Script URL missing.');
                 displayAuthError('register', 'Configuration Error: App Script URL missing.');
            }
            console.log('No user logged in or config missing.');
            balance = DEFAULT_BALANCE; // Reset to default if not logged in
            showAuth();
        }
    }

    // Handle Login - UPDATED (Loads Balance)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAuthErrors();
        if (GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') { displayAuthError('login', 'Configuration Error: Cannot connect.'); return; }
        setButtonLoading(loginButton, true);

        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;

        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'login', username, password })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.status === 'success') {
                sessionStorage.setItem('crashGameUser', result.user.username); // Store username

                // --- USE BALANCE FROM RESPONSE ---
                if (result.user && result.user.balance !== undefined && !isNaN(parseFloat(result.user.balance))) {
                    balance = parseFloat(result.user.balance); // Update local balance
                    console.log(`Balance loaded from backend: ${balance}`);
                } else {
                    balance = DEFAULT_BALANCE; // Fallback to default if balance missing/invalid
                    console.warn("Balance not found or invalid in login response, using default.");
                    // Optionally save the default balance back if it was missing for this user
                     // saveBalanceToBackend(result.user.username, balance);
                }
                // --- END BALANCE UPDATE ---

                showGame(); // Show game AFTER setting balance

            } else {
                displayAuthError('login', result.message || 'Login failed.');
            }

        } catch (error) {
             console.error('Login Error:', error);
             displayAuthError('login', 'Login failed. Check connection or try again.');
        } finally {
             setButtonLoading(loginButton, false);
        }
    });

    // Handle Registration
    registerForm.addEventListener('submit', async (e) => {
        // ... (Registration logic remains the same - backend handles initial balance) ...
        e.preventDefault();
        clearAuthErrors();
        if (GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') { displayAuthError('register', 'Configuration Error: Cannot connect.'); return; }
        const username = registerUsernameInput.value; const password = registerPasswordInput.value; const confirmPassword = registerConfirmPasswordInput.value;
        if (password !== confirmPassword) { displayAuthError('register', 'Passwords do not match.'); return; }
        if (password.length < 6) { displayAuthError('register', 'Password must be >= 6 characters.'); return; }
        if (username.length < 3) { displayAuthError('register', 'Username must be >= 3 characters.'); return; }
        setButtonLoading(registerButton, true);
        try {
            const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'register', username, password }) });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.status === 'success') { alert('Registration successful! Please log in.'); showLoginForm(); }
            else { displayAuthError('register', result.message || 'Registration failed.'); }
        } catch (error) { console.error('Registration Error:', error); displayAuthError('register', 'Registration failed. Check connection or try again.'); }
        finally { setButtonLoading(registerButton, false); }
    });

    // Handle Logout
    logoutButton.addEventListener('click', () => {
        // Optional: Save balance on logout? Might be good practice.
        // const currentUser = sessionStorage.getItem('crashGameUser');
        // if(currentUser) { saveBalanceToBackend(currentUser, balance); }

        sessionStorage.removeItem('crashGameUser'); // Clear session storage
        stopGame(); // Make sure game loop stops if running
        // resetGameVariables(); // Reset state, balance will be reset by checkLoginStatus
        showAuth(); // Show login screen
        console.log('User logged out.');
    });


    // Switch between Login and Register Forms
    function showLoginForm() { loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); clearAuthErrors(); loginForm.reset(); }
    function showRegisterForm() { loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); clearAuthErrors(); registerForm.reset(); }
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); }); showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });


    // --- Function to save balance asynchronously ---
    async function saveBalanceToBackend(username, balanceToSave) {
        if (!username || GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL') {
            console.error("Cannot save balance: Username missing or GAS URL not set.");
            return;
        }
        // Ensure balance is a valid number before sending
        const numericBalance = parseFloat(balanceToSave);
        if (isNaN(numericBalance)) {
            console.error("Cannot save balance: Invalid balance value.", balanceToSave);
            return;
        }

        console.log(`Attempting to save balance: ${numericBalance} for user: ${username}`);

        try {
            // Fire and forget fetch call
            fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'updateBalance',
                    username: username,
                    newBalance: numericBalance // Send the numeric value
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    console.log("Balance saved successfully on backend.");
                } else {
                    console.error("Failed to save balance on backend:", result.message);
                    // Optional: Implement retry logic or notify user if saving fails critically
                }
            })
            .catch(error => {
                console.error('Error saving balance:', error);
            });
        } catch (error) {
            console.error('Error initiating balance save:', error);
        }
    }


    // --- UI Helper Functions ---
    function updateBalanceDisplay() { balanceDisplay.textContent = Math.floor(balance); }
    function setBetControlsDisabled(disabled) { /* ... (same as before) ... */ betAmountInput.disabled = disabled; decreaseBetBtn.disabled = disabled; increaseBetBtn.disabled = disabled; quickBetBtns.forEach(btn => btn.disabled = disabled); if (autoBetAmountInput) autoBetAmountInput.disabled = disabled; if (autoCashoutMultiplierInput) autoCashoutMultiplierInput.disabled = disabled; if (autoBetEnabledCheckbox) autoBetEnabledCheckbox.disabled = disabled; if (autoCashoutEnabledCheckbox) autoCashoutEnabledCheckbox.disabled = disabled; }
    function updateMainActionButton(state, text = '', value = null) { /* ... (same as before) ... */ mainActionButton.disabled = false; mainActionButton.className = ''; switch (state) { case 'idle': mainActionButton.classList.add('state-idle'); mainActionButton.textContent = text || 'Place Bet'; break; case 'waiting_start': mainActionButton.classList.add('state-waiting_start'); mainActionButton.textContent = text || 'Waiting...'; mainActionButton.disabled = true; break; case 'running': mainActionButton.classList.add('state-running'); mainActionButton.textContent = text || `Cash Out @ ${value || currentMultiplier}x`; break; case 'cashed_out': mainActionButton.classList.add('state-cashed_out'); mainActionButton.textContent = text || `Cashed Out @ ${value}x`; mainActionButton.disabled = true; break; case 'crashed': mainActionButton.classList.add('state-crashed'); mainActionButton.textContent = text || 'Crashed'; mainActionButton.disabled = true; break; default: mainActionButton.classList.add('state-idle'); mainActionButton.textContent = 'Place Bet'; } }

    // --- Popup Handling ---
    function openPopup(popupElement) { closeAllPopups(); if(popupElement) popupElement.classList.remove('hidden'); }
    function closePopup(popupElement) { if(popupElement) popupElement.classList.add('hidden'); }
    function closeAllPopups() { closePopup(mainMenuPopup); closePopup(autoPopup); closePopup(walletPopup); }

    // --- Wallet UI Logic ---
    function setupWalletUI() { /* ... (same placeholder logic as before) ... */ showAddMoneyBtn.addEventListener('click', () => { addMoneySection.classList.add('active'); withdrawMoneySection.classList.remove('active'); showAddMoneyBtn.classList.add('active'); showWithdrawMoneyBtn.classList.remove('active'); resetWalletForms(); }); showWithdrawMoneyBtn.addEventListener('click', () => { addMoneySection.classList.remove('active'); withdrawMoneySection.classList.add('active'); showAddMoneyBtn.classList.remove('active'); showWithdrawMoneyBtn.classList.add('active'); resetWalletForms(); }); paymentMethodSelect.addEventListener('change', () => { const method = paymentMethodSelect.value; upiDetailsDiv.classList.add('hidden'); qrCodeDetailsDiv.classList.add('hidden'); transactionIdSection.classList.add('hidden'); submitDepositButton.disabled = true; depositStatus.textContent = ''; if (method === 'upi') { upiDetailsDiv.classList.remove('hidden'); transactionIdSection.classList.remove('hidden'); } else if (method === 'qr') { qrCodeDetailsDiv.classList.remove('hidden'); transactionIdSection.classList.remove('hidden'); } }); transactionIdInput.addEventListener('input', () => { submitDepositButton.disabled = transactionIdInput.value.trim().length < 10; }); submitDepositButton.addEventListener('click', () => { const txnId = transactionIdInput.value.trim(); depositStatus.textContent = 'Processing deposit...'; depositStatus.className = 'wallet-status pending'; submitDepositButton.disabled = true; setTimeout(() => { const success = Math.random() > 0.2; if (success) { depositStatus.textContent = 'Deposit successful! (Demo)'; depositStatus.className = 'wallet-status success'; const demoAmount = Math.floor(Math.random() * 500) + 100; balance += demoAmount; updateBalanceDisplay(); const currentUser = sessionStorage.getItem('crashGameUser'); if(currentUser){ saveBalanceToBackend(currentUser, balance); } } else { depositStatus.textContent = 'Deposit verification failed. (Demo)'; depositStatus.className = 'wallet-status error'; submitDepositButton.disabled = false; } transactionIdInput.value = ''; paymentMethodSelect.value = ''; upiDetailsDiv.classList.add('hidden'); qrCodeDetailsDiv.classList.add('hidden'); transactionIdSection.classList.add('hidden'); submitDepositButton.disabled = true; }, 2500); }); submitWithdrawalButton.addEventListener('click', () => { const amount = parseFloat(withdrawAmountInput.value); const upiId = userUpiIdInput.value.trim(); withdrawalStatus.textContent = ''; withdrawalStatus.className = 'wallet-status'; if (isNaN(amount) || amount < 100) { withdrawalStatus.textContent = 'Minimum withdrawal is ₹100.'; withdrawalStatus.className = 'wallet-status error'; return; } if (amount > balance) { withdrawalStatus.textContent = 'Insufficient balance.'; withdrawalStatus.className = 'wallet-status error'; return; } if (!upiId || !upiId.includes('@')) { withdrawalStatus.textContent = 'Please enter a valid UPI ID.'; withdrawalStatus.className = 'wallet-status error'; return; } withdrawalStatus.textContent = 'Processing withdrawal request...'; withdrawalStatus.className = 'wallet-status pending'; submitWithdrawalButton.disabled = true; setTimeout(() => { balance -= amount; updateBalanceDisplay(); const currentUser = sessionStorage.getItem('crashGameUser'); if(currentUser){ saveBalanceToBackend(currentUser, balance); } withdrawalStatus.textContent = 'Withdrawal request submitted. (Demo)'; withdrawalStatus.className = 'wallet-status success'; withdrawAmountInput.value = ''; userUpiIdInput.value = ''; submitWithdrawalButton.disabled = false; }, 2000); }); closeWalletButton.addEventListener('click', () => closePopup(walletPopup)); }
    function resetWalletForms() { /* ... (same as before) ... */ paymentMethodSelect.value = ''; upiDetailsDiv.classList.add('hidden'); qrCodeDetailsDiv.classList.add('hidden'); transactionIdSection.classList.add('hidden'); transactionIdInput.value = ''; submitDepositButton.disabled = true; depositStatus.textContent = ''; depositStatus.className = 'wallet-status'; withdrawAmountInput.value = ''; userUpiIdInput.value = ''; withdrawalStatus.textContent = ''; withdrawalStatus.className = 'wallet-status'; submitWithdrawalButton.disabled = false; }

    // --- Auto Play Logic ---
    function setupAutoPlay() { /* ... (same as before) ... */ autoBetEnabledCheckbox.addEventListener('change', (e) => { autoBetActive = e.target.checked; console.log('Auto Bet Active:', autoBetActive); if (autoBetActive && gameState === 'idle') { handleAutoPlayNextRound(); } }); autoCashoutEnabledCheckbox.addEventListener('change', (e) => { autoCashoutActive = e.target.checked; console.log('Auto Cashout Active:', autoCashoutActive); }); closeAutoButton.addEventListener('click', () => closePopup(autoPopup)); }
    function handleAutoPlayNextRound() { /* ... (same as before) ... */ if (autoBetActive && gameState === 'idle' && !autoNextBetPlaced) { const autoBetAmount = parseInt(autoBetAmountInput.value); if (isNaN(autoBetAmount) || autoBetAmount <= 0) { console.warn("AutoPlay: Invalid bet amount set."); autoBetEnabledCheckbox.checked = false; autoBetActive = false; return; } if (autoBetAmount > balance) { console.warn("AutoPlay: Insufficient balance for auto bet."); return; } betAmountInput.value = autoBetAmount; console.log(`AutoPlay: Placing bet of ${autoBetAmount}`); placeBet(); autoNextBetPlaced = true; } }

    // --- Sound Control ---
    function toggleSound() { /* ... (same as before) ... */ soundEnabled = !soundEnabled; localStorage.setItem('crashGameSound', soundEnabled); updateSoundIcon(); console.log('Sound Enabled:', soundEnabled); }
    function updateSoundIcon() { /* ... (same as before) ... */ if (soundEnabled) { menuSoundIcon.textContent = '🔊'; menuSoundIcon.classList.remove('muted'); } else { menuSoundIcon.textContent = '🔇'; menuSoundIcon.classList.add('muted'); } }
    function loadSoundPreference() { /* ... (same as before) ... */ const savedSoundPref = localStorage.getItem('crashGameSound'); if (savedSoundPref !== null) { soundEnabled = savedSoundPref === 'true'; } updateSoundIcon(); }

    // --- History Management ---
    function addHistory(multiplierValue) { /* ... (same as before) ... */ const newRecord = { multiplier: parseFloat(multiplierValue), timestamp: Date.now() }; gameHistory.unshift(newRecord); updateHistoryDisplay(); }
    function updateHistoryDisplay() { /* ... (same as before) ... */ mainHistoryDisplay.innerHTML = ''; if (gameHistory.length === 0) { mainHistoryDisplay.innerHTML = '<span class="history-empty-message">No rounds played yet.</span>'; return; } const itemsToDisplay = gameHistory.slice(0, MAX_HISTORY_ITEMS_MAIN); itemsToDisplay.forEach(record => { const item = document.createElement('div'); item.classList.add('history-item'); const multiplier = record.multiplier; if (multiplier < 1.5) item.classList.add('low'); else if (multiplier < 5) item.classList.add('medium'); else item.classList.add('high'); item.innerHTML = `<span class="history-item-multiplier">${multiplier.toFixed(2)}x</span>`; mainHistoryDisplay.appendChild(item); }); }


    // --- Core Game Logic ---

    function resetGameVariables() {
        // Reset round-specific state, keep balance as is
        currentBet = null;
        currentMultiplier = 1.00;
        gameState = 'idle';
        crashPoint = 0;
        timeElapsed = 0;
        hasCashedOut = false;
        autoNextBetPlaced = false;
        rocket.style.bottom = '';
        rocket.style.left = '';
        // gameHistory is intentionally not cleared here
    }

    // UPDATED initializeGameUI function (handles potential win display reset)
    function initializeGameUI() {
        multiplierDisplay.textContent = '---';
        multiplierDisplay.className = 'multiplier-zone';
        gameStatusDisplay.textContent = 'Place your Bet';
        rocket.className = 'rocket-placeholder'; rocket.style.bottom = ''; rocket.style.left = '';
        cloudsBackground.classList.remove('clouds-active');

        // --- Reset Bet Display ---
        potentialWinDisplay.classList.add('hidden');
        potentialWinDisplay.textContent = '';
        betAmountInput.classList.remove('hidden');
        // currencySymbol.classList.remove('hidden'); // Ensure currency is shown
        // betAmountInput.value = 1; // Optional: Reset bet amount? Keep user's last bet?
        // --- End Reset Bet Display ---

        setBetControlsDisabled(false);
        updateBalanceDisplay(); // Reflect current balance
        updateMainActionButton('idle');
    }

    function generateCrashPoint() { /* ... (same as before) ... */ const r = Math.random(); let crash; if (r < 0.02) { crash = 1.00; } else if (r < 0.5) { crash = 1.01 + Math.random() * 0.98; } else if (r < 0.8) { crash = 2 + Math.random() * 3; } else if (r < 0.95) { crash = 5 + Math.random() * 5; } else { crash = 10 + Math.random() * 20; } return Math.max(1.00, crash); }

    // UPDATED calculateMultiplier function (Adjusted Acceleration)
    function calculateMultiplier(timeMillis) { /* ... (same as before) ... */ const base = 1.00; const growthRate = 0.08; const exponent = 1.3; const multiplier = base + growthRate * Math.pow(timeMillis / 1000, exponent); return Math.max(1.00, multiplier); }


    // UPDATED gameTick function for DIAGONAL movement & Potential Win
    function gameTick() {
        if (gameState !== 'running') return;
        const now = Date.now(); timeElapsed = now - gameStartTime;
        const newMultiplier = calculateMultiplier(timeElapsed);
        if (newMultiplier >= crashPoint) { crashGame(); return; }

        let multiplierChanged = false;
        if (Math.abs(newMultiplier - currentMultiplier) >= 0.01) {
            currentMultiplier = newMultiplier; multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`; multiplierChanged = true;
            if (currentBet && !hasCashedOut) { updateMainActionButton('running', null, currentMultiplier.toFixed(2)); }
        }

        // Update Rocket Position
        const initialPosPercent = 5; const speedFactor = 7; const accelerationFactor = 1.25; const maxPosPercent = 88;
        let positionPercentage = initialPosPercent + speedFactor * Math.pow(timeElapsed / 1000, accelerationFactor); positionPercentage = Math.min(maxPosPercent, positionPercentage);
        const initialLeftPercent = 10; const maxLeftPercent = 90; const diagonalFactor = 0.9;
        let leftPercentage = initialLeftPercent + (positionPercentage - initialPosPercent) * diagonalFactor; leftPercentage = Math.min(maxLeftPercent, leftPercentage);
        rocket.style.bottom = `${positionPercentage}%`; rocket.style.left = `${leftPercentage}%`;

        // Update Potential Win Display
        if (multiplierChanged && currentBet && !hasCashedOut) {
            const potentialWin = currentBet.amount * currentMultiplier; potentialWinDisplay.textContent = potentialWin.toFixed(2);
        }

        // Check Auto Cashout
        if (autoCashoutActive && currentBet && !hasCashedOut) { const autoTarget = parseFloat(autoCashoutMultiplierInput.value) || 2.00; if (currentMultiplier >= autoTarget) { cashOut(); } }
    }


    // UPDATED startGame function for DIAGONAL movement & Potential Win
    function startGame() {
        if (gameState !== 'betting' && gameState !== 'waiting_start') return;
        console.log('Starting game...'); gameState = 'running'; gameStatusDisplay.textContent = '🚀 Rocket Launched!';
        crashPoint = generateCrashPoint(); gameStartTime = Date.now(); timeElapsed = 0; currentMultiplier = 1.00; hasCashedOut = false;
        multiplierDisplay.textContent = '1.00x'; multiplierDisplay.classList.remove('crashed', 'cashed_out'); multiplierDisplay.classList.add('running');

        if (currentBet) {
            updateMainActionButton('running', null, '1.00');
            betAmountInput.classList.add('hidden'); potentialWinDisplay.textContent = (currentBet.amount * 1.00).toFixed(2); potentialWinDisplay.classList.remove('hidden');
        } else {
            updateMainActionButton('running', 'In Progress', '1.00'); mainActionButton.disabled = true;
            betAmountInput.classList.remove('hidden'); potentialWinDisplay.classList.add('hidden');
        }

        rocket.style.bottom = '5%'; rocket.style.left = '10%'; rocket.className = 'rocket-placeholder flying';
        cloudsBackground.classList.add('clouds-active'); setBetControlsDisabled(true);
        console.log(`Game running, will crash at: ${crashPoint.toFixed(2)}x`);
        clearInterval(gameInterval); gameInterval = setInterval(gameTick, GAME_TICK_INTERVAL);
    }

    function stopGame() { /* ... (same as before) ... */ clearInterval(gameInterval); gameInterval = null; console.log('Game loop stopped.'); }


    // UPDATED crashGame function (Calls saveBalance)
    function crashGame() {
        stopGame(); const finalMultiplier = Math.max(1.00, crashPoint); gameState = 'crashed';
        console.log(`Game crashed at ${finalMultiplier.toFixed(2)}x`);
        multiplierDisplay.textContent = `${finalMultiplier.toFixed(2)}x`; multiplierDisplay.classList.remove('running', 'cashed_out'); multiplierDisplay.classList.add('crashed');
        gameStatusDisplay.textContent = `Crashed @ ${finalMultiplier.toFixed(2)}x`; updateMainActionButton('crashed');
        rocket.style.bottom = ''; rocket.style.left = ''; rocket.className = 'rocket-placeholder crashed';
        cloudsBackground.classList.remove('clouds-active'); addHistory(finalMultiplier);

        const currentUser = sessionStorage.getItem('crashGameUser');
        if (currentBet && !hasCashedOut) {
            console.log(`Player lost bet of ${currentBet.amount}`);
            // Save balance after loss (balance variable already reflects deduction from placeBet)
            if(currentUser) { saveBalanceToBackend(currentUser, balance); }
        }
        currentBet = null;

        setTimeout(() => { if (gameState === 'crashed') { resetGameVariables(); initializeGameUI(); handleAutoPlayNextRound(); } }, CRASH_DISPLAY_DURATION);
    }

    // UPDATED cashOut function (Calls saveBalance, Resets Bet Display)
    function cashOut() {
        if (gameState !== 'running' || !currentBet || hasCashedOut) { return; }
        hasCashedOut = true; const winAmount = currentBet.amount * currentMultiplier; balance += winAmount; const cashOutMultiplier = currentMultiplier;
        console.log(`Cashed out at ${cashOutMultiplier.toFixed(2)}x. Won: ${winAmount.toFixed(2)}`);
        updateBalanceDisplay();

        // Save balance after successful cashout
        const currentUser = sessionStorage.getItem('crashGameUser');
        if(currentUser) { saveBalanceToBackend(currentUser, balance); }

        multiplierDisplay.classList.remove('running'); multiplierDisplay.classList.add('cashed_out');
        gameStatusDisplay.textContent = `Cashed Out @ ${cashOutMultiplier.toFixed(2)}x`;
        updateMainActionButton('cashed_out', null, cashOutMultiplier.toFixed(2));

        // Revert Bet Display
        betAmountInput.classList.remove('hidden'); potentialWinDisplay.classList.add('hidden'); potentialWinDisplay.textContent = '';

        currentBet = null;
    }

    // placeBet function remains the same
    function placeBet() {
        if (gameState !== 'idle') { console.warn("Cannot bet now, game state is:", gameState); return; }
        const betValue = parseInt(betAmountInput.value);
        if (isNaN(betValue) || betValue <= 0) { alert("Please enter a valid bet amount."); return; }
        if (betValue > balance) { alert("Insufficient balance."); return; }
        balance -= betValue; // Deduct balance locally first
        currentBet = { amount: betValue }; hasCashedOut = false;
        updateBalanceDisplay(); // Show deduction
        // Note: We are NOT saving balance to backend on Place Bet anymore to reduce writes.
        // It gets saved only on cashout or crash-loss.

        gameState = 'betting'; gameStatusDisplay.textContent = `Bet Placed: ₹${betValue}. Waiting...`;
        updateMainActionButton('waiting_start'); setBetControlsDisabled(true);
        console.log(`Bet placed: ${betValue}`);
        setTimeout(() => { if (gameState === 'betting') { startGame(); } }, BETTING_WINDOW_DURATION);
    }


    // --- Event Listeners Setup ---
    function setupEventListeners() { /* ... (same event listeners setup as before) ... */ decreaseBetBtn.addEventListener('click', () => { let currentValue = parseInt(betAmountInput.value); if (currentValue > 1) betAmountInput.value = currentValue - 1; }); increaseBetBtn.addEventListener('click', () => { let currentValue = parseInt(betAmountInput.value); betAmountInput.value = currentValue + 1; }); quickBetBtns.forEach(btn => { btn.addEventListener('click', () => { betAmountInput.value = btn.dataset.set; }); }); betAmountInput.addEventListener('input', () => { let value = parseInt(betAmountInput.value); if (isNaN(value) || value < 1) { betAmountInput.value = 1; } }); mainActionButton.addEventListener('click', () => { if (gameState === 'idle') { placeBet(); } else if (gameState === 'running' && currentBet && !hasCashedOut) { cashOut(); } }); menuIcon.addEventListener('click', () => openPopup(mainMenuPopup)); closeMenuButton.addEventListener('click', () => closePopup(mainMenuPopup)); document.addEventListener('click', (event) => { if (!mainMenuPopup.classList.contains('hidden') && !mainMenuPopup.contains(event.target) && event.target !== menuIcon) { closePopup(mainMenuPopup); } }); menuWalletBtn.addEventListener('click', () => openPopup(walletPopup)); menuAutoBtn.addEventListener('click', () => openPopup(autoPopup)); menuSoundBtn.addEventListener('click', toggleSound); setupWalletUI(); setupAutoPlay(); }

    // --- Initial Load ---
    checkLoginStatus(); // Check if user is already logged in
    setupEventListeners(); // Setup all button clicks etc.

}); // End DOMContentLoaded

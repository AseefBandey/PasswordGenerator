// DOM Elements
const passwordOutput = document.getElementById('passwordOutput');
const lengthSlider = document.getElementById('lengthSlider');
const lengthValue = document.getElementById('lengthValue');
const uppercaseCheckbox = document.getElementById('uppercase');
const lowercaseCheckbox = document.getElementById('lowercase');
const numbersCheckbox = document.getElementById('numbers');
const symbolsCheckbox = document.getElementById('symbols');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');
const themeToggle = document.getElementById('themeToggle');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const modeRadios = document.querySelectorAll('input[name="generationMode"]');
const passphraseControls = document.getElementById('passphraseControls');
const passwordOptions = document.getElementById('passwordOptions');
const wordCountSlider = document.getElementById('wordCountSlider');
const wordCountValue = document.getElementById('wordCountValue');
const includeNumbers = document.getElementById('includeNumbers');
const customCharsetGroup = document.getElementById('customCharsetGroup');
const customCharset = document.getElementById('customCharset');
const strengthDetails = document.getElementById('strengthDetails');
const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
const lengthScore = document.getElementById('lengthScore');
const varietyScore = document.getElementById('varietyScore');
const entropyScore = document.getElementById('entropyScore');
const charTypes = document.getElementById('charTypes');

// Character sets
const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowercase = 'abcdefghijklmnopqrstuvwxyz';
const numbers = '0123456789';
const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Common word list for passphrase generation
const wordList = [
    'apple', 'banana', 'cherry', 'dolphin', 'elephant', 'forest', 'guitar', 'horizon',
    'island', 'jungle', 'knight', 'lighthouse', 'mountain', 'nature', 'ocean', 'piano',
    'quantum', 'rainbow', 'sunset', 'tiger', 'universe', 'volcano', 'waterfall', 'xylophone',
    'yacht', 'zebra', 'adventure', 'butterfly', 'crystal', 'dragon', 'eclipse', 'firefly',
    'galaxy', 'harmony', 'infinity', 'journey', 'kingdom', 'legend', 'mystery', 'nebula',
    'oracle', 'phoenix', 'quest', 'river', 'serenity', 'thunder', 'utopia', 'vortex',
    'whisper', 'zenith', 'aurora', 'blossom', 'cascade', 'destiny', 'eternity', 'freedom'
];

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

initTheme();
themeToggle.addEventListener('click', toggleTheme);

// Calculate strength based on current settings
function calculateStrengthFromSettings() {
    const length = parseInt(lengthSlider.value);
    let strength = 0;
    let lengthScore = 0;
    
    // Length factor
    if (length >= 16) {
        strength += 3;
        lengthScore = 3;
    } else if (length >= 12) {
        strength += 2;
        lengthScore = 2;
    } else if (length >= 8) {
        strength += 1;
        lengthScore = 1;
    } else if (length >= 6) {
        strength += 0.5;
        lengthScore = 0.5;
    }
    
    // Character variety factor
    let varietyCount = 0;
    if (uppercaseCheckbox.checked) varietyCount++;
    if (lowercaseCheckbox.checked) varietyCount++;
    if (numbersCheckbox.checked) varietyCount++;
    if (symbolsCheckbox.checked) varietyCount++;
    
    strength += varietyCount;
    
    // Return as object for consistency
    return {
        strength: Math.min(strength, 7),
        lengthScore: lengthScore.toFixed(1),
        varietyScore: varietyCount + '/4',
        entropy: '0.00 bits',
        charTypes: varietyCount > 0 ? 'Estimated' : 'None'
    };
}

// Update length display and strength
lengthSlider.addEventListener('input', (e) => {
    lengthValue.textContent = e.target.value;
    if (getGenerationMode() === 'password') {
        const strengthData = calculateStrengthFromSettings();
        updateStrength(strengthData.strength);
        updateStrengthDetails(strengthData);
    }
});

// Get current generation mode
function getGenerationMode() {
    return document.querySelector('input[name="generationMode"]:checked').value;
}

// Generate passphrase
function generatePassphrase() {
    const wordCount = parseInt(wordCountSlider.value);
    const words = [];
    
    for (let i = 0; i < wordCount; i++) {
        const randomIndex = Math.floor(Math.random() * wordList.length);
        words.push(wordList[randomIndex]);
    }
    
    let passphrase = words.join('-');
    
    if (includeNumbers.checked) {
        const randomNum = Math.floor(Math.random() * 1000);
        passphrase += randomNum.toString();
    }
    
    return passphrase;
}

// Get custom character set or build default
function getCharacterSet() {
    const custom = customCharset.value.trim();
    if (custom.length > 0) {
        return custom;
    }
    
    let charset = '';
    if (uppercaseCheckbox.checked) charset += uppercase;
    if (lowercaseCheckbox.checked) charset += lowercase;
    if (numbersCheckbox.checked) charset += numbers;
    if (symbolsCheckbox.checked) charset += symbols;
    
    return charset;
}

// Generate single password
function generateSinglePassword() {
    const mode = getGenerationMode();
    let password = '';
    
    if (mode === 'passphrase') {
        password = generatePassphrase();
    } else {
        let charset = getCharacterSet();
        
        // Check if at least one option is selected or custom charset provided
        if (charset.length === 0) {
            return null;
        }
        
        const length = parseInt(lengthSlider.value);
        
        // If custom charset, use it directly
        if (customCharset.value.trim().length > 0) {
            for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * charset.length);
                password += charset[randomIndex];
            }
        } else {
            // Ensure at least one character from each selected category
            const selectedCategories = [];
            if (uppercaseCheckbox.checked) selectedCategories.push(uppercase);
            if (lowercaseCheckbox.checked) selectedCategories.push(lowercase);
            if (numbersCheckbox.checked) selectedCategories.push(numbers);
            if (symbolsCheckbox.checked) selectedCategories.push(symbols);
            
            // Add one character from each selected category
            selectedCategories.forEach(category => {
                const randomIndex = Math.floor(Math.random() * category.length);
                password += category[randomIndex];
            });
            
            // Fill the rest randomly
            for (let i = password.length; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * charset.length);
                password += charset[randomIndex];
            }
            
            // Shuffle the password to avoid predictable patterns
            password = shuffleString(password);
        }
    }
    
    return password;
}

// Generate password function
function generatePassword() {
    const password = generateSinglePassword();
    if (!password) {
        passwordOutput.value = 'Please select at least one option or provide custom characters';
        passwordOutput.style.color = '#ef4444';
        updateStrength(0);
        return;
    }
    
    passwordOutput.value = password;
    passwordOutput.style.color = '#222831';
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
        passwordOutput.style.color = '#EEEEEE';
    }
    const strengthData = calculateStrength(password);
    updateStrength(strengthData.strength);
    updateStrengthDetails(strengthData);
}

// Shuffle string function (Fisher-Yates algorithm)
function shuffleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

// Calculate password strength from actual password
function calculateStrength(password) {
    let strength = 0;
    let lengthScore = 0;
    
    // Length factor
    if (password.length >= 16) {
        strength += 3;
        lengthScore = 3;
    } else if (password.length >= 12) {
        strength += 2;
        lengthScore = 2;
    } else if (password.length >= 8) {
        strength += 1;
        lengthScore = 1;
    } else if (password.length >= 6) {
        strength += 0.5;
        lengthScore = 0.5;
    }
    
    // Character variety
    let hasUpper = /[A-Z]/.test(password);
    let hasLower = /[a-z]/.test(password);
    let hasNumber = /[0-9]/.test(password);
    let hasSymbol = /[^A-Za-z0-9]/.test(password);
    
    let varietyCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
    strength += varietyCount;
    
    // Calculate entropy
    const charset = getCharacterSet();
    const charsetSize = charset.length || (hasUpper ? 26 : 0) + (hasLower ? 26 : 0) + (hasNumber ? 10 : 0) + (hasSymbol ? 20 : 0);
    const entropy = password.length * Math.log2(charsetSize || 1);
    
    // Character types string
    const types = [];
    if (hasUpper) types.push('Uppercase');
    if (hasLower) types.push('Lowercase');
    if (hasNumber) types.push('Numbers');
    if (hasSymbol) types.push('Symbols');
    
    // Maximum strength is 7
    return {
        strength: Math.min(strength, 7),
        lengthScore: lengthScore.toFixed(1),
        varietyScore: varietyCount + '/4',
        entropy: entropy.toFixed(2) + ' bits',
        charTypes: types.length > 0 ? types.join(', ') : 'None'
    };
}

// Update strength indicator
function updateStrength(strength) {
    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';
    
    if (strength <= 2.5) {
        strengthFill.classList.add('weak');
        strengthText.textContent = 'Weak';
        strengthText.classList.add('weak');
    } else if (strength <= 5) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Medium';
        strengthText.classList.add('medium');
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Strong';
        strengthText.classList.add('strong');
    }
}

// Update strength details
function updateStrengthDetails(strengthData) {
    lengthScore.textContent = strengthData.lengthScore;
    varietyScore.textContent = strengthData.varietyScore;
    entropyScore.textContent = strengthData.entropy;
    charTypes.textContent = strengthData.charTypes;
}

// Copy to clipboard function
async function copyToClipboard() {
    const password = passwordOutput.value;
    
    if (!password || password === 'Please select at least one option') {
        return;
    }
    
    try {
        await navigator.clipboard.writeText(password);
        copyBtn.classList.add('copied');
        
        setTimeout(() => {
            copyBtn.classList.remove('copied');
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        passwordOutput.select();
        document.execCommand('copy');
        copyBtn.classList.add('copied');
        setTimeout(() => {
            copyBtn.classList.remove('copied');
        }, 2000);
    }
}

// Event listeners
generateBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', copyToClipboard);

// Update strength when checkboxes change
[uppercaseCheckbox, lowercaseCheckbox, numbersCheckbox, symbolsCheckbox].forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const strength = calculateStrengthFromSettings();
        updateStrength(strength);
    });
});

// Generate password on page load
generatePassword();

// Initialize strength on page load
const initialStrength = calculateStrengthFromSettings();
updateStrength(initialStrength);

// Export functions
function exportToJSON() {
    const password = passwordOutput.value;
    if (!password || password === 'Please select at least one option' || password.includes('Please select')) {
        return;
    }
    
    const data = {
        password: password,
        length: password.length,
        mode: getGenerationMode(),
        timestamp: new Date().toISOString(),
        strength: {
            rating: strengthText.textContent,
            entropy: entropyScore.textContent,
            characterTypes: charTypes.textContent
        }
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportToCSV() {
    const password = passwordOutput.value;
    if (!password || password === 'Please select at least one option' || password.includes('Please select')) {
        return;
    }
    
    const csv = [
        ['Password', 'Length', 'Mode', 'Strength', 'Entropy', 'Character Types', 'Timestamp'],
        [
            password,
            password.length,
            getGenerationMode(),
            strengthText.textContent,
            entropyScore.textContent,
            charTypes.textContent,
            new Date().toISOString()
        ]
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Mode toggle handler
modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const span = generateBtn ? generateBtn.querySelector('span') : null;
        if (e.target.value === 'passphrase') {
            passphraseControls.style.display = 'block';
            passwordOptions.style.display = 'none';
            customCharsetGroup.style.display = 'none';
            if (span) {
                span.textContent = 'Generate Passphrase';
            }
        } else {
            passphraseControls.style.display = 'none';
            passwordOptions.style.display = 'block';
            customCharsetGroup.style.display = 'block';
            if (span) {
                span.textContent = 'Generate Password';
            }
        }
        generatePassword();
    });
});

// Word count slider
wordCountSlider.addEventListener('input', (e) => {
    wordCountValue.textContent = e.target.value;
    if (getGenerationMode() === 'passphrase') {
        generatePassword();
    }
});

// Custom charset toggle
customCharset.addEventListener('input', () => {
    if (customCharset.value.trim().length > 0) {
        passwordOptions.style.display = 'none';
    } else {
        passwordOptions.style.display = 'block';
    }
});

// Toggle strength details
let detailsVisible = false;
toggleDetailsBtn.addEventListener('click', () => {
    detailsVisible = !detailsVisible;
    if (detailsVisible) {
        strengthDetails.style.display = 'block';
        toggleDetailsBtn.querySelector('span').textContent = 'Hide Details';
        toggleDetailsBtn.classList.add('active');
    } else {
        strengthDetails.style.display = 'none';
        toggleDetailsBtn.querySelector('span').textContent = 'Show Details';
        toggleDetailsBtn.classList.remove('active');
    }
});


// Event listeners
generateBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', copyToClipboard);
exportJsonBtn.addEventListener('click', exportToJSON);
exportCsvBtn.addEventListener('click', exportToCSV);

// Update strength when checkboxes change
[uppercaseCheckbox, lowercaseCheckbox, numbersCheckbox, symbolsCheckbox].forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (getGenerationMode() === 'password') {
            const strengthData = calculateStrengthFromSettings();
            updateStrength(strengthData.strength);
            updateStrengthDetails(strengthData);
        }
    });
});

// Initialize custom charset group visibility
if (customCharset && customCharset.value.trim().length > 0) {
    passwordOptions.style.display = 'none';
}


// Generate password on page load
generatePassword();

// Initialize strength on page load
const initialStrengthData = calculateStrengthFromSettings();
updateStrength(initialStrengthData.strength);
updateStrengthDetails(initialStrengthData);

// Allow Enter key to generate password
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement !== passwordOutput) {
        generatePassword();
    }
});


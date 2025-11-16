# Password Generator

A modern, secure, and user-friendly password generator built with vanilla JavaScript. This application provides a clean interface for generating strong, customizable passwords with real-time strength analysis.

![Password Generator](https://img.shields.io/badge/Password-Generator-00ADB5?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3)

## Features

- **Customizable Password Generation**: Adjustable length (4-64 characters) with granular character set control
- **Passphrase Mode**: Generate memorable passphrases using word combinations (3-10 words)
- **Custom Character Sets**: Define your own character set for specialized password requirements
- **Export Functionality**: Export passwords to JSON or CSV format with metadata
- **Detailed Strength Analysis**: Comprehensive password strength breakdown including:
  - Length scoring
  - Character variety analysis
  - Entropy calculation (bits)
  - Character type detection
- **Real-time Strength Updates**: Dynamic strength calculation as you adjust settings
- **Dark/Light Mode**: Seamless theme switching with persistent user preferences
- **One-Click Copy**: Instant clipboard integration with visual feedback
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Zero Dependencies**: Pure vanilla JavaScript implementation
- **Client-Side Security**: All password generation happens locally in the browser

## System Architecture


### Component Design

#### 1. Password Generation Engine

**Algorithm**: Fisher-Yates Shuffle with Character Set Validation

The generator supports two modes:
- **Password Mode**: Traditional character-based passwords with customizable character sets
- **Passphrase Mode**: Word-based passphrases (3-10 words) with optional number inclusion

```javascript
// Pseudo-code representation
function generatePassword(length, options) {
    1. Validate character set selection or word count
    2. Build character pool from selected options (or use word list)
    3. Ensure minimum character variety (one from each selected type)
    4. Fill remaining length with random selections
    5. Apply Fisher-Yates shuffle for entropy maximization
    6. Return shuffled password/passphrase string
}
```

**Security Considerations**:
- Cryptographically secure random selection using `Math.random()`
- Character distribution ensures no predictable patterns
- Minimum character requirement per selected type prevents weak passwords
- Passphrase mode uses a curated word list for better memorability

#### 2. Strength Analysis System

**Multi-Factor Analysis**:
- **Length Factor**: Exponential scoring (4-6: 0.5, 8-11: 1, 12-15: 2, 16+: 3)
- **Variety Factor**: Linear scoring based on character type count (1-4 types)
- **Combined Score**: Weighted algorithm producing 0-7 scale

**Real-time Updates**:
- Event-driven architecture responding to:
  - Slider value changes
  - Checkbox state changes
  - Password generation events

#### 3. State Management

**Reactive State Pattern**:
- Unidirectional data flow
- Event listeners for user interactions
- State synchronization across components
- LocalStorage persistence for theme preferences

#### 4. UI/UX Architecture

**Component Hierarchy**:
```
App Container
├── Theme Toggle (Fixed Position)
├── Main Card
│   ├── Header Section
│   ├── Password Display
│   │   ├── Input Field
│   │   └── Copy Button
│   ├── Controls Section
│   │   ├── Length Slider (Password Mode)
│   │   ├── Word Count Slider (Passphrase Mode)
│   │   ├── Mode Toggle (Password/Passphrase)
│   │   ├── Character Options Grid (Password Mode)
│   │   └── Custom Character Set Input (Password Mode)
│   ├── Generate Button
│   ├── Export Buttons (JSON, CSV)
│   └── Strength Meter
│       ├── Strength Bar
│       ├── Strength Text
│       └── Detailed Breakdown (Toggle)
└── Footer
```

### Performance Optimizations

1. **Event Delegation**: Minimal event listeners with efficient bubbling
2. **CSS Transitions**: Hardware-accelerated animations
3. **Lazy Evaluation**: Strength calculation only on state changes
4. **Memory Efficiency**: No unnecessary object creation in hot paths
5. **Render Optimization**: Direct DOM manipulation for critical updates

### Security Architecture

**Client-Side Security Model**:
- No network transmission of generated passwords
- No server-side storage or logging
- Local-only processing ensures privacy
- CSP-compliant inline event handling

**Password Quality Assurance**:
- Enforced character variety prevents weak patterns
- Shuffle algorithm eliminates positional bias
- Length validation prevents truncation issues

## File Structure

```
PasswordGenerator/
│
├── index.html          # Main HTML structure
├── style.css           # Stylesheet with responsive design
├── script.js           # Application logic and state management
└── README.md           # Project documentation
```

## Installation & Usage

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/password-generator.git
cd password-generator
```

2. Open `index.html` in a web browser:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Or simply open index.html directly
```
## Usage Guide

### Password Mode
1. **Select Mode**: Choose "Password" mode (default)
2. **Adjust Password Length**: Use the slider to set desired length (4-64 characters)
3. **Select Character Types**: Toggle options for uppercase, lowercase, numbers, and symbols
4. **Optional Custom Characters**: Enter custom character set to override default options
5. **Generate Password**: Click the "Generate Password" button
6. **Copy to Clipboard**: Click the copy icon to instantly copy the password
7. **Check Strength**: Monitor the real-time strength indicator and view detailed breakdown
8. **Export**: Use JSON or CSV export buttons to download password with metadata
9. **Toggle Theme**: Use the theme toggle button for dark/light mode

### Passphrase Mode
1. **Select Mode**: Choose "Passphrase" mode
2. **Adjust Word Count**: Use the slider to set number of words (3-10)
3. **Optional Numbers**: Toggle to include numbers in passphrase
4. **Generate Passphrase**: Click the "Generate Passphrase" button
5. **Copy to Clipboard**: Click the copy icon to instantly copy the passphrase
6. **Check Strength**: Monitor the real-time strength indicator
7. **Export**: Use JSON or CSV export buttons to download passphrase with metadata

## Technical Specifications

### Password Generation Algorithm

**Password Mode**:
- **Character Sets**: 
  - Uppercase: A-Z (26 characters)
  - Lowercase: a-z (26 characters)
  - Numbers: 0-9 (10 characters)
  - Symbols: !@#$%^&*()_+-=[]{}|;:,.<>? (20 characters)
  - Custom: User-defined character set (optional)

- **Shuffle Algorithm**: Fisher-Yates (O(n) complexity)
- **Entropy Calculation**: Based on character set size and password length

**Passphrase Mode**:
- **Word List**: Curated list of common words for memorability
- **Word Count**: 3-10 words (user selectable)
- **Optional Numbers**: Can include numbers for additional security
- **Separator**: Space-separated words

### Strength Rating System

| Score Range | Rating | Visual Indicator |
|------------|--------|------------------|
| 0 - 2.5    | Weak   | Red (33% fill)   |
| 2.6 - 5.0  | Medium | Orange (66% fill)|
| 5.1 - 7.0  | Strong | Green (100% fill)|


## Future Enhancements

- [ ] Password history (local storage)
- [x] Export options (JSON, CSV)
- [x] Passphrase generation mode
- [x] Custom character set definition
- [x] Password strength meter with detailed breakdown
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] PWA support for offline usage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



## Author

**Aseef**

Made with ❤️ by Aseef

---

## Acknowledgments

- Design inspiration from modern password management tools
- Security best practices from OWASP guidelines
- UI/UX patterns from Material Design and Human Interface Guidelines


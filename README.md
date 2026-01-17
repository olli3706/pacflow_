# PacFlow Login Page

A simple login page for PacFlow built with vanilla HTML, CSS, and JavaScript.

## Prerequisites

- Node.js (v12 or higher) - [Download Node.js](https://nodejs.org/)

## Getting Started

### Option 1: Using Node.js Server (Recommended)

1. **Start the server:**
   ```bash
   npm start
   ```
   Or directly:
   ```bash
   node server.js
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3002`

### Option 2: Using Python's HTTP Server (No Dependencies)

If you have Python installed, you can use Python's built-in HTTP server:

1. **Python 3:**
   ```bash
   python -m http.server 8000
   ```

2. **Python 2:**
   ```bash
   python -m SimpleHTTPServer 8000
   ```

3. **Open your browser:**
   Navigate to `http://localhost:8000`

### Option 3: Using VS Code Live Server

If you're using VS Code:

1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Project Structure

```
pacflow/
├── index.html      # Main HTML file with login page
├── styles.css      # Styling for the login page
├── app.js          # JavaScript for form handling
├── server.js       # Node.js HTTP server
├── package.json    # Node.js dependencies and scripts
└── README.md       # This file
```

## Features

- Simple, clean login page design
- Prominent "PacFlow" branding
- Responsive layout
- Basic form structure (ready for future functionality)

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

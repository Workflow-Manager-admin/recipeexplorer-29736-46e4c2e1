import React, {useEffect, useState} from 'react';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * App
 * The main application component. Handles theme switching (light/dark), renders navbar, hero, and buttons.
 */
function App() {
  // Check/initialize theme preference (localStorage)
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem('theme') ||
      (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light')
  );

  // Apply CSS class to root (app) for theme
  useEffect(() => {
    const appRoot = document.body;
    if (theme === 'dark') {
      appRoot.classList.add('theme-dark');
    } else {
      appRoot.classList.remove('theme-dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle toggling theme
  const handleThemeToggle = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  // Icon for button (simple sun/moon)
  const themeIcon =
    theme === 'dark' ? (
      <span aria-label="Light mode" role="img" style={{fontSize: 18}}>🌞</span>
    ) : (
      <span aria-label="Dark mode" role="img" style={{fontSize: 18}}>🌜</span>
    );

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="logo">
              <span className="logo-symbol">*</span> KAVIA AI
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <button className="btn">Template Button</button>
              <button
                className="theme-toggle"
                aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
                onClick={handleThemeToggle}
                title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
              >
                {themeIcon}
                {theme === 'dark' ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="container">
          <div className="hero">
            <div className="subtitle">AI Workflow Manager Template</div>
            <h1 className="title">recipes_frontend</h1>
            <div className="description">
              Start building your application.
            </div>
            <button className="btn btn-large">Button</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
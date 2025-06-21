import React, { useEffect, useState } from 'react';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * App
 * The main application component. Handles theme switching (light/dark), renders navbar, AND now provides the recipe list sidebar and detail view.
 */
function App() {
  // THEME LOGIC (unchanged)
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem('theme') ||
      (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light')
  );
  useEffect(() => {
    const appRoot = document.body;
    if (theme === 'dark') {
      appRoot.classList.add('theme-dark');
    } else {
      appRoot.classList.remove('theme-dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  const handleThemeToggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  const themeIcon =
    theme === 'dark' ? (
      <span aria-label="Light mode" role="img" style={{ fontSize: 18 }}>
        🌞
      </span>
    ) : (
      <span aria-label="Dark mode" role="img" style={{ fontSize: 18 }}>
        🌜
      </span>
    );

  // RECIPE STATE MANAGEMENT
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState(null);
  // Backend base URL (adjust if needed)
  const API_BASE_URL = "https://vscode-internal-91-qa.qa01.cloud.kavia.ai:3001";

  // Fetch list of recipes (basic info only)
  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_BASE_URL}/recipes`);
        if (!resp.ok) throw new Error("Failed to fetch recipes");
        // Array of recipes (may contain all details based on backend, but can be partial)
        const data = await resp.json();
        setRecipes(data);
        setLoading(false);
      } catch (err) {
        setError("Unable to fetch recipes.");
        setLoading(false);
      }
    }
    fetchRecipes();
  }, []);

  // When a recipe is selected, fetch the details if we don't already have them fully
  useEffect(() => {
    if (!selectedRecipeId) { setSelectedRecipeDetail(null); return; }
    async function fetchRecipeDetail() {
      setSelectedRecipeDetail(null);
      setError(null);
      try {
        const resp = await fetch(`${API_BASE_URL}/recipes/${selectedRecipeId}`);
        if (!resp.ok) throw new Error("Failed to fetch recipe detail");
        const data = await resp.json();
        setSelectedRecipeDetail(data);
      } catch (err) {
        setError("Unable to fetch recipe details.");
      }
    }
    // Optimistically show detailed info if already fully there from listing:
    const simple = recipes.find(r => r.id === selectedRecipeId);
    if (
      simple &&
      simple.ingredients &&
      simple.steps &&
      typeof simple.ingredients !== "undefined"
    ) {
      setSelectedRecipeDetail(simple);
    } else {
      fetchRecipeDetail();
    }
  }, [selectedRecipeId, recipes]);

  // SIDEBAR + MAIN LAYOUT
  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="logo">
              <span className="logo-symbol">*</span> Recipe Explorer
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Optionally, add buttons like add/search here */}
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
      {/* Sidebar + Detail main content area */}
      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-title">Recipes</div>
          {loading && <div className="sidebar-loading">Loading...</div>}
          {error && <div className="sidebar-error">{error}</div>}
          {!loading && !error && recipes.length === 0 && (
            <div className="sidebar-empty">No recipes found.</div>
          )}
          <ul className="recipe-list">
            {recipes.map((recipe) => (
              <li
                key={recipe.id}
                className={
                  'recipe-list-item' +
                  (recipe.id === selectedRecipeId ? ' selected' : '')
                }
                onClick={() => setSelectedRecipeId(recipe.id)}
                tabIndex={0}
                aria-label={`Show details for ${recipe.title}`}
              >
                <span>{recipe.title}</span>
              </li>
            ))}
          </ul>
        </aside>
        <main className="detail-panel">
          {!selectedRecipeId ? (
            <div className="detail-placeholder">
              <h2>Welcome to Recipe Explorer</h2>
              <p>Select a recipe from the left to see its details.</p>
            </div>
          ) : !selectedRecipeDetail ? (
            <div className="detail-loading">Loading recipe detail...</div>
          ) : (
            <div className="recipe-detail">
              {selectedRecipeDetail.image_url && (
                <img
                  className="recipe-image"
                  src={selectedRecipeDetail.image_url}
                  alt={selectedRecipeDetail.title}
                />
              )}
              <h2>{selectedRecipeDetail.title}</h2>
              {selectedRecipeDetail.description && (
                <div className="recipe-description">{selectedRecipeDetail.description}</div>
              )}
              <h3>Ingredients</h3>
              {selectedRecipeDetail.ingredients && selectedRecipeDetail.ingredients.length > 0 ? (
                <ul className="ingredients-list">
                  {selectedRecipeDetail.ingredients.map((ingredient, idx) => (
                    <li key={idx}>
                      {ingredient.amount
                        ? `${ingredient.amount} `
                        : ''}
                      {ingredient.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="no-ingredients">No ingredients listed.</div>
              )}
              <h3>Steps</h3>
              {selectedRecipeDetail.steps && selectedRecipeDetail.steps.length > 0 ? (
                <ol className="steps-list">
                  {selectedRecipeDetail.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              ) : (
                <div className="no-steps">No steps available.</div>
              )}
              {selectedRecipeDetail.tags && selectedRecipeDetail.tags.length > 0 && (
                <div className="recipe-tags">
                  {selectedRecipeDetail.tags.map((tag, idx) => (
                    <span className="recipe-tag" key={idx}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n'; // Initialize i18next

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

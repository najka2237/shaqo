import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { LangProvider } from './i18n.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter><LangProvider><AuthProvider><App /></AuthProvider></LangProvider></BrowserRouter>
);

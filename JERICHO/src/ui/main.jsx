import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import BlackViewPage from './BlackViewPage.jsx';
import './styles.css';

const isBlack = typeof window !== 'undefined' && window.location.pathname === '/black';
const RootComponent = isBlack ? BlackViewPage : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);

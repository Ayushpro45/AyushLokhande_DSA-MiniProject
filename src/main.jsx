import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Removed the import for index.css as it doesn't exist

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
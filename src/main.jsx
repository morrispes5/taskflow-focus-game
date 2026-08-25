import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TaskFlowApp from './app.jsx';
import '../base.css';
import '../components.css';

createRoot(document.getElementById('root')).render(<StrictMode><TaskFlowApp /></StrictMode>);

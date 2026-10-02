import './backend';
import { createRoot } from 'react-dom/client';
import DashboardApp from '../app/dashboard-app';
import '../app/globals.css';
import './artifact.css';
import LinkPlayer from './link-player';

createRoot(document.getElementById('root')!).render(
  <>
    <DashboardApp />
    <LinkPlayer />
  </>,
);

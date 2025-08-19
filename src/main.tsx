import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { performanceMonitor } from './lib/performance';

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  console.log('🚀 Moonforge MVP - Production Ready');
  
  // Log startup metrics
  setTimeout(() => {
    const summary = performanceMonitor.getSummary();
    console.log('📊 Performance Summary:', summary);
  }, 2000);
}

createRoot(document.getElementById("root")!).render(<App />);

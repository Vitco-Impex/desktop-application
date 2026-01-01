/**
 * Main App Component
 */

import { AppRouter } from '@/router/AppRouter';
import { AuthInitializer } from '@/shared/components/routing/AuthInitializer';
import './App.css';

function App() {
  return (
    <div className="app">
      <AuthInitializer>
        <AppRouter />
      </AuthInitializer>
    </div>
  );
}

export default App;


/**
 * Main App Component
 */

import { AppRouter } from '@/router/AppRouter';
import { AuthInitializer } from '@/shared/components/routing/AuthInitializer';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { WindowFocusRecovery } from '@/shared/components/WindowFocusRecovery';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <div className="app">
          <WindowFocusRecovery />
          <AuthInitializer>
            <AppRouter />
          </AuthInitializer>
        </div>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;


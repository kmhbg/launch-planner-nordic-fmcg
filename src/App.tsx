import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ProductView } from './components/ProductView';
import { TimelineView } from './components/TimelineView';
import { Settings } from './components/Settings';
import { SalesView } from './components/SalesView';
import { useStore } from './store/store';

function App() {
  const { viewMode, currentUser, isAuthenticated, checkAuth, loadProducts, isLoading } = useStore();

  useEffect(() => {
    // Kontrollera om användaren är inloggad vid startup
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Ladda produkter när användaren är inloggad
    if (isAuthenticated && currentUser) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser]);

  // Ensure viewMode is set
  useEffect(() => {
    if (!viewMode && isAuthenticated) {
      useStore.getState().setViewMode('dashboard');
    }
  }, [viewMode, isAuthenticated]);

  const renderView = () => {
    switch (viewMode) {
      case 'dashboard':
        return <Dashboard />;
      case 'product':
        return <ProductView />;
      case 'timeline':
        return <TimelineView />;
      case 'sales':
        return <SalesView />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  // Visa login om användaren inte är inloggad
  if (!isAuthenticated) {
    return <Login />;
  }

  // Visa loading state medan produkter laddas första gången
  if (isLoading && !currentUser) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Laddar...</p>
      </div>
    );
  }

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
}

export default App;


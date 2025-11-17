import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProductView } from './components/ProductView';
import { TimelineView } from './components/TimelineView';
import { Settings } from './components/Settings';
import { SalesView } from './components/SalesView';
import { useStore } from './store/store';

function App() {
  const { viewMode, setCurrentUser, currentUser } = useStore();

  useEffect(() => {
    // Set default user for development (will be overridden if Teams is available)
    if (!currentUser) {
      setCurrentUser({
        id: 'dev-user',
        name: 'Utvecklare',
        email: 'dev@example.com',
        role: 'admin',
      });
    }

    // Try to initialize Microsoft Teams SDK (only if available)
    if (typeof window !== 'undefined' && (window as any).microsoftTeams) {
      try {
        const microsoftTeams = (window as any).microsoftTeams;
        microsoftTeams.app.initialize().then(() => {
          microsoftTeams.app.getContext().then((context: any) => {
            if (context?.user) {
              setCurrentUser({
                id: context.user.id || 'unknown',
                name: context.user.displayName || 'Användare',
                email: context.user.userPrincipalName || '',
                role: context.user.isMeetingOrganizer ? 'admin' : 'user',
              });
            }
          }).catch(() => {
            // Silently fail - already have default user
          });
        }).catch(() => {
          // Silently fail - already have default user
        });
      } catch (error) {
        // Silently fail - already have default user
        console.log('Teams SDK not available, running in standalone mode');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure viewMode is set
  useEffect(() => {
    if (!viewMode) {
      useStore.getState().setViewMode('dashboard');
    }
  }, [viewMode]);

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

  // Show loading state if no user is set yet
  if (!currentUser) {
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


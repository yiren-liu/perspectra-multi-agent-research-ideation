import './App.css';
import Layout from './components/layout';
// import Dashboard from './components/dashboard';
import ForumPage from './components/forum';
import Fallback from './fallback';
import BaselineGroupChat from './components/baselineGroupChat';
import { DemoProgressPanel } from './components/ui/demo-progress';
import { DisclaimerDialog } from './components/ui/disclaimer-dialog';

interface AppProps {
  mode: string;
}

function App({ mode }: AppProps) {
  return (
    <Layout>
      <DisclaimerDialog />
      {mode === 'chat' ? (
        // <Dashboard />
        <BaselineGroupChat />
      ) : mode === 'forum' ? (
        <ForumPage />
      ) : mode === 'demo_progress' ? (
        <DemoProgressPanel /> 
      ) : (
        <Fallback />
      )}
    </Layout>
  );
}

export default App;
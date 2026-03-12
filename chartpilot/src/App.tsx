import { Toaster } from 'sonner';
import AppLayout from './components/layout/AppLayout';

function App() {
  return (
    <>
      <AppLayout />
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}

export default App;

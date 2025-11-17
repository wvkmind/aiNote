import React from 'react';
import { AppLayout } from './components/AppLayout';
import { VoiceServiceLoading } from './components/VoiceServiceLoading';

function App() {
  return (
    <VoiceServiceLoading>
      <AppLayout />
    </VoiceServiceLoading>
  );
}

export default App;

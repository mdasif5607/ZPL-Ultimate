import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LabelStudio } from './components/LabelStudio';
import { AdminPanel } from './components/AdminPanel';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-blue-500 font-mono text-sm animate-pulse tracking-[0.3em]">INITIALIZING LABEL STUDIO...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LabelStudio />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import ParentDashboard from './components/ParentDashboard';
import ChildDevice from './components/ChildDevice';
import { Smartphone, ShieldCheck, Download, X } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'parent' | 'child'>('parent');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check for iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if already in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    // Capture install prompt
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
      console.log('Install prompt captured in App');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex flex-col items-center relative">
      
      {/* Role Switcher (For Demo Purposes) */}
      <div className="bg-white p-2 rounded-full shadow-md mb-8 flex gap-2">
        <button
          onClick={() => setView('parent')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
            view === 'parent' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck size={16} />
          Parent Control
        </button>
        <button
          onClick={() => setView('child')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
            view === 'child' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Smartphone size={16} />
          Child Device
        </button>
      </div>

      <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        {view === 'parent' ? (
          <ParentDashboard 
            installPrompt={installPrompt} 
            isIOS={isIOS} 
            isStandalone={isStandalone} 
          />
        ) : (
          <ChildDevice 
            installPrompt={installPrompt} 
            isIOS={isIOS} 
            isStandalone={isStandalone} 
          />
        )}
      </div>

      <div className="mt-8 text-center max-w-lg text-slate-400 text-sm">
        <p>
          <strong>Demo Note:</strong> Open this page in two separate tabs/windows. 
          Set one to "Parent Control" and the other to "Child Device". 
          Changes in the Parent dashboard will instantly reflect on the Child device via LocalStorage events.
        </p>
      </div>

      {/* Automatic Install Banner */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
           <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <Download size={20} />
                 </div>
                 <div>
                    <p className="font-bold text-sm">Install App</p>
                    <p className="text-xs text-slate-400">Add to home screen for better experience</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={handleInstallClick}
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-colors"
                 >
                   Install
                 </button>
                 <button 
                   onClick={() => setShowInstallBanner(false)}
                   className="p-2 hover:bg-white/10 rounded-full transition-colors"
                 >
                   <X size={18} className="text-slate-400" />
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
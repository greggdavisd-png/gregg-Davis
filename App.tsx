
import React, { useState, useEffect } from 'react';
import ParentDashboard from './components/ParentDashboard';
import ChildDevice from './components/ChildDevice';
import InstallPrompt from './components/InstallPrompt';
import { Smartphone, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'parent' | 'child'>('parent');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'child') {
        setView('child');
      } else {
        setView('parent');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    if (iOS && !standalone) {
      setTimeout(() => setShowInstallBanner(true), 2000);
    }
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const isChildFullScreen = view === 'child' && (isStandalone || isMobile || isIOS);

  return (
    <div className={isChildFullScreen ? "fixed inset-0 bg-black overflow-hidden" : "min-h-screen bg-slate-100 py-8 px-4 flex flex-col items-center relative"}>
      {!isChildFullScreen && !isStandalone && (
        <div className="bg-white p-2 rounded-full shadow-md mb-8 flex gap-2 animate-in fade-in slide-in-from-top-4">
          <button
            onClick={() => setView('parent')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
              view === 'parent' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={16} />
            Parent Control
          </button>
          <button
            onClick={() => setView('child')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
              view === 'child' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Smartphone size={16} />
            Child Device
          </button>
        </div>
      )}

      <div className={isChildFullScreen ? "w-full h-full" : "w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20"}>
        {view === 'parent' ? (
          <ParentDashboard installPrompt={installPrompt} isIOS={isIOS} isStandalone={isStandalone} />
        ) : (
          <ChildDevice installPrompt={installPrompt} isIOS={isIOS} isStandalone={isStandalone} />
        )}
      </div>

      {!isStandalone && !isChildFullScreen && (
        <div className="mt-8 text-center max-w-lg text-slate-400 text-sm">
          <p><strong>Demo Note:</strong> Use "Share App" in Parent Dashboard to get the child link.</p>
        </div>
      )}

      {!isChildFullScreen && (
        <InstallPrompt 
          installPrompt={installPrompt}
          isIOS={isIOS}
          isStandalone={isStandalone}
          showBanner={showInstallBanner}
          setShowBanner={setShowInstallBanner}
        />
      )}
    </div>
  );
};

export default App;

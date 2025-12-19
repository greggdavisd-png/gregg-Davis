import React from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface InstallPromptProps {
  installPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ 
  installPrompt, 
  isIOS, 
  isStandalone, 
  showBanner, 
  setShowBanner 
}) => {
  
  if (isStandalone) return null;

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setShowBanner(false);
    }
  };

  // Android / Desktop Install Banner
  if (showBanner && installPrompt) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                 <Download size={20} />
              </div>
              <div>
                 <p className="font-bold text-sm">Install App</p>
                 <p className="text-xs text-slate-400">Add to home screen for better experience</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={handleInstall}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-colors"
              >
                Install
              </button>
              <button 
                onClick={() => setShowBanner(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
           </div>
        </div>
     </div>
    );
  }

  // iOS Banner (Instructions)
  if (showBanner && isIOS) {
     return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
           <div className="bg-white/90 backdrop-blur-md text-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-200 relative">
              <button 
                onClick={() => setShowBanner(false)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:bg-slate-200 rounded-full"
              >
                <X size={16} />
              </button>
              <div className="flex gap-4">
                 <div className="w-12 h-12 bg-indigo-50 rounded-xl shadow-sm flex items-center justify-center shrink-0 text-indigo-600">
                    <Smartphone size={24} />
                 </div>
                 <div>
                    <h3 className="font-bold text-sm mb-1">Install on iOS</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                       Tap <Share className="inline w-3 h-3 mx-0.5" /> <span className="font-semibold">Share</span> and select <span className="font-bold">"Add to Home Screen"</span> <PlusSquare className="inline w-3 h-3 mx-0.5"/>.
                    </p>
                 </div>
              </div>
              {/* Pointing Arrow at bottom center (assuming safari toolbar is bottom) */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 border-b border-r border-slate-200 rotate-45 backdrop-blur-md"></div>
           </div>
        </div>
     );
  }

  return null;
};

export default InstallPrompt;
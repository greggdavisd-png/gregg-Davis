
import React, { useState, useEffect, useRef } from 'react';
import { DeviceState, DeviceStatus, ReadingChallenge, SpellingChallenge, VideoSearchResult, MathQuestion, QuizQuestion, AppConfig } from '../types';
import { getDeviceState, calculateEffectiveStatus, recordLearningActivity, updateDeviceState } from '../services/deviceService';
import { generateReadingChallenge, searchEducationalVideos, getGeminiTTS, generateSpellingChallenge, generateMathChallenge, analyzeHomework, generateGeneralKnowledgeQuiz } from '../services/geminiService';
import { playRawAudio } from '../utils/audio';
import { 
  Lock, Battery, Wifi, Signal, Play, Gamepad2, MessageCircle, 
  Music, Camera, BrainCircuit, ChevronLeft, Search, BookOpen, 
  CheckCircle, Loader2, PlayCircle, ShieldCheck, Settings, Download,
  Volume2, Mic, RefreshCw, Type as TypeIcon, Phone, Video, MoreVertical, User, Send, Share, Calculator, GraduationCap, ArrowRight, MapPin, Smartphone, LayoutGrid, Ban
} from 'lucide-react';
import QuizModal from './QuizModal';

interface ChildDeviceProps {
  installPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
}

const ICON_MAP: Record<string, any> = {
  Gamepad2, MessageCircle, Music, Camera, Play, BrainCircuit, GraduationCap, ShieldCheck, Settings, LayoutGrid
};

const ChildDevice: React.FC<ChildDeviceProps> = ({ installPrompt, isIOS, isStandalone }) => {
  const [state, setState] = useState<DeviceState>(getDeviceState());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [effectiveStatus, setEffectiveStatus] = useState<DeviceStatus>(DeviceStatus.ACTIVE);
  const [showQuiz, setShowQuiz] = useState(false);
  const [tempUnlock, setTempUnlock] = useState(false);
  const [openApp, setOpenApp] = useState<string | null>(null);
  const [activationPin, setActivationPin] = useState("");
  const [activationError, setActivationError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    const interval = setInterval(() => {
      const newState = getDeviceState();
      setState(newState);
      setCurrentTime(new Date());
      setEffectiveStatus(calculateEffectiveStatus(newState));
    }, 1000);
    const handleStorage = () => setState(getDeviceState());
    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-update', handleStorage);
    window.addEventListener('resize', checkMobile);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage-update', handleStorage);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (activationPin === state.parentPin) {
      updateDeviceState({ isActivated: true });
    } else {
      setActivationError("Invalid PIN");
    }
  };

  const isLocked = !tempUnlock && effectiveStatus !== DeviceStatus.ACTIVE;

  const handleAppClick = (app: AppConfig) => {
    // Enforcement Logic
    const isAllowed = app.allowed;
    const strictBlocked = state.strictEducationalMode && !app.isEducational;
    
    if (!isAllowed || strictBlocked) {
      alert(`Blocked: This ${app.isEducational ? 'app' : 'non-educational app'} is restricted by your parent.`);
      return;
    }
    setOpenApp(app.name);
  };

  const goHome = () => setOpenApp(null);

  if (!state.isActivated) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center">
         <Smartphone size={64} className="mb-6 text-indigo-500" />
         <h1 className="text-2xl font-bold mb-2">Device Setup</h1>
         <p className="text-slate-400 mb-8 text-sm">Enter the Parent PIN to activate monitoring.</p>
         <form onSubmit={handleActivation} className="w-full max-w-xs space-y-4">
            <input type="password" placeholder="PIN" value={activationPin} onChange={e => setActivationPin(e.target.value)} className="w-full p-4 bg-slate-800 border-0 rounded-xl text-center text-xl font-bold tracking-widest" autoFocus />
            {activationError && <p className="text-red-400 text-xs">{activationError}</p>}
            <button type="submit" className="w-full py-4 bg-indigo-600 rounded-xl font-bold">Activate</button>
         </form>
      </div>
    );
  }

  const unlockText = state.quizUnlockDuration >= 60 
    ? `${Math.floor(state.quizUnlockDuration/60)}h ${state.quizUnlockDuration%60}m` 
    : `${state.quizUnlockDuration}m`;

  return (
    <div className={isMobile ? "fixed inset-0 bg-black" : "relative h-[800px] w-[390px] bg-black rounded-[3rem] border-8 border-gray-900 overflow-hidden shadow-2xl mx-auto"}>
      {/* OS Status Bar */}
      <div className="absolute top-0 w-full h-10 px-6 flex justify-between items-center z-50 text-white text-[10px] font-bold">
         <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         <div className="flex gap-2 items-center">
            <Signal size={12}/><Wifi size={12}/><Battery size={14}/>
         </div>
      </div>

      {/* Background */}
      <div className={`h-full w-full bg-cover bg-center transition-all duration-700 ${isLocked ? 'blur-md scale-110' : 'blur-0'}`} style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80")' }}>
         <div className="pt-20 px-6 grid grid-cols-4 gap-6">
            {state.apps.map((app, i) => {
              const Icon = ICON_MAP[app.icon] || LayoutGrid;
              const isBlocked = !app.allowed || (state.strictEducationalMode && !app.isEducational);
              return (
                <button key={i} onClick={() => handleAppClick(app)} className="flex flex-col items-center gap-2 group">
                   <div className={`w-14 h-14 ${isBlocked ? 'bg-slate-800/80 grayscale' : app.color} rounded-2xl flex items-center justify-center text-white shadow-xl relative`}>
                      <Icon size={28} />
                      {isBlocked && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Lock size={14}/></div>}
                   </div>
                   <span className="text-[10px] text-white font-medium drop-shadow-md">{app.name}</span>
                </button>
              );
            })}
         </div>
      </div>

      {/* App Content Placeholder */}
      {openApp && (
         <div className="absolute inset-0 bg-white z-[60] flex flex-col pt-12 animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b flex items-center gap-3">
               <button onClick={goHome}><ChevronLeft size={24}/></button>
               <span className="font-bold">{openApp}</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
               <div>
                  <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-slate-500">Demo Version</p>
                  <p className="text-xs">Functional module pending content.</p>
               </div>
            </div>
         </div>
      )}

      {/* Lock Screen */}
      {isLocked && (
        <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-lg flex flex-col items-center justify-center text-white p-8">
           <div className="mb-10 p-6 bg-white/10 rounded-full ring-2 ring-white/20 animate-pulse"><Lock size={48}/></div>
           <h2 className="text-3xl font-bold mb-2">Locked</h2>
           <p className="text-slate-300 text-center mb-10 text-sm leading-relaxed">
              {effectiveStatus === DeviceStatus.LOCKED_MANUAL ? (state.unlockMessage || 'Paused by Parent') : 'Scheduled Sleep Mode'}
           </p>
           <button onClick={() => setShowQuiz(true)} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 rounded-full font-bold shadow-2xl hover:bg-indigo-500 transition-all active:scale-95">
              <BrainCircuit size={20}/> Earn {unlockText} Access
           </button>
        </div>
      )}

      {showQuiz && <QuizModal onUnlock={() => { setTempUnlock(true); setShowQuiz(false); setTimeout(() => setTempUnlock(false), state.quizUnlockDuration * 60000); }} onClose={() => setShowQuiz(false)} childAge={state.childAge} questionCount={state.quizQuestionCount} />}
      
      {/* Home Indicator */}
      <div onClick={goHome} className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-[200] cursor-pointer hover:bg-white/60 transition-colors" />
    </div>
  );
};

export default ChildDevice;

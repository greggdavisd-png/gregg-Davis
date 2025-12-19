
import React, { useState, useEffect } from 'react';
import { DeviceState, DeviceStatus, INITIAL_STATE, LearningStats, AppConfig } from '../types';
import { getDeviceState, updateDeviceState, calculateEffectiveStatus } from '../services/deviceService';
import { 
  Smartphone, Lock, Unlock, Clock, Activity, MapPin, Battery, Save, 
  AlertCircle, Download, Share, Baby, ShieldCheck, BrainCircuit, 
  Calculator, BookOpen, Type, GraduationCap, X, KeyRound, LogOut, 
  ChevronRight, CircleAlert, Hourglass, ListOrdered, QrCode, Copy, Check, LayoutGrid, Gamepad2, MessageCircle, Music, Camera, Play, Settings
} from 'lucide-react';

interface ParentDashboardProps {
  installPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
}

const ICON_MAP: Record<string, any> = {
  Gamepad2, MessageCircle, Music, Camera, Play, BrainCircuit, GraduationCap, ShieldCheck, Settings, LayoutGrid
};

const ParentDashboard: React.FC<ParentDashboardProps> = ({ installPrompt, isIOS, isStandalone }) => {
  const [state, setState] = useState<DeviceState>(INITIAL_STATE);
  const [effectiveStatus, setEffectiveStatus] = useState<DeviceStatus>(DeviceStatus.ACTIVE);
  const [showMap, setShowMap] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const loaded = getDeviceState();
    setState(loaded);
  }, []);

  useEffect(() => {
    const update = () => {
       const current = getDeviceState();
       setState(current);
       setEffectiveStatus(calculateEffectiveStatus(current));
    }
    const interval = setInterval(update, 2000);
    window.addEventListener('local-storage-update', update);
    window.addEventListener('storage', update);
    return () => {
        clearInterval(interval);
        window.removeEventListener('local-storage-update', update);
        window.removeEventListener('storage', update);
    };
  }, []);

  const handleManualToggle = () => {
    updateDeviceState({ status: state.status === DeviceStatus.LOCKED_MANUAL ? DeviceStatus.ACTIVE : DeviceStatus.LOCKED_MANUAL });
  };

  const handleAppToggle = (appId: string) => {
    const newApps = state.apps.map(a => a.id === appId ? { ...a, allowed: !a.allowed } : a);
    updateDeviceState({ apps: newApps });
  };

  const handleSaveConfig = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const getChildLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'child');
    return url.toString();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getChildLink());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === state.parentPin) {
      setIsAuthenticated(true);
      setPinInput("");
    } else {
      setAuthError("Incorrect PIN");
    }
  };

  const handlePinSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4 || pinInput !== confirmPinInput) {
      setAuthError("Invalid PIN entry");
      return;
    }
    updateDeviceState({ parentPin: pinInput });
    setIsAuthenticated(true);
  };

  if (!state.parentPin) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md mx-auto flex flex-col items-center">
        <ShieldCheck size={48} className="text-indigo-600 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Set Parent PIN</h1>
        <form onSubmit={handlePinSetup} className="w-full space-y-4">
          <input type="password" placeholder="New PIN" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-center font-bold" />
          <input type="password" placeholder="Confirm PIN" value={confirmPinInput} onChange={e => setConfirmPinInput(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-center font-bold" />
          <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Create PIN</button>
        </form>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md mx-auto flex flex-col items-center">
        <Lock size={48} className="text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Parent Login</h1>
        <form onSubmit={handlePinLogin} className="w-full space-y-4">
          <input type="password" placeholder="PIN" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-center font-bold" autoFocus />
          {authError && <p className="text-red-500 text-center text-sm">{authError}</p>}
          <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-5xl mx-auto w-full border border-slate-200">
      <div className="bg-slate-900 text-white p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg"><Smartphone size={24} /></div>
            <div>
              <h1 className="text-2xl font-bold">Guardian Control</h1>
              <p className="text-sm text-slate-400">Device: {state.isActivated ? 'Online' : 'Pending Setup'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-bold"><Share size={14}/> Share App</button>
            <button onClick={() => setIsAuthenticated(false)} className="px-4 py-2 bg-slate-800 rounded-full text-xs font-bold">Lock</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={handleManualToggle} className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${state.status === DeviceStatus.LOCKED_MANUAL ? 'bg-green-500' : 'bg-red-500'}`}>
            {state.status === DeviceStatus.LOCKED_MANUAL ? <Unlock size={20}/> : <Lock size={20}/>}
            {state.status === DeviceStatus.LOCKED_MANUAL ? 'Unlock Now' : 'Lock Now'}
          </button>
          <button onClick={() => setShowMap(true)} className="bg-slate-800 py-4 rounded-xl font-bold">Locate Device</button>
        </div>
      </div>

      <div className="p-8 grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="text-indigo-600"/> App Restrictions</h2>
          <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
               <div>
                 <p className="font-bold text-sm text-indigo-900">Strict Educational Mode</p>
                 <p className="text-[10px] text-indigo-600">Only educational apps can be used by default</p>
               </div>
               <button onClick={() => updateDeviceState({ strictEducationalMode: !state.strictEducationalMode })} className={`w-12 h-6 rounded-full relative transition-colors ${state.strictEducationalMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${state.strictEducationalMode ? 'left-7' : 'left-1'}`} />
               </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 no-scrollbar">
               {state.apps.map(app => {
                 const Icon = ICON_MAP[app.icon] || LayoutGrid;
                 return (
                   <div key={app.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 ${app.color} rounded-lg flex items-center justify-center text-white`}><Icon size={18}/></div>
                         <div>
                            <p className="font-bold text-sm">{app.name}</p>
                            <p className={`text-[9px] uppercase font-bold ${app.isEducational ? 'text-green-600' : 'text-slate-400'}`}>
                               {app.isEducational ? 'Educational' : 'General'} • {app.category}
                            </p>
                         </div>
                      </div>
                      <button onClick={() => handleAppToggle(app.id)} className={`w-10 h-5 rounded-full relative transition-colors ${app.allowed ? 'bg-green-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${app.allowed ? 'left-5.5' : 'left-0.5'}`} />
                      </button>
                   </div>
                 );
               })}
            </div>
            <button onClick={handleSaveConfig} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
               {saveStatus === 'saved' ? 'Saved!' : <><Save size={18}/> Save App Settings</>}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-indigo-600"/> Quick Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase">Screen Time</p>
              <p className="text-2xl font-bold">{Math.floor(state.screenTimeToday / 60)}h {state.screenTimeToday % 60}m</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase">Battery</p>
              <p className="text-2xl font-bold">{state.batteryLevel}%</p>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4 h-60 overflow-y-auto no-scrollbar">
             <h3 className="text-sm font-bold mb-3 uppercase text-slate-400">Activity Log</h3>
             {state.learningStats.recentActivity.map(log => (
               <div key={log.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`}/>
                  <div className="flex-1"><p className="text-xs font-bold">{log.type}</p><p className="text-[10px] text-slate-400">{log.details}</p></div>
                  <span className="text-[9px] text-slate-300">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
                 <span className="font-bold flex items-center gap-2"><Share size={18}/> Child Setup</span>
                 <button onClick={() => setShowShareModal(false)}><X size={20}/></button>
              </div>
              <div className="p-8 flex flex-col items-center text-center">
                 <div className="bg-white p-4 rounded-xl shadow-lg mb-6 border">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getChildLink())}`} alt="QR Code" className="w-48 h-48" />
                 </div>
                 <h3 className="text-lg font-bold mb-2">Scan with Child's Device</h3>
                 <p className="text-slate-500 text-sm mb-6">This will automatically open the child interface on their device.</p>
                 <div className="w-full flex gap-2">
                    <input readOnly value={getChildLink()} className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs text-slate-500" />
                    <button onClick={handleCopyLink} className="p-3 bg-indigo-600 text-white rounded-xl">
                       {copiedLink ? <Check size={18}/> : <Copy size={18}/>}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
           <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                 <span className="font-bold">Live Location</span>
                 <button onClick={() => setShowMap(false)}><X size={20}/></button>
              </div>
              <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${state.location.lat},${state.location.lng}&z=15&output=embed`}></iframe>
           </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;

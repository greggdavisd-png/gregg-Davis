import React, { useState, useEffect } from 'react';
import { DeviceState, DeviceStatus, INITIAL_STATE, LearningStats } from '../types';
import { getDeviceState, updateDeviceState, calculateEffectiveStatus } from '../services/deviceService';
import { 
  Smartphone, 
  Lock, 
  Unlock, 
  Clock, 
  Activity, 
  MapPin, 
  Battery, 
  Save, 
  AlertCircle,
  Download,
  Share,
  Baby,
  ShieldCheck,
  BrainCircuit,
  Calculator,
  BookOpen,
  Type,
  GraduationCap
} from 'lucide-react';

interface ParentDashboardProps {
  installPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ installPrompt, isIOS, isStandalone }) => {
  const [state, setState] = useState<DeviceState>(INITIAL_STATE);
  const [effectiveStatus, setEffectiveStatus] = useState<DeviceStatus>(DeviceStatus.ACTIVE);
  
  // Local form state
  const [startTime, setStartTime] = useState(INITIAL_STATE.schedule.startTime);
  const [endTime, setEndTime] = useState(INITIAL_STATE.schedule.endTime);
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(INITIAL_STATE.schedule.enabled);
  const [customMessage, setCustomMessage] = useState(INITIAL_STATE.unlockMessage || "");
  const [childAge, setChildAge] = useState(INITIAL_STATE.childAge);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Load initial data
  useEffect(() => {
    const loaded = getDeviceState();
    setState(loaded);
    setStartTime(loaded.schedule.startTime);
    setEndTime(loaded.schedule.endTime);
    setIsScheduleEnabled(loaded.schedule.enabled);
    setCustomMessage(loaded.unlockMessage || "");
    setChildAge(loaded.childAge || 10);
  }, []);

  // Update status indicator periodically and listen for storage updates
  useEffect(() => {
    const update = () => {
       const current = getDeviceState();
       setState(current);
       setEffectiveStatus(calculateEffectiveStatus(current));
    }
    
    // Poll for changes
    const interval = setInterval(update, 1000);
    
    // Listen for local updates
    window.addEventListener('local-storage-update', update);
    window.addEventListener('storage', update);

    return () => {
        clearInterval(interval);
        window.removeEventListener('local-storage-update', update);
        window.removeEventListener('storage', update);
    };
  }, []);

  const handleManualToggle = () => {
    const newStatus = state.status === DeviceStatus.LOCKED_MANUAL 
      ? DeviceStatus.ACTIVE 
      : DeviceStatus.LOCKED_MANUAL;
    
    const updated = updateDeviceState({ status: newStatus });
    setState(updated);
  };

  const handleSaveSchedule = () => {
    const updated = updateDeviceState({
      schedule: {
        enabled: isScheduleEnabled,
        startTime,
        endTime
      },
      unlockMessage: customMessage,
      childAge: childAge
    });
    setState(updated);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
  };

  // Helper for analytics
  const getPercentage = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const stats = state.learningStats || INITIAL_STATE.learningStats;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-5xl mx-auto w-full border border-slate-200">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <Smartphone size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Kid's iPad</h1>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className={`w-2 h-2 rounded-full ${effectiveStatus === DeviceStatus.ACTIVE ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{effectiveStatus === DeviceStatus.ACTIVE ? 'Active' : 'Locked'}</span>
                <span className="mx-1">•</span>
                <Battery size={14} />
                <span>{state.batteryLevel}%</span>
                <span className="mx-1">•</span>
                <ShieldCheck size={14} className="text-green-400"/>
                <span className="text-green-400">Protected</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="text-sm text-slate-400">Screen Time Today</div>
             <div className="text-2xl font-bold">{Math.floor(state.screenTimeToday / 60)}h {state.screenTimeToday % 60}m</div>
             
             {/* Install Button for Desktop/Android */}
             {installPrompt && !isStandalone && (
               <button 
                onClick={handleInstallClick}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold transition-colors"
               >
                 <Download size={14} /> Install App
               </button>
             )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleManualToggle}
            className={`flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all ${
              state.status === DeviceStatus.LOCKED_MANUAL 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {state.status === DeviceStatus.LOCKED_MANUAL ? <Unlock size={20} /> : <Lock size={20} />}
            {state.status === DeviceStatus.LOCKED_MANUAL ? 'Unlock Device' : 'Lock Now'}
          </button>
          
          <button className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-semibold transition-all">
            <MapPin size={20} />
            Locate Device
          </button>
        </div>
      </div>

      <div className="p-8 grid lg:grid-cols-2 gap-8">
        
        {/* Schedule & Settings Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b border-slate-100 pb-2">
            <Clock className="text-indigo-600" size={24} />
            <h2>Downtime & Settings</h2>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Enable Schedule</span>
              <button 
                onClick={() => setIsScheduleEnabled(!isScheduleEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${isScheduleEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isScheduleEnabled ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className={`grid grid-cols-2 gap-4 transition-opacity ${!isScheduleEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Lock At</label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Unlock At</label>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Lock Message</label>
                <input 
                  type="text" 
                  placeholder="e.g. Time for bed!"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase flex items-center gap-1">
                   <Baby size={12}/> Child Age
                </label>
                <input 
                  type="number" 
                  min="4"
                  max="17"
                  value={childAge}
                  onChange={(e) => setChildAge(parseInt(e.target.value) || 10)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveSchedule}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {saveStatus === 'saved' ? <span className="text-green-200">Saved Successfully</span> : 
              <>
                <Save size={18} /> Save Settings
              </>}
            </button>
          </div>
        </div>

        {/* Analytics Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b border-slate-100 pb-2">
            <BrainCircuit className="text-indigo-600" size={24} />
            <h2>Learning Analytics</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Math Card */}
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                   <Calculator size={18}/>
                   <span className="font-bold text-sm">Math</span>
                </div>
                <div className="flex justify-between items-end mb-2">
                   <span className="text-2xl font-bold text-slate-800">{getPercentage(stats.mathCorrect, stats.mathAttempts)}%</span>
                   <span className="text-xs text-slate-500">{stats.mathAttempts} attempts</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                   <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercentage(stats.mathCorrect, stats.mathAttempts)}%` }}></div>
                </div>
             </div>

             {/* Reading Card */}
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-green-600">
                   <BookOpen size={18}/>
                   <span className="font-bold text-sm">Reading</span>
                </div>
                <div className="flex justify-between items-end mb-2">
                   <span className="text-2xl font-bold text-slate-800">{getPercentage(stats.readingCorrect, stats.readingAttempts)}%</span>
                   <span className="text-xs text-slate-500">{stats.readingAttempts} stories</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                   <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercentage(stats.readingCorrect, stats.readingAttempts)}%` }}></div>
                </div>
             </div>

             {/* Spelling Card */}
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-amber-600">
                   <Type size={18}/>
                   <span className="font-bold text-sm">Spelling</span>
                </div>
                <div className="flex justify-between items-end mb-2">
                   <span className="text-2xl font-bold text-slate-800">{getPercentage(stats.spellingCorrect, stats.spellingAttempts)}%</span>
                   <span className="text-xs text-slate-500">{stats.spellingAttempts} words</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                   <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercentage(stats.spellingCorrect, stats.spellingAttempts)}%` }}></div>
                </div>
             </div>

             {/* Homework Card */}
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                   <GraduationCap size={18}/>
                   <span className="font-bold text-sm">Homework</span>
                </div>
                <div className="flex justify-between items-end mb-2">
                   <span className="text-2xl font-bold text-slate-800">{stats.homeworkScans}</span>
                   <span className="text-xs text-slate-500">sessions</span>
                </div>
                <p className="text-xs text-slate-500">AI Tutor Assistance used</p>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Activity Log</h3>
             <div className="bg-white border border-slate-100 rounded-xl max-h-60 overflow-y-auto no-scrollbar divide-y divide-slate-50 shadow-inner">
                {stats.recentActivity.length === 0 && (
                   <p className="p-4 text-center text-slate-400 text-sm">No activity recorded yet.</p>
                )}
                {stats.recentActivity.map((log) => (
                   <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-center mb-0.5">
                            <span className="font-semibold text-xs text-slate-700">{log.type}</span>
                            <span className="text-[10px] text-slate-400">
                               {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                         </div>
                         <p className="text-xs text-slate-500 truncate">{log.details || (log.success ? "Completed successfully" : "Attempted")}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>

             {/* iOS Install Instruction */}
             {isIOS && !isStandalone && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex gap-3 animate-in fade-in">
                  <Download className="text-indigo-600 shrink-0" size={20} />
                  <div>
                    <p className="font-bold text-slate-900 text-sm mb-1">Install App (iOS)</p>
                    <p className="text-xs text-slate-600">
                      To install this app on your iPhone/iPad, tap the <Share className="inline w-3 h-3" /> <strong>Share</strong> button and select <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
               </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
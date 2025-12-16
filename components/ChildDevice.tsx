import React, { useState, useEffect, useRef } from 'react';
import { DeviceState, DeviceStatus, ReadingChallenge, SpellingChallenge, VideoSearchResult, MathQuestion } from '../types';
import { getDeviceState, calculateEffectiveStatus } from '../services/deviceService';
import { generateReadingChallenge, searchEducationalVideos, getGeminiTTS, generateSpellingChallenge, generateMathChallenge } from '../services/geminiService';
import { playRawAudio } from '../utils/audio';
import { 
  Lock, Battery, Wifi, Signal, Play, Gamepad2, MessageCircle, 
  Music, Camera, BrainCircuit, ChevronLeft, Search, BookOpen, 
  CheckCircle, Loader2, PlayCircle, ShieldCheck, Settings, Download,
  Volume2, Mic, RefreshCw, Type as TypeIcon, Phone, Video, MoreVertical, User, Send, Share, Calculator
} from 'lucide-react';
import QuizModal from './QuizModal';

interface ChildDeviceProps {
  installPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
}

const ChildDevice: React.FC<ChildDeviceProps> = ({ installPrompt, isIOS, isStandalone }) => {
  const [state, setState] = useState<DeviceState>(getDeviceState());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [effectiveStatus, setEffectiveStatus] = useState<DeviceStatus>(DeviceStatus.ACTIVE);
  
  // Overlays
  const [showQuiz, setShowQuiz] = useState(false);
  const [tempUnlock, setTempUnlock] = useState(false);
  
  // App State
  const [openApp, setOpenApp] = useState<string | null>(null);
  
  // WhatsApp State
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  
  // Unlock Task State
  const [taskMode, setTaskMode] = useState<'reading' | 'spelling' | 'math'>('reading');
  const [gamesLocked, setGamesLocked] = useState(true);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  
  // Reading Specific
  const [readingTasks, setReadingTasks] = useState<ReadingChallenge[]>([]);
  const [currentReadingIndex, setCurrentReadingIndex] = useState(0);
  const [readingScore, setReadingScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Spelling Specific
  const [spellingTasks, setSpellingTasks] = useState<SpellingChallenge[]>([]);
  const [currentSpellingIndex, setCurrentSpellingIndex] = useState(0);
  const [spellingScore, setSpellingScore] = useState(0);
  const [spellingInput, setSpellingInput] = useState("");
  const [spellingFeedback, setSpellingFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Math Specific
  const [mathQuestions, setMathQuestions] = useState<MathQuestion[]>([]);
  const [currentMathIndex, setCurrentMathIndex] = useState(0);
  const [mathScore, setMathScore] = useState(0);
  const [mathAnswer, setMathAnswer] = useState("");
  const [mathFeedback, setMathFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Videos App State
  const [videoQuery, setVideoQuery] = useState("");
  const [videoResults, setVideoResults] = useState<VideoSearchResult[] | null>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoBlocked, setVideoBlocked] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newState = getDeviceState();
      setState(newState);
      setCurrentTime(new Date());
      setEffectiveStatus(calculateEffectiveStatus(newState));
    }, 1000);

    const handleStorage = () => setState(getDeviceState());
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-update', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage-update', handleStorage);
    };
  }, []);

  const isLocked = !tempUnlock && effectiveStatus !== DeviceStatus.ACTIVE;

  const handleQuizUnlock = () => {
    setTempUnlock(true);
    setShowQuiz(false);
    setTimeout(() => setTempUnlock(false), 15 * 60 * 1000);
  };

  const handleAppClick = (appName: string) => {
    if (appName === 'Games') {
      if (gamesLocked) {
        setOpenApp('UnlockTask');
        loadTask('reading');
      } else {
        setOpenApp('Games');
      }
    } else {
      setOpenApp(appName);
      // Reset app specific states
      if (appName === 'WhatsApp') {
        setActiveChat(null);
      }
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
  };

  const loadTask = async (mode: 'reading' | 'spelling' | 'math') => {
    setTaskMode(mode);
    setUnlockLoading(true);
    setTranscript("");
    
    // Reset all task states
    setReadingTasks([]);
    setReadingScore(0);
    setCurrentReadingIndex(0);

    setSpellingTasks([]);
    setSpellingInput("");
    setSpellingScore(0);
    setCurrentSpellingIndex(0);
    setSpellingFeedback('idle');

    setMathQuestions([]);
    setMathScore(0);
    setCurrentMathIndex(0);
    setMathAnswer("");
    setMathFeedback('idle');
    
    const age = state.childAge || 10;

    if (mode === 'reading') {
      const challenges = await generateReadingChallenge(age);
      if (challenges && challenges.length > 0) {
        setReadingTasks(challenges);
      } else {
        // Fallback
        setReadingTasks([{
          title: "Error Loading",
          story: "Please check internet connection.",
          question: "Try reloading?",
          options: ["Yes", "No", "Maybe"],
          correctAnswerIndex: 0
        }]);
      }
    } else if (mode === 'spelling') {
      const challenges = await generateSpellingChallenge(age);
      if (challenges && challenges.length > 0) {
        setSpellingTasks(challenges);
      } else {
        setSpellingTasks([{
          word: "Error",
          hint: "Try again",
          contextSentence: "Connection error."
        }]);
      }
    } else if (mode === 'math') {
      const challenges = await generateMathChallenge(age);
      if (challenges && challenges.length > 0) {
        setMathQuestions(challenges);
      } else {
        setMathQuestions(Array(15).fill(null).map((_, i) => ({
          question: `${i + 2} + ${i + 3} = ?`,
          answer: i + 5
        })));
      }
    }
    setUnlockLoading(false);
  };

  // --- Reading Logic ---
  const handleTTS = async (text: string) => {
    const audioData = await getGeminiTTS(text);
    if (audioData) await playRawAudio(audioData);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interimTranscript += event.results[i][0].transcript;
        }
        setTranscript(interimTranscript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  const renderColoredStory = () => {
    const currentTask = readingTasks[currentReadingIndex];
    if (!currentTask) return null;
    const words = currentTask.story.split(' ');
    const spokenWords = transcript.toLowerCase().split(/\s+/);
    
    return (
      <p className="text-lg font-serif leading-loose text-justify">
        {words.map((word, i) => {
          const cleanWord = word.replace(/[.,!?'"]/g, '').toLowerCase();
          // Simple fuzzy matching
          let status = 'neutral';
          if (spokenWords.includes(cleanWord)) status = 'correct';
          
          return (
            <span 
              key={i} 
              className={`
                transition-colors duration-300 rounded px-0.5
                ${status === 'correct' ? 'text-green-600 font-bold bg-green-50' : 'text-slate-700'}
              `}
            >
              {word}{' '}
            </span>
          );
        })}
      </p>
    );
  };

  const handleReadingAnswer = (idx: number) => {
    const currentTask = readingTasks[currentReadingIndex];
    if (!currentTask) return;

    const isCorrect = idx === currentTask.correctAnswerIndex;
    if (isCorrect) {
       setReadingScore(readingScore + 1);
    } else {
       alert("Incorrect. Moving to next question.");
    }

    if (currentReadingIndex < 14) {
      setCurrentReadingIndex(currentReadingIndex + 1);
      setTranscript(""); // Reset reading transcript for next story
    } else {
      // Finished
      const finalScore = isCorrect ? readingScore + 1 : readingScore;
      if (finalScore >= 13) {
        triggerUnlock();
      } else {
        alert(`You scored ${finalScore}/15. You need 13 to unlock. Try again!`);
        loadTask('reading');
      }
    }
  };

  // --- Spelling Logic ---
  const handleSpellingCheck = () => {
    const currentTask = spellingTasks[currentSpellingIndex];
    if (!currentTask) return;
    
    const isCorrect = spellingInput.toLowerCase().trim() === currentTask.word.toLowerCase();
    
    setSpellingFeedback(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
        const nextScore = isCorrect ? spellingScore + 1 : spellingScore;
        setSpellingScore(nextScore);

        if (currentSpellingIndex < 14) {
            setCurrentSpellingIndex(currentSpellingIndex + 1);
            setSpellingInput("");
            setSpellingFeedback('idle');
        } else {
            if (nextScore >= 13) {
                triggerUnlock();
            } else {
                alert(`You scored ${nextScore}/15. You need 13 to unlock. Try again!`);
                loadTask('spelling');
            }
        }
    }, 1000);
  };

  // --- Math Logic ---
  const handleMathCheck = () => {
    if (!mathQuestions.length) return;
    
    const userAns = parseFloat(mathAnswer);
    const correctAns = mathQuestions[currentMathIndex].answer;
    const isCorrect = Math.abs(userAns - correctAns) < 0.01;

    setMathFeedback(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
      const nextScore = isCorrect ? mathScore + 1 : mathScore;
      setMathScore(nextScore);
      
      if (currentMathIndex < 14) {
        setCurrentMathIndex(currentMathIndex + 1);
        setMathAnswer("");
        setMathFeedback('idle');
      } else {
        // Finished
        if (nextScore >= 13) {
          triggerUnlock();
        } else {
          // Failed
          alert(`You scored ${nextScore}/15. You need 13 to unlock. Try again!`);
          loadTask('math'); // Reset
        }
      }
    }, 1000);
  };

  const triggerUnlock = () => {
    setUnlockSuccess(true);
    setTimeout(() => {
      setGamesLocked(false);
      setOpenApp('Games');
      setUnlockSuccess(false);
    }, 1500);
  };

  const handleVideoSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoQuery.trim()) return;
    setVideoLoading(true);
    setVideoBlocked(false);
    
    const results = await searchEducationalVideos(videoQuery);
    if (results) {
      setVideoResults(results);
    } else {
      setVideoResults(null);
      setVideoBlocked(true);
    }
    setVideoLoading(false);
  };

  const apps = [
    { name: 'Games', icon: Gamepad2, color: 'bg-orange-500' },
    { name: 'WhatsApp', icon: MessageCircle, color: 'bg-[#25D366]' },
    { name: 'Music', icon: Music, color: 'bg-pink-500' },
    { name: 'Camera', icon: Camera, color: 'bg-gray-500' },
    { name: 'Videos', icon: Play, color: 'bg-red-500' },
    { name: 'Learn', icon: BrainCircuit, color: 'bg-indigo-500' },
    { name: 'Settings', icon: Settings, color: 'bg-slate-600' },
  ];

  const goHome = () => {
    setOpenApp(null);
    setVideoQuery("");
    setVideoResults([]);
    setVideoBlocked(false);
  };

  return (
    <div className="relative h-[800px] w-[390px] bg-black rounded-[3rem] border-8 border-gray-900 overflow-hidden shadow-2xl mx-auto ring-4 ring-gray-200/20">
      
      {/* Status Bar */}
      <div className="absolute top-0 w-full h-12 px-6 flex justify-between items-center z-20 text-white font-medium text-xs pt-2">
        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex gap-1.5 items-center">
          <Signal size={14} />
          <Wifi size={14} />
          <div className="flex items-center gap-1">
            <span className="text-[10px]">{state.batteryLevel}%</span>
            <Battery size={16} fill="white" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`relative h-full w-full bg-cover bg-center transition-all duration-500 ${isLocked ? 'blur-sm scale-105' : 'blur-0 scale-100'}`}
        style={{ backgroundImage: 'url("https://picsum.photos/400/800?random=1")' }}
      >
        <div className="pt-20 px-6 grid grid-cols-4 gap-4">
          {apps.map((app, i) => (
            <button 
              key={i} 
              onClick={() => handleAppClick(app.name)}
              className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform active:scale-95"
            >
              <div className={`w-14 h-14 ${app.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                <app.icon size={28} />
              </div>
              <span className="text-[11px] text-white font-medium drop-shadow-md">{app.name}</span>
            </button>
          ))}
        </div>

        {/* --- APP VIEWS --- */}

        {/* Learn App */}
        {openApp === 'Learn' && (
          <div className="absolute inset-0 bg-slate-50 z-30 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="bg-indigo-600 pt-12 pb-4 px-4 text-white flex items-center gap-3 shadow-md">
              <button onClick={goHome} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
              <span className="font-bold text-lg">Learning Hub</span>
            </div>
            <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
               <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                    <BrainCircuit size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Daily Knowledge</h3>
                  <p className="text-slate-500">Explore fun facts and educational content tailored for you.</p>
               </div>
               <div className="space-y-4">
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Science Fact</div>
                    <p className="text-slate-800 leading-relaxed">Did you know? Octopuses have three hearts. Two pump blood to the gills, while the third pumps it to the rest of the body.</p>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* WhatsApp App */}
        {openApp === 'WhatsApp' && (
            <div className="absolute inset-0 bg-[#e5ddd5] z-30 animate-in slide-in-from-bottom duration-300 flex flex-col font-sans">
                {/* Header */}
                <div className="bg-[#008069] pt-12 pb-3 px-4 flex items-center justify-between shadow-md text-white">
                    <div className="flex items-center gap-3">
                        <button onClick={() => activeChat ? setActiveChat(null) : goHome()} className="p-1">
                            <ChevronLeft size={24} />
                        </button>
                        {activeChat ? (
                            <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                                     <User size={20} className="mt-1"/>
                                 </div>
                                 <span className="font-bold text-lg">{activeChat}</span>
                            </div>
                        ) : (
                            <span className="font-bold text-xl">WhatsApp</span>
                        )}
                    </div>
                    <div className="flex gap-5">
                        <Video size={22} />
                        <Phone size={20} />
                        <MoreVertical size={20} />
                    </div>
                </div>

                {/* List or Chat */}
                {!activeChat ? (
                    <div className="flex-1 overflow-y-auto bg-white">
                        {['Mom', 'Dad', 'Grandma'].map((contact, i) => (
                            <div key={i} onClick={() => setActiveChat(contact)} className="flex items-center gap-4 p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                     <User size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-semibold text-gray-900">{contact}</span>
                                        <span className="text-xs text-gray-400">Yesterday</span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">Call me when you are done.</p>
                                </div>
                            </div>
                        ))}
                        
                        <div className="mt-8 p-4">
                            <p className="text-center text-xs text-gray-400 mb-4">Integrations</p>
                            <a href="https://wa.me/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-bold rounded-full shadow-sm hover:opacity-90 transition-opacity">
                                <MessageCircle size={20} />
                                Open Real WhatsApp
                            </a>
                        </div>
                    </div>
                ) : (
                     <div className="flex-1 flex flex-col relative" style={{ backgroundImage: 'linear-gradient(#e5ddd5 2px, transparent 2px), linear-gradient(90deg, #e5ddd5 2px, transparent 2px), linear-gradient(#e5ddd5 1px, transparent 1px), linear-gradient(90deg, #e5ddd5 1px, transparent 1px)', backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px', backgroundPosition: '-2px -2px, -2px -2px, -1px -1px, -1px -1px' }}>
                         <div className="flex-1 p-4 overflow-y-auto space-y-2">
                             <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm self-start max-w-[80%] text-sm">
                                 <p className="text-gray-800">Hello!</p>
                                 <span className="text-[10px] text-gray-400 float-right mt-1 ml-2">10:00 AM</span>
                             </div>
                             <div className="bg-[#d9fdd3] p-2 rounded-lg rounded-tr-none shadow-sm self-end max-w-[80%] ml-auto text-sm">
                                 <p className="text-gray-800">Can I play now?</p>
                                 <span className="text-[10px] text-gray-500 float-right mt-1 ml-2">10:05 AM</span>
                             </div>
                         </div>
                         
                         {/* Input Area */}
                         <div className="p-2 bg-[#f0f2f5] flex items-center gap-2">
                             <input 
                                className="flex-1 py-2 px-4 rounded-full border-none outline-none text-sm" 
                                placeholder="Message" 
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                             />
                             <button className="p-2 bg-[#008069] rounded-full text-white shadow-sm">
                                 <Send size={18} />
                             </button>
                         </div>
                     </div>
                )}
            </div>
        )}

        {/* Unlock Gatekeeper (Reading & Spelling & Math) */}
        {openApp === 'UnlockTask' && (
           <div className="absolute inset-0 bg-[#fdfbf7] z-30 animate-in slide-in-from-bottom duration-300 flex flex-col">
              <div className="pt-12 pb-4 px-6 flex items-center justify-between border-b border-amber-100">
                 <button onClick={goHome} className="text-amber-800 font-medium text-sm">Cancel</button>
                 <div className="flex gap-2">
                   <button 
                    onClick={() => loadTask('reading')}
                    className={`p-2 rounded-lg ${taskMode === 'reading' ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}
                   >
                     <BookOpen size={20} />
                   </button>
                   <button 
                    onClick={() => loadTask('spelling')}
                    className={`p-2 rounded-lg ${taskMode === 'spelling' ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}
                   >
                     <TypeIcon size={20} />
                   </button>
                   <button 
                    onClick={() => loadTask('math')}
                    className={`p-2 rounded-lg ${taskMode === 'math' ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}
                   >
                     <Calculator size={20} />
                   </button>
                 </div>
                 <div className="w-10"></div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                 {unlockLoading ? (
                    <div className="mt-20 flex flex-col items-center gap-3 text-amber-700">
                       <Loader2 className="animate-spin" size={32} />
                       <p>Loading Challenge...</p>
                    </div>
                 ) : unlockSuccess ? (
                    <div className="mt-20 flex flex-col items-center gap-4 text-green-600 animate-in zoom-in">
                       <CheckCircle size={64} />
                       <h3 className="text-2xl font-bold">Unlocked!</h3>
                    </div>
                 ) : taskMode === 'reading' && readingTasks.length > 0 ? (
                    <div className="w-full max-w-sm">
                       <div className="flex justify-between items-center mb-4 px-2">
                          <span className="text-sm font-bold text-slate-400">Story {currentReadingIndex + 1} of 15</span>
                          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Score: {readingScore}</div>
                       </div>

                       <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-serif font-bold text-slate-900">{readingTasks[currentReadingIndex].title}</h2>
                         <div className="flex gap-2">
                            <button 
                              onClick={() => handleTTS(`${readingTasks[currentReadingIndex].title}. ${readingTasks[currentReadingIndex].story}`)}
                              className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                              title="Read for me"
                            >
                              <Volume2 size={20} />
                            </button>
                            <button 
                              onClick={toggleListening}
                              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                              title="Read along"
                            >
                              <Mic size={20} />
                            </button>
                         </div>
                       </div>

                       <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-50 mb-6 min-h-[120px]">
                          {renderColoredStory()}
                       </div>

                       <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                          <p className="font-semibold text-slate-800 mb-4">{readingTasks[currentReadingIndex].question}</p>
                          <div className="space-y-2">
                             {readingTasks[currentReadingIndex].options.map((opt, i) => (
                                <button 
                                   key={i}
                                   onClick={() => handleReadingAnswer(i)}
                                   className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-colors text-slate-600 text-sm"
                                >
                                   {opt}
                                </button>
                             ))}
                          </div>
                       </div>
                    </div>
                 ) : taskMode === 'spelling' && spellingTasks.length > 0 ? (
                    <div className="w-full max-w-sm text-center pt-8">
                       <div className="flex justify-between items-center mb-6 px-2">
                          <span className="text-sm font-bold text-slate-400">Word {currentSpellingIndex + 1} of 15</span>
                          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Score: {spellingScore}</div>
                       </div>

                       <h2 className="text-xl font-bold text-slate-800 mb-2">Spelling Bee</h2>
                       <p className="text-slate-500 mb-8 text-sm">Listen to the word and type it correctly.</p>
                       
                       <button 
                         onClick={() => handleTTS(spellingTasks[currentSpellingIndex].word)}
                         className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 hover:scale-105 transition-transform shadow-sm"
                       >
                         <Volume2 size={40} />
                       </button>

                       <div className="mb-6 space-y-2">
                         <p className="text-sm font-medium text-slate-600 italic">"{spellingTasks[currentSpellingIndex].contextSentence}"</p>
                         <p className="text-xs text-slate-400">Hint: {spellingTasks[currentSpellingIndex].hint}</p>
                       </div>

                       <div className="relative mb-4">
                         <input 
                           type="text" 
                           value={spellingInput}
                           onChange={(e) => setSpellingInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSpellingCheck()}
                           placeholder="Type the word..."
                           className={`w-full text-center text-xl font-bold p-4 border-2 rounded-2xl outline-none transition-colors
                             ${spellingFeedback === 'correct' ? 'border-green-500 bg-green-50 text-green-800' : 
                               spellingFeedback === 'wrong' ? 'border-red-500 bg-red-50 text-red-800' : 
                               'border-slate-200 focus:border-indigo-500'}
                           `}
                         />
                       </div>
                       
                       <button 
                         onClick={handleSpellingCheck}
                         className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors"
                       >
                         Check Answer
                       </button>
                    </div>
                 ) : taskMode === 'math' && mathQuestions.length > 0 ? (
                    <div className="w-full max-w-sm text-center pt-4">
                       <div className="flex justify-between items-center mb-8 px-2">
                          <span className="text-sm font-bold text-slate-400">Question {currentMathIndex + 1} of 15</span>
                          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Score: {mathScore}</div>
                       </div>

                       <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 mb-8">
                          <h2 className="text-3xl font-bold text-slate-800 mb-2">
                             {mathQuestions[currentMathIndex].question}
                          </h2>
                          <p className="text-slate-400 text-sm">Calculate the answer</p>
                       </div>

                       <div className="relative mb-6">
                         <input 
                           type="number" 
                           value={mathAnswer}
                           onChange={(e) => setMathAnswer(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleMathCheck()}
                           placeholder="?"
                           className={`w-full text-center text-4xl font-bold p-6 border-2 rounded-2xl outline-none transition-all shadow-inner
                             ${mathFeedback === 'correct' ? 'border-green-500 bg-green-50 text-green-800' : 
                               mathFeedback === 'wrong' ? 'border-red-500 bg-red-50 text-red-800' : 
                               'border-slate-200 focus:border-indigo-500 bg-slate-50 text-slate-800'}
                           `}
                         />
                       </div>
                       
                       <button 
                         onClick={handleMathCheck}
                         disabled={!mathAnswer}
                         className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg"
                       >
                         Submit Answer
                       </button>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center gap-4 mt-20">
                      <p className="text-red-400">Something went wrong.</p>
                      <button onClick={() => loadTask(taskMode)} className="flex items-center gap-2 text-indigo-600"><RefreshCw size={16}/> Retry</button>
                    </div>
                 )}
              </div>
           </div>
        )}

        {/* Games App (Unlocked) */}
        {openApp === 'Games' && (
           <div className="absolute inset-0 bg-slate-900 z-30 animate-in zoom-in duration-300 flex flex-col">
              <div className="pt-12 pb-4 px-4 flex items-center gap-3">
                 <button onClick={goHome} className="p-1 text-white/50 hover:text-white transition-colors"><ChevronLeft size={24} /></button>
                 <span className="font-bold text-white text-lg">Games Arcade</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar">
                 {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="aspect-square bg-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition-colors cursor-pointer">
                       <Gamepad2 className="text-orange-400" size={32} />
                       <span className="text-white text-sm font-medium">Game {i}</span>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* Videos App */}
        {openApp === 'Videos' && (
           <div className="absolute inset-0 bg-white z-30 animate-in slide-in-from-bottom duration-300 flex flex-col">
              <div className="bg-red-600 pt-12 pb-4 px-4 text-white flex items-center gap-3 shadow-md">
                 <button onClick={goHome} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                 <span className="font-bold text-lg">SafeTube</span>
              </div>

              <div className="p-4 border-b border-slate-100">
                 <form onSubmit={handleVideoSearch} className="relative">
                    <input 
                       type="text" 
                       value={videoQuery}
                       onChange={e => setVideoQuery(e.target.value)}
                       placeholder="Search learning topics (e.g. Space)"
                       className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                    />
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                 </form>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                 {videoLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                       <Loader2 className="animate-spin text-red-500" size={24} />
                       <p className="text-sm">Checking content safety...</p>
                    </div>
                 ) : videoBlocked ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center px-4 animate-in fade-in">
                       <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                          <ShieldCheck size={32} />
                       </div>
                       <h3 className="font-bold text-slate-800 mb-2">Oops!</h3>
                       <p className="text-slate-500 text-sm">That doesn't look like an educational topic. Try searching for "Planets", "Animals", or "Science Experiments"!</p>
                    </div>
                 ) : videoResults && videoResults.length > 0 ? (
                    <div className="space-y-6">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Results</p>
                       {videoResults.map((vid, i) => (
                          <div key={i} className="group">
                             <div className="aspect-video rounded-xl mb-3 relative flex items-center justify-center shadow-sm" style={{ backgroundColor: vid.thumbnailColor }}>
                                <PlayCircle className="text-white opacity-80 group-hover:scale-110 transition-transform" size={48} />
                                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{vid.duration}</span>
                             </div>
                             <h4 className="font-bold text-slate-900 leading-tight mb-1">{vid.title}</h4>
                             <p className="text-xs text-slate-500">{vid.channel}</p>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-center mt-20 text-slate-400">
                       <p>Search for something to learn!</p>
                    </div>
                 )}
              </div>
           </div>
        )}

        {/* Settings App */}
        {openApp === 'Settings' && (
          <div className="absolute inset-0 bg-slate-100 z-30 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="bg-slate-800 pt-12 pb-4 px-4 text-white flex items-center gap-3 shadow-md">
              <button onClick={goHome} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
              <span className="font-bold text-lg">Settings</span>
            </div>
            
            <div className="p-4 space-y-4">
               <div className="bg-white p-4 rounded-xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Device Info</h3>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                     <span className="text-slate-600">Model</span>
                     <span className="font-medium">Guardian Pad Air</span>
                  </div>
                  <div className="flex justify-between py-2">
                     <span className="text-slate-600">Version</span>
                     <span className="font-medium">1.0.5</span>
                  </div>
               </div>

               {/* Android/Chrome Install */}
               {installPrompt && !isStandalone && (
                 <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Application</h3>
                    <button 
                      onClick={handleInstallClick}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={20} />
                      Install to Home Screen
                    </button>
                    <p className="text-xs text-slate-400 mt-2 text-center">Get the full full-screen experience.</p>
                 </div>
               )}

               {/* iOS Instructions */}
               {isIOS && !isStandalone && (
                 <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Install on iOS</h3>
                    <div className="text-sm text-slate-700 space-y-2">
                      <p>1. Tap the <Share className="inline w-4 h-4" /> <strong>Share</strong> button in your browser toolbar.</p>
                      <p>2. Scroll down and select <strong>"Add to Home Screen"</strong>.</p>
                      <p>3. Tap <strong>Add</strong> in the top right corner.</p>
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

      </div>

      {/* Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-500">
          <div className="mb-8 p-6 bg-white/10 rounded-full ring-4 ring-white/20 animate-pulse">
            <Lock size={48} />
          </div>
          
          <h2 className="text-3xl font-bold mb-2 text-center">Device Locked</h2>
          
          <p className="text-gray-200 text-center mb-8 font-light">
            {effectiveStatus === DeviceStatus.LOCKED_MANUAL 
              ? (state.unlockMessage || "Parent has paused this device.")
              : `Sleep mode is active until ${state.schedule.endTime}.`
            }
          </p>

          <button 
            onClick={() => setShowQuiz(true)}
            className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold transition-all shadow-lg hover:shadow-indigo-500/30"
          >
            <BrainCircuit className="group-hover:rotate-12 transition-transform" />
            <span>Earn 15m Unlock</span>
          </button>
          
          <div className="absolute bottom-10 text-xs text-gray-400">
            Emergency calls only
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuiz && (
        <QuizModal 
          onUnlock={handleQuizUnlock} 
          onClose={() => setShowQuiz(false)} 
        />
      )}

      {/* Home Bar */}
      <div 
        onClick={goHome} 
        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-50 z-50 cursor-pointer hover:opacity-100 transition-opacity"
      ></div>
    </div>
  );
};

export default ChildDevice;
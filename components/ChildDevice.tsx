import React, { useState, useEffect, useRef } from 'react';
import { DeviceState, DeviceStatus, ReadingChallenge, SpellingChallenge, VideoSearchResult, MathQuestion, QuizQuestion } from '../types';
import { getDeviceState, calculateEffectiveStatus, recordLearningActivity, updateDeviceState } from '../services/deviceService';
import { generateReadingChallenge, searchEducationalVideos, getGeminiTTS, generateSpellingChallenge, generateMathChallenge, analyzeHomework, generateGeneralKnowledgeQuiz } from '../services/geminiService';
import { playRawAudio } from '../utils/audio';
import { 
  Lock, Battery, Wifi, Signal, Play, Gamepad2, MessageCircle, 
  Music, Camera, BrainCircuit, ChevronLeft, Search, BookOpen, 
  CheckCircle, Loader2, PlayCircle, ShieldCheck, Settings, Download,
  Volume2, Mic, RefreshCw, Type as TypeIcon, Phone, Video, MoreVertical, User, Send, Share, Calculator, GraduationCap, ArrowRight, MapPin, Smartphone
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

  // Learn App (General Knowledge) State
  const [learnQuestions, setLearnQuestions] = useState<QuizQuestion[]>([]);
  const [currentLearnIndex, setCurrentLearnIndex] = useState(0);
  const [learnScore, setLearnScore] = useState(0);
  const [learnLoading, setLearnLoading] = useState(false);
  const [learnQuizCompleted, setLearnQuizCompleted] = useState(false);
  const [showLearnExplanation, setShowLearnExplanation] = useState(false);

  // Videos App State
  const [videoQuery, setVideoQuery] = useState("");
  const [videoResults, setVideoResults] = useState<VideoSearchResult[] | null>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoBlocked, setVideoBlocked] = useState(false);

  // Security App State
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Homework App State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [homeworkImage, setHomeworkImage] = useState<string | null>(null);
  const [homeworkAnalysis, setHomeworkAnalysis] = useState<string | null>(null);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Activation State
  const [activationPin, setActivationPin] = useState("");
  const [activationError, setActivationError] = useState("");

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

  // Location Tracking
  useEffect(() => {
    if (state.isActivated && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateDeviceState({
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              lastUpdated: Date.now()
            }
          });
        },
        (error) => console.log('Location error', error),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [state.isActivated]);

  // Handle Camera Stream for Homework App
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (openApp === 'Homework' && !homeworkImage) {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraError(false);
        } catch (err) {
          console.error("Camera access failed:", err);
          setCameraError(true);
        }
      };
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [openApp, homeworkImage]);

  const handleActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.parentPin) {
      setActivationError("Parent has not set a PIN yet. Please configure the Parent Dashboard first.");
      return;
    }
    
    if (activationPin === state.parentPin) {
      updateDeviceState({ isActivated: true });
      setActivationError("");
    } else {
      setActivationError("Incorrect PIN. Please try again.");
    }
  };

  const isLocked = !tempUnlock && effectiveStatus !== DeviceStatus.ACTIVE;

  const handleQuizUnlock = () => {
    recordLearningActivity('QUIZ', true, 'Unlocked device via quiz');
    setTempUnlock(true);
    setShowQuiz(false);
    // Unlocked for configured duration (default 90 mins if not set)
    const duration = state.quizUnlockDuration || 90;
    setTimeout(() => setTempUnlock(false), duration * 60 * 1000);
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
      if (appName === 'Homework') {
        setHomeworkImage(null);
        setHomeworkAnalysis(null);
        setHomeworkLoading(false);
      }
      if (appName === 'Learn') {
         // Optionally reset learn state here, or keep it persistent per session
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
    const count = state.quizQuestionCount || 40;

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
        setMathQuestions(Array(count).fill(null).map((_, i) => ({
          question: `${i + 2} + ${i + 3} = ?`,
          answer: i + 5
        })));
      }
    }
    setUnlockLoading(false);
  };

  // --- Learn App Logic ---
  const startLearnQuiz = async () => {
     setLearnLoading(true);
     setLearnQuestions([]);
     setLearnScore(0);
     setCurrentLearnIndex(0);
     setLearnQuizCompleted(false);
     setShowLearnExplanation(false);
     
     const count = state.quizQuestionCount || 40;

     const questions = await generateGeneralKnowledgeQuiz(state.childAge || 10, count);
     if (questions && questions.length > 0) {
        setLearnQuestions(questions);
     } else {
        // Fallback
        setLearnQuestions([{
           question: "Which planet is known as the Red Planet?",
           options: ["Earth", "Mars", "Jupiter", "Venus"],
           correctAnswerIndex: 1,
           explanation: "Mars appears red because of iron oxide (rust) on its surface."
        }]);
     }
     setLearnLoading(false);
  };

  const handleLearnAnswer = (index: number) => {
     const isCorrect = index === learnQuestions[currentLearnIndex].correctAnswerIndex;
     if (isCorrect) setLearnScore(prev => prev + 1);
     setShowLearnExplanation(true);
     // Record basic activity
     recordLearningActivity('QUIZ', isCorrect, isCorrect ? "Correct answer in Learn Quiz" : "Incorrect answer in Learn Quiz");
  };

  const nextLearnQuestion = () => {
     if (currentLearnIndex < learnQuestions.length - 1) {
        setCurrentLearnIndex(prev => prev + 1);
        setShowLearnExplanation(false);
     } else {
        setLearnQuizCompleted(true);
     }
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
    
    // Log analytics
    recordLearningActivity('READING', isCorrect, `Story: ${currentTask.title}`);

    if (isCorrect) {
       setReadingScore(readingScore + 1);
    } else {
       alert("Incorrect. Moving to next question.");
    }

    if (currentReadingIndex < readingTasks.length - 1) {
      setCurrentReadingIndex(currentReadingIndex + 1);
      setTranscript(""); // Reset reading transcript for next story
    } else {
      // Finished
      const finalScore = isCorrect ? readingScore + 1 : readingScore;
      const passingScore = Math.ceil(readingTasks.length * 0.8);
      if (finalScore >= passingScore) {
        triggerUnlock();
      } else {
        alert(`You scored ${finalScore}/${readingTasks.length}. You need ${passingScore} to unlock. Try again!`);
        loadTask('reading');
      }
    }
  };

  // --- Spelling Logic ---
  const handleSpellingCheck = () => {
    const currentTask = spellingTasks[currentSpellingIndex];
    if (!currentTask) return;
    
    const isCorrect = spellingInput.toLowerCase().trim() === currentTask.word.toLowerCase();
    
    // Log analytics
    recordLearningActivity('SPELLING', isCorrect, `Word: ${currentTask.word}`);

    setSpellingFeedback(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
        const nextScore = isCorrect ? spellingScore + 1 : spellingScore;
        setSpellingScore(nextScore);

        if (currentSpellingIndex < spellingTasks.length - 1) {
            setCurrentSpellingIndex(currentSpellingIndex + 1);
            setSpellingInput("");
            setSpellingFeedback('idle');
        } else {
            const passingScore = Math.ceil(spellingTasks.length * 0.8);
            if (nextScore >= passingScore) {
                triggerUnlock();
            } else {
                alert(`You scored ${nextScore}/${spellingTasks.length}. You need ${passingScore} to unlock. Try again!`);
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

    // Log analytics
    recordLearningActivity('MATH', isCorrect, `Question: ${mathQuestions[currentMathIndex].question}`);

    setMathFeedback(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
      const nextScore = isCorrect ? mathScore + 1 : mathScore;
      setMathScore(nextScore);
      
      if (currentMathIndex < mathQuestions.length - 1) {
        setCurrentMathIndex(currentMathIndex + 1);
        setMathAnswer("");
        setMathFeedback('idle');
      } else {
        const passingScore = Math.ceil(mathQuestions.length * 0.8);
        if (nextScore >= passingScore) {
          triggerUnlock();
        } else {
          // Failed
          alert(`You scored ${nextScore}/${mathQuestions.length}. You need ${passingScore} to unlock. Try again!`);
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

  const handleScan = () => {
    setScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          setLastScanTime(new Date());
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  // --- Homework Capture Logic ---
  const handleCapture = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        context.drawImage(videoRef.current, 0, 0, width, height);
        
        // Get base64 string without the prefix
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        
        setHomeworkImage(dataUrl); // To show preview
        setHomeworkLoading(true);
        
        // Analyze
        const explanation = await analyzeHomework(base64, state.childAge || 10);
        
        // Log Activity
        recordLearningActivity('HOMEWORK', true, 'Scanned homework problem');

        setHomeworkAnalysis(explanation);
        setHomeworkLoading(false);
      }
    }
  };

  const handleRetake = () => {
    setHomeworkImage(null);
    setHomeworkAnalysis(null);
  };

  const apps = [
    { name: 'Games', icon: Gamepad2, color: 'bg-orange-500' },
    { name: 'WhatsApp', icon: MessageCircle, color: 'bg-[#25D366]' },
    { name: 'Music', icon: Music, color: 'bg-pink-500' },
    { name: 'Camera', icon: Camera, color: 'bg-gray-500' },
    { name: 'Videos', icon: Play, color: 'bg-red-500' },
    { name: 'Learn', icon: BrainCircuit, color: 'bg-indigo-500' },
    { name: 'Homework', icon: GraduationCap, color: 'bg-blue-500' },
    { name: 'Security', icon: ShieldCheck, color: 'bg-green-600' },
    { name: 'Settings', icon: Settings, color: 'bg-slate-600' },
  ];

  const goHome = () => {
    setOpenApp(null);
    setVideoQuery("");
    setVideoResults([]);
    setVideoBlocked(false);
    setHomeworkImage(null);
    setHomeworkAnalysis(null);
  };

  // --- Activation Screen ---
  if (!state.isActivated) {
    return (
      <div className="relative h-[800px] w-[390px] bg-slate-900 rounded-[3rem] border-8 border-gray-900 overflow-hidden shadow-2xl mx-auto ring-4 ring-gray-200/20 flex flex-col items-center justify-center p-8">
         <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
            <Smartphone size={40} className="text-white" />
         </div>
         <h1 className="text-2xl font-bold text-white mb-2 text-center">Device Setup</h1>
         <p className="text-slate-400 text-center mb-8 text-sm">Enter the Parent PIN to activate monitoring on this device.</p>
         
         <form onSubmit={handleActivation} className="w-full space-y-4">
            <input 
              type="password" 
              placeholder="Enter PIN"
              value={activationPin}
              onChange={(e) => setActivationPin(e.target.value)}
              className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center text-lg font-bold text-white tracking-widest"
              autoFocus
            />
            {activationError && (
              <p className="text-red-400 text-xs text-center font-medium">{activationError}</p>
            )}
            <button 
              type="submit" 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 mt-4"
            >
              Activate Device
            </button>
         </form>
         
         <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-500">Need a PIN?</p>
            <p className="text-xs text-slate-400">Configure it on the Parent Dashboard first.</p>
         </div>
      </div>
    );
  }

  // Calculate dynamic hour/min for display
  const unlockHours = Math.floor((state.quizUnlockDuration || 90) / 60);
  const unlockMins = (state.quizUnlockDuration || 90) % 60;
  const unlockTimeText = unlockHours > 0 ? `${unlockHours}h ${unlockMins}m` : `${unlockMins}m`;

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
          {/* Location Indicator */}
          <MapPin size={12} className="text-white opacity-80" />
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
              <span className="text-[11px] text-white font-medium drop-shadow-md text-center leading-tight">{app.name}</span>
            </button>
          ))}
        </div>

        {/* --- APP VIEWS (Truncated for brevity, same as previous) --- */}
        {/* ... (All existing app views remain unchanged) ... */}
        {/* Learn App */}
        {openApp === 'Learn' && (
          <div className="absolute inset-0 bg-slate-50 z-30 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="bg-indigo-600 pt-12 pb-4 px-4 text-white flex items-center gap-3 shadow-md">
              <button onClick={goHome} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
              <span className="font-bold text-lg">Learning Hub</span>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
               {/* State 1: Intro / Dashboard */}
               {!learnLoading && learnQuestions.length === 0 && !learnQuizCompleted && (
                 <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 text-indigo-600 shadow-sm">
                      <BrainCircuit size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Daily Quiz Challenge</h3>
                    <p className="text-slate-500 mb-8">Test your knowledge with {state.quizQuestionCount || 40} fun questions about science, history, and the world!</p>
                    
                    <button 
                      onClick={startLearnQuiz}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      Start {state.quizQuestionCount || 40}-Question Quiz
                    </button>

                    <div className="mt-8 w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-left">
                       <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Did You Know?</div>
                       <p className="text-slate-800 leading-relaxed text-sm">Octopuses have three hearts. Two pump blood to the gills, while the third pumps it to the rest of the body.</p>
                    </div>
                 </div>
               )}

               {/* State 2: Loading */}
               {learnLoading && (
                 <div className="flex-1 flex flex-col items-center justify-center p-6 text-indigo-600">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-medium">Generating questions...</p>
                 </div>
               )}

               {/* State 3: Quiz Active */}
               {!learnLoading && learnQuestions.length > 0 && !learnQuizCompleted && (
                 <div className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                       <span className="text-sm font-bold text-slate-400">Question {currentLearnIndex + 1} of {learnQuestions.length}</span>
                       <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">Score: {learnScore}</div>
                    </div>

                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-slate-900 mb-6 leading-relaxed">
                        {learnQuestions[currentLearnIndex].question}
                      </h2>

                      <div className="space-y-3">
                        {learnQuestions[currentLearnIndex].options.map((opt, idx) => (
                           <button 
                             key={idx}
                             onClick={() => handleLearnAnswer(idx)}
                             disabled={showLearnExplanation}
                             className={`w-full p-4 text-left rounded-xl border-2 transition-all font-medium
                               ${showLearnExplanation 
                                  ? idx === learnQuestions[currentLearnIndex].correctAnswerIndex 
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-slate-100 text-slate-400'
                                  : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-700'
                               }
                             `}
                           >
                             {opt}
                           </button>
                        ))}
                      </div>

                      {showLearnExplanation && (
                        <div className="mt-6 p-4 bg-slate-100 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                           <p className="font-bold text-slate-700 mb-1">Explanation</p>
                           <p className="text-slate-600 text-sm leading-relaxed">{learnQuestions[currentLearnIndex].explanation}</p>
                           <button 
                             onClick={nextLearnQuestion}
                             className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-lg font-bold"
                           >
                             {currentLearnIndex < learnQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                           </button>
                        </div>
                      )}
                    </div>
                 </div>
               )}

               {/* State 4: Completed */}
               {learnQuizCompleted && (
                 <div className="p-6 flex flex-col items-center justify-center h-full text-center animate-in zoom-in">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                      <CheckCircle size={48} />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-2">Quiz Complete!</h3>
                    <p className="text-slate-500 mb-8">You scored {learnScore} out of {learnQuestions.length}</p>
                    
                    <button 
                      onClick={() => {
                        setLearnQuizCompleted(false);
                        setLearnQuestions([]);
                        setLearnScore(0);
                        setCurrentLearnIndex(0);
                      }}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg"
                    >
                      Back to Menu
                    </button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Homework App */}
        {openApp === 'Homework' && (
          <div className="absolute inset-0 bg-slate-50 z-30 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="bg-blue-600 pt-12 pb-4 px-4 text-white flex items-center gap-3 shadow-md">
              <button onClick={goHome} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
              <span className="font-bold text-lg">Homework Helper</span>
            </div>
            
            <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
               {/* Hidden Canvas for capture */}
               <canvas ref={canvasRef} className="hidden"></canvas>

               {!homeworkImage ? (
                 <>
                   {/* Camera View */}
                   {cameraError ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                        <Camera size={48} className="text-slate-500 mb-4"/>
                        <p className="text-lg font-bold">Camera unavailable</p>
                        <p className="text-sm text-slate-400">Please enable camera access or try on a mobile device.</p>
                     </div>
                   ) : (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover"
                      ></video>
                   )}
                   
                   {/* Capture Controls */}
                   <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center">
                      <button 
                        onClick={handleCapture}
                        disabled={cameraError}
                        className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                      >
                         <div className="w-16 h-16 bg-blue-600 rounded-full"></div>
                      </button>
                   </div>
                   
                   <div className="absolute top-4 left-0 right-0 flex justify-center">
                      <div className="bg-black/50 text-white px-4 py-2 rounded-full text-xs font-medium backdrop-blur-md">
                        Center homework in frame
                      </div>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden">
                    {/* Image Preview */}
                    <div className="h-1/3 w-full bg-black relative shrink-0">
                       <img src={homeworkImage} alt="Homework" className="w-full h-full object-contain" />
                       <button 
                         onClick={handleRetake}
                         className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                       >
                         <RefreshCw size={20} />
                       </button>
                    </div>

                    {/* Analysis Result */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white rounded-t-3xl -mt-6 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
                       {homeworkLoading ? (
                          <div className="flex flex-col items-center justify-center h-full gap-4 text-blue-600">
                             <Loader2 className="animate-spin" size={40} />
                             <p className="font-medium animate-pulse">Analyzing problem...</p>
                             <p className="text-xs text-slate-400">Asking the AI Tutor</p>
                          </div>
                       ) : (
                          <div className="animate-in slide-in-from-bottom duration-500">
                             <div className="flex items-center gap-2 mb-4">
                               <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                                  <GraduationCap size={24} />
                               </div>
                               <h3 className="font-bold text-xl text-slate-800">Tutor's Help</h3>
                             </div>
                             
                             <div className="prose prose-sm prose-slate leading-relaxed text-slate-600">
                               {homeworkAnalysis?.split('\n').map((line, i) => (
                                 <p key={i} className={`mb-2 ${line.startsWith('**') || line.match(/^\d\./) ? 'font-bold text-slate-800 mt-4' : ''}`}>
                                   {line.replace(/\*\*/g, '')}
                                 </p>
                               ))}
                             </div>

                             <div className="mt-8 pt-4 border-t border-slate-100">
                                <button 
                                  onClick={() => handleTTS(homeworkAnalysis || "")}
                                  className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:underline"
                                >
                                   <Volume2 size={16} /> Listen to explanation
                                </button>
                             </div>
                             
                             <button 
                               onClick={handleRetake}
                               className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200"
                             >
                               Scan Another
                             </button>
                          </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Security App */}
        {openApp === 'Security' && (
          <div className="absolute inset-0 bg-slate-50 z-30 animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="bg-green-600 pt-12 pb-4 px-4 text-white flex items-center gap-3 shadow-md">
              <button onClick={goHome} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
              <span className="font-bold text-lg">Device Security</span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col items-center">
               <div className="mt-10 mb-8 relative">
                 <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-colors duration-500 ${scanning ? 'bg-amber-100 text-amber-500' : 'bg-green-100 text-green-600'}`}>
                    <ShieldCheck size={80} className={`transition-transform duration-1000 ${scanning ? 'scale-110' : 'scale-100'}`} />
                 </div>
                 {scanning && (
                   <div className="absolute inset-0 rounded-full border-4 border-green-400 border-t-transparent animate-spin"></div>
                 )}
               </div>

               <h2 className="text-2xl font-bold text-slate-800 mb-2">
                 {scanning ? "Scanning..." : "Device is Safe"}
               </h2>
               <p className="text-slate-500 text-center mb-8 text-sm">
                 {scanning ? "Checking for malware and threats..." : 
                  lastScanTime ? `Last scan: ${lastScanTime.toLocaleTimeString()}` : "No threats detected."}
               </p>

               {scanning && (
                  <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-8">
                    <div className="bg-green-600 h-2.5 rounded-full transition-all duration-75" style={{ width: `${scanProgress}%` }}></div>
                  </div>
               )}

               <button 
                 onClick={handleScan}
                 disabled={scanning}
                 className="w-full max-w-xs py-4 bg-green-600 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
               >
                 {scanning ? "Scanning..." : "Scan Now"}
               </button>

               <div className="mt-8 w-full max-w-xs space-y-3">
                 <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                   <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle size={16}/></div>
                   <div className="text-sm font-medium text-slate-700">App Safety Check</div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                   <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle size={16}/></div>
                   <div className="text-sm font-medium text-slate-700">Web Filter Active</div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                   <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle size={16}/></div>
                   <div className="text-sm font-medium text-slate-700">Malware Protection</div>
                 </div>
               </div>
            </div>
          </div>
        )}
        
        {/* WhatsApp & other apps... (omitted to fit, structure is identical) */}
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
        
        {/* Unlock Task, Games, Videos, Settings - Keeping them as they were in previous file content... */}
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
                          <span className="text-sm font-bold text-slate-400">Story {currentReadingIndex + 1} of {readingTasks.length}</span>
                          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Score: {readingScore}</div>
                       </div>
                        <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">{readingTasks[currentReadingIndex].title}</h2>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-50 mb-4 min-h-[120px]">
                           {renderColoredStory()}
                        </div>
                       <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                          <p className="font-semibold text-slate-800 mb-4">{readingTasks[currentReadingIndex].question}</p>
                          <div className="space-y-2">
                             {readingTasks[currentReadingIndex].options.map((opt, i) => (
                                <button key={i} onClick={() => handleReadingAnswer(i)} className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-amber-50 text-slate-600 text-sm">{opt}</button>
                             ))}
                          </div>
                       </div>
                    </div>
                 ) : taskMode === 'math' && mathQuestions.length > 0 ? (
                    <div className="w-full max-w-sm text-center pt-4">
                       <div className="flex justify-between items-center mb-8 px-2">
                          <span className="text-sm font-bold text-slate-400">Question {currentMathIndex + 1} of {mathQuestions.length}</span>
                          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Score: {mathScore}</div>
                       </div>
                       <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 mb-8">
                          <h2 className="text-3xl font-bold text-slate-800 mb-2">{mathQuestions[currentMathIndex].question}</h2>
                       </div>
                       <input type="number" value={mathAnswer} onChange={(e) => setMathAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMathCheck()} placeholder="?" className="w-full text-center text-4xl font-bold p-6 border-2 rounded-2xl outline-none mb-6"/>
                       <button onClick={handleMathCheck} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">Submit Answer</button>
                    </div>
                 ) : (
                    /* Spelling Fallback UI */
                    <div className="w-full max-w-sm text-center pt-8">
                         <div className="flex justify-between items-center mb-6 px-2">
                            <span className="text-sm font-bold text-slate-400">Word {currentSpellingIndex + 1} of {spellingTasks.length}</span>
                            <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Score: {spellingScore}</div>
                         </div>
                         <h2 className="text-xl font-bold text-slate-800 mb-2">Spelling Bee</h2>
                         <button onClick={() => handleTTS(spellingTasks[currentSpellingIndex]?.word || "")} className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600"><Volume2 size={40} /></button>
                         <input type="text" value={spellingInput} onChange={(e) => setSpellingInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSpellingCheck()} placeholder="Type the word..." className="w-full text-center text-xl font-bold p-4 border-2 rounded-2xl outline-none mb-4"/>
                         <button onClick={handleSpellingCheck} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Check Answer</button>
                    </div>
                 )}
              </div>
           </div>
        )}

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
               {/* Install Instructions */}
               {installPrompt && !isStandalone && (
                 <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Application</h3>
                    <button onClick={handleInstallClick} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"><Download size={20} /> Install to Home Screen</button>
                 </div>
               )}
            </div>
          </div>
        )}

      </div>
      
      {/* ... Lock Overlay and Quiz Modal logic ... */}
      {isLocked && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-500">
          <div className="mb-8 p-6 bg-white/10 rounded-full ring-4 ring-white/20 animate-pulse">
            <Lock size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-center">Device Locked</h2>
          <p className="text-gray-200 text-center mb-8 font-light">
            {effectiveStatus === DeviceStatus.LOCKED_MANUAL ? (state.unlockMessage || "Parent has paused this device.") : `Sleep mode is active until ${state.schedule.endTime}.`}
          </p>
          <button onClick={() => setShowQuiz(true)} className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold transition-all shadow-lg hover:shadow-indigo-500/30">
            <BrainCircuit className="group-hover:rotate-12 transition-transform" />
            <span>Earn {unlockTimeText} Unlock</span>
          </button>
        </div>
      )}
      {showQuiz && <QuizModal onUnlock={handleQuizUnlock} onClose={() => setShowQuiz(false)} childAge={state.childAge || 10} questionCount={state.quizQuestionCount || 40} />}
      <div onClick={goHome} className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-50 z-50 cursor-pointer hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

export default ChildDevice;
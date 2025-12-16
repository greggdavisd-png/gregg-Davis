import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { generateGeneralKnowledgeQuiz, generateMathQuiz } from '../services/geminiService';
import { BrainCircuit, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

interface QuizModalProps {
  onUnlock: () => void;
  onClose: () => void;
  childAge?: number;
  questionCount?: number;
}

const QuizModal: React.FC<QuizModalProps> = ({ onUnlock, onClose, childAge = 10, questionCount = 40 }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    
    // Calculate split (approx 50/50)
    const gkCount = Math.ceil(questionCount / 2);
    const mathCount = Math.floor(questionCount / 2);

    // Fetch questions concurrently
    const [gkQuestions, mathQuestions] = await Promise.all([
      generateGeneralKnowledgeQuiz(childAge, gkCount),
      generateMathQuiz(childAge, mathCount)
    ]);
    
    let combinedQuestions: QuizQuestion[] = [];
    
    if (gkQuestions && gkQuestions.length > 0) {
      combinedQuestions = [...combinedQuestions, ...gkQuestions];
    } else {
      // Fallback GK
      const fallbackGK = Array(gkCount).fill(null).map((_, i) => ({
        question: `GK Q${i+1}: What is the capital of France?`,
        options: ["Paris", "London", "Berlin", "Madrid"],
        correctAnswerIndex: 0,
        explanation: "Paris is the capital of France."
      }));
      combinedQuestions = [...combinedQuestions, ...fallbackGK];
    }

    if (mathQuestions && mathQuestions.length > 0) {
      combinedQuestions = [...combinedQuestions, ...mathQuestions];
    } else {
      // Fallback Math
      const fallbackMath = Array(mathCount).fill(null).map((_, i) => ({
        question: `Math Q${i+1}: What is ${i+2} + ${i+3}?`,
        options: [`${i+5}`, `${i+4}`, `${i+6}`, `${i+7}`],
        correctAnswerIndex: 0,
        explanation: `${i+2} + ${i+3} equals ${i+5}.`
      }));
      combinedQuestions = [...combinedQuestions, ...fallbackMath];
    }
    
    // Shuffle the combined questions so Math and GK are mixed
    const shuffled = combinedQuestions.sort(() => Math.random() - 0.5);
    
    // Ensure we stick to the requested count
    setQuestions(shuffled.slice(0, questionCount));
    setLoading(false);
  };

  const handleOptionClick = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
    
    const correct = index === questions[currentIndex].correctAnswerIndex;
    if (correct) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
      // Check if passed (e.g., 80% passing grade)
      const passingScore = Math.ceil(questions.length * 0.8);
      if (score >= passingScore) {
        setTimeout(() => {
          onUnlock();
        }, 2000);
      }
    }
  };

  const currentQ = questions[currentIndex];
  const passingScore = Math.ceil(questions.length * 0.8);
  const isPassed = score >= passingScore;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <BrainCircuit size={24} />
            <span>Smart Unlock Challenge</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">Close</button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-gray-500">Generating {questionCount} questions...</p>
          </div>
        ) : quizCompleted ? (
           <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in">
              {isPassed ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Challenge Complete!</h3>
                  <p className="text-gray-600 mb-4">You scored {score} out of {questions.length}.</p>
                  <p className="text-green-600 font-bold">Device Unlocking...</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                    <XCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Try Again</h3>
                  <p className="text-gray-600 mb-6">You scored {score}/{questions.length}. You need {passingScore} to unlock.</p>
                  <button 
                    onClick={() => {
                      setQuizCompleted(false);
                      setCurrentIndex(0);
                      setScore(0);
                      setSelectedOption(null);
                      setShowExplanation(false);
                      loadQuiz(); // Reload new questions
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold"
                  >
                    Restart Quiz
                  </button>
                </>
              )}
           </div>
        ) : currentQ ? (
          <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
               <span>Question {currentIndex + 1} of {questions.length}</span>
               <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Score: {score}</span>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-6 leading-relaxed">
              {currentQ.question}
            </h3>
            
            <div className="space-y-3 mb-6">
              {currentQ.options.map((option, idx) => {
                let btnClass = "w-full p-4 rounded-xl text-left border-2 transition-all duration-200 font-medium ";
                
                if (!showExplanation) {
                  btnClass += "border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-gray-700";
                } else if (idx === currentQ.correctAnswerIndex) {
                  btnClass += "border-green-500 bg-green-50 text-green-700";
                } else if (idx === selectedOption) {
                  btnClass += "border-red-500 bg-red-50 text-red-700";
                } else {
                  btnClass += "border-gray-100 text-gray-400 opacity-50";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(idx)}
                    disabled={showExplanation}
                    className={btnClass}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showExplanation && idx === currentQ.correctAnswerIndex && (
                        <CheckCircle size={20} className="text-green-600" />
                      )}
                      {showExplanation && idx === selectedOption && idx !== currentQ.correctAnswerIndex && (
                        <XCircle size={20} className="text-red-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <div className="mt-auto animate-in slide-in-from-bottom-4 fade-in">
                <div className={`p-4 rounded-lg mb-4 ${selectedOption === currentQ.correctAnswerIndex ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                   <p className="text-sm">{currentQ.explanation}</p>
                </div>
                <button 
                  onClick={nextQuestion}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'} <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-red-500 text-center">Error loading quiz.</p>
        )}
      </div>
    </div>
  );
};

export default QuizModal;
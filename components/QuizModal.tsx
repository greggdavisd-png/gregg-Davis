import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { generateUnlockQuiz } from '../services/geminiService';
import { BrainCircuit, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface QuizModalProps {
  onUnlock: () => void;
  onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ onUnlock, onClose }) => {
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    const data = await generateUnlockQuiz("random science or history fact");
    
    if (data) {
      setQuiz(data);
    } else {
      // Fallback if API fails
      setQuiz({
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswerIndex: 2,
        explanation: "Paris is the capital and most populous city of France."
      });
    }
    setLoading(false);
  };

  const handleOptionClick = (index: number) => {
    if (isCorrect !== null || !quiz) return;
    setSelectedOption(index);
    
    const correct = index === quiz.correctAnswerIndex;
    setIsCorrect(correct);

    if (correct) {
      setTimeout(() => {
        onUnlock();
      }, 2000);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <BrainCircuit size={24} />
            <span>Smart Unlock</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">Close</button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-gray-500">Generating challenge...</p>
          </div>
        ) : quiz ? (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6 leading-relaxed">
              {quiz.question}
            </h3>
            
            <div className="space-y-3">
              {quiz.options.map((option, idx) => {
                let btnClass = "w-full p-4 rounded-xl text-left border-2 transition-all duration-200 font-medium ";
                
                if (selectedOption === null) {
                  btnClass += "border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-gray-700";
                } else if (idx === quiz.correctAnswerIndex) {
                  btnClass += "border-green-500 bg-green-50 text-green-700";
                } else if (idx === selectedOption) {
                  btnClass += "border-red-500 bg-red-50 text-red-700";
                } else {
                  btnClass += "border-gray-100 text-gray-400";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(idx)}
                    disabled={selectedOption !== null}
                    className={btnClass}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {selectedOption !== null && idx === quiz.correctAnswerIndex && (
                        <CheckCircle size={20} className="text-green-600" />
                      )}
                      {selectedOption === idx && idx !== quiz.correctAnswerIndex && (
                        <XCircle size={20} className="text-red-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {isCorrect !== null && (
              <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p className="font-semibold mb-1">
                  {isCorrect ? "Correct! Unlocking..." : "Incorrect. Try again later."}
                </p>
                <p className="text-sm opacity-90">{quiz.explanation}</p>
                {!isCorrect && (
                   <button onClick={onClose} className="mt-2 text-sm underline font-semibold">Back to Lock Screen</button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-red-500">Error loading quiz.</p>
        )}
      </div>
    </div>
  );
};

export default QuizModal;
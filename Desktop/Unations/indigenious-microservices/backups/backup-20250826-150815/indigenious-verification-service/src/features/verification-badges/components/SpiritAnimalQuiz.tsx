'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritAnimalQuizService } from '../services/SpiritAnimalQuizService';
import { BadgeRenderer } from './BadgeRenderer';
import { AnimalSpirit } from '../types';
import confetti from 'canvas-confetti';

interface SpiritAnimalQuizProps {
  onComplete?: (result: any) => void;
}

export const SpiritAnimalQuiz: React.FC<SpiritAnimalQuizProps> = ({ onComplete }) => {
  const quizService = new SpiritAnimalQuizService();
  const questions = quizService.getQuestions();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnswer = (answerId: string) => {
    const newAnswers = {
      ...answers,
      [questions[currentQuestion].id]: answerId
    };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      // Calculate results
      calculateResults(newAnswers);
    }
  };

  const calculateResults = async (finalAnswers: Record<string, string>) => {
    setIsLoading(true);
    const quizResult = quizService.calculateResults(finalAnswers);
    setResult(quizResult);
    
    // Trigger celebration
    setTimeout(() => {
      triggerCelebration();
      setShowResult(true);
      setIsLoading(false);
    }, 1000);
  };

  const triggerCelebration = () => {
    const count = 300;
    const defaults = {
      origin: { y: 0.7 },
      spread: 120,
      ticks: 100,
      gravity: 0.8,
      decay: 0.9,
      startVelocity: 30
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleEmailSubmit = async () => {
    if (!email || !result) return;
    
    setIsLoading(true);
    
    // Save quiz results
    await quizService.saveQuizResults(result, email);
    
    // Trigger completion
    if (onComplete) {
      onComplete({
        ...result,
        email,
        converted: true
      });
    }
    
    setIsLoading(false);
  };

  const shareResult = () => {
    if (!result) return;
    
    const shareData = quizService.generateShareableResult(result);
    const text = `${shareData.text}\n\n${shareData.hashtags.map(h => `#${h}`).join(' ')}\n\nTake the quiz: indigenious.ca/quiz`;
    
    // Share to Twitter
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              {/* Progress bar */}
              <div className="mb-8">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-white/60 text-sm mt-2">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </div>

              {/* Question card */}
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  {questions[currentQuestion].question}
                </h2>

                <div className="space-y-3">
                  {questions[currentQuestion].answers.map((answer, index) => (
                    <motion.button
                      key={answer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleAnswer(answer.id)}
                      className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-white">{answer.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Loading state */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
                >
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mx-auto mb-4" />
                    <p className="text-white text-xl">Discovering your spirit animal...</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto text-center"
            >
              {/* Result header */}
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold text-white mb-8"
              >
                You are a {result.primarySpirit.toUpperCase()} Spirit!
              </motion.h1>

              {/* Badge display */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-8 flex justify-center"
              >
                <BadgeRenderer
                  badge={{
                    animal: result.primarySpirit,
                    stage: 1,
                    metrics: {
                      procurementPercentage: 0,
                      indigenousEmployment: 0,
                      communityInvestment: 0,
                      sustainabilityScore: 0,
                      yearsActive: 0,
                      totalImpactValue: 0
                    },
                    animations: {
                      idle: 'pulse',
                      hover: 'bounce',
                      click: 'spin',
                      evolution: 'glow'
                    },
                    colors: getAnimalColors(result.primarySpirit)
                  }}
                  size="large"
                  interactive={true}
                  showMetrics={false}
                />
              </motion.div>

              {/* Narrative */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20"
              >
                <p className="text-xl text-white mb-4">{result.narrative}</p>
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-300 mb-2">
                      Your Business Alignment
                    </h3>
                    <p className="text-white/80">{result.businessAlignment}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-300 mb-2">
                      Your Growth Path
                    </h3>
                    <p className="text-white/80">{result.growthPath}</p>
                  </div>
                </div>
              </motion.div>

              {/* Key traits */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mb-8"
              >
                <h3 className="text-xl font-semibold text-white mb-4">Your Key Traits</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {result.traits.slice(0, 6).map((trait: string, index: number) => (
                    <span
                      key={trait}
                      className="px-4 py-2 bg-white/10 rounded-full text-white border border-white/20"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* CTA section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8"
              >
                <h2 className="text-3xl font-bold text-white mb-4">
                  Ready to Show Your Spirit?
                </h2>
                <p className="text-white/90 mb-6">
                  Join thousands of businesses displaying their Indigenous verification badges.
                  Get verified and start your economic reconciliation journey today.
                </p>
                
                {!email ? (
                  <div className="max-w-md mx-auto">
                    <input
                      type="email"
                      placeholder="Enter your email to get started"
                      className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/60 border border-white/30 focus:border-white focus:outline-none mb-4"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <button
                      onClick={handleEmailSubmit}
                      disabled={!email || isLoading}
                      className="w-full px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
                    >
                      Get Your Verification Badge
                    </button>
                  </div>
                ) : (
                  <div className="text-white">
                    <p className="text-xl mb-4">✓ Check your email for next steps!</p>
                    <button
                      onClick={shareResult}
                      className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-lg font-semibold hover:bg-white/30 transition-colors"
                    >
                      Share Your Spirit Animal
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function getAnimalColors(spirit: AnimalSpirit) {
  const colors: Record<AnimalSpirit, any> = {
    [AnimalSpirit.BEAVER]: { primary: '#8B4513', secondary: '#D2691E', accent: '#FFD700', glow: 'rgba(210, 105, 30, 0.5)' },
    [AnimalSpirit.EAGLE]: { primary: '#FFD700', secondary: '#FFA500', accent: '#FFFF00', glow: 'rgba(255, 215, 0, 0.5)' },
    [AnimalSpirit.FOX]: { primary: '#FF6347', secondary: '#FF4500', accent: '#FFA07A', glow: 'rgba(255, 99, 71, 0.5)' },
    [AnimalSpirit.WOLF]: { primary: '#708090', secondary: '#696969', accent: '#C0C0C0', glow: 'rgba(112, 128, 144, 0.5)' },
    [AnimalSpirit.BEAR]: { primary: '#654321', secondary: '#8B4513', accent: '#D2691E', glow: 'rgba(101, 67, 33, 0.5)' },
    [AnimalSpirit.TURTLE]: { primary: '#228B22', secondary: '#32CD32', accent: '#00FF00', glow: 'rgba(34, 139, 34, 0.5)' },
    [AnimalSpirit.OTTER]: { primary: '#4682B4', secondary: '#5F9EA0', accent: '#87CEEB', glow: 'rgba(70, 130, 180, 0.5)' },
    [AnimalSpirit.WOLVERINE]: { primary: '#2F4F4F', secondary: '#483D8B', accent: '#9370DB', glow: 'rgba(47, 79, 79, 0.5)' },
    [AnimalSpirit.MARTEN]: { primary: '#8B7355', secondary: '#A0522D', accent: '#DEB887', glow: 'rgba(139, 115, 85, 0.5)' },
    [AnimalSpirit.RAVEN]: { primary: '#000000', secondary: '#4B0082', accent: '#9400D3', glow: 'rgba(75, 0, 130, 0.5)' }
  };
  
  return colors[spirit];
}
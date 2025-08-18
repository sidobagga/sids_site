'use client'

import { useState, useEffect } from 'react'

interface Question {
  id: string
  question: string
  instruction: string
  choices: { letter: string; text: string }[]
  correctAnswer: string
  rationale: string
  difficulty: string
}

export default function DrillsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Parse the vocabulary data and create questions
    parseVocabData()
  }, [])

  const parseVocabData = async () => {
    try {
      const response = await fetch('/sat_vocab.txt')
      const text = await response.text()
      const parsedQuestions = parseQuestions(text)
      setQuestions(parsedQuestions)
      setLoading(false)
    } catch (error) {
      console.error('Error loading vocabulary data:', error)
      setLoading(false)
    }
  }

  const parseQuestions = (text: string): Question[] => {
    const lines = text.split('\n')
    const questions: Question[] = []
    let currentQuestion: Partial<Question> = {}
    let questionText = ''
    let choices: { letter: string; text: string }[] = []
    let isReadingQuestion = false
    let isReadingChoices = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip the "You said:" and empty lines
      if (line === 'You said:' || line === '') continue

      // Look for Question ID to start a new question
      if (line.startsWith('Question ID')) {
        // Save previous question if it exists
        if (currentQuestion.id && questionText && choices.length > 0) {
          const { question, instruction } = parseQuestionAndInstruction(questionText.trim())
          questions.push({
            id: currentQuestion.id,
            question: question,
            instruction: instruction,
            choices: choices,
            correctAnswer: currentQuestion.correctAnswer || '',
            rationale: currentQuestion.rationale || '',
            difficulty: currentQuestion.difficulty || ''
          })
        }

        // Reset for new question
        currentQuestion = { id: line.split(' ')[2] }
        questionText = ''
        choices = []
        isReadingQuestion = false
        isReadingChoices = false
        continue
      }

      // Look for ID line and start reading question
      if (line.startsWith('ID:') && !line.includes('Answer')) {
        currentQuestion.id = line.split(': ')[1]
        isReadingQuestion = true
        isReadingChoices = false
        continue
      }

      // Stop reading question when we hit the answer section
      if (line.includes('ID:') && line.includes('Answer')) {
        isReadingQuestion = false
        isReadingChoices = false
        continue
      }

      // Read question text (including "Which choice completes..." part)
      if (isReadingQuestion && !line.match(/^[A-D]\./)) {
        questionText += line + ' '
        continue
      }

      // Start reading choices when we hit first answer choice
      if (line.match(/^[A-D]\./)) {
        isReadingQuestion = false
        isReadingChoices = true
        const letter = line[0]
        const text = line.substring(3).trim()
        choices.push({ letter, text })
        continue
      }

      // Continue reading more choices
      if (isReadingChoices && line.match(/^[A-D]\./)) {
        const letter = line[0]
        const text = line.substring(3).trim()
        choices.push({ letter, text })
        continue
      }

      // Look for correct answer
      if (line === 'Correct Answer:' && i + 1 < lines.length) {
        currentQuestion.correctAnswer = lines[i + 1].trim()
        continue
      }

      // Look for rationale
      if (line === 'Rationale' && i + 1 < lines.length) {
        let rationale = ''
        let j = i + 1
        while (j < lines.length && 
               !lines[j].trim().startsWith('Question Difficulty:') && 
               !lines[j].trim().startsWith('Assessment') &&
               !lines[j].trim().startsWith('Question ID')) {
          if (lines[j].trim()) {
            rationale += lines[j].trim() + ' '
          }
          j++
        }
        currentQuestion.rationale = rationale.trim()
        continue
      }

      // Look for difficulty
      if (line === 'Question Difficulty:' && i + 1 < lines.length) {
        currentQuestion.difficulty = lines[i + 1].trim()
        continue
      }
    }

    // Don't forget the last question
    if (currentQuestion.id && questionText && choices.length > 0) {
      const { question, instruction } = parseQuestionAndInstruction(questionText.trim())
      questions.push({
        id: currentQuestion.id,
        question: question,
        instruction: instruction,
        choices: choices,
        correctAnswer: currentQuestion.correctAnswer || '',
        rationale: currentQuestion.rationale || '',
        difficulty: currentQuestion.difficulty || ''
      })
    }

    return questions.slice(0, 20) // Limit to first 20 questions for now
  }

  const parseQuestionAndInstruction = (fullText: string) => {
    // Common instruction patterns in SAT questions
    const instructionPatterns = [
      /Which choice completes the text with the most logical and precise word or phrase\?/,
      /As used in the text, what does.*most nearly mean\?/,
      /Which choice best describes.*\?/,
      /What does.*most nearly mean\?/,
      /Which choice.*\?$/
    ]

    for (const pattern of instructionPatterns) {
      const match = fullText.match(pattern)
      if (match) {
        const instructionStart = match.index!
        const question = fullText.substring(0, instructionStart).trim()
        const instruction = fullText.substring(instructionStart).trim()
        return { question, instruction }
      }
    }

    // If no pattern matches, try to find the last sentence that ends with a question mark
    const sentences = fullText.split(/(?<=[.!?])\s+/)
    if (sentences.length > 1) {
      const lastSentence = sentences[sentences.length - 1]
      if (lastSentence.includes('?')) {
        const question = sentences.slice(0, -1).join(' ').trim()
        const instruction = lastSentence.trim()
        return { question, instruction }
      }
    }

    // Fallback: return the full text as question with empty instruction
    return { question: fullText, instruction: '' }
  }

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return
    setSelectedAnswer(answer)
  }

  const handleSubmit = () => {
    if (!selectedAnswer) return
    
    setShowResult(true)
    const isCorrect = selectedAnswer === questions[currentQuestionIndex].correctAnswer
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer('')
      setShowResult(false)
    }
  }

  const handleRestart = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setShowResult(false)
    setScore({ correct: 0, total: 0 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading SAT vocabulary questions...</div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">SAT Vocabulary Drills</h1>
        <p>Sorry, no questions could be loaded. Please try again later.</p>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SAT Vocabulary Drills</h1>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>Score: {score.correct}/{score.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-4">
          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mb-2">
            {currentQuestion.difficulty} Difficulty
          </span>
          <p className="text-lg leading-relaxed">{currentQuestion.question}</p>
          {currentQuestion.instruction && (
            <p className="text-lg leading-relaxed font-bold mt-4">{currentQuestion.instruction}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {currentQuestion.choices.map((choice) => {
            let bgColor = 'bg-gray-50 hover:bg-gray-100'
            let borderColor = 'border-gray-200'
            let textColor = 'text-gray-900'

            if (showResult) {
              if (choice.letter === currentQuestion.correctAnswer) {
                bgColor = 'bg-green-100'
                borderColor = 'border-green-500'
                textColor = 'text-green-800'
              } else if (choice.letter === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) {
                bgColor = 'bg-red-100'
                borderColor = 'border-red-500'
                textColor = 'text-red-800'
              }
            } else if (selectedAnswer === choice.letter) {
              bgColor = 'bg-blue-100'
              borderColor = 'border-blue-500'
            }

            return (
              <label
                key={choice.letter}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${bgColor} ${borderColor}`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={choice.letter}
                  checked={selectedAnswer === choice.letter}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  disabled={showResult}
                  className="mt-1"
                />
                <div className={textColor}>
                  <span className="font-medium">{choice.letter}.</span> {choice.text}
                </div>
              </label>
            )
          })}
        </div>

        {!showResult && (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Submit Answer
          </button>
        )}

        {showResult && (
          <div className="border-t pt-6">
            <div className={`p-4 rounded-lg mb-4 ${selectedAnswer === currentQuestion.correctAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`font-bold text-lg mb-2 ${selectedAnswer === currentQuestion.correctAnswer ? 'text-green-800' : 'text-red-800'}`}>
                {selectedAnswer === currentQuestion.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
              </h3>
              <p className="text-gray-700 text-sm">
                The correct answer is <strong>{currentQuestion.correctAnswer}</strong>.
              </p>
            </div>
            
            {currentQuestion.rationale && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Explanation:</h4>
                <p className="text-sm text-gray-700">{currentQuestion.rationale}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!isLastQuestion ? (
                <button
                  onClick={handleNext}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={handleRestart}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Restart Quiz (Final Score: {score.correct + (selectedAnswer === currentQuestion.correctAnswer ? 1 : 0)}/{score.total + 1})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Sparkles } from 'lucide-react'

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'filled'

interface GuessLetter {
  letter: string
  status: LetterStatus
}

const DEMO_WORD = 'SOLANA'
const MAX_GUESSES = 6 // Match real game (7 total, but demo limited to 6)

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
]

export function InteractiveDemo() {
  const [grid, setGrid] = useState<GuessLetter[][]>(
    Array(MAX_GUESSES).fill(null).map(() => 
      Array(6).fill(null).map(() => ({ letter: '', status: 'empty' }))
    )
  )
  const [currentRow, setCurrentRow] = useState(0)
  const [currentCol, setCurrentCol] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [keyboardState, setKeyboardState] = useState<Record<string, LetterStatus>>({})

  const evaluateGuess = (guess: string): GuessLetter[] => {
    const result: GuessLetter[] = []
    const targetLetters = DEMO_WORD.split('')
    const guessLetters = guess.toUpperCase().split('')

    // First pass: mark correct positions
    const remainingTarget = [...targetLetters]
    const remainingGuess = guessLetters.map((letter, i) => {
      if (letter === targetLetters[i]) {
        remainingTarget[i] = ''
        return null
      }
      return letter
    })

    // Second pass: mark present letters
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = { letter, status: 'correct' }
      } else if (remainingGuess[i] && remainingTarget.includes(remainingGuess[i]!)) {
        const idx = remainingTarget.indexOf(remainingGuess[i]!)
        remainingTarget[idx] = ''
        result[i] = { letter, status: 'present' }
      } else {
        result[i] = { letter, status: 'absent' }
      }
    })

    return result
  }

  const handleKeyPress = (key: string) => {
    if (gameOver) return

    if (key === 'BACKSPACE') {
      if (currentCol > 0) {
        const newGrid = [...grid]
        newGrid[currentRow][currentCol - 1] = { letter: '', status: 'empty' }
        setGrid(newGrid)
        setCurrentCol(currentCol - 1)
      }
    } else if (key === 'ENTER') {
      if (currentCol === 6) {
        submitGuess()
      }
    } else if (key.length === 1 && currentCol < 6) {
      const newGrid = [...grid]
      newGrid[currentRow][currentCol] = { letter: key, status: 'filled' }
      setGrid(newGrid)
      setCurrentCol(currentCol + 1)
    }
  }

  const submitGuess = () => {
    const currentGuess = grid[currentRow].map(tile => tile.letter).join('')
    if (currentGuess.length !== 6) return

    const evaluatedGuess = evaluateGuess(currentGuess)
    const newGrid = [...grid]
    newGrid[currentRow] = evaluatedGuess
    setGrid(newGrid)
    
    // Update keyboard state
    const newKeyboardState = { ...keyboardState }
    evaluatedGuess.forEach(({ letter, status }) => {
      if (status === 'correct') {
        newKeyboardState[letter] = 'correct'
      } else if (status === 'present' && newKeyboardState[letter] !== 'correct') {
        newKeyboardState[letter] = 'present'
      } else if (!newKeyboardState[letter]) {
        newKeyboardState[letter] = 'absent'
      }
    })
    setKeyboardState(newKeyboardState)
    
    if (currentGuess.toUpperCase() === DEMO_WORD) {
      setWon(true)
      setGameOver(true)
    } else if (currentRow + 1 >= MAX_GUESSES) {
      setGameOver(true)
    } else {
      setCurrentRow(currentRow + 1)
      setCurrentCol(0)
    }
  }

  const handleReset = () => {
    setGrid(Array(MAX_GUESSES).fill(null).map(() => 
      Array(6).fill(null).map(() => ({ letter: '', status: 'empty' }))
    ))
    setCurrentRow(0)
    setCurrentCol(0)
    setGameOver(false)
    setWon(false)
    setKeyboardState({})
  }

  const getTileStyle = (status: LetterStatus) => {
    switch (status) {
      case 'correct':
        return 'bg-[#14F195] border-[#14F195] text-white font-bold shadow-lg'
      case 'present':
        return 'bg-[#9945FF] border-[#9945FF] text-white font-bold shadow-lg'
      case 'absent':
        return 'bg-gray-500 border-gray-500 text-white font-bold'
      case 'filled':
        return 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-black dark:text-white font-bold border-2 scale-105'
      default:
        return 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-black dark:text-white border-2'
    }
  }

  const getKeyStyle = (letter: string) => {
    const state = keyboardState[letter] || 'empty'
    const baseStyle = 'px-2 sm:px-3 py-3 sm:py-4 rounded font-bold text-xs sm:text-sm transition-all duration-200 hover:scale-105 min-w-[1.75rem] sm:min-w-[2rem]'
    
    switch (state) {
      case 'correct':
        return `${baseStyle} bg-[#14F195] text-white shadow-lg`
      case 'present':
        return `${baseStyle} bg-[#9945FF] text-white shadow-lg`
      case 'absent':
        return `${baseStyle} bg-gray-800 text-white shadow-lg`
      default:
        return `${baseStyle} bg-gray-100 dark:bg-gray-600 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500`
    }
  }

  return (
    <Card className="border-2 border-primary/20 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <CardTitle className="text-xl sm:text-2xl">Try It Now!</CardTitle>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          No wallet needed - Get a feel for the game
        </p>
        <Badge variant="secondary" className="mx-auto mt-2 text-xs">
          Demo: {MAX_GUESSES} guesses (real game has 7)
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Game Grid */}
        <div className="space-y-1">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 justify-center">
              {row.map((tile, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-base sm:text-lg font-bold border-2 rounded transition-all duration-300 ${getTileStyle(
                    tile.status
                  )}`}
                >
                  {tile.letter}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Status */}
        {!gameOver && (
          <p className="text-xs text-center text-muted-foreground">
            Guess {currentRow + 1} of {MAX_GUESSES} • Hint: Think blockchain! 🔗
          </p>
        )}

        {/* Virtual Keyboard */}
        {!gameOver && (
          <div className="space-y-1">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1">
                {row.map((key) => (
                  <Button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={`
                      ${key === 'ENTER' || key === 'BACKSPACE' ? 'px-2 sm:px-4 min-w-[2.5rem] sm:min-w-[3.5rem] text-[10px] sm:text-xs' : ''} 
                      ${getKeyStyle(key)}
                    `}
                    disabled={gameOver}
                  >
                    {key === 'BACKSPACE' ? '⌫' : key}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Game over message */}
        {gameOver && (
          <div className="text-center space-y-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
            {won ? (
              <>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  🎉 Awesome! You got it!
                </p>
                <p className="text-sm text-muted-foreground">
                  The word was <span className="font-bold text-foreground">{DEMO_WORD}</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  Demo complete!
                </p>
                <p className="text-sm text-muted-foreground">
                  The word was <span className="font-bold text-foreground">{DEMO_WORD}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  In the real game, you get 7 guesses and win SOL prizes!
                </p>
              </>
            )}
            <Button onClick={handleReset} variant="outline" className="mt-2">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center text-xs pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#14F195] rounded border-2 border-[#14F195]" />
            <span className="text-muted-foreground text-[10px] sm:text-xs">Correct</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#9945FF] rounded border-2 border-[#9945FF]" />
            <span className="text-muted-foreground text-[10px] sm:text-xs">Wrong spot</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-500 rounded border-2 border-gray-500" />
            <span className="text-muted-foreground text-[10px] sm:text-xs">Not in word</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Tile = {
  id: number
  value: number
  row: number
  col: number
  isNew?: boolean
  isMerged?: boolean
}

type Direction = "up" | "down" | "left" | "right"

const GRID_SIZE = 4
let tileIdCounter = 0

const getTileColor = (value: number) => {
  const colors: Record<number, string> = {
    2: "bg-[oklch(0.95_0.02_264)] text-foreground",
    4: "bg-[oklch(0.92_0.03_264)] text-foreground",
    8: "bg-[oklch(0.75_0.15_35)] text-primary-foreground",
    16: "bg-[oklch(0.70_0.18_35)] text-primary-foreground",
    32: "bg-[oklch(0.65_0.20_30)] text-primary-foreground",
    64: "bg-[oklch(0.60_0.22_25)] text-primary-foreground",
    128: "bg-[oklch(0.75_0.18_80)] text-primary-foreground",
    256: "bg-[oklch(0.70_0.20_80)] text-primary-foreground",
    512: "bg-[oklch(0.65_0.22_80)] text-primary-foreground",
    1024: "bg-[oklch(0.60_0.24_80)] text-primary-foreground",
    2048: "bg-[oklch(0.55_0.26_80)] text-primary-foreground",
  }

  return colors[value] || "bg-primary text-primary-foreground"
}

const initializeBoard = (): Tile[] => {
  const tiles: Tile[] = []

  // Add first tile
  const row1 = Math.floor(Math.random() * GRID_SIZE)
  const col1 = Math.floor(Math.random() * GRID_SIZE)
  tiles.push({
    id: tileIdCounter++,
    value: Math.random() < 0.9 ? 2 : 4,
    row: row1,
    col: col1,
    isNew: true,
  })

  // Add second tile
  let row2, col2
  do {
    row2 = Math.floor(Math.random() * GRID_SIZE)
    col2 = Math.floor(Math.random() * GRID_SIZE)
  } while (row2 === row1 && col2 === col1)

  tiles.push({
    id: tileIdCounter++,
    value: Math.random() < 0.9 ? 2 : 4,
    row: row2,
    col: col2,
    isNew: true,
  })

  return tiles
}

const addRandomTile = (tiles: Tile[]): Tile[] => {
  const occupiedPositions = new Set(tiles.map((t) => `${t.row}-${t.col}`))
  const emptyCells: [number, number][] = []

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (!occupiedPositions.has(`${i}-${j}`)) {
        emptyCells.push([i, j])
      }
    }
  }

  if (emptyCells.length > 0) {
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    return [
      ...tiles,
      {
        id: tileIdCounter++,
        value: Math.random() < 0.9 ? 2 : 4,
        row,
        col,
        isNew: true,
      },
    ]
  }

  return tiles
}

const move = (tiles: Tile[], direction: Direction): { tiles: Tile[]; moved: boolean; scoreGained: number } => {
  let scoreGained = 0
  let moved = false

  // Clear animation flags
  const cleanTiles = tiles.map((t) => ({ ...t, isNew: false, isMerged: false }))

  // Group tiles by row or column depending on direction
  const lines: Map<number, Tile[]> = new Map()

  cleanTiles.forEach((tile) => {
    const key = direction === "left" || direction === "right" ? tile.row : tile.col
    if (!lines.has(key)) {
      lines.set(key, [])
    }
    lines.get(key)!.push(tile)
  })

  const newTiles: Tile[] = []

  // Process each line
  lines.forEach((lineTiles, lineIndex) => {
    // Sort tiles based on direction
    const sorted = [...lineTiles].sort((a, b) => {
      if (direction === "left") return a.col - b.col
      if (direction === "right") return b.col - a.col
      if (direction === "up") return a.row - b.row
      return b.row - a.row
    })

    const merged: boolean[] = []
    let targetPosition = 0

    for (let i = 0; i < sorted.length; i++) {
      if (merged[i]) continue

      const currentTile = sorted[i]
      let newRow = currentTile.row
      let newCol = currentTile.col

      // Check if can merge with next tile
      if (i < sorted.length - 1 && !merged[i + 1] && currentTile.value === sorted[i + 1].value) {
        // Merge tiles
        if (direction === "left" || direction === "right") {
          newCol = direction === "left" ? targetPosition : GRID_SIZE - 1 - targetPosition
        } else {
          newRow = direction === "up" ? targetPosition : GRID_SIZE - 1 - targetPosition
        }

        newTiles.push({
          id: tileIdCounter++,
          value: currentTile.value * 2,
          row: newRow,
          col: newCol,
          isMerged: true,
        })

        scoreGained += currentTile.value * 2
        merged[i] = true
        merged[i + 1] = true
        targetPosition++

        if (newRow !== currentTile.row || newCol !== currentTile.col) {
          moved = true
        }
      } else {
        // Just move tile
        if (direction === "left" || direction === "right") {
          newCol = direction === "left" ? targetPosition : GRID_SIZE - 1 - targetPosition
        } else {
          newRow = direction === "up" ? targetPosition : GRID_SIZE - 1 - targetPosition
        }

        if (newRow !== currentTile.row || newCol !== currentTile.col) {
          moved = true
        }

        newTiles.push({
          ...currentTile,
          row: newRow,
          col: newCol,
        })

        targetPosition++
      }
    }
  })

  return { tiles: newTiles, moved, scoreGained }
}

const isGameOver = (tiles: Tile[]): boolean => {
  // Check if board is full
  if (tiles.length < GRID_SIZE * GRID_SIZE) return false

  // Check for possible merges
  const board: (number | null)[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null))

  tiles.forEach((tile) => {
    board[tile.row][tile.col] = tile.value
  })

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const current = board[i][j]
      if (j < GRID_SIZE - 1 && current === board[i][j + 1]) return false
      if (i < GRID_SIZE - 1 && current === board[i + 1][j]) return false
    }
  }

  return true
}

const hasWon = (tiles: Tile[]): boolean => {
  return tiles.some((tile) => tile.value === 2048)
}

export default function Game2048() {
  const [tiles, setTiles] = useState<Tile[]>(initializeBoard)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  useEffect(() => {
    const savedBestScore = localStorage.getItem("2048-best-score")
    if (savedBestScore) {
      setBestScore(Number.parseInt(savedBestScore))
    }
  }, [])

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score)
      localStorage.setItem("2048-best-score", score.toString())
    }
  }, [score, bestScore])

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver) return

      const result = move(tiles, direction)

      if (result.moved) {
        const newTiles = addRandomTile(result.tiles)
        setTiles(newTiles)
        setScore((prev) => prev + result.scoreGained)

        if (hasWon(newTiles) && !won) {
          setWon(true)
        }

        if (isGameOver(newTiles)) {
          setGameOver(true)
        }
      }
    },
    [tiles, gameOver, won],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()
      }

      switch (e.key) {
        case "ArrowUp":
          handleMove("up")
          break
        case "ArrowDown":
          handleMove("down")
          break
        case "ArrowLeft":
          handleMove("left")
          break
        case "ArrowRight":
          handleMove("right")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleMove])

  const resetGame = () => {
    tileIdCounter = 0
    setTiles(initializeBoard())
    setScore(0)
    setGameOver(false)
    setWon(false)
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-balance mb-2">2048</h1>
        <p className="text-muted-foreground text-pretty">Join the tiles to reach 2048!</p>
      </div>

      <div className="flex gap-4 w-full justify-center">
        <Card className="px-6 py-3 flex flex-col items-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Score</div>
          <div className="text-2xl font-bold">{score}</div>
        </Card>
        <Card className="px-6 py-3 flex flex-col items-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Best</div>
          <div className="text-2xl font-bold">{bestScore}</div>
        </Card>
      </div>

      <div className="relative">
        <Card className="p-4 bg-muted/30">
          <div className="relative w-[280px] h-[280px] sm:w-[352px] sm:h-[352px]">
            {/* Background grid */}
            <div className="absolute inset-0 grid grid-cols-4 gap-3">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="bg-muted/50 rounded-lg" />
              ))}
            </div>

            {/* Tiles with absolute positioning for animations */}
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className={cn(
                  "absolute w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all duration-200 ease-in-out",
                  getTileColor(tile.value),
                  tile.isNew && "animate-in zoom-in-50 duration-200",
                  tile.isMerged && "animate-in zoom-in-110 duration-200",
                )}
                style={{
                  transform: `translate(${tile.col * 76}px, ${tile.row * 76}px)`,
                }}
              >
                {tile.value}
              </div>
            ))}
          </div>
        </Card>

        {(gameOver || won) && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Card className="p-6 text-center">
              <h2 className="text-3xl font-bold mb-2">{won ? "You Win!" : "Game Over!"}</h2>
              <p className="text-muted-foreground mb-4">Final Score: {score}</p>
              <Button onClick={resetGame} size="lg">
                Play Again
              </Button>
            </Card>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={resetGame} variant="outline">
          New Game
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p className="text-pretty">Use arrow keys to move tiles</p>
      </div>
    </div>
  )
}

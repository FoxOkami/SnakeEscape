import React from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";
import { useAudio } from "../../lib/stores/useAudio";
import { LEVELS } from "../../lib/game/levels";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

const GameUI: React.FC = () => {
  const {
    gameState,
    currentLevel,
    player,
    startGame,
    resetGame,
    nextLevel,
    returnToMenu
  } = useSnakeGame();
  
  const { isMuted, toggleMute, playSuccess, backgroundMusic } = useAudio();



  // Handle audio based on game state
  React.useEffect(() => {
    if (gameState === 'playing' && backgroundMusic) {
      if (!isMuted) {
        backgroundMusic.play().catch(console.log);
      }
    } else if (backgroundMusic) {
      backgroundMusic.pause();
    }
  }, [gameState, backgroundMusic, isMuted]);

  // Play success sound on level complete or victory
  React.useEffect(() => {
    if (gameState === 'levelComplete' || gameState === 'victory') {
      playSuccess();
    }
  }, [gameState, playSuccess]);

  const renderMenu = () => (
    <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <Card className="w-96 bg-gray-800 text-white border-gray-600 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-400">Snake Room</CardTitle>
          <CardDescription className="text-gray-300">
            Escape the rooms while avoiding the deadly snakes!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-400 space-y-2">
            <p><strong>Controls:</strong> WASD or Arrow Keys to move</p>
            <p><strong>Goal:</strong> Collect the key, activate switches, and escape!</p>
            <p><strong>Warning:</strong> Don't touch the snakes!</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={startGame} className="w-full bg-blue-600 hover:bg-blue-700">
              Start Game
            </Button>
            <Button onClick={toggleMute} variant="outline" className="w-full">
              Sound: {isMuted ? 'Off' : 'On'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderGameOver = () => (
    <div className="absolute inset-0 bg-red-900 bg-opacity-80 flex items-center justify-center z-10">
      <Card className="w-96 bg-gray-800 text-white border-red-600">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-400">Game Over!</CardTitle>
          <CardDescription className="text-gray-300">
            A snake caught you! Try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button onClick={resetGame} className="w-full bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
            <Button onClick={returnToMenu} variant="outline" className="w-full">
              Return to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLevelComplete = () => (
    <div className="absolute inset-0 bg-green-900 bg-opacity-80 flex items-center justify-center z-10">
      <Card className="w-96 bg-gray-800 text-white border-green-600">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-400">Level Complete!</CardTitle>
          <CardDescription className="text-gray-300">
            Well done! Ready for the next challenge?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button onClick={nextLevel} className="w-full bg-green-600 hover:bg-green-700">
              Next Level
            </Button>
            <Button onClick={returnToMenu} variant="outline" className="w-full">
              Return to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderVictory = () => (
    <div className="absolute inset-0 bg-yellow-900 bg-opacity-80 flex items-center justify-center z-10">
      <Card className="w-96 bg-gray-800 text-white border-yellow-600">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-yellow-400">Victory!</CardTitle>
          <CardDescription className="text-gray-300">
            Congratulations! You've escaped all the rooms!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg">🎉 You are a true escape artist! 🎉</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={startGame} className="w-full bg-yellow-600 hover:bg-yellow-700">
              Play Again
            </Button>
            <Button onClick={returnToMenu} variant="outline" className="w-full">
              Return to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderGameHUD = () => (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-5">
      <div className="flex gap-2">
        <Badge variant="secondary" className="bg-gray-800 text-white border-gray-600">
          Level: {currentLevel + 1} / {LEVELS.length}
        </Badge>
        <Badge variant="secondary" className="bg-gray-800 text-white border-gray-600">
          {LEVELS[currentLevel]?.name || 'Unknown Level'}
        </Badge>
        {player.hasKey && (
          <Badge className="bg-yellow-600 text-white">
            🗝️ Key Collected
          </Badge>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={toggleMute}
          variant="outline"
          size="sm"
          className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
        >
          🔊 {isMuted ? 'Off' : 'On'}
        </Button>
        <Button
          onClick={returnToMenu}
          variant="outline"
          size="sm"
          className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
        >
          Menu
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {gameState === 'menu' && renderMenu()}
      {gameState === 'gameOver' && renderGameOver()}
      {gameState === 'levelComplete' && renderLevelComplete()}
      {gameState === 'victory' && renderVictory()}
      {gameState === 'playing' && renderGameHUD()}
    </>
  );
};

export default GameUI;

# Wordle Brawl
## A browser game by Eli Mills, based on NYT's [Wordle](https://www.nytimes.com/games/wordle/index.html)

## Deployment
[Click here to play](https://wordlebrawl.onrender.com). The app is hosted for free on [Render](http://www.render.com). Because I'm using the free-tier to host the game's back-end, the server will "spin down" after 15 minutes of inactivity. This means that the first time you load the game, it may take 1 - 2 minutes as the server spins back up. Once the server is running, though, load times will be much quicker.

## How to Play: Pre-Game
Navigate to the [landing page](https://wordlebrawl.onrender.com), where you can create a room or join an existing one.

### Create a Room
Click "Create a Room" to start a new game. This will create a room and give it a number, which you can share with your friends so they can join. You can also share the URL, which your friends can click to join the room. The game requires a minimum of two people in a room before starting. The creator of the room is called the room "leader", and is responsible for starting the game.

### Join a Room
Existing rooms can be joined by entering their number in the text box, or by navigating to their URL. If the requested room does not exist or the room has too many players, you will be returned to the landing page.

### Enter a Name
Once you are in a room, you will be prompted to enter a name. This is how you will appear on everyone else's screen! Two players in a room cannot have the same name. The game cannot start until everyone has a name.

## How to Play: Gameplay

### Choose a Word
Once the leader starts the game, a random player will be selected to become the "chooser". This person chooses a word for the other players to guess. This word must be a valid Wordle answer, which is a subset of all the words that players can guess. Try to pick a tricky word - the more tries it takes the players to guess your word, the more points you get!

### Guess the Word
This part should be familiar to anyone who has played Wordle before! Guess different words to try and match the secret word. A green letter means that letter is in the correct spot. A yellow letter means that letter is in the secret word, but not in that spot. A grey letter means that letter is not in the secret word. 

### Point System
Players can earn between 0 and 360 base points per round. The first person to guess the word also gets an additional speed bonus. For guessers, fewer attempts = more points. For choosers, more wrong guesses = more points. The points are summarized in the tables below.

### Point System: Guessers
| Number of Attempts | Points Rewarded |
| - | - |
| 1 | 360 |
| 2 | 300 |
| 3 | 240 |
| 4 | 180 |
| 5 | 120 |
| 6 | 60 |
| Strikeout | 0|

**Speed Bonus: 120 points**

### Point System: Choosers

| Number of Guessers | Points Per Wrong Guess |
| - | - |
| 1 | 60 |
| 2 | 30 |
| 3 | 20 |
| 4 | 15 |
| 5 | 12 |
| 6 | 10 |

## How to Play: End Game
The game ends when everyone has had a turn to choose a word. The player with the highest score wins! The game leader can choose to play again, which will reset everyone's score and start over.

## Technology Used
Wordle Brawl uses the following technologies.

**Front End**
- Next.js

**Back End**
- Node.js
- Socket.io (facilitates live game updates)
- Redis (caches game state data)

## Challenges

For this project, I used a lot of new-to-me technologies at once. Prior to this, I had no experience working with Next.js, Socket.io, Redis, or Typescript. At first, this was fairly overwhelming and I stalled out early on. But then I divided the project into smaller steps and planned out my approach so that I could focus on learning one new thing at a time. I first built a very basic front-end, learning the features of Typescript and Next.js. Once I had that working, I focused on setting up a Socket.io server and developed the API for the front-end to use. Eventually I learned about Redis and set up a local instance, and one-by-one converted each entity I had been working with in the back-end to a Redis-friendly hash, list, or other entity.

## Next Steps

I've tracked several feature ideas in the Issues of this repository. Some next steps include 

- Improving the visual layout and design
- Represent points more visually so players get a more intuitive understanding as they play
- Add the ability to store a user session so disconnecting doesn't delete their player entity in the database


## Attributions
This game is based on the New York Times game, [Wordle](https://www.nytimes.com/games/wordle/index.html).

[Word lists](https://gist.github.com/cfreshman/dec102adb5e60a8299857cbf78f6cf57) provided by Github user cfreshman.
import { createServer } from "http";
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { EvaluationRequestData, EvaluationResponseData, evaluateGuess } from "./evaluation";

// Configure redis client
const redisClient = createClient({
    url: "redis://127.0.0.1:6379" 
});
redisClient.on("error", err => console.error("Redis client error", err));
redisClient.connect();

// Configure socketio server
const server = createServer();
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});


io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => console.log('user disconnected'));
    socket.on("declare-name", async (name : string) => {
        if (! redisClient.isReady) await redisClient.connect();
        console.log(`Name received: ${name}. Writing to db.`);
        redisClient.set(socket.id, name); 
    })
    socket.on("guess", async (guessReq : EvaluationRequestData) => {
        console.log(`Guess received: ${guessReq.guess}`);

        // Get socket's name
        if (! redisClient.isReady) await redisClient.connect();
        const guesserName : string | null = await redisClient.get(socket.id);
        console.log(`Guesser name retrieved: ${guesserName}`);

        // Evaluate result
        const result : EvaluationResponseData = await evaluateGuess(guessReq.guess);

        // Send results
        console.log("Sending results");
        socket.emit("evaluation", result);
        socket.broadcast.emit("other-eval", {guesserName, ...result});
    });
});

server.listen(3001, () => {
    console.log('server running at http://localhost:3001');
});
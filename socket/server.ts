import { createServer } from "http";
import { Server, Socket } from 'socket.io';
import { EvaluationRequestData, EvaluationResponseData, evaluateGuess } from "./evaluation";

const server = createServer();
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

let socketConn : Socket;

io.on('connection', (socket) => {
    socketConn = socket;
    console.log('a user connected');
    socket.on('disconnect', () => console.log('user disconnected'));
    socket.on("guess", handleGuessRequest);
});

const handleGuessRequest = async (guessReq : EvaluationRequestData) => { 
    const result : EvaluationResponseData = await evaluateGuess(guessReq.guess);
    io.emit("evaluation", result);
}

server.listen(3001, () => {
    console.log('server running at http://localhost:3001');
});
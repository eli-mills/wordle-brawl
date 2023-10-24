import "dotenv/config.js";
import * as socket from "./socket.js";
import { io, httpServer } from "./socket.js";
import { connectClientToDb } from "./db.js";
import { GameEvents } from "../../common/dist/index.js";
// Configure socket event listeners
io.on('connection', async (newSocket) => {
    console.log('a user connected');
    // Add event listeners to socket
    newSocket.on(GameEvents.REQUEST_NEW_ROOM, () => socket.onCreateRoomRequest(newSocket));
    newSocket.on(GameEvents.REQUEST_JOIN_ROOM, (data) => socket.onJoinRoomRequest(newSocket, data.room));
    newSocket.on(GameEvents.DECLARE_NAME, (name) => socket.onDeclareName(newSocket, name));
    newSocket.on(GameEvents.GUESS, (guessReq) => socket.onGuess(newSocket, guessReq));
    newSocket.on('disconnecting', () => socket.onDisconnect(newSocket));
});
// Connect to database and start server
connectClientToDb()
    .then(() => {
    httpServer.listen(process.env.PORT, () => {
        console.log(`server listening at port ${process.env.PORT}`);
    });
});

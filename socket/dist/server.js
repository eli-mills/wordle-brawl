import "dotenv/config.js";
import { httpServer } from "./socket.js";
import { initializeDbConn } from "./db.js";
// Connect to database and start server
initializeDbConn()
    .then(() => {
    httpServer.listen(process.env.PORT, () => {
        console.log(`server listening at port ${process.env.PORT}`);
    });
});

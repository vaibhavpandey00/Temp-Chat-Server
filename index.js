import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: [ "GET", "POST" ]
    }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const users = {}

io.on('connection', socket => {
    // console.log(`A User is connected: ${socket.id}`);

    socket.on('register', ({ userId }) => {
        // Check if user with userId already registered
        if (users[ userId ]) return;

        users[ userId ] = socket.id;
        socket.userId = userId;
        // console.log("😊 Users: ", users);
        io.emit('userCount', Object.keys(users).length);
        io.emit('userList', Object.keys(users));
    });

    socket.on('privateMessage', ({ toUserId, message }) => {
        const sentUser = users[ toUserId ];
        if (sentUser) {
            // Send to recipient
            io.to(sentUser).to(socket.id).emit('privateMessage', {
                from: socket.userId,
                message,
                isPrivate: true
            });
        }
    })

    socket.on('groupMessage', (message) => {
        io.emit('groupMessage', {
            from: socket.userId,
            message,
            isPrivate: false
        })
    })

    socket.on('disconnect', () => {
        if (socket.userId) {
            delete users[ socket.userId ];
            io.emit('userCount', Object.keys(users).length);
            // console.log("❌ Disconnected User: ", socket.userId);
        }
    });

})

app.get("/", (req, res) => {
    res.send("Hello from the server :)")
})

app.post("/checkUsername", (req, res) => {
    const { username } = req.body;
    // console.log("Username: ", username);

    if (users[ username ]) {
        res.json({ exists: true }).status(400);
    } else {
        res.json({ exists: false }).status(200);
    }
})

const PORT = process.env.PORT || 8000

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
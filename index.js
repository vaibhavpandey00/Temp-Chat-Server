import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from 'uuid';
import { getOrigins } from "./components/getAllowedOrigins.js";

const app = express();
const server = http.createServer(app);
const origins = getOrigins();

const io = new Server(server, {
    cors: {
        origin: origins,
        methods: [ "GET", "POST" ]
    }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const users = {}

// Function to add a random ID to each messages using UUID
const randId = () => {
    return uuidv4();
}

io.on('connection', socket => {
    // console.log(`A User is connected: ${socket.id}`);

    socket.on('register', ({ userId }) => {
        // Check if user with userId already registered
        if (users[ userId ]) return;

        users[ userId ] = socket.id;
        socket.userId = userId;
        console.log("🟢 Users: ", users);
        io.emit('userCount', Object.keys(users).length);
        io.emit('userList', Object.keys(users));
    });

    socket.on('privateMessage', ({ toUserId, message }) => {
        if (!socket.userId) return;
        const sentUser = users[ toUserId ];
        if (sentUser) {
            io.to(sentUser).to(socket.id).emit('privateMessage', {
                from: socket.userId,
                message,
                isPrivate: true,
                id: randId()
            });
        }
    })

    socket.on('groupMessage', (message) => {
        if (!socket.userId) return;
        io.emit('groupMessage', {
            from: socket.userId,
            message,
            isPrivate: false,
            id: randId()
        })
    })

    socket.on('disconnect', () => {
        if (socket.userId) {
            delete users[ socket.userId ];
            io.emit('userCount', Object.keys(users).length);
            io.emit('userList', Object.keys(users));
        }
    });

})

app.get("/", (req, res) => {
    res.send("Hello from the server :)")
})

app.post("/checkUsername", (req, res) => {
    const { username } = req.body;
    // console.log("Username: ", username);

    if (users[ username ] || users.length >= 10) {
        res.json({ exists: true }).status(400);
    } else {
        res.json({ exists: false }).status(200);
    }
})

app.get("/api/reset/all", (req, res) => {
    users = {};
    res.send("All users have been reset").status(200);
})

const PORT = process.env.PORT || 8000

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
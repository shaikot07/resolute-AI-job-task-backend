const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const http = require('http');
const socketio = require('socket.io');


const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Configure CORS (adjust origins based on your needs)
// const allowedOrigins = ['http://localhost:3000']; 
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
};
app.use(cors(corsOptions));

// Connect to MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.loifkbc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function connectDB() {
    try {
        await client.connect();
        console.log('MongoDB Connected!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit on connection error
    }
}

// Define Message model (replace with your schema)
// const MessageSchema = {
//     text: {
//         type: String,
//         required: true
//       },
//       user: {
//         name: String,
//         photo:  String,
//       }
//     // Add timestamps, user information, etc. if needed
// };

const messageCollection = client.db('resoluteAiJobProject').collection('messages');
// User routes (replace with your user model and validation)
const userCollection = client.db('resoluteAiJobProject').collection('users');

// Socket.io setup start

const io = socketio(server, { cors: corsOptions });

io.on('connection', (socket) => {
    socket.on('message', async (message) => {
        try {
            // Insert the message directly into the database
            const result = await messageCollection.insertOne(message);
            // Emit the inserted message to all connected clients
            io.emit('message', result.ops[0]);
        } catch (error) {
            console.error('Error saving message:', error);
            // Send an error message to the client
            socket.emit('error', { message: 'Failed to save message' });
        }
    });
});

// socket.io amin setup end 

// Message routes for RESTful API
app.post('/messages', async (req, res) => {
    
    try {
        const message = req.body; // Extract text from request body
        console.log(message);
        // const newMessage = new Message(  message ); 
        const result = await messageCollection.insertOne(message);
        res.status(201).send(result); // Send inserted message with ID
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await messageCollection.find().toArray();
        res.send(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

// user related  end point 
app.post('/users', async (req, res) => {
    const user = req.body;
    try {
        const existingUser = await userCollection.findOne({ email: user.email });
        if (existingUser) {
            return res.status(400).send({ message: 'User already exists' });
        }
        const result = await userCollection.insertOne(user);
        res.status(201).send(result); // Created status code
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send({ message: 'Internal server error' }); // Generic error for now
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await userCollection.find().toArray();
        res.send(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ message: 'Internal server error' }); // Generic error for now
    }
});

app.get('/', (req, res) => {
    res.send('Simple CRUD is running!');
});

// Start server
async function startServer() {
    await connectDB();
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

startServer();

// Ensure proper closing on exit (optional)
process.on('SIGINT', async () => {
    console.log('Closing connections...');
    await client.close();
    process.exit(0);
});
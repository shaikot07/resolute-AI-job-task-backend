const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
// for socket.io 
const http = require('http');
const socketio = require('socket.io');
const app = express()
const port = process.env.PORT || 5000;
const server = http.createServer(app);


// Socket.io connection
const io = socketio(server, {
    cors: {
        origin: '*', // Allow all origins,
        methods: ["GET", "POST"]
    }
});

// middleWare 
app.use(cors());
app.use(express.json());

// console.log("thht",process.env.DB_PASS);
// console.log(process.env.DB_USER);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.loifkbc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// const uri = "mongodb+srv://<username>:<password>@cluster0.loifkbc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // start operation 

        const userCollection = client.db('resoluteAiJobProject').collection('users');
        const messageCollection = client.db('resoluteAiJobProject').collection('messages');
        // Socket.io connection
        io.on('connection', (socket) => {
            console.log('New WebSocket connection');

            // Listen for new messages
            // Listen for new messages
            // socket.on('sendMessage', async (message) => {
            //     // Add timestamp to the message
            //     message.timestamp = new Date();
            //     await messageCollection.insertOne(message);
            //     io.emit('message', message);
            // });
            socket.on('sendMessage', async (message) => {
                const newMessage = new Message({ text: message });
                await newMessage.save();
                io.emit('message', { text: message });
            });
        });

        // Message routes for RESTful API

        app.post('/messages', async (req, res) => {
            try {
                const message = req.body;
                message.timestamp = new Date(); // Add timestamp
                const result = await messageCollection.insertOne(message);
                res.status(201).send(result);
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
        // user related  api 
        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user  doseno't exists 
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })


        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        });
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Simple CRUD Is RUNNING")
})
app.listen(port, () => {
    console.log(`Simple CURD IS Running on port,${port}`);
})
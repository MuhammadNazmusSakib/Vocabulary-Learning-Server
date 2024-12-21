require('dotenv').config();
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token

    if (!token) {
        return res.status(401).send({message: 'Unauthorized access.'})
    }
    // verify the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err) {
            return res.status(401).send({message: 'Unauthorized access.'})
        }
        req.user = decoded
        next()
    })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m594l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



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

        const allVocabularyDb = client.db("VocabularyLearningServer").collection('allVocabulary')
        const completedWordDb = client.db("VocabularyLearningServer").collection('completedVocabulary')

        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '5h'
            })
            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })



        // allVocabularyDb--------------------------------------------

        // getting all data from database (api)
        app.get('/allVocabulary', verifyToken, async (req, res) => {
            const cursor = allVocabularyDb.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        // getting a specific data from database (api)
        app.get('/allVocabulary/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            // const query = { _id: new ObjectId(id) }
            const query = { _id: id }
            const result = await allVocabularyDb.findOne(query)
            res.send(result)
        })
        // getting a specific data(based on difficulty) from database (api)
        app.get('/allVocabulary/difficulty/:type', verifyToken, async (req, res) => {
            const type = req.params.type
            const query = { difficulty: type };

           

            const result = await allVocabularyDb.find(query).toArray();
            res.send(result)
        })

        // completedWordDb-----------------------------------------------

        // storing data in database
        app.post('/completedWords', verifyToken, async (req, res) => {
            const completedWordsData = req.body
            // Check for existing words and insert only new ones
            const insertPromises = completedWordsData.map(async (word) => {
                // Check if the word already exists for the user
                const exists = await completedWordDb.findOne({
                    wordId: word.wordId,
                    email: word.email, // Ensure uniqueness per user
                });

                if (!exists) {
                    // If it doesn't exist, prepare for insertion
                    return {
                        ...word,
                        createdAt: new Date(), // Add created timestamp
                    };
                }
            });
            // Resolve all promises and filter out undefined (existing) entries
            const newWords = (await Promise.all(insertPromises)).filter(Boolean);
            if (newWords.length === 0) {
                return
            }
            const result = await completedWordDb.insertMany(newWords);
            res.send(result)
        })
        // Deleting all completed data
        app.post('/completedWords/deleteAll', verifyToken, async (req, res) => {
            const allIds = req.body;
            // console.log(allIds)
            // Construct the $or query for deletion
            const deleteFilter = {
                $or: allIds.map((word) => ({
                    wordId: word.wordId,
                    email: word.email,
                })),
            };
            const result = await completedWordDb.deleteMany(deleteFilter)
            res.send(result)
        })
        // Deleting single completed data
        app.delete('/completedWords/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await completedWordDb.deleteOne({ wordId: id });
            res.send(result)
        })
        // getting completed words based on different email id
        app.get('/completedWords/email/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }; // Use email directly in the query

            // checking token email and query email
            if (req.user.email !== req.params.email) {
                return res.status(401).send({message: 'Unauthorized access.'})
            }

            const result = await completedWordDb.find(query).toArray(); // Retrieve all applications for the email
            res.send(result)
        })








        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Server is Runimg...')
})

app.listen(port, () => {
    console.log(`Server is waiting at ${port}`)
})
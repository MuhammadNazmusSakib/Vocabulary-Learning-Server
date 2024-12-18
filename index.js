require('dotenv').config();
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())




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



        // allVocabularyDb--------------------------------------------

        // getting all data from database (api)
        app.get('/allVocabulary', async (req, res) => {
            const cursor = allVocabularyDb.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        // getting a specific data from database (api)
        app.get('/allVocabulary/:id', async (req, res) => {
            const id = req.params.id
            // const query = { _id: new ObjectId(id) }
            const query = { _id: id }
            const result = await allVocabularyDb.findOne(query)
            res.send(result)
        })
        // getting a specific data(based on difficulty) from database (api)
        app.get('/allVocabulary/difficulty/:type', async (req, res) => {
            const type = req.params.type
            const query = { difficulty: type };
            const result = await allVocabularyDb.find(query).toArray();
            res.send(result)
        })

        // completedWordDb-----------------------------------------------

        // storing data in database
        app.post('/completedWords', async (req, res) => {
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
        app.post('/completedWords/deleteAll', async (req, res) => {
            const allIds = req.body;
            // console.log(allIds)
            // Construct the $or query for deletion
            const deleteFilter = {
                $or: allIds.map((word) => ({
                    wordId: word.wordId,
                    email: word.email,
                })),
            };
            console.log("abcd")
            const result = await completedWordDb.deleteMany(deleteFilter)
            res.send(result)
        })
        // Deleting single completed data
        app.delete('/completedWords/:id', async (req, res) => {
            const id = req.params.id;
            const result = await completedWordDb.deleteOne({ wordId: id });
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
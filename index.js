const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGO_DB_URI;
const port = process.env.PORT

app.use(cors())
app.use(express.json())


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const database = client.db("hireloop");
    const jobsCollection = database.collection("jobs");
    const companyCollection = database.collection("companies");


    app.post('/api/companies', async (req, res) => {
      const company = req.body;
      const result = await companyCollection.insertOne(company);
      res.send(result);
    })

    app.get('/api/my/companies', async (req, res) => {
      const query = {}
      if (req.query.recuiterId) {
        query.recuiterId = req.query.recuiterId
      }
      const results = await companyCollection.findOne(query);
      res.send(results);
    })

    app.post('/api/jobs', async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    })

    app.get('/api/jobs', async (req, res) => {
      const results = await jobsCollection.find().toArray();
      res.send(results);
    })



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
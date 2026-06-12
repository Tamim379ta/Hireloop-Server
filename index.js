const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const userCollection = database.collection("user");
    const applicationCollection = database.collection("applications");
    const planCollection = database.collection("plans");
    const subscriptionCollection = database.collection("subscriptions");
    const sessionCollection = database.collection("session");

    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers?.authorization
      if (!authHeader) {
        return res.status(401)
      }

      const token = authHeader.split(' ')[1]

      if (!token) {
        return res.status(401)
      }

      const query = { token: token }
      const session = await sessionCollection.findOne(query)
      const userId = session.userId
      const userQuery = {
        _id: userId
      }
      const user = await userCollection.findOne(userQuery)
      req.user = user
      next()
    }

    const verifySeeker = (req, res, next) => {
      if (req.user?.role !== 'seeker') {
        return res.status(403)
      }
      next()
    }


    const verifyAdmin = (req, res, next) => {
      if (req.user?.role !== 'admin') {
        return res.status(403)
      }
      next()
    }

    const verifyRecruiter = (req, res, next) => {
      if (req.user?.role !== 'recruiter') {
        return res.status(403)
      }

      next()
    }

    app.get('/api/user', async (req, res) => {
      const results = await userCollection.find().skip(3).toArray();
      res.send(results);
    })

    // subscription related api 


    app.post('/api/subscriptions', async (req, res) => {
      const subscription = req.body;
      const subInfo = {
        ...subscription,
        createdAt: new Date()
      }
      const result = await subscriptionCollection.insertOne(subInfo)

      const filter = { email: subscription.userEmail }
      const updateDocument = {
        $set: {
          plan: subscription.planId,
        },
      };

      const updateResult = await userCollection.updateOne(filter, updateDocument)
      res.send(updateResult)
    });


    app.get('/api/plans', async (req, res) => {
      const query = {};
      if (req.query.plan_id) {
        query.id = req.query.plan_id;
      }
      const results = await planCollection.find(query).toArray();
      res.send(results);
    });



    // application related api 


    app.get('/api/applications', verifyToken, verifySeeker, async (req, res) => {
      const query = {};
      if (req.query.applicantId) {
        query.applicantId = req.query.applicantId;
        if (req.user._id.toString() !== req.query.applicantId) {
          return res.status(403)
        }
      }
      const cursor = applicationCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/api/applications', async (req, res) => {
      const application = req.body;
      const newApplication = {
        ...application,
        createdAt: new Date()
      }
      const result = await applicationCollection.insertOne(newApplication);
      res.send(result);
    })



    // company related api 


    app.post('/api/companies', async (req, res) => {
      const company = req.body;
      const newCompany = {
        ...company,
        createdAt: new Date()
      }
      const result = await companyCollection.insertOne(newCompany);
      res.send(result);
    })

    app.get('/api/companies', async (req, res) => {
      const results = await companyCollection.find().toArray();
      res.send(results);
    })

    app.patch('/api/companies/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const updateCompany = req.body

      const filter = { _id: new ObjectId(id) }
      const updateOne = {
        $set: {
          status: updateCompany.status
        }
      }
      const result = await companyCollection.updateOne(filter, updateOne)
      res.send(result)
    })

    app.get('/api/my/companies', async (req, res) => {
      const query = {}
      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId
      } else {
        return res.status(400).send({ error: "recruiterId is required" });
      }
      const results = await companyCollection.findOne(query);
      res.send(results || {});
    })


    // job related api 


    app.post('/api/jobs', async (req, res) => {
      const job = req.body;
      const newJob = {
        ...job,
        createdAt: new Date()
      }
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })

    app.get('/api/jobs', async (req, res) => {

      const query = {}
      if (req.query.companyId) {
        query.companyId = req.query.companyId
      }
      const cursor = await jobsCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    })

    app.get('/api/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await jobsCollection.findOne(query);
      res.send(result);
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
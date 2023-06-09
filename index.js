require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(req.headers);

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorization access" });
  }
  const token = authorization.split(" ")[1];
  // console.log(token);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorization access 2" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.efhcwjr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const usersCollections = client.db("SoccerClubDB").collection("users");
    const instructorClassCollections = client
      .db("SoccerClubDB")
      .collection("instructorClass");

    // user related api
    // get Soccer club all user
    app.get("/users", verifyJWT, async (req, res) => {
      const result = await usersCollections.find().toArray();
      res.send(result);
    });
    // app.get("/user", verifyJWT, async (req, res) => {
    //   const result = await usersCollections.find().toArray();
    //   res.send(result);
    // });
    app.get("/instructors", async (req, res) => {
      const result = await usersCollections.find().toArray();
      res.send(result);
    });
    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      res.send({ token });
    });

    // Soccer club single users save
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existionUser = await usersCollections.findOne(query);
      if (existionUser) {
        return res.send("User", { message: existionUser });
      }
      const result = await usersCollections.insertOne(user);
      res.send(result);
    });

    // jwt assecc token

    // admin role curd oparation
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // create a document that sets the plot of the movie
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get instructors class
    app.get("/instructorsclass", verifyJWT, async (req, res) => {
      const result = await instructorClassCollections.find().toArray();
      res.send(result);
    });

    // post instructors class
    app.post("/instructorsclas", verifyJWT, async (req, res) => {
      const instructorsClass = req.body;
      // console.log(instructorsClass);
      const result = await instructorClassCollections.insertOne(
        instructorsClass
      );
      res.send(result);
    });

    // patch instructors status
    app.patch("/instructorsclass/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $unset: {
          status: "pending",
          // Use an empty value to remove the field
        },
        $set: {
          newStatus: "approved",
        },
      };
      const result = await instructorClassCollections.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // patch instructors status
    app.patch("/handleDenied/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $unset: {
          status: " ",
          // Use an empty value to remove the field
        },
        $set: {
          deniedStatus: "Denied",
        },
      };
      const result = await instructorClassCollections.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // Denied Feedback
    app.patch("/deniedFeedback/:id", async (req, res) => {
      const id = req.params.id;
      // const feedback = req.body;
      console.log(id, feedback);
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          Feedback: feedback,
        },
      };
      const result = instructorClassCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // handleDelete Class
    app.delete("/handleDelete/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // console.log(query);
      const result = await instructorClassCollections.deleteOne(filter);
      res.send(result);
    });

    // instructor role curd oparation
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // create a document that sets the plot of the movie
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("SOCCER CLUB SERVER RUNNING");
});

app.listen(port, () => {
  console.log(`Bistro app listening on port ${port}`);
});

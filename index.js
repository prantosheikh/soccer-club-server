require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.payment_secret_key);
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
        .send({ error: true, message: "unauthorization access 1" });
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
    const paymentsCollections = client
      .db("SoccerClubDB")
      .collection("payments");
    const instructorClassCollections = client
      .db("SoccerClubDB")
      .collection("instructorClass");
    const selectClassCollections = client
      .db("SoccerClubDB")
      .collection("classes");

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
    app.get("/instructors", verifyJWT, async (req, res) => {
      const result = await usersCollections.find().toArray();
      res.send(result);
    });

    // get all all Classes
    app.get("/allClasses", async (req, res) => {
      const result = await instructorClassCollections.find().toArray();
      res.send(result);
    });

    // jwt assecc token
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
      const query = { email: user.email };

      const existingUser = await usersCollections.findOne(query);

      if (existingUser) {
        return res.send({ message: " user already exists" });
      }
      const result = await usersCollections.insertOne(user);
      res.send(result);
    });

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

    //  post selecte classes
    app.post("/seleteClass", async (req, res) => {
      const classes = req.body;
      const result = await selectClassCollections.insertOne(classes);
      res.send(result);
    });

    app.get("/classes", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail);
      if (decodedEmail !== email) {
        return res
          .status(403)
          .send({ error: true, message: "forbiden access" });
      }
      const query = { "selecteClass.email": email };
      console.log(email);
      const result = await selectClassCollections.find(query).toArray();
      res.send(result);
    });

    // Delete Selected Class
    app.delete("/deleteSelectedClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectClassCollections.deleteOne(query);
      res.send(result);
    });

    // get instructors class
    app.get("/instructorsclass", verifyJWT, async (req, res) => {
      const result = await instructorClassCollections.find().toArray();
      res.send(result);
    });

    //  instructors class update
    app.put("/classUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateClass = req.body;
      console.log(updateClass.update.AvailableSeats);
      const classes = {
        $set: {
          "newCalss.AvailableSeats": updateClass.update.AvailableSeats,
          "newCalss.InstructorEmail": updateClass.update.InstructorEmail,
          "newCalss.ClassImage": updateClass.update.ClassImage,
          "newCalss.Price": updateClass.update.Price,
          "newCalss.InstructorName": updateClass.update.InstructorName,
          "newCalss.ClassName": updateClass.update.ClassName,
        },
      };
      const result = await instructorClassCollections.updateOne(
        filter,
        classes,
        options
      );
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(email);

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // instructor

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      console.log(email);

      const user = await usersCollections.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });
    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      console.log(email);

      const user = await usersCollections.findOne(query);
      const result = { student: user?.role === "Student" };
      res.send(result);
    });

    // enrolled
    app.get("/enrolled", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const result = await paymentsCollections.find({ email }).toArray();
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
    app.patch("/changestatus/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await instructorClassCollections.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // patch instructors status
    app.patch("/classDenied/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await instructorClassCollections.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // Denied Feedback
    app.patch("/deniedFeedback/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const feedback = req.body;
      // console.log(id, feedback);
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
    app.delete("/handleDelete/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // console.log(query);
      const result = await instructorClassCollections.deleteOne(filter);
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log("total price", price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      console.log(payment.newId);
      const Insert = await paymentsCollections.insertOne(payment);

      const query = {
        _id: { $in: payment.newId.map((id) => new ObjectId(id)) },
      };
      const Deletec = await selectClassCollections.deleteMany(query);

      res.send({ Insert, Deletec });
    });

    // app.get("/payments", verifyJWT, async (req, res) => {
    //   const result = await paymentsCollections.find().toArray();
    //   res.send(result);
    // });

    //  instructors my classes api
    app.get("/myClasses", verifyJWT, async (req, res) => {
      let query = {};
      const email = req.query.email;
      console.log(email);

      if (email) {
        query = { "newCalss.InstructorEmail": email };
      }
      console.log(query);
      const result = await instructorClassCollections.find(query).toArray();
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

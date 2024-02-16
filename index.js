const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
var cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://intimiti18:nXyA2bbwuoIPf1NE@cluster0.7k1zdza.mongodb.net/?retryWrites=true&w=majority`;

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['https://weather-app-by-fardin.netlify.app','http://localhost:5173'],
    credentials: true,
    methods: ["GET", "POST", "DELETE", "UPDATE","PUT","PATCH"],
  })
);

//custom middlewares
const verify = (req, res, next) => {
  const token = req.cookies["ema-zohan"];
  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.API_SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(401).send("Forbidden");
    }
    // console.log(decoded.email)
    res.user = decoded;
    next();
  });
};

// app.use(verify)

app.get("/", async (req, res) => {
  res.send("Blog Bloom Server is runnig!");
});

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
    // await client.connect();

    //collection
    const blogsColl = client.db("blog-bloom").collection("blogs");
    const advertiseColl = client
      .db("blog-bloom")
      .collection("advertise-banner-hero");
    const subscriberColl = client.db("blog-bloom").collection("subscriber");
    const commentsColl = client.db("blog-bloom").collection("comments");
    const wishlistColl = client.db("blog-bloom").collection("wishlist");

    //Add To Wishlist
    app.post("/api/v1/wishlist",verify, async (req, res) => {
      const blog = req.body;
      try {
        const result = await wishlistColl.insertOne(blog);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
      }
    });

    //Delete from Wishlist
    app.delete("/api/v1/wishlist/:id",verify, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      try {
        const result = await wishlistColl.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
      }
    });

    //Get wishlist blogs

    app.get("/api/v1/wishlist",verify, async (req, res) => {
      const query = {};
      const email = req.query.email;
      query.email = email;
      const category = req.query.category;
      const title = req.query.title;
      const page = Number(req.query?.page);
      const pageSize = Number(req.query?.pageSize);
      if (title) {
        query.title = title;
      }
      if (category) {
        query.category = category;
      }
      try {
        const result = await wishlistColl
        .find(query)
        .skip(page * pageSize)
        .limit(pageSize)
        .toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send("Server Error!");
      }
    });

    //Find total wishlist blog by countDocuments
    app.get("/api/v1/wishCount", async (req, res) => {
      const query = {};
      const email = req.query.email;
      if (email) {
        query.email = email;
      }
      try {
        const result = await wishlistColl.countDocuments(query);
        res.send({ result });
      } catch (error) {
        res.status(500).send("Server error!");
      }
    });

    //Add Comments
    app.post("/api/v1/comments", async (req, res) => {
      const comment = req.body;
      try {
        const result = await commentsColl.insertOne(comment);
        res.send(result);
      } catch (err) {
        res.status(500).send("Server error!");
      }
    });

    //Get comments for spasific blog
    app.get("/api/v1/comments", async (req, res) => {
      const query = {};
      const commentId = req.query.commentId;
      if (commentId) {
        query.commentId = commentId;
      }
      try {
        const result = await commentsColl.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send("Server Error!");
      }
    });

    // Add Subscriber api
    app.post("/api/v1/subscriber", async (req, res) => {
      const user = req.body;
      try {
        const result = await subscriberColl.insertOne(user);
        res.send(result);
      } catch (err) {
        res.status(500).send("Server error!");
      }
    });
    //Filter Subscriber api
    app.get("/api/v1/subscriber", async (req, res) => {
      const query = {};
      const email = req.body;
      if (email) {
        query.email = email;
      }
      console.log(query);

      try {
        const result = await subscriberColl.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500);
      }
    });

    //Auth related api
    app.post("/api/v1/jwt", async (req, res) => {
      const email = req.body.email;
      // console.log(email)
      const token = jwt.sign({ email }, process.env.API_SECRET_KEY, {
        expiresIn: "1h",
      });
      try {
        // console.log(token);
        res
          .cookie("ema-zohan", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send(token);
      } catch (error) {}
    });

  //find blogs by details length

  app.get("/api/v1/top/blogs",async (req,res) => { 
    try {
      const result = await blogsColl
      .aggregate([
        {
          $addFields: {
            wordCount: { $size: { $split: ['$details', ' '] } },
          },
        },
        { $sort: { wordCount: -1 } },
        { $limit: 10 },
      ])
      .toArray();
    
      res.send(result)
    
    } catch (err) {
      console.log(err)
      res.status(500).send("Server error!")
    }
   })

    //find blogs with Filter and sorting functionality
    app.get("/api/v1/blogs", async (req, res) => {
      const queryObj = {};
      const sortObj = {};
      
      const sortFild = req.query?.sortFild;
      const sortOrder = req.query?.sortOrder;
      const category = req.query?.category;
      const label = req.query?.label;
      const page = Number(req.query?.page);
      const pageSize = Number(req.query?.pageSize);
      const email = req.query?.email;
      const title = req.query?.title;

      if (title) {
        queryObj.title = { $regex: new RegExp(title, "i") };
      }
      if (category) {
        queryObj.category = category;
      }
      if (label) {
        queryObj.label = label;
      }
      if (email) {
        queryObj.email = email;
      }

      if (sortOrder && sortOrder) {
        sortObj[sortFild] = sortOrder;
      }

      try {
        const result = await blogsColl
          .find(queryObj)
          .skip(page * pageSize)
          .limit(pageSize)
          .sort(sortObj)
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    //find blog by id
    app.get(`/api/v1/blogs/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await blogsColl.findOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send("server error!");
      }
    });

    //Find total blog by countDocuments
    app.get("/api/v1/blogCount", async (req, res) => {
      const query = {};
      const category = req.query.category;
      const title = req.query.title;
      if (title) {
        query.title = title;
      }
      if (category) {
        query.category = category;
      }
      // console.log(query)
      // Logging for debugging
      // console.log("Received request with category:", category);
      // console.log("Received request with title:", title);
      try {
        const result = await blogsColl.countDocuments(query);
        res.send({ result });
      } catch (error) {
        res.status(500).send("Server error!");
      }
    });

    //find specific blog by id
    app.get("/api/v1/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await blogsColl.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send("Server Error!");
      }
    });

    //Add blog api
    app.post("/api/v1/blogs",verify, async (req, res) => {
      const blog = req.body;
      try {
        const result = await blogsColl.insertOne(blog);
        res.send(result);
      } catch (err) {
        res.status(500).send("Server Error!");
      }
    });
    //Update blog api
    app.put("/api/v1/update/:id",verify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const blog = req.body;
      const update = {
        $set: blog,
      };
      try {
        const result = await blogsColl.updateOne(query, update);
        res.send(result);
      } catch (err) {
        res.status(500).send("Server Error!");
      }
    });
    //Delete blog api
    app.delete("/api/v1/delete/:id",verify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await blogsColl.deleteOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send("Server Error!");
      }
    });

    //Advertise related api's
    app.get("/api/v1/advertise", async (req, res) => {
      const query = {};
      const category = req.query.category;
      if (category) {
        query.category = category;
      }
      try {
        const result = await advertiseColl.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send("Server error!");
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is runnig on port: ${port}`);
});

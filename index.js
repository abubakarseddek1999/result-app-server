const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize session middleware
app.use(session({
    secret: 'your_secret_key',  // Use a secure secret in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set 'secure: true' for HTTPS environments
}));



const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// MongoDB connection URI
const uri = `mongodb+srv://result-app:PaXcs7Dn8I5pYVK2@cluster0.bidtnbd.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect to MongoDB
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const subjectCollection = client.db("result-app").collection("subjects");
        const resultCollection = client.db("result-app").collection("results");
        const usersCollection = client.db("result-app").collection("users");

        // Add a new subject to the collection
        app.post("/subjects", async (req, res) => {
            try {
                const subject = req.body;
                console.log(subject);
                const result = await subjectCollection.insertOne(subject);


                res.status(201).json({
                    newSubject: { _id: result.insertedId, name: subject }
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to add subject." });
            }
        });
        app.post("/results", async (req, res) => {
            try {
                const resultData = req.body;
                const result = await resultCollection.insertOne(resultData);



                res.status(201).json({
                    result
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to add result." });
            }
        });



        // Update an existing subject in the collection
        app.patch("/subjects/:id", async (req, res) => {
            try {
                const { id } = req.params; // Get the subject ID from the request params
                const { name } = req.body; // Get the new name from the request body

                if (!name || !name.trim()) {
                    return res.status(400).json({ message: "Name is required and cannot be empty." });
                }

                console.log("Updating subject with ID:", id);
                console.log("New name:", name);

                // Update the subject in the database
                const result = await subjectCollection.updateOne(
                    { _id: new ObjectId(id) }, // Use ObjectId properly here
                    { $set: { name } } // Set the new name
                );

                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: "Subject updated successfully." });
                } else {
                    res.status(404).json({ message: "Subject not found." });
                }
            } catch (error) {
                console.error("Error updating subject:", error);
                res.status(500).json({ message: "Failed to update subject." });
            }
        });

        // Get all subjects from the collection
        app.get("/subjects", async (req, res) => {
            try {
                const subjects = await subjectCollection.find().toArray();
                res.status(200).json(subjects);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fetch subjects." });
            }
        });
        app.get("/results", async (req, res) => {
            try {
                const results = await resultCollection.find().toArray();
                res.status(200).json(results);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Failed to fetch results." });
            }
        });

        app.get("/api/results", async (req, res) => {
            try {
                const { studentID } = req.query; // Get studentID from query params
                console.log(studentID);
                if (!studentID) {
                    return res.status(400).json({ message: "Student ID is required." });
                }

                // Query to find the result by studentID
                const result = await resultCollection.findOne({ studentId: studentID });
                console.log("result", result);
                // If result is found, return it, else return a message
                if (result) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({ message: "No result found for the given student ID." });
                }
            } catch (error) {
                console.error("Error fetching results:", error);
                res.status(500).json({ message: "Failed to fetch results." });
            }
        });


        // Delete a subject from the collection

        app.delete("/subjects/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await subjectCollection.deleteOne(query);
            res.send(result);
        });

        // register a new user

        app.post("/register", async (req, res) => {
            try {
                const { name, email, password } = req.body;

                if (!name || !email || !password) {
                    return res.status(400).json({ message: "All fields are required." });
                }

                const usersCollection = client.db("result-app").collection("users");

                // Check if user already exists
                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: "Email already registered." });
                }

                // Hash the password before saving it
                const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

                // Insert the new user with the hashed password
                const result = await usersCollection.insertOne({ name, email, password: hashedPassword });
                res.status(201).json({ message: "User registered successfully", userId: result.insertedId });
            } catch (error) {
                console.error("Error registering user:", error);
                res.status(500).json({ message: "Failed to register user." });
            }
        });


        // User login
        app.post("/login", async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ message: "Email and password are required." });
                }

                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(400).json({ message: "Invalid email or password." });
                }

                // Compare the provided password with the hashed password in the database
                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return res.status(400).json({ message: "Invalid email or password." });
                }

                // Generate a JWT token
                const token = jwt.sign(
                    { id: user._id, name: user.name, email: user.email },
                    'your_secret_key',
                    { expiresIn: '1h' }
                );

                res.status(200).json({
                    message: "Login successful",
                    token: token // Send token in the response
                });
            } catch (error) {
                console.error("Error logging in:", error);
                res.status(500).json({ message: "Failed to login." });
            }
        });






    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
    } finally {
        // Close the MongoDB connection when done
        // Ensure that the client will close when the app is finished or errors
        // (optional) You can add process exit event listener to ensure graceful shutdown
        process.on('SIGINT', () => {
            client.close();
            console.log("MongoDB connection closed");
            process.exit(0);
        });
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('users-server is running');
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

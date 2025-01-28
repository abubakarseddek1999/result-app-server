const express = require('express');
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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


        // Delete a subject from the collection

        app.delete("/subjects/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await subjectCollection.deleteOne(query);
            res.send(result);
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

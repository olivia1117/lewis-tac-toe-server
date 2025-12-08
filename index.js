const express = require('express');
const cors = require("cors");
const url = require('url');
const dt = require('./date-time');
require('dotenv').config();

const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;
const majorVersion = 1;
const minorVersion = 3;

// For file uploads 
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');


// ------------------------------
// MIDDLEWARE
// ------------------------------

// Parse JSON globally
app.use(express.json());

// Enable CORS for all origins (good for local testing)
app.use(cors({
//   origin: '*', //use this for testing locally
  origin: ['https://lewistactoe.lewisunivcs.com', 'http://localhost:3000', 'http://localhost:3001'], // your React app domain
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Serve static files
app.use(express.static(__dirname + '/static'));

const storage = multer.memoryStorage();
const upload = multer({ storage });


// ------------------------------
// MONGO DB SETUP
// ------------------------------
const client = new MongoClient(process.env.MONGO_URI);
let db;
// let filesDb;
let gfsBucket;

async function startServer() {
  try {
    await client.connect();
    db = client.db(process.env.MONGO_DB);
    console.log("Connected to MongoDB Atlas (login DB):", process.env.MONGO_DB);

	// filesDb = client.db(process.env.FILES_DB); // separate files database
	// console.log("Connected to MongoDB Atlas (files DB):", process.env.FILES_DB);

	//Initialize GridFS bucket for file storage
    gfsBucket = new GridFSBucket(db, { bucketName: "fs" });

    // Start Express server AFTER DB is connected
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
}

startServer();


// Log login attempts
app.post('/api/log-login', async (req, res) => {
  try {
    const { email, name, timestamp } = req.body;

    await db.collection("logins").insertOne({
      email,
      name,
      timestamp
    });

    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// Retrieve login history
app.get('/api/logins', async (req, res) => {
  if (!db) {
	return res.status(500).json({ error: "Database not connected" });
  }
  try {
    const logins = await db.collection("logins")
      .find()
      .sort({ timestamp: -1 })
      .toArray();

    res.json(logins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load login history" });
  }
});

// Upload a file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const readableFile = new Readable();
  readableFile.push(req.file.buffer);
  readableFile.push(null);

  const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
    metadata: { uploadedBy: req.body.email || "anonymous" }
  });

  readableFile.pipe(uploadStream)
    .on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    })
    .on('finish', () => {
      res.json({ message: "File uploaded successfully", fileId: uploadStream.id });
    });
});

// // Upload a file
// app.post('/api/upload', upload.single('file'), async (req, res) => {
//   if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//   const readableFile = new Readable();
//   readableFile.push(req.file.buffer);
//   readableFile.push(null);

//   // Use gfsBucket from the separate files DB
//   const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
//     metadata: { uploadedBy: req.body.email || "anonymous" }
//   });

//   readableFile.pipe(uploadStream)
//     .on('error', (err) => {
//       console.error(err);
//       res.status(500).json({ error: "Upload failed" });
//     })
//     .on('finish', () => {
//       res.json({ message: "File uploaded successfully", fileId: uploadStream.id });
//     });
// });



// Download a file by filename
app.get('/api/files/:filename', async (req, res) => {
  try {
    const file = await db.collection("fs.files").findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ error: "File not found" });

    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    const downloadStream = gfsBucket.openDownloadStreamByName(req.params.filename);
    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// // Download a file by filename
// app.get('/api/files/:filename', async (req, res) => {
//   try {
//     const file = await filesDb.collection("fs.files").findOne({ filename: req.params.filename });
//     if (!file) return res.status(404).json({ error: "File not found" });

//     res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
//     const downloadStream = gfsBucket.openDownloadStreamByName(req.params.filename);
//     downloadStream.pipe(res);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to download file" });
//   }
// });


// List all files
app.get('/api/files', async (req, res) => {
  try {
    const files = await db.collection("fs.files").find().toArray();
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// // List all files
// app.get('/api/files', async (req, res) => {
//   try {
//     const files = await filesDb.collection("fs.files").find().toArray();
//     res.json(files);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to list files" });
//   }
// });

// Other endpoints remain the same
app.get('/about', (req, res) => {
  console.log('Calling "/about" on the Node.js server.');
  res.type('text/plain');
  res.send('About Node.js on Azure Template.');
});

app.get('/version', (req, res) => {
  console.log('Calling "/version" on the Node.js server.');
  res.type('text/plain');
  res.send('Version: ' + majorVersion + '.' + minorVersion);
});

app.get('/api/ping', (req, res) => {
  console.log('Calling "/api/ping"');
  res.type('text/plain');
  res.send('ping response');
});

app.get('/2plus2', (req, res) => {
  console.log('Calling "/2plus2" on the Node.js server.');
  res.type('text/plain');
  res.send('4');
});

app.get('/add-two-integers', (req, res) => {
  console.log('Calling "/add-two-integers" on the Node.js server.');
  const inputs = url.parse(req.url, true).query;
  const x = parseInt(inputs.x);
  const y = parseInt(inputs.y);
  const sum = x + y;
  res.type('text/plain');
  res.send(sum.toString());
});

app.get('/calculate-bmi', (req, res) => {
  console.log('Calling "/calculate-bmi" on the Node.js server.');
  const inputs = url.parse(req.url, true).query;
  const heightFeet = parseInt(inputs.feet);
  const heightInches = parseInt(inputs.inches);
  const weight = parseInt(inputs.lbs);

  console.log('Height:' + heightFeet + '\'' + heightInches + '\"');
  console.log('Weight:' + weight + ' lbs.');

  res.type('text/plain');
  res.send('Todo: Implement "/calculate-bmi"');
});

app.get('/test', (req, res) => {
  console.log(req);
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('<h3>Testing Function</h3>');
  res.write("The date and time are currently: " + dt.myDateTime() + "<br><br>");
  res.write("req.url=" + req.url + "<br><br>");
  res.write("Consider adding '/test?year=2017&month=July' to the URL.<br><br>");
  const q = url.parse(req.url, true).query;
  const txt = q.year + " " + q.month;
  res.write("txt=" + txt);
  res.end('<h3>The End.</h3>');
});

const batMan = {
  "firstName":"Bruce",
  "lastName":"Wayne",
  "preferredName":"Batman",
  "email":"darkknight@lewisu.edu",
  "phoneNumber":"800-bat-mann",
  "city":"Gotham",
  "state":"NJ",
  "zip":"07101",
  "lat":"40.73",
  "lng":"-74.17",
  "favoriteHobby":"Flying",
  "class":"cpsc-24700-001",
  "room":"AS-104-A",
  "startTime":"2 PM CT",
  "seatNumber":"",
  "inPerson":["Monday","Wednesday"],
  "virtual":["Friday"]
};

app.get('/batman', (req, res) => {
  console.log('Calling "/batman" on the Node.js server.');
  res.type('application/json');
  res.send(JSON.stringify(batMan));
});

const favoritePlaces = require('./FavoritePlaces.json');
app.get('/api/favorite-places', (req, res) => {
  res.json(favoritePlaces);
});

// ------------------------------
// ERROR HANDLING
// ------------------------------
app.use((req, res) => {
  res.type('text/plain');
  res.status(404);
  res.send('404 - Not Found');
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.type('text/plain');
  res.status(500);
  res.send('500 - Server Error');
});


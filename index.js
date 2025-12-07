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

// ------------------------------
// MIDDLEWARE
// ------------------------------

// Parse JSON globally
app.use(express.json());

// Enable CORS for all origins (good for local testing)
app.use(cors({
//   origin: '*', //use this for testing locally
  origin: ['https://lewistactoe.lewisunivcs.com'], // your React app domain
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Serve static files
app.use(express.static(__dirname + '/static'));

// ------------------------------
// MONGO DB SETUP
// ------------------------------
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectToDB() {
  try {
    await client.connect();
    db = client.db(process.env.MONGO_DB);
    console.log("Connected to MongoDB Atlas", process.env.MONGO_DB);
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}

connectToDB();
console.log("db value:", db);


// ------------------------------
// API ENDPOINTS
// ------------------------------

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
  try {
    const data = await db.collection("logins")
      .find()
      .sort({ timestamp: -1 })
      .toArray();

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load login history" });
  }
});

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

// ------------------------------
// START SERVER
// ------------------------------
app.listen(port, () => console.log(
  `Express started at http://localhost:${port}\npress Ctrl-C to terminate.`)
);

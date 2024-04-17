const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080; // Default port 8080

app.set("view engine", "ejs");// Set EJS as the templating engine

// Middleware to parse request bodies and cookies
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

///////////////////////////////////////////////////////
// Data storage
///////////////////////////////////////////////////////

const urlDatabase = {
  b2xVn2: "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

///////////////////////////////////////////////////////
// Helper functions
///////////////////////////////////////////////////////

const generateRandomString = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * characters.length); // Generates a random index for characters
    result += characters[index]; // Adds the random generated index to select from characters
  }
  return result;
};
// helper function for getting a user by their email
const getUserByEmail = function(email) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
};

///////////////////////////////////////////////////////
// Basic routes
///////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

///////////////////////////////////////////////////////
// URL management routes
///////////////////////////////////////////////////////

// Main page for URL listing, passing user object and URLs to the template
app.get("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  const user = users[userId];
  const templateVars = { user: user, urls: urlDatabase };
  res.render("urls_index", templateVars);
});

// Endpoint to handle creation of short URLs
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString(); // Generate a short URL identifier
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`); // Redirect to the page showing the new short URL
});

// Endpoint to update an existing URL
app.post("/urls/:id/update", (req, res) => {
  const id = req.params.id; // Get the ID from the URL parameter
  const newURL = req.body.newURL;
  if (urlDatabase[id]) {
    urlDatabase[id] = newURL; // Update the existing entry with the new URL
    res.redirect('/urls');
  } else {
    res.status(404).send('URL not found');
  }
});

// Endpoint for deleting URLs
app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id; // Get the ID from the URL parameter
  if (urlDatabase[id]) {
    delete urlDatabase[id];
    res.redirect('/urls');
  } else {
    res.status(404).send('URL not found');
  }
});

// Display the page for creating new URLs and pass the user object
app.get("/urls/new", (req, res) => {
  const userId = req.cookies["user_id"];
  const user = users[userId];
  res.render("urls_new", { user: user });
});
// Detail view for a single short URL, and passes the user object
app.get("/urls/:id", (req, res) => {
  const userId = req.cookies["user_id"];
  const user = users[userId];
  const id = req.params.id;
  const longURL = urlDatabase[id];
  const templateVars = { user: user, id: id, longURL: longURL };
  res.render("urls_show", templateVars);
});
// Redirect from a short URL to the actual URL
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL]; // Gets the longURL associated with the shortURL then redirects
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send('URL not found');
  }
});

///////////////////////////////////////////////////////
// User auth routes
///////////////////////////////////////////////////////

// Handle user login, setting a cookie with user ID
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email);

  if (user && user.password === password) {
    res.cookie('user_id', user.id);
    res.redirect('/urls');
  }
  res.status(401).send('Invalid credentials');
});

// Handle user logout, clearing the username cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id'); // Clear the 'user_id' cookie
  res.redirect('/urls');
});

///////////////////////////////////////////////////////
// Register
///////////////////////////////////////////////////////

// Route to display the registration form
app.get("/register", (req, res) => {
  res.render("register");
});

// Route to handle the POST request from the registration form
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  // Validation for email & password
  if (!email || !password) {
    return res.status(400).send('Email and/or password cannot be empty.');
  }
  // Check if email is already registered
  if (getUserByEmail(email)) {
    return res.status(400).send('Email already registered.');
  }

  // Generate a random user ID
  const userID = generateRandomString();

  // Create new user object
  users[userID] = {
    id: userID,
    email: email,
    password: password
  };

  // set a cookie named 'user_id' with new user ID
  res.cookie('user_id', userID);
  res.redirect('/urls');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

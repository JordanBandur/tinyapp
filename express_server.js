const express = require("express");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
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
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
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

// helper which returns the URLs where the userID is equal to the id of the currently logged-in user.
const urlsForUser = function(id) {
  const userUrls = {};
  for (const urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === id) {
      userUrls[urlId] = urlDatabase[urlId];
    }
  }
  return userUrls;
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
  const user = users[req.cookies["user_id"]] || null;
  if (!user) {
    return res.status(401).send('Please log in or register.');
  }
  const userUrls = urlsForUser(user.id); // Get URLs specific to the logged-in user
  const templateVars = { user: user, urls: userUrls };
  res.render("urls_index", templateVars);
});

// Endpoint to handle creation of short URLs
app.post("/urls", (req, res) => {
  const user = users[req.cookies["user_id"]] || null;
  if (!user) { // If the user is not logged in, send an HTML message and do not add the URL to the "database"
    return res.status(401).send('<html><body><p>You must be logged in to shorten URLs.</p></body></html>');
  }
  const shortURL = generateRandomString(); // Generate a short URL identifier
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: user.id };
  res.redirect(`/urls/${shortURL}`); // Redirect to the page showing the new short URL
});

// Endpoint to update an existing URL
app.post("/urls/:id/update", (req, res) => {
  const user = users[req.cookies["user_id"]] || null;
  const id = req.params.id;

  // Check if user is logged in
  if (!user) {
    return res.status(401).send("You must be logged in to update URLs.");
  }
  // Check if the URL exists
  if (!urlDatabase[id]) {
    return res.status(404).send("The URL you are trying to update does not exist.");
  }
  // Check if the logged-in user owns the URL
  if (urlDatabase[id].userID !== user.id) {
    return res.status(403).send("You do not have permission to update this URL.");
  }

  urlDatabase[id].longURL = req.body.newURL;
  res.redirect('/urls');
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
  const user = users[req.cookies["user_id"]] || null;
  if (!user) {
    return res.redirect("/login"); // Redirect to login if the user is not logged in
  }
  res.render("urls_new", { user: user });
});

// Detail view for a single short URL, and passes the user object
app.get("/urls/:id", (req, res) => {
  const user = users[req.cookies["user_id"]] || null;
  const id = req.params.id;

  // Check if user is logged in
  if (!user) {
    return res.status(401).send("Please log in to view this page.");
  }
  // Check if the URL exists in the database
  if (!urlDatabase[id]) {
    return res.status(404).send("The requested URL does not exist.");
  }
  // Check if the logged in user owns the URL
  if (urlDatabase[id].userID !== user.id) {
    return res.status(403).send("You do not have permission to view this URL.");
  }

  const longURL = urlDatabase[id].longURL;
  const templateVars = { user: user, id: id, longURL: longURL };
  res.render("urls_show", templateVars);
});

// Redirect from a short URL to the actual URL
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL].longURL; // Gets the longURL associated with the shortURL then redirects
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send('URL not found');
  }
});

///////////////////////////////////////////////////////
// User auth routes
///////////////////////////////////////////////////////

// Route to display the login form
app.get("/login", (req, res) => {
  const user = users[req.cookies["user_id"]] || null;
  if (user) { // redirect client if user is already logged in
    return res.redirect("/urls");
  }
  res.render("login", { user });
});

// Handle user login, setting a cookie with user ID
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email);

  if (user) {
    // Compare submitted password with hashed password in the user object
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        res.cookie('user_id', user.id);
        return res.redirect('/urls');
      } else {
        return res.status(401).send('Invalid credentials');
      }
    });
  } else {
    return res.status(401).send('Invalid credentials');
  }
});

// Handle user logout, clearing the user_id cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id'); // Clear the 'user_id' cookie
  res.redirect('/login');
});

///////////////////////////////////////////////////////
// Register
///////////////////////////////////////////////////////

// Route to display the registration form
app.get("/register", (req, res) => {
  const user = users[req.cookies["user_id"]] || null;
  if (user) { // redirect client if user is already logged in
    return res.redirect("/urls");
  }
  res.render("register", { user });
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

  // Hash the password before storing it
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).send('Error while hashing the password.');
    }

    // Create new user object with hashed password
    users[userID] = {
      id: userID,
      email: email,
      password: hash // Storing the hashed password
    };

    // Set a cookie named 'user_id' with the new user ID
    res.cookie('user_id', userID);
    res.redirect('/urls');
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

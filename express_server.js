const express = require("express");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');
const { getUserByEmail, generateRandomString, urlsForUser } = require("./helpers");
const app = express();
const PORT = 8080; // Default port 8080

app.set("view engine", "ejs");// Set EJS as the templating engine

// Middleware to parse request bodies and cookies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'], // These are the keys used to encrypt the cookie
}));
app.use(methodOverride('_method'));

///////////////////////////////////////////////////////
// Data storage
///////////////////////////////////////////////////////

const urlDatabase = {};
// Each short URL entry will now also track visits and unique visitors
const initializeURL = function(longURL, userID) {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL,
    userID,
    visitCount: 0,
    uniqueVisitors: new Set(),
    visitDetails: []
  };
  return shortURL;
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
// Basic routes
///////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.redirect(302, '/login');
});

///////////////////////////////////////////////////////
// URL management routes
///////////////////////////////////////////////////////

// Main page for URL listing, passing user object and URLs to the template
app.get("/urls", (req, res) => {
  const user = users[req.session.user_id] || null;
  if (!user) {
    return res.status(401).send('Please log in or register.');
  }
  const userUrls = urlsForUser(user.id, urlDatabase); // Get URLs specific to the logged-in user
  const templateVars = { user: user, urls: userUrls };
  res.render("urls_index", templateVars);
});

// Endpoint to handle creation of short URLs
app.post("/urls", (req, res) => {
  const user = users[req.session.user_id] || null;
  if (!user) { // If the user is not logged in, send an HTML message and do not add the URL to the "database"
    return res.status(401).send('<html><body><p>You must be logged in to shorten URLs.</p></body></html>');
  }
  const shortURL = initializeURL(req.body.longURL, user.id);
  res.redirect(`/urls/${shortURL}`); // Redirect to the page showing the new short URL
});

// Endpoint to update an existing URL
app.put("/urls/:id", (req, res) => {
  const user = users[req.session.user_id] || null;
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
app.delete("/urls/:id", (req, res) => {
  const user = users[req.session.user_id] || null;
  const id = req.params.id;

  // Check if user is logged in
  if (!user) {
    return res.status(401).send("You must be logged in to delete URLs.");
  }
  // Check if the URL exists
  if (!urlDatabase[id]) {
    return res.status(404).send("The URL you are trying to delete does not exist.");
  }
  // Check if the logged-in user owns the URL
  if (urlDatabase[id].userID !== user.id) {
    return res.status(403).send("You do not have permission to delete this URL.");
  }

  delete urlDatabase[id];
  res.redirect('/urls');
});

// Display the page for creating new URLs and pass the user object
app.get("/urls/new", (req, res) => {
  const user = users[req.session.user_id] || null;
  if (!user) {
    return res.redirect("/login"); // Redirect to login if the user is not logged in
  }
  res.render("urls_new", { user: user });
});

// Detail view for a single short URL, and passes the user object
app.get("/urls/:id", (req, res) => {
  const user = users[req.session.user_id] || null;
  const id = req.params.id;

  if (!user) {
    return res.status(401).send("Please log in to view this page.");
  }
  if (!urlDatabase[id]) {
    return res.status(404).send("The requested URL does not exist.");
  }
  if (urlDatabase[id].userID !== user.id) {
    return res.status(403).send("You do not have permission to view this URL.");
  }

  const templateVars = {
    user: user,
    id: id,
    longURL: urlDatabase[id].longURL,
    visitCount: urlDatabase[id].visitCount,
    uniqueVisitorCount: urlDatabase[id].uniqueVisitors.size,
    visits: urlDatabase[id].visitDetails || []
  };
  res.render("urls_show", templateVars);
});

// Redirect from a short URL to the actual URL
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send('URL not found');
  }

  // Increment the total visit count
  urlDatabase[shortURL].visitCount++;

  // Determine the visitor ID
  let visitorID = req.session.visitorID;
  if (!visitorID) {
    visitorID = generateRandomString();
    req.session.visitorID = visitorID;
  }

  // Add to unique visitors set
  urlDatabase[shortURL].uniqueVisitors.add(visitorID);
  let date = new Date();
  const formattedDate = date.toLocaleString('en-US', { timeZoneName: 'short' }).toString();
  // Log the visit
  urlDatabase[shortURL].visitDetails.push({
    timestamp: formattedDate,
    visitorID
  });

  res.redirect(urlDatabase[shortURL].longURL);
});

///////////////////////////////////////////////////////
// User auth routes
///////////////////////////////////////////////////////

// Route to display the login form
app.get("/login", (req, res) => {
  const user = users[req.session.user_id] || null;
  if (user) { // redirect client if user is already logged in
    return res.redirect("/urls");
  }
  res.render("login", { user });
});

// Handle user login, setting a cookie with user ID
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);

  if (user) {
    // Compare submitted password with hashed password in the user object
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        // eslint-disable-next-line camelcase
        req.session.user_id = user.id; // Set user_id in session
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
  req.session = null; // Clear the session
  res.redirect('/login');
});

///////////////////////////////////////////////////////
// Register
///////////////////////////////////////////////////////

// Route to display the registration form
app.get("/register", (req, res) => {
  const user = users[req.session.user_id] || null;
  if (user) { // redirect client if user is already logged in
    return res.redirect("/urls");
  }
  res.render("register", { user });
});

// Route to handle the POST request from the registration form
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  // Validation for email & password
  if (!email.trim() || !password) {
    return res.status(400).send('Email and/or password cannot be empty.');
  }
  // Check if email is already registered
  if (getUserByEmail(email, users)) {
    return res.status(400).send('Email already registered.');
  }

  // Hash the password before storing it
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).send('Error while hashing the password.');
    }

    // Generate a random user ID
    const userID = generateRandomString();
    // Create new user object with hashed password
    users[userID] = {
      id: userID,
      email: email,
      password: hash // Storing the hashed password
    };

    // Set a cookie named 'user_id' with the new user ID
    // eslint-disable-next-line camelcase
    req.session.user_id = userID;
    res.redirect('/urls');
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

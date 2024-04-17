const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");// Set EJS as the templating engine

// Middleware to parse request bodies and cookies
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const urlDatabase = {
  b2xVn2: "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
};

const generateRandomString = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * characters.length); // generates a random index for characters
    result += characters[index]; // adds the random generated index to select from characters
  }
  return result;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});
// Main page for URL listing, passing username and URLs to the template
app.get("/urls", (req, res) => {
  const templateVars = { username: req.cookies["username"], urls: urlDatabase };
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
// Handle user login, setting a cookie with the username
app.post("/login", (req, res) => {
  const username = req.body.username;
  if (username) {
    res.cookie('username', username); // Set a cookie named 'username' with the value from the body
    res.redirect('/urls');
  } else {
    res.status(400).send('No username provided');
  }
});
// Handle user logout, clearing the username cookie
app.post("/logout", (req, res) => {
  res.clearCookie('username'); // Set a cookie named 'username' with the value from the body
  res.redirect('/urls');
});
// Display the page for creating new URLs
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});
// Detail view for a single short URL
app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  const longURL = urlDatabase[id]; // Retrieve the long URL using the id from the urlDatabase
  const templateVars = { username: req.cookies["username"], id: id, longURL: longURL };
  res.render("urls_show", templateVars);
});
// Redirect from a short URL to the actual URL
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL]; // gets the longURL associated with the shortURL then redirects
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send('URL not found');
  }
});
// Route to display the registration form
app.get("/register", (req, res) => {
  res.render("register");
});
// Route to handle the POST request from the registration form
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  // Process the registration (e.g., save to database, validation)
  // For now, just return a simple message
  res.send(`Registered with email: ${email}`);
});
// Start the server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

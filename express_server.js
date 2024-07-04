const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 8080;
const { getUserByEmail } = require('./helpers');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
app.set('view engine', 'ejs');

// Helper function to generate a random string for user IDs and short URLs
const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

// In-memory databases for users and URLs
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10),
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10),
  },
};

const urlDatabase = {
  b2xVn2: {
    longURL: "http://www.lighthouselabs.ca",
    userID: "userRandomID",
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "user2RandomID",
  },
};

// Middleware to check if the user is logged in
const requireLogin = (req, res, next) => {
  const userId = req.session.user_id;
  if (!userId || !users[userId]) {
    return res.redirect('/login');
  }
  next();
};

// Home route redirects to /urls if logged in, otherwise to /login
app.get("/", (req, res) => {
  const user = users[req.session.user_id];
  if (user) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

// Display user's URLs
app.get('/urls', (req, res) => {
  console.log('Session:', req.session); // Log entire session object

  const userId = req.session.user_id;
  console.log('User ID from session:', userId); // Log the user ID from session

  if (!userId || !users[userId]) {
    const templateVars = { user: null, message: "Please log in to view your URLs." };
    console.log("User not logged in or not found"); // Debug logging
    return res.status(403).render('error', templateVars);
  }
  
  const userUrls = {};
  for (const urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === userId) {
      userUrls[urlId] = urlDatabase[urlId];
    }
  }
  
  const user = users[userId];
  const templateVars = { user, urls: userUrls };
  console.log("Rendering urls_index with user URLs", templateVars); // Debug logging
  res.render('urls_index', templateVars);
});

// Display form to create a new URL
app.get("/urls/new", requireLogin, (req, res) => {
  const user = users[req.session.user_id];
  const templateVars = { user };
  res.render("urls_new", templateVars);
});

// Display a specific URL and its details
app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const id = req.params.id;
  const url = urlDatabase[id];

  if (!userId || !users[userId]) {
    const templateVars = { user: null, message: "You need to log in to view URL details." };
    return res.status(403).render('error', templateVars);
  }

  if (!url || url.userID !== userId) {
    const templateVars = { user: users[userId], message: "You do not have permission to access this URL." };
    return res.status(403).render("error", templateVars);
  }

  const user = users[userId];
  const templateVars = { user, id, longURL: url.longURL };
  res.render("urls_show", templateVars);
});

// Create a new short URL
app.post("/urls", requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const longURL = req.body.longURL;
  const id = generateRandomString();
  urlDatabase[id] = { longURL, userID: userId };
  res.redirect(`/urls/${id}`);
});

// Delete a URL
app.post('/urls/:id/delete', requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const id = req.params.id;
  if (!urlDatabase[id]) {
    return res.status(404).render("error", { message: "URL not found." });
  }
  if (urlDatabase[id].userID !== userId) {
    return res.status(403).render("error", { message: "You do not have permission to delete this URL." });
  }
  delete urlDatabase[id];
  res.redirect('/urls');
});

// Update a URL
app.post('/urls/:id', requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const id = req.params.id;
  const newLongURL = req.body.longURL;
  if (!urlDatabase[id]) {
    return res.status(404).render("error", { message: "URL not found." });
  }
  if (urlDatabase[id].userID !== userId) {
    return res.status(403).render("error", { message: "You do not have permission to edit this URL." });
  }
  urlDatabase[id].longURL = newLongURL;
  res.redirect('/urls');
});

// Login route
app.get('/login', (req, res) => {
  const userId = req.session.user_id;
  if (userId && users[userId]) {
    return res.redirect('/urls');
  }
  const templateVars = { user: null };
  res.render('login', templateVars);
});

// Handle login form submission
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);

  if (!user) {
    return res.status(403).send('Invalid email or password');
  }

  try {
    if (bcrypt.compareSync(password, user.password)) {
      req.session.user_id = user.id;
      console.log(`User ${user.id} logged in successfully`); // Debug logging
      return res.redirect('/urls');
    } else {
      return res.status(403).send('Invalid email or password');
    }
  } catch (err) {
    console.error('Error comparing passwords:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// Logout route
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// Registration route
app.get('/register', (req, res) => {
  const userId = req.session.user_id;
  if (userId && users[userId]) {
    return res.redirect('/urls');
  }
  const templateVars = { user: null };
  res.render('register', templateVars);
});

// Handle registration form submission
app.post('/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email and Password cannot be blank');
  }

  if (getUserByEmail(email, users)) {
    return res.status(400).send('Email already registered');
  }

  try {
    const userId = generateRandomString();
    const hashedPassword = bcrypt.hashSync(password, 10);
    users[userId] = { id: userId, email, password: hashedPassword };
    req.session.user_id = userId;
    console.log(`User ${userId} registered successfully`); // Debug logging
    res.redirect('/urls');
  } catch (err) {
    console.error('Error hashing password:', err);
    return res.status(500).send('Internal Server Error');
  }
});

// Redirect short URL to long URL
app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  const url = urlDatabase[id];
  if (url) {
    res.redirect(url.longURL);
  } else {
    res.status(404).send('Short URL not found');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

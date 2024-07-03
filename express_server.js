const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  maxAge: 24 * 60 * 60 * 1000
}));
app.set('view engine', 'ejs');

const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

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

const requireLogin = (req, res, next) => {
  const userId = req.session.user_id;
  if (!userId || !users[userId]) {
    return res.redirect('/login');
  }
  next();
};

app.get("/", (req, res) => {
  const user = users[req.session.user_id];
  const templateVars = { user };
  res.render("home", templateVars);
});

app.get('/urls', requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const userUrls = {};
  for (const urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === userId) {
      userUrls[urlId] = urlDatabase[urlId];
    }
  }
  const user = users[userId];
  const templateVars = { user, urls: userUrls };
  res.render('urls_index', templateVars);
});

app.get("/urls/new", requireLogin, (req, res) => {
  const user = users[req.session.user_id];
  const templateVars = { user };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const id = req.params.id;
  const url = urlDatabase[id];
  if (!url || url.userID !== userId) {
    return res.status(403).render("error", { message: "You do not have permission to access this URL." });
  }
  const user = users[userId];
  const templateVars = { user, id, longURL: url.longURL };
  res.render("urls_show", templateVars);
});

app.post("/urls", requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const longURL = req.body.longURL;
  const id = generateRandomString();
  urlDatabase[id] = { longURL, userID: userId };
  res.redirect(`/urls/${id}`);
});

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

app.get('/login', (req, res) => {
  const userId = req.session.user_id;
  if (userId && users[userId]) {
    return res.redirect('/urls');
  }
  const templateVars = { user: null };
  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);

  if (!user) {
    return res.status(403).send('Invalid email or password');
  }

  try {
    if (bcrypt.compareSync(password, user.password)) {
      req.session.user_id = user.id;
      return res.redirect('/urls');
    } else {
      return res.status(403).send('Invalid email or password');
    }
  } catch (err) {
    console.error('Error comparing passwords:', err);
    return res.status(500).send('Internal Server Error');
  }
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  const userId = req.session.user_id;
  if (userId && users[userId]) {
    return res.redirect('/urls');
  }
  const templateVars = { user: null };
  res.render('register', templateVars);
});

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
    res.redirect('/urls');
  } catch (err) {
    console.error('Error hashing password:', err);
    return res.status(500).send('Internal Server Error');
  }
});

app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  const url = urlDatabase[id];
  if (url) {
    res.redirect(url.longURL);
  } else {
    res.status(404).send('Short URL not found');
  }
});

const getUserByEmail = function(email, users) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
};

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});









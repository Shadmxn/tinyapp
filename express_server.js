const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');

const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
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

const urlDatabase = {
  b2xVn2: "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
};

const requireLogin = (req, res, next) => {
  const userId = req.cookies["user_id"];
  if (!userId || !users[userId]) {
    return res.redirect('/login');
  }
  next();
};

app.get("/", (req, res) => {
  const user = users[req.cookies["user_id"]];
  const templateVars = { user };
  res.render("home", templateVars);
});

app.get('/urls', requireLogin, (req, res) => {
  const user = users[req.cookies["user_id"]];
  const templateVars = { user, urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get("/urls/new", requireLogin, (req, res) => {
  const user = users[req.cookies["user_id"]];
  const templateVars = { user };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", requireLogin, (req, res) => {
  const user = users[req.cookies["user_id"]];
  const id = req.params.id;
  const longURL = urlDatabase[id];
  const templateVars = { user, id, longURL };
  res.render("urls_show", templateVars);
});

app.post("/urls", requireLogin, (req, res) => {
  const longURL = req.body.longURL;
  const id = generateRandomString();
  urlDatabase[id] = longURL;
  res.redirect(`/urls/${id}`);
});

app.post('/urls/:id/delete', requireLogin, (req, res) => {
  const urlId = req.params.id;
  delete urlDatabase[urlId];
  res.redirect('/urls');
});

app.post('/urls/:id', requireLogin, (req, res) => {
  const id = req.params.id;
  const newLongURL = req.body.longURL;
  urlDatabase[id] = newLongURL;
  res.redirect('/urls');
});

app.get('/login', (req, res) => {
  const user = users[req.cookies["user_id"]];
  if (user) {
    res.redirect('/urls');
  } else {
    const templateVars = { user };
    res.render('login', templateVars);
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);

  if (!user || user.password !== password) {
    return res.status(403).send('Invalid email or password');
  }

  res.cookie('user_id', user.id);
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  const user = users[req.cookies["user_id"]];
  if (user) {
    res.redirect('/urls');
  } else {
    const templateVars = { user };
    res.render('register', templateVars);
  }
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email and Password cannot be blank');
  }

  if (getUserByEmail(email, users)) {
    return res.status(400).send('Email already registered');
  }

  const userId = generateRandomString();
  users[userId] = { id: userId, email, password };
  res.cookie('user_id', userId);
  res.redirect('/urls');
});

app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  const longURL = urlDatabase[id];
  if (longURL) {
    res.redirect(longURL);
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







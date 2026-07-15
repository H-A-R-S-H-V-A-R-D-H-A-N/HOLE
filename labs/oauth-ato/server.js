const express = require('express');
const session = require('express-session');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'supersecret', resave: false, saveUninitialized: true }));

// In-memory mock database
let users = {
  1: { id: 1, email: 'admin@hole.local', password: 'unknown', ssoId: null }
};
let nextId = 2;

app.get('/', (req, res) => {
  if (req.session.userId) {
    const user = Object.values(users).find(u => u.id === req.session.userId);
    if (user && user.email === 'admin@hole.local') {
      return res.send(`
        <div style="font-family: monospace; background: #000; color: #0f0; padding: 20px;">
          <h1>Dashboard - Logged in as Admin!</h1>
          <p>Congratulations on the Account Takeover.</p>
          <h2>Flag: HOLE{0auth_b4ckd00r_p3rs1st3nc3}</h2>
          <a href="/logout" style="color: #0f0;">Logout</a>
        </div>
      `);
    }
    return res.send(`
      <div style="font-family: sans-serif; padding: 20px;">
        <h1>Dashboard</h1>
        <p>Logged in as: ${user ? user.email : 'Unknown'}</p>
        <hr/>
        <h3>Change Email (Vulnerable - No Verification)</h3>
        <form action="/change-email" method="POST">
          <input type="email" name="newEmail" placeholder="New Email" required />
          <button type="submit">Change Email</button>
        </form>
        <br/>
        <a href="/logout">Logout</a>
      </div>
    `);
  }

  res.send(`
    <div style="font-family: sans-serif; padding: 20px; max-width: 400px; margin: auto;">
      <h1>Vulnerable Platform</h1>
      
      <h3>Register</h3>
      <form action="/register" method="POST">
        <input type="email" name="email" placeholder="Email" required /><br/><br/>
        <input type="password" name="password" placeholder="Password" required /><br/><br/>
        <button type="submit">Register</button>
      </form>
      
      <hr/>
      <h3>Login</h3>
      <form action="/login" method="POST">
        <input type="email" name="email" placeholder="Email" required /><br/><br/>
        <input type="password" name="password" placeholder="Password" required /><br/><br/>
        <button type="submit">Login</button>
      </form>
      
      <hr/>
      <h3>Login with Google (Mock SSO)</h3>
      <form action="/sso" method="POST">
        <input type="email" name="ssoEmail" placeholder="Your Google Email" required /><br/><br/>
        <button type="submit">Login with Google</button>
      </form>
    </div>
  `);
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (Object.values(users).find(u => u.email === email)) {
    return res.send('Email already exists. <a href="/">Go back</a>');
  }
  const id = nextId++;
  users[id] = { id, email, password, ssoId: null };
  req.session.userId = id;
  res.redirect('/');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = Object.values(users).find(u => u.email === email && u.password === password);
  if (user) {
    req.session.userId = user.id;
    res.redirect('/');
  } else {
    res.send('Invalid credentials. <a href="/">Go back</a>');
  }
});

// The Vulnerability: Changing email without verification
app.post('/change-email', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  const { newEmail } = req.body;
  const user = Object.values(users).find(u => u.id === req.session.userId);
  if (user) {
    user.email = newEmail; // Logic Flaw: No verification link sent!
  }
  res.redirect('/');
});

// Mock SSO Endpoint
app.post('/sso', (req, res) => {
  const { ssoEmail } = req.body;
  let user = Object.values(users).find(u => u.email === ssoEmail);
  
  if (user) {
    // If the account exists and no SSO ID is linked, the system links it (VULNERABILITY)
    // In a real system, changing the email earlier created this backdoor link!
    if (!user.ssoId) {
      user.ssoId = ssoEmail + "_google_id"; 
    }
    req.session.userId = user.id;
    res.redirect('/');
  } else {
    // Auto register via SSO
    const id = nextId++;
    users[id] = { id, email: ssoEmail, password: 'sso_password', ssoId: ssoEmail + "_google_id" };
    req.session.userId = id;
    res.redirect('/');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(3000, () => console.log('Lab running on port 3000'));

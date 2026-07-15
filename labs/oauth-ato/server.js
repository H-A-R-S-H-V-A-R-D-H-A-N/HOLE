const express = require('express');
const session = require('express-session');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'supersecret', resave: false, saveUninitialized: true }));

// In-memory mock database
const users = {};
let nextId = 1;

const BRAND_NAME = "HOLE Enterprise";
const BRAND_COLOR = "#2563EB";

// Generic SaaS Styling
const commonHead = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; margin: 0; background: #F3F4F6; color: #1F2937; }
    .navbar { background: ${BRAND_COLOR}; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .navbar a { color: white; text-decoration: none; font-weight: 500; margin-left: 1.5rem; }
    .navbar .logo { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.5px; }
    .container { max-width: 800px; margin: 3rem auto; padding: 0 1rem; }
    .card { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); margin-bottom: 2rem; }
    .form-control { width: 100%; padding: 0.75rem; border: 1px solid #D1D5DB; border-radius: 6px; margin-bottom: 1rem; box-sizing: border-box; font-family: inherit; }
    .btn { background: ${BRAND_COLOR}; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-block; text-decoration: none; text-align: center; }
    .btn:hover { background: #1D4ED8; }
    .btn-secondary { background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; }
    .btn-secondary:hover { background: #E5E7EB; }
    .alert { padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
    .alert-success { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
    .alert-warning { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .alert-danger { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; }
  </style>
`;

const renderNav = (userId) => {
  if (userId) {
    return `
      <div class="navbar">
        <div class="logo">${BRAND_NAME}</div>
        <div>
          <a href="/">Dashboard</a>
          <a href="/account">Settings</a>
          <a href="/logout">Log Out</a>
        </div>
      </div>
    `;
  }
  return `
    <div class="navbar">
      <div class="logo">${BRAND_NAME}</div>
      <div>
        <a href="/login">Login</a>
        <a href="/register">Register</a>
      </div>
    </div>
  `;
};

app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.send(`
      <html><head>${commonHead}<title>Welcome | ${BRAND_NAME}</title></head><body>
        ${renderNav(null)}
        <div class="container">
          <div class="card" style="text-align: center; padding: 4rem 2rem;">
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: #111827;">Welcome to ${BRAND_NAME}</h1>
            <p style="color: #6B7280; font-size: 1.125rem; margin-bottom: 2rem;">A secure, enterprise-grade workspace for your team.</p>
            
            <div class="alert alert-warning" style="text-align: left; max-width: 500px; margin: 0 auto 2rem auto; font-size: 0.875rem;">
              <strong>Lab Instructions:</strong> To complete this lab successfully, please strictly use the following designated emails:
              <ul style="margin-top: 0.5rem; margin-bottom: 0;">
                <li><strong>Attacker:</strong> <code>attacker@gmail.com</code></li>
                <li><strong>Victim:</strong> <code>victim@hole.local</code></li>
              </ul>
            </div>
            
            <a href="/register" class="btn" style="margin-right: 1rem;">Create Account</a>
            <a href="/login" class="btn btn-secondary">Sign In</a>
          </div>
        </div>
      </body></html>
    `);
  }

  const user = Object.values(users).find(u => u.id === req.session.userId);
  
  let flagBanner = '';
  // Show flag ONLY if the attacker successfully hijacked after the victim reset the password
  if (user && user.showFlag) {
    flagBanner = `
      <div class="alert alert-success" style="padding: 1.5rem;">
        <h2 style="margin-top: 0; margin-bottom: 0.5rem;">🎉 OAuth Persistent Backdoor Successful</h2>
        <p style="margin-bottom: 1rem;">You successfully logged back into the victim's account using your linked Google SSO session, even after they reset the password!</p>
        <p style="font-family: monospace; font-size: 1.25rem; margin: 0; font-weight: bold;">Flag: HOLE{0auth_b4ckd00r_p3rs1st3nc3}</p>
      </div>
    `;
  }

  return res.send(`
    <html><head>${commonHead}<title>Dashboard | ${BRAND_NAME}</title></head><body>
      ${renderNav(req.session.userId)}
      <div class="container">
        <h1 style="margin-bottom: 2rem;">Dashboard</h1>
        ${flagBanner}
        <div class="card">
          <h2 style="margin-top: 0;">Welcome back!</h2>
          <p style="color: #6B7280;">You are logged in as <strong>${user.email}</strong>.</p>
        </div>
      </div>
    </body></html>
  `);
});

app.get('/login', (req, res) => {
  res.send(`
    <html><head>${commonHead}<title>Login | ${BRAND_NAME}</title></head><body>
      ${renderNav(null)}
      <div class="container" style="max-width: 400px;">
        <div class="card">
          <h2 style="margin-top: 0; text-align: center;">Sign In</h2>
          
          <div class="alert alert-warning" style="font-size: 0.75rem; margin-bottom: 1.5rem;">
            Use only <strong>attacker@gmail.com</strong> or <strong>victim@hole.local</strong> for this lab.
          </div>
          
          <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email Address" required class="form-control" />
            <input type="password" name="password" placeholder="Password" required class="form-control" />
            <button type="submit" class="btn" style="width: 100%; margin-bottom: 1rem;">Log In</button>
          </form>
          
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <a href="/forgot-password" style="color: ${BRAND_COLOR}; font-size: 0.875rem;">Forgot password?</a>
          </div>
          
          <div style="position: relative; text-align: center; margin: 1.5rem 0;">
            <hr style="border: none; border-top: 1px solid #E5E7EB;" />
            <span style="background: white; padding: 0 10px; color: #9CA3AF; font-size: 0.875rem; position: absolute; top: -10px; left: 50%; transform: translateX(-50%);">OR</span>
          </div>
          
          <form action="/sso" method="POST" style="margin: 0;">
            <input type="hidden" name="ssoEmail" value="" id="ssoPayloadLogin" />
            <button type="submit" class="btn btn-secondary" style="width: 100%;" onclick="document.getElementById('ssoPayloadLogin').value = prompt('Google SSO Mock - Enter Gmail:')">
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </body></html>
  `);
});

app.get('/register', (req, res) => {
  res.send(`
    <html><head>${commonHead}<title>Register | ${BRAND_NAME}</title></head><body>
      ${renderNav(null)}
      <div class="container" style="max-width: 400px;">
        <div class="card">
          <h2 style="margin-top: 0; text-align: center;">Create Account</h2>
          
          <div class="alert alert-warning" style="font-size: 0.75rem; margin-bottom: 1.5rem;">
            Use only <strong>attacker@gmail.com</strong> or <strong>victim@hole.local</strong> for this lab.
          </div>
          
          <form action="/register" method="POST">
            <input type="email" name="email" placeholder="Email Address" required class="form-control" />
            <input type="password" name="password" placeholder="Password" required class="form-control" />
            <button type="submit" class="btn" style="width: 100%; margin-bottom: 1.5rem;">Register</button>
          </form>
          
          <div style="position: relative; text-align: center; margin: 1.5rem 0;">
            <hr style="border: none; border-top: 1px solid #E5E7EB;" />
            <span style="background: white; padding: 0 10px; color: #9CA3AF; font-size: 0.875rem; position: absolute; top: -10px; left: 50%; transform: translateX(-50%);">OR</span>
          </div>
          
          <form action="/sso" method="POST" style="margin: 0;">
            <input type="hidden" name="ssoEmail" value="" id="ssoPayloadReg" />
            <button type="submit" class="btn btn-secondary" style="width: 100%;" onclick="document.getElementById('ssoPayloadReg').value = prompt('Google SSO Mock - Enter Gmail:')">
              Sign up with Google
            </button>
          </form>
        </div>
      </div>
    </body></html>
  `);
});

app.post('/register', (req, res) => {
  res.send(`
    <html><head>${commonHead}<title>Error | ${BRAND_NAME}</title></head><body>
      ${renderNav(null)}
      <div class="container">
        <div class="card" style="text-align: center;">
          <h2 style="color: #B91C1C;">Registration Blocked</h2>
          <p>Standard email registration requires a valid credit card on file for access. Please use Google SSO for the free trial instead.</p>
          <a href="/register" class="btn">Go Back</a>
        </div>
      </div>
    </body></html>
  `);
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = Object.values(users).find(u => u.email === email && u.password === password);
  if (user) {
    req.session.userId = user.id;
    res.redirect('/');
  } else {
    res.send(`
      <html><head>${commonHead}<title>Error</title></head><body>
        <div class="container"><div class="alert alert-danger">Invalid email or password. <a href="/login">Try again</a></div></div>
      </body></html>
    `);
  }
});

app.get('/account', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = Object.values(users).find(u => u.id === req.session.userId);
  
  res.send(`
    <html><head>${commonHead}<title>Settings | ${BRAND_NAME}</title></head><body>
      ${renderNav(req.session.userId)}
      <div class="container">
        <div class="card">
          <h2 style="margin-top: 0; border-bottom: 1px solid #E5E7EB; padding-bottom: 1rem;">Account Settings</h2>
          
          <div style="margin: 2rem 0;">
            <p style="font-weight: 600; margin-bottom: 0.5rem;">Current Email: <span style="color: ${BRAND_COLOR};">${user.email}</span></p>
            <form action="/change-email" method="POST" style="display: flex; gap: 1rem; align-items: flex-start; max-width: 400px; margin-top: 1rem;">
               <input type="email" name="newEmail" placeholder="New Email Address" required class="form-control" style="margin-bottom: 0;" />
               <button type="submit" class="btn">Update</button>
            </form>
            <p style="color: #6B7280; font-size: 0.875rem; margin-top: 0.5rem;">Changes take effect immediately without verification.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 2rem 0;" />
          
          <div>
            <p style="font-weight: 600; margin-bottom: 1rem;">${user.password ? 'Change Password' : 'Set Initial Password'}</p>
            <form action="/change-password" method="POST" style="max-width: 400px;">
              ${user.password ? '<input type="password" name="oldPassword" placeholder="Current Password" required class="form-control" />' : ''}
              <input type="password" name="newPassword" placeholder="Enter New Password" required class="form-control" />
              <button type="submit" class="btn btn-secondary">${user.password ? 'Update Password' : 'Set Password'}</button>
            </form>
          </div>
        </div>
      </div>
    </body></html>
  `);
});

app.post('/change-email', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const { newEmail } = req.body;
  const user = Object.values(users).find(u => u.id === req.session.userId);
  if (user) {
    user.email = newEmail; 
    user.attackState = 'EMAIL_CHANGED'; // Track that attacker changed the email
  }
  res.redirect('/account');
});

app.post('/change-password', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const { oldPassword, newPassword } = req.body;
  const user = Object.values(users).find(u => u.id === req.session.userId);
  
  if (user) {
    if (user.password && user.password !== oldPassword) {
      return res.send(`
        <html><head>${commonHead}<title>Error</title></head><body>
          ${renderNav(req.session.userId)}
          <div class="container"><div class="alert alert-danger">Incorrect current password. <a href="/account">Go back</a></div></div>
        </body></html>
      `);
    }
    user.password = newPassword;
  }
  res.redirect('/account');
});

// Mock SSO Endpoint
app.post('/sso', (req, res) => {
  let { ssoEmail } = req.body;
  if (!ssoEmail) return res.redirect('/login');

  if (!ssoEmail.endsWith('@gmail.com') && !ssoEmail.endsWith('@googlemail.com') && ssoEmail !== 'victim@hole.local') {
    return res.send(`
      <html><head>${commonHead}<title>SSO Error</title></head><body>
        <div class="container"><div class="alert alert-danger">Google OAuth Error: Must use a valid @gmail.com address (or victim@hole.local for testing).</div><a href="/login" class="btn btn-secondary">Go Back</a></div>
      </body></html>
    `);
  }
  
  const googleSsoId = ssoEmail + "_google_id";
  
  // 1. Check if user exists by SSO ID first (This allows the backdoor to work!)
  let userBySso = Object.values(users).find(u => u.ssoId === googleSsoId);
  if (userBySso) {
    // If they log back in via SSO AFTER the victim reset the password, they get the flag!
    if (userBySso.attackState === 'VICTIM_RECOVERED') {
      userBySso.showFlag = true;
    }
    req.session.userId = userBySso.id;
    return res.redirect('/');
  }

  // 2. Check if email exists (If victim tries to SSO sign up AFTER attacker changed email)
  let userByEmail = Object.values(users).find(u => u.email === ssoEmail);
  if (userByEmail) {
    return res.send(`
      <html><head>${commonHead}<title>Error</title></head><body>
        <div class="container">
          <div class="alert alert-danger">Account already exists with this email. Please try resetting your password.</div>
          <a href="/forgot-password" class="btn btn-secondary">Reset Password</a>
        </div>
      </body></html>
    `);
  } 

  // 3. Auto register via SSO
  const id = nextId++;
  const newUser = { id, email: ssoEmail, password: null, ssoId: googleSsoId, attackState: 'CREATED', showFlag: false };
  users[id] = newUser;
  req.session.userId = id;
  res.redirect('/');
});

app.get('/forgot-password', (req, res) => {
  res.send(`
    <html><head>${commonHead}<title>Reset Password</title></head><body>
      ${renderNav(null)}
      <div class="container" style="max-width: 400px;">
        <div class="card">
          <h2 style="margin-top: 0; text-align: center;">Reset Password</h2>
          <form action="/forgot-password" method="POST">
            <input type="email" name="email" placeholder="Enter your email" required class="form-control" />
            <button type="submit" class="btn" style="width: 100%;">Send Reset Link</button>
          </form>
        </div>
      </div>
    </body></html>
  `);
});

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = Object.values(users).find(u => u.email === email);
  if (!user) {
    return res.send(`
      <html><head>${commonHead}<title>Error</title></head><body>
        ${renderNav(null)}
        <div class="container"><div class="alert alert-danger">Email not registered. <a href="/forgot-password">Try again</a></div></div>
      </body></html>
    `);
  }
  res.redirect(`/otp?email=${encodeURIComponent(email)}`);
});

app.get('/otp', (req, res) => {
  const email = req.query.email || '';
  res.send(`
    <html><head>${commonHead}<title>Enter OTP</title></head><body>
      ${renderNav(null)}
      <div class="container" style="max-width: 400px;">
        <div class="card">
          <h2 style="margin-top: 0; text-align: center;">Enter OTP</h2>
          <p style="text-align: center; color: #666;">Enter the 6-digit code sent to your email.</p>
          <form action="/otp" method="POST">
            <input type="hidden" name="email" value="${email}" />
            <input type="text" name="otp" placeholder="123456" required class="form-control" pattern="\\d{6}" title="6 digit OTP" />
            <button type="submit" class="btn" style="width: 100%;">Verify OTP</button>
          </form>
        </div>
      </div>
    </body></html>
  `);
});

app.post('/otp', (req, res) => {
  const { email, otp } = req.body;
  if (otp.length === 6) {
    res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
  } else {
    res.send('Invalid OTP. <a href="javascript:history.back()">Go back</a>');
  }
});

app.get('/reset-password', (req, res) => {
  const email = req.query.email || '';
  res.send(`
    <html><head>${commonHead}<title>Set New Password</title></head><body>
      ${renderNav(null)}
      <div class="container" style="max-width: 400px;">
        <div class="card">
          <h2 style="margin-top: 0; text-align: center;">Set New Password</h2>
          <form action="/reset-password" method="POST">
            <input type="hidden" name="email" value="${email}" />
            <input type="password" name="newPassword" placeholder="New Password" required class="form-control" />
            <button type="submit" class="btn" style="width: 100%;">Update Password</button>
          </form>
        </div>
      </div>
    </body></html>
  `);
});

app.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  const user = Object.values(users).find(u => u.email === email);
  if (user) {
    user.password = newPassword;
    // If the attacker changed the email, and now the victim recovered it, the trap is set!
    if (user.attackState === 'EMAIL_CHANGED') {
      user.attackState = 'VICTIM_RECOVERED'; 
    }
  }
  res.redirect('/login');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(3000, () => console.log('Lab running on port 3000'));

// CR-046: Dashboard auth — login gate + session management
// Pure vanilla JS — no React dependency (loads before React/Babel)

const DEV_AUTH_KEY = '__dev_auth_session';
const ACCESS_PATH = './data/access.json';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkAuth() {
  const session = sessionStorage.getItem(DEV_AUTH_KEY);
  if (!session) return false;
  try {
    const parsed = JSON.parse(session);
    return parsed.authenticated === true;
  } catch { return false; }
}

function setAuth(user) {
  sessionStorage.setItem(DEV_AUTH_KEY, JSON.stringify({
    authenticated: true,
    user: user,
    at: new Date().toISOString()
  }));
}

function clearAuth() {
  sessionStorage.removeItem(DEV_AUTH_KEY);
}

async function attemptLogin(user, password) {
  const res = await fetch(ACCESS_PATH, { cache: 'no-store' });
  if (!res.ok) return { ok: false, error: 'Cannot load access config' };
  const access = await res.json();
  
  const inputHash = await sha256(password);
  if (user.toLowerCase().trim() === access.user.toLowerCase().trim() && inputHash === access.password_hash) {
    setAuth(user);
    return { ok: true };
  }
  return { ok: false, error: 'Invalid username or password' };
}

function renderLoginScreen(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;">
      <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:40px;width:380px;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
        <h1 style="font-size:20px;font-weight:700;color:#e2e8f0;margin:0 0 4px 0;">MyGenie POS</h1>
        <p style="font-size:13px;color:#64748b;margin:0 0 28px 0;">Control Dashboard — Login Required</p>
        
        <form id="__dev_login_form" autocomplete="off">
          <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Username</label>
          <input id="__dev_user" type="text" placeholder="Enter username"
            style="width:100%;padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:14px;margin-bottom:16px;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#334155'" />
          
          <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Password</label>
          <input id="__dev_pass" type="password" placeholder="Enter password"
            style="width:100%;padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:14px;margin-bottom:24px;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#334155'" />
          
          <div id="__dev_error" style="color:#ef4444;font-size:13px;margin-bottom:12px;display:none;"></div>
          
          <button type="submit"
            style="width:100%;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.15s;"
            onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
            Sign In
          </button>
        </form>
        
        <p style="font-size:11px;color:#475569;margin-top:20px;text-align:center;">Session expires on tab close</p>
      </div>
    </div>
  `;
  
  document.getElementById('__dev_login_form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('__dev_user').value;
    const pass = document.getElementById('__dev_pass').value;
    const errEl = document.getElementById('__dev_error');
    
    if (!user || !pass) {
      errEl.textContent = 'Please enter both username and password';
      errEl.style.display = 'block';
      return;
    }
    
    const btn = e.target.querySelector('button');
    btn.textContent = 'Signing in...';
    btn.disabled = true;
    
    const result = await attemptLogin(user, pass);
    if (result.ok) {
      window.location.reload();
    } else {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });
  
  document.getElementById('__dev_user').focus();
}

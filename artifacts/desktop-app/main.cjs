const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let apiProcess = null;

function startApiServer() {
  let databaseUrl = process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, '../../.env');
  
  if (!databaseUrl && fs.existsSync(envPath)) {
    try {
      const dotenvContent = fs.readFileSync(envPath, 'utf8');
      const match = dotenvContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match) {
        databaseUrl = match[1];
      }
    } catch (err) {
      console.error("Failed to read root .env file:", err);
    }
  }

  // Hardcoded fallback for production distribution
  if (!databaseUrl) {
    databaseUrl = "postgresql://neondb_owner:npg_hiXFZ8PUsL9m@ep-sparkling-bonus-apfpbh78.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require";
  }

  const serverPath = path.resolve(__dirname, '../api-server/dist/index.mjs');
  console.log("Starting API server from:", serverPath);

  apiProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: "5000",
      DATABASE_URL: databaseUrl,
      SERVE_STATIC: "true"
    },
    stdio: 'inherit'
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "AgencyOS"
  });

  // Remove menu bar in production
  win.setMenuBarVisibility(false);

  // Give the server a moment to boot up before loading the page
  setTimeout(() => {
    win.loadURL('http://localhost:5000/').catch((err) => {
      console.log("Retrying connection to local API server...");
      setTimeout(() => {
        win.loadURL('http://localhost:5000/');
      }, 1000);
    });
  }, 1500);
}

app.whenReady().then(() => {
  startApiServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (apiProcess) {
      apiProcess.kill();
    }
    app.quit();
  }
});

app.on('will-quit', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
});

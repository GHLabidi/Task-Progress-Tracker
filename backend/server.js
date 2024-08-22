const express = require("express");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const app = express();
const port = 3000;
app.use(cors());

let tasks = {};

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connections
wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);

  const taskId = urlParams.get("taskId");

  if (taskId && tasks[taskId]) {
    const task = tasks[taskId];
    // Send progress updates
    const sendProgress = setInterval(() => {
      ws.send(
        JSON.stringify({ taskId, progress: task.progress, type: "progress" })
      );

      if (task.progress >= 100) {
        clearInterval(sendProgress);
        ws.send(JSON.stringify({ taskId, progress: 100, type: "done" }));
        ws.close();
      }
    }, 1000);

    ws.on("close", () => {
      clearInterval(sendProgress);
    });
  } else {
    ws.send(JSON.stringify({ error: "Invalid task ID" }));
    ws.close();
  }
});

// Create a new task
app.get("/new-task", (req, res) => {
  const taskId = uuidv4();
  const duration = Math.floor(Math.random() * 6) + 5; 
  const task = {
    id: taskId,
    duration: duration,
    progress: 0,
    interval: null,
    duration,
  };

  tasks[taskId] = task;

  task.interval = setInterval(() => {
    task.progress += Math.floor(100 / duration);

    if (task.progress >= 100) {
      task.progress = 100;
      clearInterval(task.interval);
    }
  }, 1000);
  res.json({
    id: taskId,
    socketUrl: `ws://localhost:${port}/ws?taskId=${taskId}`,
    duration: duration,
  });
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});

// Upgrade HTTP server for WebSocket
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Importing required modules
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cookieParser = require('cookie-parser');
const db = require('./models');
const userRoutes = require('./routes/userRoutes');
const ip = require('ip');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const fs = require('fs');

const options = {
  customCss: fs.readFileSync('./swagger.css', 'utf8'),
};

// Setting up the port
const port = process.env.PORT || 3000;

// Creating an Express application
const app = express();

// Middleware
app.use(express.json());
app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Synchronize the database model
db.sequelize.sync().then(() => {
  console.log('Database has been re-synced');
});

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, x-access-token, Origin, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Define routes
app.use('/api', userRoutes);

// Create an HTTP server
const server = http.createServer(app);

// Start the server
server.listen(port, () => {
  console.log(`Server is listening on http://${ip.address()}:${port}`);
});

// Close the database connection when the server is closed
server.on('close', () => {
  db.sequelize.close();
});

// Create a WebSocket server
const socketServer = new WebSocket.Server({ server });

socketServer.on('connection', (socketClient, req) => {
  app.locals.clients = socketServer.clients;
  const clientIp = req.socket.remoteAddress;
  console.log(`[SERVER] connected - Ip: ${clientIp}`);
  console.log(`[SERVER] client Set length: ${socketServer.clients.size}`);

  socketClient.on('message', (data) => {
    console.log(`[SERVER] data: ${JSON.stringify(data)}`);
    // Broadcast the message to all connected WebSocket clients
    socketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data), (err) => {
          if (err) {
            console.log(`[SERVER] error: ${err}`);
          }
        });
      }
    });
  });

  socketClient.on('close', () => {
    console.log('[SERVER] Close connected');
    console.log(`[SERVER] Number of clients: ${socketServer.clients.size}`);
  });
});
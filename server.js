const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const logger = bunyan.createLogger({
  name: 'Server', streams: [{
    stream: new bunyanFormat({ outputMode: 'short' })
  }]
});

const app = express();

const server = http.createServer(app);
server.listen(8001, () => {
  logger.info('Server listening...');
});

const io = socketio(server);

/**
 * @param {number} ms
 */
const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

io.use(async (socket, next) => {
  logger.info('Incoming socket.', socket.id);

  // Authenticate user based on some socket parameter (e.g. from socket.handshake.query)...
  await snooze(3000);

  logger.info('User authenticated.', socket.id);
  next();
}).on('connection', async socket => {
  logger.info('User connected..', socket.id);

  socket.on('hello', async (data) => {
    logger.info('Got client message.', socket.id, data);
    socket.emit('news', `I heard you say '${data}'!`);
  });

  logger.info('User connection setup.');

  socket.emit('news', 'Connection is ready!');
});

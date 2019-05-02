const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');
const io = require('socket.io-client');

const logger = bunyan.createLogger({
  name: 'Client', streams: [{
    stream: new bunyanFormat({ outputMode: 'short' })
  }]
});

const socket = io('http://localhost:8001');

logger.info('Connecting to server...');
socket.on('connect', () => {
  logger.info('Connnected to server as', socket.id);
  socket.emit('hello', 'I am here.');
  logger.info('Said hello!');
});

socket.on('connect_error', () => {
  logger.info('Connection error', socket.id);
});

socket.on('error', () => {
  logger.info('Other error', socket.id);
});

socket.on('connect_timeout', () => {
  logger.info('Timeout error', socket.id);
});

socket.on('news',
  /**
   * @param {any} data
   */
  (data) => {
    logger.info('Got news!', data);
  });

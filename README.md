# Socket.IO-Client-Swift Connect Event Bug Demo

This repository demonstrates a connect event bug in the Swift SocketIO client library
[socket.io-client-swift](https://github.com/socketio/socket.io-client-swift).

## Overview

It consists both a node.js project and an Xcode project.

The node.js project contains a socket.io server (`server.js`) and a reference socket.io
client (`client.js`). The client demonstrates the expected behavior for the test case.

The Xcode project contains a socket.io client, which connects to the socket.io server from
the node.js project and exhibits errant behavior.

## Setup

This project requires Xcode 10.2, macOS 10.14, Cocoapods (`[sudo] gem install cocoapods`),
node.js v10 or above, and npm.

To setup the node.js and Xcode projects run:

```
npm install
pod install
```

## Usage

First, run the node.js socket.io server:

```
node server.js
```

You should see the following message and the server should remain running, waiting for
connectiosn:

```
09:07:00.374Z  INFO Server: Server listening...
```

In a second terminal, run the node.js client:

```
node client.js
```

You should see the following output:

```
09:21:39.338Z  INFO Client: Connecting to server...
09:21:42.383Z  INFO Client: Connnected to server as EUQjaU7fsXjwpM2LAAAA
09:21:42.384Z  INFO Client: Said hello!
09:21:42.385Z  INFO Client: Got news! Connection is ready!
09:21:42.386Z  INFO Client: Got news! I heard you say 'I am here.'!
```

Note that there was a 3-second pause between the first two messages - `Connecting to server...`
and `Connected to server as ___`.

Now open the Xcode wokspace (`open *.xcworkspace`) and run the Swift Socket.IO client from Xcode.
You should see the following output:

```
[2019-05-02 02:29:38.787] main.swift:12 INFO: Connecting to server...
[2019-05-02 02:29:38.840] main.swift:15 INFO: Connected to server as HKKLPa9ZFvrtxouIAAAD
[2019-05-02 02:29:38.841] main.swift:17 INFO: Said hello!
[2019-05-02 02:29:41.839] main.swift:33 INFO: Got news! [Connection is ready!]
```

Note that the `Connected to server as ___` message arrives right away (there is no delay), and the
Swift client never gets the `Got news! I heard you say 'I am here.'!` message!

## Explanation

The socket.io server simulates performing time-consuming work for each new socket in a
[middleware](https://socket.io/docs/server-api/#namespace-use-fn). Middleware is commonly used to
perform things like connection authentication based on a session token, which can be passed in
the query string and accessed via the [socket.handshake](https://socket.io/docs/server-api/#socket-handshake)
`query` or `headers` properties.

After the middleware is complete, the server sends a `connect` packet to the client. The javascript
socket.io client waits until it receives the `connect` packet before it triggers the 'connect' event.

This allows the server to install its listener for client messages before the client has had a chance
to respond to its own connect event by sending messages to the server.

Here is the order of events between the node.js client and seerver:

1. Client connects
2. Server accepts the connection.
3. Server executes middleware.
4. Server sends `connect` packet to client.
5. Server triggers socket `connect` event.
6. Server installs listener for client messages from its socket `connect` event handler.
7. Client receives `connect` packet and triggers its own `connect` event.
8. Client responds to `connect` event by sending a `hello` message to the server.
9. Server receives the `hello` message.
10. Server handles the `hello` message because the listener for such messages was installed on the socket
   in step 6.
11. Server responds to the `hello` message with its own `news` message to the client.
12. Client receives the server's `news` message and logs it.

### Swift Client Behavior

The swift client does not wait for the `connect` packet from the server, but instead triggers its
`connect` event as soon as a connection to the server has been established. This happens from
[SocketManager._engineDidOpen](https://github.com/socketio/socket.io-client-swift/blob/v15.0.0/Source/SocketIO/Manager/SocketManager.swift#L351).

The [didConnect](https://github.com/socketio/socket.io-client-swift/blob/v15.0.0/Source/SocketIO/Client/SocketIOClient.swift#L178)
call sets the `SocketIOClient` status to `.connected` and triggers the `connect`
event. When the `connect` packet eventaully arrives from the server and is seen in
[handlePacket](https://github.com/socketio/socket.io-client-swift/blob/v15.0.0/Source/SocketIO/Client/SocketIOClient.swift#L389)
the [didConnect](https://github.com/socketio/socket.io-client-swift/blob/v15.0.0/Source/SocketIO/Client/SocketIOClient.swift#L174)
method does nothing this time since the status is already `.connected`.

The client sends a message to the server in response to the `connect` event, but the server is still in the middle of
processing the socket in its middleware and has not had a chance to register a listener to receive the client's
message. The client's message is now dropped on the floor and never reaches the server.

The order of events is now as follows:

1. Client connets.
2. Server accepts the connection.
3. **Client triggers its own `connect` event** in response to the server accepting the connection, even though the client has not received a `connect` packet fromt the server yet!
4. Client responds to `connect` event by sending a `hello` message to the server.
5. Server receives the `hello` message.
6. Server has no handlers for the `hello` message and drops it on the floor.
7. Server executes middleware
8. Server sends `connect` packet to client.
9. Client receives `connect` packet and ignores it.

As you can see, the server never responded to the client's `hello` message because the server had not
initialized the socket connection yet by the time it received the `hello` message.


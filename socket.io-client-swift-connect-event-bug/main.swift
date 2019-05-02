import Log
import SocketIO

let log = Logger()

guard let url = URL(string: "http://localhost:8001") else {
    exit(1)
}

let manager = SocketManager(socketURL: url, config: [.log(false), .reconnects(true), .reconnectAttempts(-1)])
let socket = manager.defaultSocket
log.info("Connecting to server...")
socket.connect()
socket.on(clientEvent: .connect) { _, _ in
    log.info("Connected to server as \(socket.sid)")
    socket.emit("hello", "I am here.")
}

socket.on("connect_error") { _, _ in
    log.info("Connection error \(socket.sid)")
}

socket.on("error") { _, _ in
    log.info("Other error \(socket.sid)")
}

socket.on("connect_timeout") { _, _ in
    log.info("Timeout error \(socket.sid)")
}

socket.on("news") { data, _ in
    log.info("Got news! \(data)")
}

dispatchMain()

const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { ApiError } = require("../utils/apiError");

class SocketService {
  constructor() {
    this.io = null;
    this.connections = new Map();
  }

  /**
   * Initialize Socket.io server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: config.adminUrl,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // Apply middleware for authentication
    this.io.use(this.authenticateSocket.bind(this));

    // Handle connections
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);

      // Handle disconnection
      socket.on("disconnect", () => {
        this.handleDisconnection(socket);
      });

      // Error handling
      socket.on("error", (error) => {
        this.handleError(socket, error);
      });
    });

    console.log("Socket.io server initialized");
  }

  /**
   * Socket.io authentication middleware
   */
  async authenticateSocket(socket, next) {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        throw new ApiError({
          message: "Authentication token missing",
          statusCode: 401,
        });
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;

      // Store the socket connection with user ID
      if (decoded.sub) {
        this.connections.set(decoded.sub, socket);
      }

      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    console.log(`New client connected: ${socket.id}`);

    // Join user to their personal room
    if (socket.user?.sub) {
      socket.join(`user_${socket.user.sub}`);
    }

    // Example of custom event handling
    socket.on("joinRoom", (room) => {
      this.handleJoinRoom(socket, room);
    });

    socket.on("leaveRoom", (room) => {
      this.handleLeaveRoom(socket, room);
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove from connections map
    if (socket.user?.sub) {
      this.connections.delete(socket.user.sub);
    }
  }

  /**
   * Handle socket errors
   */
  handleError(socket, error) {
    console.error(`Socket error (${socket.id}):`, error);
    socket.emit("error", { message: "An error occurred" });
  }

  /**
   * Handle joining rooms
   */
  handleJoinRoom(socket, room) {
    if (!room) return;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  }

  /**
   * Handle leaving rooms
   */
  handleLeaveRoom(socket, room) {
    if (!room) return;
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  }

  /**
   * Send message to specific user
   * @param {string} userId - User ID to send to
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  sendToUser(userId, event, data) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Broadcast to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Send to specific room
   * @param {string} room - Room name
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  /**
   * Create a namespace
   * @param {string} name - Namespace name
   * @param {Function} configFn - Configuration function
   */
  createNamespace(name, configFn) {
    const namespace = this.io.of(name);
    if (typeof configFn === "function") {
      configFn(namespace);
    }
    return namespace;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers() {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if user is connected
   * @param {string} userId - User ID to check
   */
  isUserConnected(userId) {
    return this.connections.has(userId);
  }
}

// Singleton pattern
module.exports = new SocketService();

const socketIo = require("socket.io");

let io = null;

/**
 * Initializes socket.io server.
 * @param {import('http').Server} server 
 */
function init(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    // Join room corresponding to organization for multi-tenant streaming updates
    socket.on("join-organization", (orgId) => {
      if (orgId) {
        socket.join(`org_${orgId}`);
        console.log(`[Socket] Socket ${socket.id} joined room: org_${orgId}`);
      }
    });

    // Join room corresponding to individual user for targeted notifications
    socket.on("join-user", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket] Socket ${socket.id} joined room: user_${userId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emits an event to an entire organization tenant.
 */
function emitToOrganization(orgId, eventName, data) {
  if (io) {
    io.to(`org_${orgId}`).emit(eventName, data);
    console.log(`[Socket] Emitted ${eventName} to organization room org_${orgId}`);
  }
}

/**
 * Emits an event to a single user.
 */
function emitToUser(userId, eventName, data) {
  if (io) {
    io.to(`user_${userId}`).emit(eventName, data);
    console.log(`[Socket] Emitted ${eventName} to user room user_${userId}`);
  }
}

module.exports = {
  init,
  emitToOrganization,
  emitToUser
};

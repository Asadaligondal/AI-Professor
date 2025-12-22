"""
WebSocket Manager for real-time updates
Handles connections and broadcasts events to connected clients
"""

import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and store a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(self.active_connections[user_id])}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                logger.info(f"WebSocket disconnected for user {user_id}")
                
                # Clean up empty lists
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            except ValueError:
                pass
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to all connections of a specific user"""
        if user_id in self.active_connections:
            disconnected = []
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected websockets
            for connection in disconnected:
                self.disconnect(connection, user_id)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected users"""
        for user_id, connections in self.active_connections.items():
            await self.send_personal_message(message, user_id)


# Global connection manager instance
manager = ConnectionManager()

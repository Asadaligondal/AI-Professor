"""
WebSocket Router
Real-time communication endpoints for payment notifications and updates
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.websocket import manager

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ws",
    tags=["WebSocket"]
)


@router.websocket("/notifications/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str
):
    """
    WebSocket endpoint for real-time notifications.
    
    Clients connect here to receive payment success events and other updates.
    """
    await manager.connect(websocket, user_id)
    
    try:
        # Keep connection alive and handle any incoming messages
        while True:
            # Wait for any message from client (ping/pong to keep alive)
            data = await websocket.receive_text()
            
            # Echo back for heartbeat
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
        manager.disconnect(websocket, user_id)

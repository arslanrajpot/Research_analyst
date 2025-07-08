from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Legacy method - connection is now handled directly in the endpoint"""
        # This method is kept for backward compatibility but not used
        pass

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)

    async def send_personal_json(self, data: dict, websocket: WebSocket):
        """Send JSON data to a specific websocket"""
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.error(f"Error sending JSON message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            logger.warning("No active connections to broadcast to")
            return
            
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                self.disconnect(connection)

    def has_connections(self):
        """Check if there are any active connections"""
        return len(self.active_connections) > 0

    async def send_status_update(self, status: str, details: str = "", progress: int = 0):
        """Send a status update to all connected clients"""
        if not self.has_connections():
            logger.warning("No active connections for status update")
            return
            
        message = {
            "type": "status_update",
            "status": status,
            "details": details,
            "progress": progress,
            "timestamp": datetime.now().isoformat()
        }
        try:
            await self.broadcast(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending status update: {e}")

    async def send_data_source_update(self, source: str, action: str, count: int = 0):
        """Send data source specific update"""
        message = {
            "type": "data_source_update",
            "source": source,
            "action": action,
            "count": count,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(json.dumps(message))

    async def send_insight_update(self, insight: str, step: int, total: int):
        """Send insight generation update"""
        message = {
            "type": "insight_update",
            "insight": insight,
            "step": step,
            "total": total,
            "timestamp": datetime.now().isoformat()
        }
        try:
            await self.broadcast(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending insight update: {e}")

    async def send_subtask_update(self, task_id: str, task_name: str, status: str, description: str = ""):
        """Send subtask update with status and color coding"""
        message = {
            "type": "subtask_update",
            "task_id": task_id,
            "task_name": task_name,
            "status": status,  # "pending", "in_progress", "completed", "error"
            "description": description,
            "timestamp": datetime.now().isoformat()
        }
        try:
            await self.broadcast(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending subtask update: {e}")

    async def send_workflow_start(self, total_tasks: int):
        """Send workflow start notification"""
        message = {
            "type": "workflow_start",
            "total_tasks": total_tasks,
            "timestamp": datetime.now().isoformat()
        }
        try:
            await self.broadcast(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending workflow start: {e}")

    async def send_research_progress(self, stage: str, message: str, progress: int = 0, data: dict = None):
        """Send research progress update"""
        update_message = {
            "type": "research_progress",
            "stage": stage,
            "message": message,
            "progress": progress,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        }
        try:
            await self.broadcast(json.dumps(update_message))
        except Exception as e:
            logger.error(f"Error sending research progress: {e}")

    async def send_error_update(self, error_type: str, error_message: str, stage: str = "unknown"):
        """Send error update to clients"""
        error_message_data = {
            "type": "error_update",
            "error_type": error_type,
            "error_message": error_message,
            "stage": stage,
            "timestamp": datetime.now().isoformat()
        }
        try:
            await self.broadcast(json.dumps(error_message_data))
        except Exception as e:
            logger.error(f"Error sending error update: {e}")

# Global connection manager
manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    manager.active_connections.append(websocket)
    logger.info(f"WebSocket connected for {client_id}. Total: {len(manager.active_connections)}")
    
    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": f"Connected to Market Research Generator (Client: {client_id})",
            "timestamp": datetime.now().isoformat()
        }))
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
    finally:
        manager.disconnect(websocket)

@router.get("/health")
async def websocket_health():
    """Health check endpoint for WebSocket service"""
    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "has_connections": manager.has_connections()
    }

@router.get("/debug")
async def websocket_debug():
    """Debug endpoint to check WebSocket manager state"""
    return {
        "manager_class": str(type(manager)),
        "active_connections_count": len(manager.active_connections),
        "has_connections": manager.has_connections()
    }

# Export the manager for use in other modules
__all__ = ["router", "manager"]

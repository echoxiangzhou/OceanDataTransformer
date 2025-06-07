import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import websocket_manager
from app.services.task_scheduler import task_scheduler
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket连接端点"""
    await websocket_manager.connect(websocket, client_id)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_websocket_message(client_id, message)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON from client {client_id}: {data}")
                await websocket_manager.send_personal_message(
                    json.dumps({"error": "Invalid JSON format"}), 
                    client_id
                )
            except Exception as e:
                logger.error(f"Error handling message from {client_id}: {e}")
                await websocket_manager.send_personal_message(
                    json.dumps({"error": str(e)}), 
                    client_id
                )
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        websocket_manager.disconnect(client_id)

async def handle_websocket_message(client_id: str, message: dict):
    """处理WebSocket消息"""
    message_type = message.get("type")
    
    if message_type == "subscribe_task":
        # 订阅任务进度更新
        task_id = message.get("task_id")
        if task_id:
            websocket_manager.subscribe_to_task(client_id, int(task_id))
            response = {
                "type": "subscription_confirmed",
                "task_id": task_id,
                "message": f"Subscribed to task {task_id}"
            }
            await websocket_manager.send_personal_message(
                json.dumps(response), client_id
            )
    
    elif message_type == "unsubscribe_task":
        # 取消订阅任务进度更新
        task_id = message.get("task_id")
        if task_id:
            websocket_manager.unsubscribe_from_task(client_id, int(task_id))
            response = {
                "type": "unsubscription_confirmed", 
                "task_id": task_id,
                "message": f"Unsubscribed from task {task_id}"
            }
            await websocket_manager.send_personal_message(
                json.dumps(response), client_id
            )
    
    elif message_type == "get_scheduler_status":
        # 获取调度器状态
        status = task_scheduler.get_queue_status()
        response = {
            "type": "scheduler_status",
            "data": status
        }
        await websocket_manager.send_personal_message(
            json.dumps(response), client_id
        )
    
    elif message_type == "ping":
        # 心跳检测
        response = {
            "type": "pong",
            "timestamp": message.get("timestamp")
        }
        await websocket_manager.send_personal_message(
            json.dumps(response), client_id
        )
    
    else:
        logger.warning(f"Unknown message type from {client_id}: {message_type}")
        response = {
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }
        await websocket_manager.send_personal_message(
            json.dumps(response), client_id
        )

@router.get("/ws/stats")
async def get_websocket_stats():
    """获取WebSocket连接统计信息"""
    return websocket_manager.get_connection_stats()
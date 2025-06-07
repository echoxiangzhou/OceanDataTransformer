import asyncio
import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:
    """WebSocket连接管理器，用于实时进度推送"""
    
    def __init__(self):
        # 存储所有活跃的WebSocket连接
        self.active_connections: Dict[str, WebSocket] = {}
        # 存储每个连接订阅的任务ID
        self.task_subscriptions: Dict[str, Set[int]] = {}
        # 存储每个任务的订阅者
        self.subscribers_by_task: Dict[int, Set[str]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """接受WebSocket连接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.task_subscriptions[client_id] = set()
        logger.info(f"WebSocket client {client_id} connected")
        
    def disconnect(self, client_id: str):
        """断开WebSocket连接"""
        if client_id in self.active_connections:
            # 清理订阅关系
            subscribed_tasks = self.task_subscriptions.get(client_id, set())
            for task_id in subscribed_tasks:
                if task_id in self.subscribers_by_task:
                    self.subscribers_by_task[task_id].discard(client_id)
                    if not self.subscribers_by_task[task_id]:
                        del self.subscribers_by_task[task_id]
            
            # 清理连接
            del self.active_connections[client_id]
            del self.task_subscriptions[client_id]
            logger.info(f"WebSocket client {client_id} disconnected")
    
    def subscribe_to_task(self, client_id: str, task_id: int):
        """订阅任务进度更新"""
        if client_id in self.task_subscriptions:
            self.task_subscriptions[client_id].add(task_id)
            
            if task_id not in self.subscribers_by_task:
                self.subscribers_by_task[task_id] = set()
            self.subscribers_by_task[task_id].add(client_id)
            
            logger.info(f"Client {client_id} subscribed to task {task_id}")
    
    def unsubscribe_from_task(self, client_id: str, task_id: int):
        """取消订阅任务进度更新"""
        if client_id in self.task_subscriptions:
            self.task_subscriptions[client_id].discard(task_id)
            
        if task_id in self.subscribers_by_task:
            self.subscribers_by_task[task_id].discard(client_id)
            if not self.subscribers_by_task[task_id]:
                del self.subscribers_by_task[task_id]
                
        logger.info(f"Client {client_id} unsubscribed from task {task_id}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """发送个人消息"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def send_task_update(self, task_id: int, update_data: dict):
        """发送任务进度更新给所有订阅者"""
        if task_id not in self.subscribers_by_task:
            return
            
        message = {
            "type": "task_update",
            "task_id": task_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": update_data
        }
        
        message_str = json.dumps(message)
        subscribers = list(self.subscribers_by_task[task_id])
        
        for client_id in subscribers:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(message_str)
                except Exception as e:
                    logger.error(f"Error sending task update to {client_id}: {e}")
                    self.disconnect(client_id)
    
    async def broadcast_scheduler_status(self, status_data: dict):
        """广播调度器状态更新"""
        message = {
            "type": "scheduler_status",
            "timestamp": datetime.utcnow().isoformat(),
            "data": status_data
        }
        
        message_str = json.dumps(message)
        disconnected_clients = []
        
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message_str)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # 清理断开的连接
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    async def send_notification(self, notification_data: dict, target_clients: List[str] = None):
        """发送通知消息"""
        message = {
            "type": "notification",
            "timestamp": datetime.utcnow().isoformat(),
            "data": notification_data
        }
        
        message_str = json.dumps(message)
        target_connections = target_clients or list(self.active_connections.keys())
        
        for client_id in target_connections:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(message_str)
                except Exception as e:
                    logger.error(f"Error sending notification to {client_id}: {e}")
                    self.disconnect(client_id)
    
    def get_connection_stats(self) -> dict:
        """获取连接统计信息"""
        return {
            "active_connections": len(self.active_connections),
            "total_subscriptions": sum(len(subs) for subs in self.task_subscriptions.values()),
            "tasks_being_watched": len(self.subscribers_by_task),
            "clients": list(self.active_connections.keys())
        }

# 全局WebSocket管理器实例
websocket_manager = WebSocketManager()
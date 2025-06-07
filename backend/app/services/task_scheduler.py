import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.crud.crud_download_task import download_task as crud_download_task
from app.services.data_download_service import download_service
from app.core.config import settings

logger = logging.getLogger(__name__)

class TaskScheduler:
    """Download task scheduler with priority queue and concurrency control"""
    
    def __init__(self, max_concurrent_tasks: int = None):
        self.max_concurrent_tasks = max_concurrent_tasks or settings.MAX_CONCURRENT_TASKS
        self.running_tasks: Dict[int, asyncio.Task] = {}
        self.pending_queue: List[int] = []  # Task IDs in priority order
        self.scheduler_running = False
        
    async def start_scheduler(self, db: Session):
        """Start the task scheduler"""
        if self.scheduler_running:
            return
            
        self.scheduler_running = True
        logger.info("Task scheduler started")
        
        while self.scheduler_running:
            try:
                await self._process_queue(db)
                await asyncio.sleep(5)  # Check every 5 seconds
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(10)
    
    async def stop_scheduler(self):
        """Stop the task scheduler"""
        self.scheduler_running = False
        
        # Cancel all running tasks
        for task_id, task in self.running_tasks.items():
            task.cancel()
            logger.info(f"Cancelled task {task_id}")
            
        self.running_tasks.clear()
        logger.info("Task scheduler stopped")
    
    async def add_task_to_queue(self, db: Session, task_id: int, priority: int = 5):
        """Add task to scheduler queue with priority (1=highest, 10=lowest)"""
        # Update task priority in database
        task = crud_download_task.get(db, task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")
            
        # Add task metadata with priority
        if not task.task_metadata:
            task.task_metadata = {}
        task.task_metadata['priority'] = priority
        task.task_metadata['queued_at'] = datetime.utcnow().isoformat()
        
        crud_download_task.update(db, db_obj=task, obj_in={"task_metadata": task.task_metadata})
        
        # Insert into queue based on priority
        self._insert_by_priority(task_id, priority)
        
        logger.info(f"Task {task_id} added to queue with priority {priority}")
    
    async def remove_task_from_queue(self, task_id: int):
        """Remove task from queue"""
        if task_id in self.pending_queue:
            self.pending_queue.remove(task_id)
            logger.info(f"Task {task_id} removed from queue")
    
    async def _process_queue(self, db: Session):
        """Process pending tasks based on concurrency limits"""
        # Clean up completed/failed tasks
        completed_tasks = []
        for task_id, task in self.running_tasks.items():
            if task.done():
                completed_tasks.append(task_id)
        
        for task_id in completed_tasks:
            del self.running_tasks[task_id]
            logger.info(f"Task {task_id} completed and removed from running tasks")
        
        # Start new tasks if we have capacity
        available_slots = self.max_concurrent_tasks - len(self.running_tasks)
        
        while available_slots > 0 and self.pending_queue:
            task_id = self.pending_queue.pop(0)  # Get highest priority task
            
            # Verify task is still pending
            task = crud_download_task.get(db, task_id)
            if not task or task.status != "pending":
                continue
                
            # Start the task
            try:
                success = await download_service.start_download(db, task_id)
                if success:
                    # Track the running task (the actual async task is managed by download_service)
                    self.running_tasks[task_id] = asyncio.create_task(self._monitor_task(db, task_id))
                    available_slots -= 1
                    logger.info(f"Started task {task_id} ({len(self.running_tasks)}/{self.max_concurrent_tasks} slots used)")
                else:
                    logger.error(f"Failed to start task {task_id}")
            except Exception as e:
                logger.error(f"Error starting task {task_id}: {e}")
    
    async def _monitor_task(self, db: Session, task_id: int):
        """Monitor task completion"""
        while True:
            try:
                task = crud_download_task.get(db, task_id)
                if not task:
                    break
                    
                if task.status in ["completed", "failed", "cancelled"]:
                    break
                    
                await asyncio.sleep(10)  # Check every 10 seconds
            except Exception as e:
                logger.error(f"Error monitoring task {task_id}: {e}")
                break
    
    def _insert_by_priority(self, task_id: int, priority: int):
        """Insert task into queue maintaining priority order"""
        # For now, simple insertion - could be optimized with heapq
        inserted = False
        for i, existing_task_id in enumerate(self.pending_queue):
            # Lower number = higher priority
            if priority < self._get_task_priority(existing_task_id):
                self.pending_queue.insert(i, task_id)
                inserted = True
                break
        
        if not inserted:
            self.pending_queue.append(task_id)
    
    def _get_task_priority(self, task_id: int) -> int:
        """Get task priority (would need to query DB in real implementation)"""
        # This is a simplified implementation
        # In practice, you'd cache task metadata or query the database
        return 5  # Default priority
    
    def get_queue_status(self) -> Dict:
        """Get current queue status"""
        return {
            "running_tasks": len(self.running_tasks),
            "pending_tasks": len(self.pending_queue),
            "max_concurrent": self.max_concurrent_tasks,
            "scheduler_running": self.scheduler_running,
            "running_task_ids": list(self.running_tasks.keys()),
            "pending_task_ids": self.pending_queue.copy()
        }

# Global scheduler instance
task_scheduler = TaskScheduler()
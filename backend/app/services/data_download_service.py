import asyncio
import aiohttp
import aiofiles
import ftplib
import paramiko
from pathlib import Path
from typing import Optional, Callable, Dict, Any
from urllib.parse import urlparse
from sqlalchemy.orm import Session
import logging

from app.crud.crud_download_task import download_task as crud_download_task
from app.crud.crud_data_source import data_source as crud_data_source
from app.core.config import settings

logger = logging.getLogger(__name__)

class DownloadService:
    def __init__(self):
        self.active_downloads: Dict[int, asyncio.Task] = {}

    async def start_download(self, db: Session, task_id: int) -> bool:
        """Start a download task"""
        try:
            # Get task and data source info
            task = crud_download_task.get(db, task_id)
            if not task:
                logger.error(f"Task {task_id} not found")
                return False

            data_source = crud_data_source.get(db, task.source_id)
            if not data_source:
                logger.error(f"Data source {task.source_id} not found")
                return False

            # Update task status to running
            crud_download_task.set_status(db, task_id=task_id, status="running")
            
            # Create download task based on protocol
            download_task_coroutine = self._create_download_task(db, task, data_source)
            
            # Store the task for potential cancellation
            self.active_downloads[task_id] = asyncio.create_task(download_task_coroutine)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start download task {task_id}: {e}")
            crud_download_task.set_status(db, task_id=task_id, status="failed", error_message=str(e))
            return False

    async def pause_download(self, db: Session, task_id: int) -> bool:
        """Pause a download task"""
        if task_id in self.active_downloads:
            self.active_downloads[task_id].cancel()
            del self.active_downloads[task_id]
            crud_download_task.set_status(db, task_id=task_id, status="paused")
            return True
        return False

    async def resume_download(self, db: Session, task_id: int) -> bool:
        """Resume a paused download task"""
        return await self.start_download(db, task_id)

    async def cancel_download(self, db: Session, task_id: int) -> bool:
        """Cancel a download task"""
        if task_id in self.active_downloads:
            self.active_downloads[task_id].cancel()
            del self.active_downloads[task_id]
        crud_download_task.set_status(db, task_id=task_id, status="cancelled")
        return True

    async def _create_download_task(self, db: Session, task, data_source):
        """Create appropriate download task based on protocol"""
        try:
            protocol = data_source.protocol.upper()
            
            if protocol == "HTTP" or protocol == "HTTPS":
                await self._download_http(db, task, data_source)
            elif protocol == "FTP":
                await self._download_ftp(db, task, data_source)
            elif protocol == "SFTP":
                await self._download_sftp(db, task, data_source)
            else:
                raise ValueError(f"Unsupported protocol: {protocol}")
                
        except asyncio.CancelledError:
            logger.info(f"Download task {task.id} was cancelled")
            crud_download_task.set_status(db, task_id=task.id, status="cancelled")
        except Exception as e:
            logger.error(f"Download task {task.id} failed: {e}")
            crud_download_task.set_status(db, task_id=task.id, status="failed", error_message=str(e))
        finally:
            # Clean up
            if task.id in self.active_downloads:
                del self.active_downloads[task.id]

    async def _download_http(self, db: Session, task, data_source):
        """Download file using HTTP/HTTPS"""
        url = data_source.url
        save_path = Path(task.save_path)
        save_path.mkdir(parents=True, exist_ok=True)
        
        # Extract filename from URL or use pattern
        parsed_url = urlparse(url)
        filename = Path(parsed_url.path).name or "downloaded_file"
        filepath = save_path / filename

        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {response.reason}")
                
                total_size = int(response.headers.get('content-length', 0))
                if total_size > 0:
                    crud_download_task.update(db, db_obj=task, obj_in={"file_size": total_size})

                downloaded_size = 0
                
                async with aiofiles.open(filepath, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        await f.write(chunk)
                        downloaded_size += len(chunk)
                        
                        # Update progress
                        if total_size > 0:
                            progress = (downloaded_size / total_size) * 100
                            crud_download_task.update_progress(
                                db, task_id=task.id, progress=progress, downloaded_size=downloaded_size
                            )

        # Mark as completed
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)

    async def _download_ftp(self, db: Session, task, data_source):
        """Download file using FTP"""
        # Note: This is a simplified FTP implementation
        # In production, you'd want to use aioftp for async FTP
        parsed_url = urlparse(data_source.url)
        
        def ftp_download():
            ftp = ftplib.FTP()
            try:
                ftp.connect(parsed_url.hostname, parsed_url.port or 21)
                
                if data_source.auth_required:
                    ftp.login(data_source.username, data_source.password)
                else:
                    ftp.login()
                
                # Simple file download logic
                save_path = Path(task.save_path)
                save_path.mkdir(parents=True, exist_ok=True)
                
                filename = Path(parsed_url.path).name
                filepath = save_path / filename
                
                with open(filepath, 'wb') as f:
                    ftp.retrbinary(f'RETR {parsed_url.path}', f.write)
                
                ftp.quit()
                
            except Exception as e:
                if ftp:
                    ftp.quit()
                raise e

        # Run FTP download in thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, ftp_download)
        
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)

    async def _download_sftp(self, db: Session, task, data_source):
        """Download file using SFTP"""
        parsed_url = urlparse(data_source.url)
        
        def sftp_download():
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            try:
                ssh.connect(
                    hostname=parsed_url.hostname,
                    port=parsed_url.port or 22,
                    username=data_source.username,
                    password=data_source.password
                )
                
                sftp = ssh.open_sftp()
                
                save_path = Path(task.save_path)
                save_path.mkdir(parents=True, exist_ok=True)
                
                filename = Path(parsed_url.path).name
                filepath = save_path / filename
                
                sftp.get(parsed_url.path, str(filepath))
                
                sftp.close()
                ssh.close()
                
            except Exception as e:
                if ssh:
                    ssh.close()
                raise e

        # Run SFTP download in thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, sftp_download)
        
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)

# Global instance
download_service = DownloadService()
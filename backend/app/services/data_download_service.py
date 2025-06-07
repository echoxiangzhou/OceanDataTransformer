import asyncio
import aiohttp
import aiofiles
import ftplib
import paramiko
import re
from pathlib import Path
from typing import Optional, Callable, Dict, Any, List
from urllib.parse import urlparse, urljoin
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup
import logging

from app.crud.crud_download_task import download_task as crud_download_task
from app.crud.crud_data_source import data_source as crud_data_source
from app.core.config import settings
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

# Import websocket manager (avoid circular import)
def get_websocket_manager():
    from app.services.websocket_manager import websocket_manager
    return websocket_manager

class DownloadService:
    def __init__(self):
        self.active_downloads: Dict[int, asyncio.Task] = {}
    
    def _is_directory_url(self, url: str) -> bool:
        """判断URL是否为目录（不以文件扩展名结尾）"""
        parsed = urlparse(url)
        path = parsed.path.rstrip('/')
        return not Path(path).suffix or path.endswith('/')
    
    def _get_file_pattern(self, filename_pattern: str) -> str:
        """将通配符模式转换为正则表达式"""
        if not filename_pattern:
            return r'.*\.nc$'  # 默认匹配.nc文件
        
        # 转换通配符为正则表达式
        pattern = filename_pattern.replace('.', r'\.')
        pattern = pattern.replace('*', '.*')
        pattern = pattern.replace('?', '.')
        return f'^{pattern}$'
    
    async def _extract_files_from_directory(self, session: aiohttp.ClientSession, url: str, pattern: str) -> List[str]:
        """从目录页面提取符合模式的文件链接"""
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"Failed to access directory: HTTP {response.status}")
                
                html_content = await response.text()
                soup = BeautifulSoup(html_content, 'html.parser')
                
                file_links = []
                regex_pattern = re.compile(pattern, re.IGNORECASE)
                
                # 查找所有链接
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    filename = href.split('/')[-1]
                    
                    # 匹配文件名模式
                    if regex_pattern.match(filename):
                        # 构建完整URL
                        if href.startswith('http'):
                            file_url = href
                        else:
                            file_url = urljoin(url, href)
                        file_links.append(file_url)
                
                return file_links
                
        except Exception as e:
            logger.error(f"Failed to extract files from directory {url}: {e}")
            raise

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
        # Create a new database session for the long-running download task
        async_db = SessionLocal()
        try:
            protocol = data_source.protocol.upper()
            
            if protocol == "HTTP" or protocol == "HTTPS":
                await self._download_http(async_db, task, data_source)
            elif protocol == "FTP":
                await self._download_ftp(async_db, task, data_source)
            elif protocol == "SFTP":
                await self._download_sftp(async_db, task, data_source)
            else:
                raise ValueError(f"Unsupported protocol: {protocol}")
                
        except asyncio.CancelledError:
            logger.info(f"Download task {task.id} was cancelled")
            crud_download_task.set_status(async_db, task_id=task.id, status="cancelled")
        except Exception as e:
            logger.error(f"Download task {task.id} failed: {e}")
            crud_download_task.set_status(async_db, task_id=task.id, status="failed", error_message=str(e))
        finally:
            # Clean up database session
            async_db.close()
            # Clean up active downloads
            if task.id in self.active_downloads:
                del self.active_downloads[task.id]

    async def _download_http(self, db: Session, task, data_source):
        """Download file(s) using HTTP/HTTPS - supports both single files and directories"""
        url = data_source.url
        
        # 确保使用相对路径，避免权限问题
        if task.save_path.startswith('/'):
            save_path = Path('.' + task.save_path)
        else:
            save_path = Path(task.save_path)
            
        # 创建目录
        try:
            save_path.mkdir(parents=True, exist_ok=True)
        except PermissionError as e:
            logger.error(f"Permission denied creating directory {save_path}: {e}")
            raise Exception(f"无法创建下载目录: {save_path}，请检查权限")

        async with aiohttp.ClientSession() as session:
            # 判断是目录还是单文件
            if self._is_directory_url(url):
                await self._download_directory(db, session, task, url, save_path)
            else:
                await self._download_single_file(db, session, task, url, save_path)

    async def _download_single_file(self, db: Session, session: aiohttp.ClientSession, task, url: str, save_path: Path):
        """下载单个文件"""
        parsed_url = urlparse(url)
        filename = Path(parsed_url.path).name or "downloaded_file"
        filepath = save_path / filename

        async with session.get(url) as response:
            if response.status != 200:
                raise Exception(f"HTTP {response.status}: {response.reason}")
            
            total_size = int(response.headers.get('content-length', 0))
            if total_size > 0:
                fresh_task = crud_download_task.get(db, task.id)
                if fresh_task:
                    crud_download_task.update(db, db_obj=fresh_task, obj_in={"file_size": total_size})

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
                        
                        # Send WebSocket progress update
                        await self._send_progress_update(task.id, {
                            "progress": progress,
                            "downloaded_size": downloaded_size,
                            "total_size": total_size,
                            "status": "running",
                            "current_file": filename
                        })

        # Mark as completed
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)
        
        # Send completion update
        await self._send_progress_update(task.id, {
            "progress": 100.0,
            "downloaded_size": downloaded_size,
            "total_size": total_size,
            "status": "completed",
            "files_downloaded": 1
        })

    async def _download_directory(self, db: Session, session: aiohttp.ClientSession, task, url: str, save_path: Path):
        """下载目录中所有符合模式的文件"""
        pattern = self._get_file_pattern(task.filename_pattern)
        
        # 获取目录中的文件列表
        file_urls = await self._extract_files_from_directory(session, url, pattern)
        
        if not file_urls:
            raise Exception(f"在目录 {url} 中未找到符合模式 '{task.filename_pattern}' 的文件")
        
        logger.info(f"Found {len(file_urls)} files to download from directory {url}")
        
        total_files = len(file_urls)
        downloaded_files = 0
        total_downloaded_size = 0
        
        for i, file_url in enumerate(file_urls):
            try:
                filename = Path(urlparse(file_url).path).name
                filepath = save_path / filename
                
                # 发送当前文件信息
                await self._send_progress_update(task.id, {
                    "progress": (i / total_files) * 100,
                    "status": "running",
                    "current_file": filename,
                    "files_completed": i,
                    "total_files": total_files
                })
                
                async with session.get(file_url) as response:
                    if response.status != 200:
                        logger.warning(f"Failed to download {file_url}: HTTP {response.status}")
                        continue
                    
                    file_size = int(response.headers.get('content-length', 0))
                    downloaded_size = 0
                    
                    async with aiofiles.open(filepath, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            await f.write(chunk)
                            downloaded_size += len(chunk)
                            total_downloaded_size += len(chunk)
                            
                            # 更新进度（文件级别 + 总体进度）
                            file_progress = (downloaded_size / file_size * 100) if file_size > 0 else 0
                            overall_progress = ((i + file_progress / 100) / total_files) * 100
                            
                            crud_download_task.update_progress(
                                db, task_id=task.id, progress=overall_progress, downloaded_size=total_downloaded_size
                            )
                            
                            # Send WebSocket progress update
                            await self._send_progress_update(task.id, {
                                "progress": overall_progress,
                                "downloaded_size": total_downloaded_size,
                                "status": "running",
                                "current_file": filename,
                                "file_progress": file_progress,
                                "files_completed": i,
                                "total_files": total_files
                            })
                
                downloaded_files += 1
                logger.info(f"Successfully downloaded {filename}")
                
            except Exception as e:
                logger.error(f"Failed to download file {file_url}: {e}")
                # 继续下载其他文件，不中断整个任务
                continue
        
        if downloaded_files == 0:
            raise Exception("所有文件下载均失败")
        
        # Mark as completed
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)
        
        # Send completion update
        await self._send_progress_update(task.id, {
            "progress": 100.0,
            "downloaded_size": total_downloaded_size,
            "status": "completed",
            "files_downloaded": downloaded_files,
            "total_files": total_files
        })

    async def _download_ftp(self, db: Session, task, data_source):
        """Download file(s) using FTP - supports both single files and directories"""
        parsed_url = urlparse(data_source.url)
        
        # 确保使用相对路径，避免权限问题
        if task.save_path.startswith('/'):
            save_path = Path('.' + task.save_path)
        else:
            save_path = Path(task.save_path)
        save_path.mkdir(parents=True, exist_ok=True)
        
        # 判断是目录还是单文件
        if self._is_directory_url(data_source.url):
            await self._download_ftp_directory(db, task, data_source, parsed_url, save_path)
        else:
            await self._download_ftp_single_file(db, task, data_source, parsed_url, save_path)

    async def _download_ftp_single_file(self, db: Session, task, data_source, parsed_url, save_path: Path):
        """FTP单文件下载"""
        def ftp_download():
            ftp = ftplib.FTP()
            try:
                ftp.connect(parsed_url.hostname, parsed_url.port or 21)
                
                if data_source.auth_required:
                    ftp.login(data_source.username, data_source.password)
                else:
                    ftp.login()
                
                filename = Path(parsed_url.path).name
                filepath = save_path / filename
                
                # 获取文件大小
                try:
                    file_size = ftp.size(parsed_url.path)
                    if file_size:
                        fresh_task = crud_download_task.get(db, task.id)
                        if fresh_task:
                            crud_download_task.update(db, db_obj=fresh_task, obj_in={"file_size": file_size})
                except:
                    file_size = 0
                
                downloaded_size = 0
                
                def write_callback(data):
                    nonlocal downloaded_size
                    downloaded_size += len(data)
                    
                    # 更新进度
                    if file_size > 0:
                        progress = (downloaded_size / file_size) * 100
                        crud_download_task.update_progress(
                            db, task_id=task.id, progress=progress, downloaded_size=downloaded_size
                        )
                    
                    return data
                
                with open(filepath, 'wb') as f:
                    ftp.retrbinary(f'RETR {parsed_url.path}', lambda data: f.write(write_callback(data)))
                
                ftp.quit()
                return downloaded_size
                
            except Exception as e:
                if ftp:
                    ftp.quit()
                raise e

        # Run FTP download in thread pool
        loop = asyncio.get_event_loop()
        downloaded_size = await loop.run_in_executor(None, ftp_download)
        
        # Send completion update
        await self._send_progress_update(task.id, {
            "progress": 100.0,
            "downloaded_size": downloaded_size,
            "status": "completed",
            "files_downloaded": 1
        })
        
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)

    async def _download_ftp_directory(self, db: Session, task, data_source, parsed_url, save_path: Path):
        """FTP目录下载"""
        pattern = self._get_file_pattern(task.filename_pattern)
        regex_pattern = re.compile(pattern, re.IGNORECASE)
        
        def ftp_list_and_download():
            ftp = ftplib.FTP()
            try:
                ftp.connect(parsed_url.hostname, parsed_url.port or 21)
                
                if data_source.auth_required:
                    ftp.login(data_source.username, data_source.password)
                else:
                    ftp.login()
                
                # 获取目录文件列表
                ftp.cwd(parsed_url.path or '/')
                files = ftp.nlst()
                
                # 过滤符合模式的文件
                matching_files = [f for f in files if regex_pattern.match(f)]
                
                if not matching_files:
                    raise Exception(f"在FTP目录中未找到符合模式 '{task.filename_pattern}' 的文件")
                
                logger.info(f"Found {len(matching_files)} files to download from FTP directory")
                
                total_files = len(matching_files)
                downloaded_files = 0
                total_downloaded_size = 0
                
                for i, filename in enumerate(matching_files):
                    try:
                        filepath = save_path / filename
                        
                        # 获取文件大小
                        try:
                            file_size = ftp.size(filename)
                        except:
                            file_size = 0
                        
                        downloaded_size = 0
                        
                        def write_callback(data):
                            nonlocal downloaded_size, total_downloaded_size
                            downloaded_size += len(data)
                            total_downloaded_size += len(data)
                            
                            # 更新进度（仅更新数据库，WebSocket在主线程中发送）
                            file_progress = (downloaded_size / file_size * 100) if file_size > 0 else 0
                            overall_progress = ((i + file_progress / 100) / total_files) * 100
                            
                            crud_download_task.update_progress(
                                db, task_id=task.id, progress=overall_progress, downloaded_size=total_downloaded_size
                            )
                            
                            return data
                        
                        with open(filepath, 'wb') as f:
                            ftp.retrbinary(f'RETR {filename}', lambda data: f.write(write_callback(data)))
                        
                        downloaded_files += 1
                        logger.info(f"Successfully downloaded {filename} via FTP")
                        
                    except Exception as e:
                        logger.error(f"Failed to download FTP file {filename}: {e}")
                        continue
                
                ftp.quit()
                return downloaded_files, total_downloaded_size, total_files
                
            except Exception as e:
                if ftp:
                    ftp.quit()
                raise e

        # Run FTP download in thread pool with periodic WebSocket updates
        loop = asyncio.get_event_loop()
        
        # Start a task to send periodic WebSocket updates
        update_task = asyncio.create_task(self._send_periodic_updates(db, task.id, lambda: True))
        
        try:
            downloaded_files, total_downloaded_size, total_files = await loop.run_in_executor(None, ftp_list_and_download)
        finally:
            update_task.cancel()
        
        if downloaded_files == 0:
            raise Exception("所有FTP文件下载均失败")
        
        # Send completion update
        await self._send_progress_update(task.id, {
            "progress": 100.0,
            "downloaded_size": total_downloaded_size,
            "status": "completed",
            "files_downloaded": downloaded_files,
            "total_files": total_files
        })
        
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)

    async def _download_sftp(self, db: Session, task, data_source):
        """Download file(s) using SFTP - supports both single files and directories"""
        parsed_url = urlparse(data_source.url)
        
        # 确保使用相对路径，避免权限问题
        if task.save_path.startswith('/'):
            save_path = Path('.' + task.save_path)
        else:
            save_path = Path(task.save_path)
        save_path.mkdir(parents=True, exist_ok=True)
        
        # 判断是目录还是单文件
        if self._is_directory_url(data_source.url):
            await self._download_sftp_directory(db, task, data_source, parsed_url, save_path)
        else:
            await self._download_sftp_single_file(db, task, data_source, parsed_url, save_path)

    async def _download_sftp_single_file(self, db: Session, task, data_source, parsed_url, save_path: Path):
        """SFTP单文件下载"""
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
                
                filename = Path(parsed_url.path).name
                filepath = save_path / filename
                
                # 获取文件大小
                try:
                    file_stat = sftp.stat(parsed_url.path)
                    file_size = file_stat.st_size
                    if file_size:
                        fresh_task = crud_download_task.get(db, task.id)
                        if fresh_task:
                            crud_download_task.update(db, db_obj=fresh_task, obj_in={"file_size": file_size})
                except:
                    file_size = 0
                
                # 下载文件并跟踪进度
                downloaded_size = 0
                
                def progress_callback(transferred, total):
                    nonlocal downloaded_size
                    downloaded_size = transferred
                    
                    # 更新进度
                    if total > 0:
                        progress = (transferred / total) * 100
                        crud_download_task.update_progress(
                            db, task_id=task.id, progress=progress, downloaded_size=transferred
                        )
                
                sftp.get(parsed_url.path, str(filepath), callback=progress_callback)
                
                sftp.close()
                ssh.close()
                
                return downloaded_size
                
            except Exception as e:
                if ssh:
                    ssh.close()
                raise e

        # Run SFTP download in thread pool
        loop = asyncio.get_event_loop()
        downloaded_size = await loop.run_in_executor(None, sftp_download)
        
        # Send completion update
        await self._send_progress_update(task.id, {
            "progress": 100.0,
            "downloaded_size": downloaded_size,
            "status": "completed",
            "files_downloaded": 1
        })
        
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)

    async def _download_sftp_directory(self, db: Session, task, data_source, parsed_url, save_path: Path):
        """SFTP目录下载"""
        pattern = self._get_file_pattern(task.filename_pattern)
        regex_pattern = re.compile(pattern, re.IGNORECASE)
        
        def sftp_list_and_download():
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
                
                # 获取目录文件列表
                remote_path = parsed_url.path or '/'
                files = sftp.listdir(remote_path)
                
                # 过滤符合模式的文件
                matching_files = []
                for f in files:
                    # 检查是否为文件（非目录）
                    try:
                        remote_file_path = f"{remote_path.rstrip('/')}/{f}"
                        stat = sftp.stat(remote_file_path)
                        if not stat.st_mode & 0o040000:  # 不是目录
                            if regex_pattern.match(f):
                                matching_files.append(f)
                    except:
                        continue
                
                if not matching_files:
                    raise Exception(f"在SFTP目录中未找到符合模式 '{task.filename_pattern}' 的文件")
                
                logger.info(f"Found {len(matching_files)} files to download from SFTP directory")
                
                total_files = len(matching_files)
                downloaded_files = 0
                total_downloaded_size = 0
                
                for i, filename in enumerate(matching_files):
                    try:
                        remote_file_path = f"{remote_path.rstrip('/')}/{filename}"
                        local_filepath = save_path / filename
                        
                        # 获取文件大小
                        try:
                            file_stat = sftp.stat(remote_file_path)
                            file_size = file_stat.st_size
                        except:
                            file_size = 0
                        
                        downloaded_size = 0
                        
                        def progress_callback(transferred, total):
                            nonlocal downloaded_size, total_downloaded_size
                            # 计算此文件的下载进度
                            file_progress = (transferred / total * 100) if total > 0 else 0
                            
                            # 更新总下载大小
                            size_diff = transferred - downloaded_size
                            total_downloaded_size += size_diff
                            downloaded_size = transferred
                            
                            # 计算总体进度
                            overall_progress = ((i + file_progress / 100) / total_files) * 100
                            
                            crud_download_task.update_progress(
                                db, task_id=task.id, progress=overall_progress, downloaded_size=total_downloaded_size
                            )
                        
                        sftp.get(remote_file_path, str(local_filepath), callback=progress_callback)
                        
                        downloaded_files += 1
                        logger.info(f"Successfully downloaded {filename} via SFTP")
                        
                    except Exception as e:
                        logger.error(f"Failed to download SFTP file {filename}: {e}")
                        continue
                
                sftp.close()
                ssh.close()
                
                return downloaded_files, total_downloaded_size, total_files
                
            except Exception as e:
                if ssh:
                    ssh.close()
                raise e

        # Run SFTP download in thread pool with periodic WebSocket updates
        loop = asyncio.get_event_loop()
        
        # Start a task to send periodic WebSocket updates
        update_task = asyncio.create_task(self._send_periodic_updates(db, task.id, lambda: True))
        
        try:
            downloaded_files, total_downloaded_size, total_files = await loop.run_in_executor(None, sftp_list_and_download)
        finally:
            update_task.cancel()
        
        if downloaded_files == 0:
            raise Exception("所有SFTP文件下载均失败")
        
        # Send completion update
        await self._send_progress_update(task.id, {
            "progress": 100.0,
            "downloaded_size": total_downloaded_size,
            "status": "completed",
            "files_downloaded": downloaded_files,
            "total_files": total_files
        })
        
        crud_download_task.set_status(db, task_id=task.id, status="completed")
        crud_download_task.update_progress(db, task_id=task.id, progress=100.0)

    async def _send_progress_update(self, task_id: int, update_data: dict):
        """Send real-time progress update via WebSocket"""
        try:
            websocket_manager = get_websocket_manager()
            await websocket_manager.send_task_update(task_id, update_data)
        except Exception as e:
            logger.error(f"Failed to send WebSocket update for task {task_id}: {e}")

    async def _send_periodic_updates(self, db: Session, task_id: int, should_continue_func):
        """Send periodic WebSocket updates for FTP/SFTP downloads"""
        try:
            while should_continue_func():
                await asyncio.sleep(2)  # Update every 2 seconds
                
                # Get current task progress from database
                task = crud_download_task.get(db, task_id)
                if task and task.status == "running":
                    await self._send_progress_update(task_id, {
                        "progress": task.progress,
                        "downloaded_size": task.downloaded_size or 0,
                        "status": "running"
                    })
                else:
                    break
                    
        except asyncio.CancelledError:
            # Task was cancelled, which is expected
            pass
        except Exception as e:
            logger.error(f"Error in periodic updates for task {task_id}: {e}")

# Global instance
download_service = DownloadService()
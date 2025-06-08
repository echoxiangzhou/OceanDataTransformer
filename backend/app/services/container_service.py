"""Docker容器管理服务"""
import asyncio
import logging
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import tempfile
import shutil
import os

import docker
from docker.models.containers import Container
from docker.models.images import Image
from docker.errors import DockerException, ContainerError, ImageNotFound, APIError
import subprocess
import platform
import glob

from app.core.config import settings
from app.schemas.algorithm import Algorithm, ExecutionTask, ExecutionStatus
from app.services.algorithm_service import algorithm_service

logger = logging.getLogger(__name__)


class ContainerService:
    """Docker容器执行管理服务"""
    
    @staticmethod
    def _detect_docker_socket_paths():
        """检测可能的Docker socket路径"""
        possible_paths = []
        system = platform.system().lower()
        
        if system == "darwin":  # macOS
            # Docker Desktop for Mac 的常见路径
            mac_paths = [
                "/var/run/docker.sock",
                "~/.docker/run/docker.sock",
                "/Users/*/Library/Containers/com.docker.docker/Data/docker.raw.sock",
                "/Users/*/Library/Containers/com.docker.docker/Data/docker.sock",
            ]
            
            for path in mac_paths:
                expanded_path = os.path.expanduser(path)
                if "*" in expanded_path:
                    # 使用glob展开通配符
                    matches = glob.glob(expanded_path)
                    possible_paths.extend(matches)
                else:
                    possible_paths.append(expanded_path)
                    
        elif system == "linux":
            # Linux 系统的常见路径
            possible_paths = [
                "/var/run/docker.sock",
                "/run/docker.sock",
                "~/.docker/run/docker.sock",
            ]
            possible_paths = [os.path.expanduser(p) for p in possible_paths]
            
        elif system == "windows":
            # Windows 系统使用named pipe
            possible_paths = [
                "npipe:////./pipe/docker_engine",
                "npipe:////./pipe/dockerDesktopLinuxEngine",
            ]
        
        # 过滤存在的路径
        valid_paths = []
        for path in possible_paths:
            if path.startswith("npipe://") or os.path.exists(path):
                valid_paths.append(path)
                
        return valid_paths
    
    @staticmethod
    def _get_docker_clients():
        """获取所有可能的Docker客户端配置"""
        clients = []
        
        # 1. 默认连接（环境变量）
        clients.append(("环境变量", lambda: docker.from_env()))
        
        # 2. 检测到的socket路径
        socket_paths = ContainerService._detect_docker_socket_paths()
        for path in socket_paths:
            if path.startswith("npipe://"):
                clients.append((f"Windows管道: {path}", lambda p=path: docker.DockerClient(base_url=p)))
            else:
                clients.append((f"Unix Socket: {path}", lambda p=path: docker.DockerClient(base_url=f'unix://{p}')))
        
        # 3. TCP连接
        tcp_urls = [
            "tcp://localhost:2375",
            "tcp://127.0.0.1:2375",
            "tcp://localhost:2376",  # TLS
            "tcp://127.0.0.1:2376",  # TLS
        ]
        
        for url in tcp_urls:
            clients.append((f"TCP: {url}", lambda u=url: docker.DockerClient(base_url=u)))
        
        return clients
    
    def _log_docker_diagnostics(self):
        """记录Docker诊断信息"""
        logger.info("=== Docker 诊断信息 ===")
        
        # 1. 检查操作系统
        system = platform.system()
        logger.info(f"操作系统: {system} {platform.release()}")
        
        # 2. 检查Docker命令是否可用
        try:
            result = subprocess.run(['docker', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                logger.info(f"Docker CLI: {result.stdout.strip()}")
            else:
                logger.warning("Docker CLI 不可用")
        except Exception as e:
            logger.warning(f"无法执行 docker --version: {e}")
        
        # 3. 检查Docker进程
        try:
            if system == "Darwin":  # macOS
                result = subprocess.run(['pgrep', '-f', 'Docker'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    logger.info("Docker Desktop 进程正在运行")
                else:
                    logger.warning("Docker Desktop 进程未运行")
            elif system == "Linux":
                result = subprocess.run(['pgrep', 'dockerd'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    logger.info("Docker daemon 进程正在运行")
                else:
                    logger.warning("Docker daemon 进程未运行")
        except Exception as e:
            logger.debug(f"进程检查失败: {e}")
        
        # 4. 检查socket文件
        socket_paths = self._detect_docker_socket_paths()
        logger.info(f"检测到的Socket路径: {socket_paths}")
        
        for path in socket_paths:
            if not path.startswith("npipe://"):
                if os.path.exists(path):
                    stat = os.stat(path)
                    logger.info(f"Socket文件 {path}: 存在，权限 {oct(stat.st_mode)}")
                else:
                    logger.warning(f"Socket文件 {path}: 不存在")
        
        # 5. 环境变量
        docker_host = os.environ.get('DOCKER_HOST')
        if docker_host:
            logger.info(f"DOCKER_HOST 环境变量: {docker_host}")
        else:
            logger.info("DOCKER_HOST 环境变量未设置")
        
        # 6. 给出建议
        logger.info("=== 解决建议 ===")
        if system == "Darwin":
            logger.info("1. 确保 Docker Desktop for Mac 已安装并运行")
            logger.info("2. 在 Docker Desktop 中启用 'Allow the default Docker socket to be used'")
            logger.info("3. 重启 Docker Desktop")
        elif system == "Linux":
            logger.info("1. 确保 Docker 已安装: sudo apt-get install docker.io")
            logger.info("2. 启动 Docker 服务: sudo systemctl start docker")
            logger.info("3. 将用户添加到 docker 组: sudo usermod -aG docker $USER")
        elif system == "Windows":
            logger.info("1. 确保 Docker Desktop for Windows 已安装并运行")
            logger.info("2. 启用 WSL2 集成")
        
        logger.info("4. 如果问题持续，请检查防火墙设置")
        logger.info("5. 尝试重启计算机")
    
    def __init__(self):
        """初始化Docker客户端"""
        self.client = None
        self.containers: Dict[str, Container] = {}
        self.tasks: Dict[str, ExecutionTask] = {}
        self.docker_available = False
        
        try:
            # 获取所有可能的Docker客户端配置
            docker_clients = self._get_docker_clients()
            
            logger.info(f"检测到 {len(docker_clients)} 种Docker连接方式")
            
            for i, (description, client_factory) in enumerate(docker_clients):
                try:
                    logger.info(f"尝试连接方式 {i+1}/{len(docker_clients)}: {description}")
                    self.client = client_factory()
                    
                    # 测试连接
                    ping_result = self.client.ping()
                    logger.info(f"Docker ping 成功: {ping_result}")
                    
                    # 获取Docker版本信息
                    version_info = self.client.version()
                    docker_version = version_info.get('Version', 'Unknown')
                    api_version = version_info.get('ApiVersion', 'Unknown')
                    logger.info(f"Docker版本: {docker_version}, API版本: {api_version}")
                    
                    # 测试基本功能
                    try:
                        images = self.client.images.list()
                        logger.info(f"Docker镜像列表访问成功，当前有 {len(images)} 个镜像")
                    except Exception as e:
                        logger.warning(f"Docker镜像列表访问失败: {e}")
                    
                    self.docker_available = True
                    logger.info(f"Docker容器服务初始化成功，使用连接: {description}")
                    break
                    
                except Exception as e:
                    logger.debug(f"连接方式 '{description}' 失败: {e}")
                    continue
            
            if not self.docker_available:
                raise DockerException("所有Docker连接方式都失败")
                
        except Exception as e:
            logger.warning(f"Docker服务不可用: {e}")
            logger.warning("容器服务将在模拟模式下运行，无法执行实际的容器化任务")
            self._log_docker_diagnostics()
        
        # 创建工作目录
        self.work_dir = Path(settings.CONTAINER_WORK_DIR)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        # 启动后台清理任务（仅在Docker可用时）
        if self.docker_available:
            try:
                # 检查是否有运行中的事件循环
                loop = asyncio.get_running_loop()
                loop.create_task(self._cleanup_completed_containers())
            except RuntimeError:
                # 在没有事件循环的情况下，稍后再启动清理任务
                logger.debug("当前没有运行中的事件循环，清理任务将稍后启动")
                pass
    
    async def build_algorithm_image(
        self, 
        algorithm: Algorithm,
        source_code: str,
        requirements: Optional[str] = None
    ) -> Tuple[bool, str, List[str]]:
        """
        构建算法的Docker镜像
        
        Args:
            algorithm: 算法对象
            source_code: 算法源代码
            requirements: 依赖文件内容
            
        Returns:
            (success, image_name, build_logs)
        """
        build_logs = []
        image_name = f"ocean-algo/{algorithm.id}:{algorithm.version}".lower()
        
        if not self.docker_available:
            build_logs.append("Docker服务不可用，无法构建镜像")
            logger.warning(f"尝试构建镜像 {image_name}，但Docker服务不可用")
            return False, "", build_logs
        
        try:
            # 创建临时构建目录
            with tempfile.TemporaryDirectory() as build_dir:
                build_path = Path(build_dir)
                
                # 写入源代码
                if algorithm.language == 'python':
                    code_file = build_path / "algorithm.py"
                    code_file.write_text(source_code)
                    
                    # 创建运行脚本
                    runner_script = self._create_python_runner()
                    (build_path / "run.py").write_text(runner_script)
                    
                    # 生成Dockerfile
                    dockerfile_content = self._generate_python_dockerfile(
                        algorithm, 
                        requirements
                    )
                elif algorithm.language == 'r':
                    code_file = build_path / "algorithm.R"
                    code_file.write_text(source_code)
                    
                    # 创建运行脚本
                    runner_script = self._create_r_runner()
                    (build_path / "run.R").write_text(runner_script)
                    
                    dockerfile_content = self._generate_r_dockerfile(algorithm)
                else:
                    raise ValueError(f"不支持的语言: {algorithm.language}")
                
                # 写入Dockerfile
                (build_path / "Dockerfile").write_text(dockerfile_content)
                
                # 如果有requirements，写入文件
                if requirements:
                    (build_path / "requirements.txt").write_text(requirements)
                
                # 构建镜像
                logger.info(f"开始构建镜像: {image_name}")
                build_logs.append(f"构建镜像: {image_name}")
                
                image, logs = self.client.images.build(
                    path=str(build_path),
                    tag=image_name,
                    rm=True,
                    forcerm=True
                )
                
                # 收集构建日志
                for log in logs:
                    if 'stream' in log:
                        log_line = log['stream'].strip()
                        if log_line:
                            build_logs.append(log_line)
                            logger.debug(log_line)
                
                build_logs.append(f"镜像构建成功: {image_name}")
                logger.info(f"镜像构建成功: {image_name}")
                
                return True, image_name, build_logs
                
        except Exception as e:
            error_msg = f"镜像构建失败: {str(e)}"
            build_logs.append(error_msg)
            logger.error(error_msg)
            return False, "", build_logs
    
    async def execute_algorithm(
        self,
        task_id: int,
        algorithm: Algorithm,
        input_files: List[str],
        parameters: Dict[str, Any],
        output_format: Optional[str] = None
    ) -> ExecutionTask:
        """
        执行算法容器
        
        Args:
            task_id: 任务ID
            algorithm: 算法对象
            input_files: 输入文件路径列表
            parameters: 算法参数
            output_format: 输出格式
            
        Returns:
            ExecutionTask对象
        """
        # 创建任务对象
        task = ExecutionTask(
            id=task_id,
            algorithm_id=algorithm.id,
            algorithm_name=algorithm.name,
            status=ExecutionStatus.QUEUED,
            start_time=datetime.utcnow(),
            input_files=[Path(f).name for f in input_files],
            output_files=[],
            parameters=parameters,
            progress=0,
            logs=["任务已创建，等待执行..."]
        )
        
        self.tasks[str(task_id)] = task
        
        if not self.docker_available:
            task.status = ExecutionStatus.FAILED
            task.error_message = "Docker服务不可用"
            task.logs.append("错误: Docker服务不可用，无法执行容器化任务")
            task.end_time = datetime.utcnow()
            logger.warning(f"任务 {task_id} 无法执行：Docker服务不可用")
            return task
        
        # 异步执行容器
        try:
            asyncio.create_task(self._run_container(task, algorithm, input_files, parameters, output_format))
            logger.info(f"异步任务已创建，任务ID: {task_id}")
        except Exception as e:
            logger.error(f"创建异步任务失败: {e}")
            task.status = ExecutionStatus.FAILED
            task.error_message = f"创建异步任务失败: {str(e)}"
            task.logs.append(f"错误: 创建异步任务失败: {str(e)}")
            task.end_time = datetime.utcnow()
        
        return task
    
    async def _run_container(
        self,
        task: ExecutionTask,
        algorithm: Algorithm,
        input_files: List[str],
        parameters: Dict[str, Any],
        output_format: Optional[str]
    ):
        """实际运行容器的内部方法"""
        logger.info(f"开始运行容器，任务ID: {task.id}")
        try:
            # 更新任务状态
            task.status = ExecutionStatus.RUNNING
            task.logs.append("启动容器...")
            logger.info(f"任务 {task.id} 状态更新为 RUNNING")
            
            # 创建任务工作目录
            task_dir = self.work_dir / str(task.id)
            task_dir.mkdir(exist_ok=True)
            input_dir = task_dir / "input"
            output_dir = task_dir / "output"
            input_dir.mkdir(exist_ok=True)
            output_dir.mkdir(exist_ok=True)
            
            # 复制输入文件
            for file_path in input_files:
                src = Path(file_path)
                if src.exists():
                    dst = input_dir / src.name
                    shutil.copy2(src, dst)
                    task.logs.append(f"复制输入文件: {src.name}")
            
            # 创建参数文件
            params_file = task_dir / "parameters.json"
            params_data = {
                "parameters": parameters,
                "output_format": output_format or "default",
                "task_id": task.id
            }
            params_file.write_text(json.dumps(params_data, indent=2))
            
            # 准备容器配置
            container_config = {
                "image": algorithm.docker_image,
                "command": self._get_container_command(algorithm),
                "volumes": {
                    str(input_dir.absolute()): {"bind": "/data/input", "mode": "ro"},
                    str(output_dir.absolute()): {"bind": "/data/output", "mode": "rw"},
                    str(params_file.absolute()): {"bind": "/data/parameters.json", "mode": "ro"}
                },
                "environment": {
                    "TASK_ID": str(task.id),
                    "ALGORITHM_ID": str(algorithm.id),
                    "OUTPUT_FORMAT": output_format or "default"
                },
                "mem_limit": f"{algorithm.memory_usage or 1024}m",
                "cpu_period": 100000,
                "cpu_quota": 50000,  # 50% CPU
                "remove": False,
                "detach": True
            }
            
            # 运行容器
            logger.info(f"启动容器: {algorithm.docker_image}")
            container = self.client.containers.run(**container_config)
            
            task.container_id = container.id
            self.containers[str(task.id)] = container
            task.logs.append(f"容器已启动: {container.id[:12]}")
            
            # 监控容器执行
            await self._monitor_container(task, container, output_dir)
            
        except Exception as e:
            task.status = ExecutionStatus.FAILED
            task.error_message = str(e)
            task.logs.append(f"容器执行失败: {str(e)}")
            logger.error(f"容器执行失败 {task.id}: {e}")
        finally:
            task.end_time = datetime.utcnow()
    
    async def _monitor_container(
        self, 
        task: ExecutionTask, 
        container: Container,
        output_dir: Path
    ):
        """监控容器执行状态"""
        try:
            # 等待容器完成
            result = container.wait()
            
            # 获取容器日志
            logs = container.logs(stream=False, timestamps=True)
            if logs:
                log_lines = logs.decode('utf-8').strip().split('\n')
                for line in log_lines[-20:]:  # 只保留最后20行
                    task.logs.append(line)
            
            # 检查退出状态
            if result['StatusCode'] == 0:
                task.status = ExecutionStatus.COMPLETED
                task.progress = 100
                
                # 收集输出文件
                output_files = []
                for file_path in output_dir.glob("*"):
                    if file_path.is_file():
                        output_files.append(file_path.name)
                
                task.output_files = output_files
                task.logs.append(f"任务完成，生成 {len(output_files)} 个输出文件")
                logger.info(f"任务 {task.id} 执行成功")
            else:
                task.status = ExecutionStatus.FAILED
                task.error_message = f"容器退出码: {result['StatusCode']}"
                task.logs.append(f"容器执行失败，退出码: {result['StatusCode']}")
                logger.error(f"任务 {task.id} 执行失败")
                
        except Exception as e:
            task.status = ExecutionStatus.FAILED
            task.error_message = str(e)
            task.logs.append(f"监控容器时出错: {str(e)}")
            logger.error(f"监控容器失败 {task.id}: {e}")
        finally:
            # 清理容器
            try:
                container.remove()
                del self.containers[str(task.id)]
            except:
                pass
    
    async def stop_task(self, task_id: int) -> bool:
        """停止执行任务"""
        try:
            if not self.docker_available:
                logger.warning(f"尝试停止任务 {task_id}，但Docker服务不可用")
                # 仍然可以更新任务状态
                if str(task_id) in self.tasks:
                    task = self.tasks[str(task_id)]
                    task.status = ExecutionStatus.CANCELLED
                    task.error_message = "用户手动停止"
                    task.logs.append("任务被用户停止")
                    task.end_time = datetime.utcnow()
                return True
            
            if str(task_id) in self.containers:
                container = self.containers[str(task_id)]
                container.stop(timeout=10)
                container.remove()
                del self.containers[str(task_id)]
                
            if str(task_id) in self.tasks:
                task = self.tasks[str(task_id)]
                task.status = ExecutionStatus.CANCELLED
                task.error_message = "用户手动停止"
                task.logs.append("任务被用户停止")
                task.end_time = datetime.utcnow()
                
            logger.info(f"任务 {task_id} 已停止")
            return True
            
        except Exception as e:
            logger.error(f"停止任务失败 {task_id}: {e}")
            return False
    
    def get_task(self, task_id: int) -> Optional[ExecutionTask]:
        """获取任务信息"""
        return self.tasks.get(str(task_id))
    
    def get_all_tasks(self, limit: Optional[int] = None) -> List[ExecutionTask]:
        """获取所有任务"""
        tasks = list(self.tasks.values())
        tasks.sort(key=lambda t: t.start_time, reverse=True)
        
        if limit:
            return tasks[:limit]
        return tasks
    
    def get_task_logs(self, task_id: int) -> List[str]:
        """获取任务日志"""
        task = self.tasks.get(str(task_id))
        if task:
            return task.logs
        return []
    
    async def get_container_stats(self, container_id: str) -> Dict[str, Any]:
        """获取容器资源使用统计"""
        if not self.docker_available:
            logger.warning(f"尝试获取容器统计 {container_id}，但Docker服务不可用")
            return {"cpu": 0, "memory": 0, "memory_usage_mb": 0, "network_rx_mb": 0, "network_tx_mb": 0}
        
        try:
            container = self.client.containers.get(container_id)
            stats = container.stats(stream=False)
            
            # 计算CPU使用率
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0
            
            # 计算内存使用
            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 1)
            memory_percent = (memory_usage / memory_limit) * 100.0
            
            return {
                "cpu": round(cpu_percent, 2),
                "memory": round(memory_percent, 2),
                "memory_usage_mb": round(memory_usage / (1024 * 1024), 2),
                "network_rx_mb": round(
                    stats['networks']['eth0']['rx_bytes'] / (1024 * 1024), 2
                ) if 'networks' in stats else 0,
                "network_tx_mb": round(
                    stats['networks']['eth0']['tx_bytes'] / (1024 * 1024), 2
                ) if 'networks' in stats else 0
            }
            
        except Exception as e:
            logger.error(f"获取容器统计失败 {container_id}: {e}")
            return {"cpu": 0, "memory": 0, "memory_usage_mb": 0}
    
    def _generate_python_dockerfile(
        self, 
        algorithm: Algorithm,
        requirements: Optional[str] = None
    ) -> str:
        """生成Python算法的Dockerfile"""
        dockerfile = f"""
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装基础依赖
RUN apt-get update && apt-get install -y \\
    libgdal-dev \\
    libproj-dev \\
    libgeos-dev \\
    proj-bin \\
    proj-data \\
    libproj25 \\
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
RUN pip install --no-cache-dir \\
    numpy==1.24.3 \\
    pandas==2.0.3 \\
    matplotlib==3.7.2 \\
    seaborn==0.12.2 \\
    xarray==2023.6.0 \\
    netCDF4==1.6.4 \\
    scipy==1.11.1 \\
    scikit-learn==1.3.0 \\
    cartopy==0.22.0 \\
    Pillow==10.0.0
"""
        
        # 如果有额外的requirements
        if requirements:
            dockerfile += """
# 复制requirements文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
"""
        
        dockerfile += """
# 复制算法文件
COPY algorithm.py .
COPY run.py .

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV ALGORITHM_NAME="{name}"
ENV ALGORITHM_VERSION="{version}"

# 运行算法
CMD ["python", "run.py"]
""".format(name=algorithm.name, version=algorithm.version)
        
        return dockerfile
    
    def _generate_r_dockerfile(self, algorithm: Algorithm) -> str:
        """生成R算法的Dockerfile"""
        return f"""
FROM r-base:4.3.1

# 设置工作目录
WORKDIR /app

# 安装R包
RUN R -e "install.packages(c('tidyverse', 'ggplot2', 'sf', 'raster', 'ncdf4'), repos='https://cran.r-project.org/')"

# 复制算法文件
COPY algorithm.R .
COPY run.R .

# 设置环境变量
ENV ALGORITHM_NAME="{algorithm.name}"
ENV ALGORITHM_VERSION="{algorithm.version}"

# 运行算法
CMD ["Rscript", "run.R"]
"""
    
    def _create_python_runner(self) -> str:
        """创建Python运行器脚本"""
        return """
import json
import sys
import os
from pathlib import Path

# 导入算法模块
import algorithm

def main():
    # 读取参数
    with open('/data/parameters.json', 'r') as f:
        config = json.load(f)
    
    parameters = config['parameters']
    output_format = config.get('output_format', 'default')
    
    # 获取输入文件
    input_dir = Path('/data/input')
    input_files = list(input_dir.glob('*'))
    
    # 设置输出目录
    output_dir = Path('/data/output')
    
    try:
        # 调用算法主函数
        print(f"开始执行算法...")
        print(f"输入文件: {[f.name for f in input_files]}")
        print(f"参数: {parameters}")
        
        # 假设算法模块有一个run函数
        if hasattr(algorithm, 'run'):
            algorithm.run(
                input_files=input_files,
                output_dir=output_dir,
                parameters=parameters,
                output_format=output_format
            )
        else:
            print("错误: 算法模块必须包含run函数")
            sys.exit(1)
            
        print("算法执行完成")
        
    except Exception as e:
        print(f"算法执行错误: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
"""
    
    def _create_r_runner(self) -> str:
        """创建R运行器脚本"""
        return """
library(jsonlite)

# 读取参数
config <- fromJSON('/data/parameters.json')
parameters <- config$parameters
output_format <- config$output_format

# 获取输入文件
input_files <- list.files('/data/input', full.names = TRUE)

# 设置输出目录
output_dir <- '/data/output'

# 导入算法
source('algorithm.R')

# 执行算法
tryCatch({
    cat("开始执行算法...\\n")
    cat("输入文件:", basename(input_files), "\\n")
    cat("参数:", toJSON(parameters), "\\n")
    
    # 调用算法主函数
    run(
        input_files = input_files,
        output_dir = output_dir,
        parameters = parameters,
        output_format = output_format
    )
    
    cat("算法执行完成\\n")
    
}, error = function(e) {
    cat("算法执行错误:", conditionMessage(e), "\\n")
    quit(status = 1)
})
"""
    
    def _get_container_command(self, algorithm: Algorithm) -> List[str]:
        """获取容器执行命令"""
        if algorithm.language == 'python':
            return ["python", "run.py"]
        elif algorithm.language == 'r':
            return ["Rscript", "run.R"]
        elif algorithm.language == 'matlab':
            return ["matlab", "-batch", "run"]
        else:
            return ["python", "run.py"]
    
    async def _cleanup_completed_containers(self):
        """定期清理已完成的容器和任务"""
        if not self.docker_available:
            logger.info("Docker服务不可用，跳过容器清理任务")
            return
            
        while True:
            try:
                # 清理超过24小时的已完成任务
                cutoff_time = datetime.utcnow().timestamp() - 86400
                
                tasks_to_remove = []
                for task_id, task in self.tasks.items():
                    if task.status in [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED]:
                        if task.end_time and task.end_time.timestamp() < cutoff_time:
                            tasks_to_remove.append(task_id)
                
                for task_id in tasks_to_remove:
                    # 清理工作目录
                    task_dir = self.work_dir / task_id
                    if task_dir.exists():
                        shutil.rmtree(task_dir)
                    
                    if task_id in self.tasks:
                        del self.tasks[task_id]
                
                if tasks_to_remove:
                    logger.info(f"清理了 {len(tasks_to_remove)} 个过期任务")
                
            except Exception as e:
                logger.error(f"清理任务失败: {e}")
            
            # 每小时清理一次
            await asyncio.sleep(3600)
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查，返回Docker服务状态"""
        health_info = {
            "docker_available": self.docker_available,
            "timestamp": datetime.utcnow().isoformat(),
            "system": platform.system(),
            "diagnostics": {}
        }
        
        if self.docker_available and self.client:
            try:
                # 测试基本连接
                ping_result = self.client.ping()
                health_info["ping"] = ping_result
                
                # 获取版本信息
                version_info = self.client.version()
                health_info["version"] = {
                    "docker_version": version_info.get('Version'),
                    "api_version": version_info.get('ApiVersion'),
                    "go_version": version_info.get('GoVersion'),
                    "arch": version_info.get('Arch'),
                    "os": version_info.get('Os')
                }
                
                # 获取系统信息
                system_info = self.client.info()
                health_info["system_info"] = {
                    "containers": system_info.get('Containers', 0),
                    "containers_running": system_info.get('ContainersRunning', 0),
                    "images": system_info.get('Images', 0),
                    "server_version": system_info.get('ServerVersion'),
                    "memory_total": system_info.get('MemTotal', 0),
                    "cpus": system_info.get('NCPU', 0)
                }
                
                health_info["status"] = "healthy"
                
            except Exception as e:
                health_info["status"] = "unhealthy"
                health_info["error"] = str(e)
                logger.error(f"Docker健康检查失败: {e}")
        else:
            health_info["status"] = "unavailable"
            health_info["error"] = "Docker service not available"
        
        # 添加诊断信息
        socket_paths = self._detect_docker_socket_paths()
        health_info["diagnostics"]["socket_paths"] = socket_paths
        health_info["diagnostics"]["docker_host"] = os.environ.get('DOCKER_HOST')
        
        return health_info
    
    def cleanup(self):
        """清理所有容器和资源"""
        try:
            if self.docker_available:
                # 停止所有运行中的容器
                for container in self.containers.values():
                    try:
                        container.stop(timeout=5)
                        container.remove()
                    except:
                        pass
            
            self.containers.clear()
            logger.info("容器服务清理完成")
            
        except Exception as e:
            logger.error(f"容器服务清理失败: {e}")


# 全局容器服务实例
container_service = ContainerService()
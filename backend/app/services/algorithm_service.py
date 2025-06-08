"""算法管理服务"""
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
import json

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.algorithm import Algorithm as AlgorithmModel, AlgorithmExecution
from app.schemas.algorithm import (
    Algorithm, 
    AlgorithmCreate, 
    AlgorithmUpdate,
    ExecutionTask,
    ExecutionStatus,
    AlgorithmParameter
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AlgorithmService:
    """算法管理服务"""
    
    def __init__(self):
        # 创建算法存储目录
        self.algorithm_dir = Path(settings.ALGORITHM_DIR)
        self.algorithm_dir.mkdir(parents=True, exist_ok=True)
    
    def create_algorithm(
        self, 
        db: Session, 
        algorithm_data: AlgorithmCreate,
        source_code: Optional[str] = None
    ) -> Algorithm:
        """创建新算法"""
        try:
            # 验证输入数据
            if not algorithm_data.name or not algorithm_data.name.strip():
                raise ValueError("算法名称不能为空")
            
            # 安全地序列化JSON字段
            try:
                tags_json = json.dumps(algorithm_data.tags, ensure_ascii=False) if algorithm_data.tags else "[]"
                input_formats_json = json.dumps(algorithm_data.input_formats, ensure_ascii=False) if algorithm_data.input_formats else "[]"
                output_formats_json = json.dumps(algorithm_data.output_formats, ensure_ascii=False) if algorithm_data.output_formats else "[]"
                
                # 处理参数序列化
                if algorithm_data.parameters:
                    params_data = []
                    for param in algorithm_data.parameters:
                        if hasattr(param, 'dict'):
                            params_data.append(param.dict())
                        elif isinstance(param, dict):
                            params_data.append(param)
                        else:
                            raise ValueError(f"参数对象格式无效: {type(param)}")
                    parameters_json = json.dumps(params_data, ensure_ascii=False)
                else:
                    parameters_json = "[]"
                    
            except (TypeError, ValueError) as e:
                raise ValueError(f"数据序列化失败: {str(e)}")
            
            # 创建算法记录 (id will be auto-generated)
            db_algorithm = AlgorithmModel(
                name=algorithm_data.name.strip(),
                version=algorithm_data.version or "1.0.0",
                description=algorithm_data.description or "",
                category=algorithm_data.category or "未分类",
                language=algorithm_data.language or "python",
                author=algorithm_data.author or "",
                institution=algorithm_data.institution or "",
                status='registered',
                tags=tags_json,
                input_formats=input_formats_json,
                output_formats=output_formats_json,
                parameters=parameters_json,
                is_public=algorithm_data.is_public if algorithm_data.is_public is not None else True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(db_algorithm)
            db.flush()  # 这会让数据库分配ID，但不提交事务
            
            # 保存源代码
            if source_code:
                try:
                    # 验证源代码
                    if not isinstance(source_code, str):
                        raise ValueError("源代码必须是字符串类型")
                    
                    # 检查源代码长度限制
                    max_size = 10 * 1024 * 1024  # 10MB
                    if len(source_code.encode('utf-8')) > max_size:
                        raise ValueError(f"源代码文件过大，超过{max_size//1024//1024}MB限制")
                    
                    code_path = self.algorithm_dir / str(db_algorithm.id) / "source.py"
                    code_path.parent.mkdir(parents=True, exist_ok=True)
                    # 指定UTF-8编码写入文件
                    code_path.write_text(source_code, encoding='utf-8')
                    db_algorithm.source_code_path = str(code_path)
                    
                except (OSError, IOError) as e:
                    raise ValueError(f"源代码文件保存失败: {str(e)}")
                except UnicodeError as e:
                    raise ValueError(f"源代码编码错误: {str(e)}")
            
            db.commit()
            db.refresh(db_algorithm)
            
            logger.info(f"成功创建算法: {db_algorithm.name} (ID: {db_algorithm.id})")
            return self._model_to_schema(db_algorithm)
            
        except ValueError:
            # 重新抛出业务逻辑错误
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"创建算法失败: {e}")
            raise ValueError(f"创建算法失败: {str(e)}")
    
    def get_algorithms(
        self, 
        db: Session,
        category: Optional[str] = None,
        language: Optional[str] = None,
        status: Optional[str] = None,
        is_public: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Algorithm]:
        """获取算法列表"""
        query = db.query(AlgorithmModel)
        
        # 应用过滤条件
        if category:
            query = query.filter(AlgorithmModel.category == category)
        if language:
            query = query.filter(AlgorithmModel.language == language)
        if status:
            query = query.filter(AlgorithmModel.status == status)
        if is_public is not None:
            query = query.filter(AlgorithmModel.is_public == is_public)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (AlgorithmModel.name.ilike(search_pattern)) |
                (AlgorithmModel.description.ilike(search_pattern)) |
                (AlgorithmModel.tags.ilike(search_pattern))
            )
        
        # 排序和分页
        algorithms = query.order_by(AlgorithmModel.updated_at.desc()).offset(skip).limit(limit).all()
        
        return [self._model_to_schema(algo) for algo in algorithms]
    
    def get_algorithm(self, db: Session, algorithm_id: int) -> Optional[Algorithm]:
        """获取单个算法"""
        algorithm = db.query(AlgorithmModel).filter(
            AlgorithmModel.id == algorithm_id
        ).first()
        
        if algorithm:
            return self._model_to_schema(algorithm)
        return None
    
    def update_algorithm(
        self, 
        db: Session, 
        algorithm_id: int,
        updates: AlgorithmUpdate
    ) -> Optional[Algorithm]:
        """更新算法"""
        try:
            # 验证算法ID
            if not isinstance(algorithm_id, int) or algorithm_id <= 0:
                raise ValueError(f"无效的算法ID: {algorithm_id}")
            
            algorithm = db.query(AlgorithmModel).filter(
                AlgorithmModel.id == algorithm_id
            ).first()
            
            if not algorithm:
                logger.warning(f"算法 {algorithm_id} 不存在")
                return None
            
            # 安全地获取更新数据
            try:
                update_data = updates.dict(exclude_unset=True)
            except Exception as e:
                logger.error(f"解析更新数据失败: {e}")
                raise ValueError(f"更新数据格式无效: {str(e)}")
            
            # 处理源代码更新
            source_code = update_data.pop('source_code', None)
            if source_code is not None:
                try:
                    # 验证源代码不为空且为字符串
                    if not isinstance(source_code, str):
                        raise ValueError("源代码必须是字符串类型")
                    
                    # 检查源代码长度限制（例如10MB）
                    max_size = 10 * 1024 * 1024  # 10MB
                    if len(source_code.encode('utf-8')) > max_size:
                        raise ValueError(f"源代码文件过大，超过{max_size//1024//1024}MB限制")
                    
                    code_path = self.algorithm_dir / str(algorithm_id) / "source.py"
                    code_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    # 指定UTF-8编码写入文件
                    code_path.write_text(source_code, encoding='utf-8')
                    algorithm.source_code_path = str(code_path)
                    logger.info(f"更新算法 {algorithm_id} 的源代码")
                    
                except (OSError, IOError) as e:
                    logger.error(f"文件操作失败: {e}")
                    raise ValueError(f"源代码文件保存失败: {str(e)}")
                except UnicodeError as e:
                    logger.error(f"编码错误: {e}")
                    raise ValueError(f"源代码编码错误: {str(e)}")
                except Exception as e:
                    logger.error(f"更新算法源代码失败: {e}")
                    raise ValueError(f"源代码更新失败: {str(e)}")
            
            # 处理其他特殊字段 - 添加JSON序列化验证
            if 'tags' in update_data:
                try:
                    if not isinstance(update_data['tags'], list):
                        raise ValueError("tags必须是列表类型")
                    update_data['tags'] = json.dumps(update_data['tags'], ensure_ascii=False)
                except (TypeError, ValueError) as e:
                    logger.error(f"tags序列化失败: {e}")
                    raise ValueError(f"tags数据格式无效: {str(e)}")
                    
            if 'input_formats' in update_data:
                try:
                    if not isinstance(update_data['input_formats'], list):
                        raise ValueError("input_formats必须是列表类型")
                    update_data['input_formats'] = json.dumps(update_data['input_formats'], ensure_ascii=False)
                except (TypeError, ValueError) as e:
                    logger.error(f"input_formats序列化失败: {e}")
                    raise ValueError(f"input_formats数据格式无效: {str(e)}")
                    
            if 'output_formats' in update_data:
                try:
                    if not isinstance(update_data['output_formats'], list):
                        raise ValueError("output_formats必须是列表类型")
                    update_data['output_formats'] = json.dumps(update_data['output_formats'], ensure_ascii=False)
                except (TypeError, ValueError) as e:
                    logger.error(f"output_formats序列化失败: {e}")
                    raise ValueError(f"output_formats数据格式无效: {str(e)}")
                    
            if 'parameters' in update_data:
                try:
                    if not isinstance(update_data['parameters'], list):
                        raise ValueError("parameters必须是列表类型")
                    # 验证每个参数对象
                    serialized_params = []
                    for param in update_data['parameters']:
                        if hasattr(param, 'dict'):
                            serialized_params.append(param.dict())
                        elif isinstance(param, dict):
                            serialized_params.append(param)
                        else:
                            raise ValueError(f"参数对象格式无效: {type(param)}")
                    update_data['parameters'] = json.dumps(serialized_params, ensure_ascii=False)
                except (TypeError, ValueError, AttributeError) as e:
                    logger.error(f"parameters序列化失败: {e}")
                    raise ValueError(f"parameters数据格式无效: {str(e)}")
            
            # 更新字段 - 添加字段验证
            for field, value in update_data.items():
                if hasattr(algorithm, field):
                    try:
                        setattr(algorithm, field, value)
                    except Exception as e:
                        logger.error(f"设置字段 {field} 失败: {e}")
                        raise ValueError(f"字段 {field} 更新失败: {str(e)}")
                else:
                    logger.warning(f"忽略未知字段: {field}")
            
            algorithm.updated_at = datetime.utcnow()
            
            # 数据库操作包含在事务中
            db.commit()
            db.refresh(algorithm)
            
            logger.info(f"成功更新算法 {algorithm_id}")
            return self._model_to_schema(algorithm)
            
        except ValueError:
            # 重新抛出业务逻辑错误
            db.rollback()
            raise
        except Exception as e:
            # 处理其他未预期的错误
            db.rollback()
            logger.error(f"更新算法 {algorithm_id} 时发生未知错误: {e}")
            raise ValueError(f"更新算法失败: {str(e)}")
    
    def delete_algorithm(self, db: Session, algorithm_id: int) -> bool:
        """删除算法"""
        algorithm = db.query(AlgorithmModel).filter(
            AlgorithmModel.id == algorithm_id
        ).first()
        
        if not algorithm:
            return False
        
        # 删除相关文件
        algo_dir = self.algorithm_dir / str(algorithm_id)
        if algo_dir.exists():
            import shutil
            shutil.rmtree(algo_dir)
        
        db.delete(algorithm)
        db.commit()
        
        return True
    
    def update_algorithm_status(
        self, 
        db: Session, 
        algorithm_id: int, 
        status: str,
        docker_image: Optional[str] = None
    ) -> Optional[Algorithm]:
        """更新算法状态"""
        algorithm = db.query(AlgorithmModel).filter(
            AlgorithmModel.id == algorithm_id
        ).first()
        
        if not algorithm:
            return None
        
        algorithm.status = status
        if docker_image:
            algorithm.docker_image = docker_image
        algorithm.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(algorithm)
        
        return self._model_to_schema(algorithm)
    
    def increment_usage_count(self, db: Session, algorithm_id: int):
        """增加算法使用次数"""
        algorithm = db.query(AlgorithmModel).filter(
            AlgorithmModel.id == algorithm_id
        ).first()
        
        if algorithm:
            algorithm.usage_count = (algorithm.usage_count or 0) + 1
            db.commit()
    
    def get_algorithm_source_code(self, algorithm_id: int) -> Optional[str]:
        """获取算法源代码"""
        try:
            # 验证算法ID
            if not isinstance(algorithm_id, int) or algorithm_id <= 0:
                logger.error(f"无效的算法ID: {algorithm_id}")
                return None
                
            code_path = self.algorithm_dir / str(algorithm_id) / "source.py"
            if code_path.exists():
                try:
                    # 指定UTF-8编码读取文件
                    return code_path.read_text(encoding='utf-8')
                except UnicodeError as e:
                    logger.error(f"读取源代码文件编码错误: {e}")
                    # 尝试其他编码
                    try:
                        return code_path.read_text(encoding='gbk')
                    except UnicodeError:
                        logger.error(f"无法读取源代码文件，编码不支持")
                        return None
                except (OSError, IOError) as e:
                    logger.error(f"读取源代码文件失败: {e}")
                    return None
            return None
        except Exception as e:
            logger.error(f"获取算法源代码时发生错误: {e}")
            return None
    
    def update_algorithm_source_code(
        self, 
        db: Session, 
        algorithm_id: int, 
        source_code: str
    ) -> bool:
        """更新算法源代码"""
        try:
            # 验证参数
            if not isinstance(algorithm_id, int) or algorithm_id <= 0:
                logger.error(f"无效的算法ID: {algorithm_id}")
                return False
                
            if not isinstance(source_code, str):
                logger.error("源代码必须是字符串类型")
                return False
            
            # 检查源代码长度限制（例如10MB）
            max_size = 10 * 1024 * 1024  # 10MB
            if len(source_code.encode('utf-8')) > max_size:
                logger.error(f"源代码文件过大，超过{max_size//1024//1024}MB限制")
                return False
            
            # 检查算法是否存在
            algorithm = db.query(AlgorithmModel).filter(
                AlgorithmModel.id == algorithm_id
            ).first()
            
            if not algorithm:
                logger.error(f"算法 {algorithm_id} 不存在")
                return False
            
            # 保存源代码到文件
            code_path = self.algorithm_dir / str(algorithm_id) / "source.py"
            try:
                code_path.parent.mkdir(parents=True, exist_ok=True)
                # 指定UTF-8编码写入文件
                code_path.write_text(source_code, encoding='utf-8')
            except (OSError, IOError) as e:
                logger.error(f"源代码文件保存失败: {e}")
                return False
            except UnicodeError as e:
                logger.error(f"源代码编码错误: {e}")
                return False
            
            # 更新数据库记录
            algorithm.source_code_path = str(code_path)
            algorithm.updated_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"成功更新算法 {algorithm_id} 的源代码")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"更新算法源代码失败: {e}")
            return False
    
    def get_algorithm_documentation(self, algorithm_id: int) -> Optional[str]:
        """获取算法文档"""
        try:
            # 验证算法ID
            if not isinstance(algorithm_id, int) or algorithm_id <= 0:
                logger.error(f"无效的算法ID: {algorithm_id}")
                return None
                
            doc_path = self.algorithm_dir / str(algorithm_id) / "README.md"
            if doc_path.exists():
                try:
                    # 指定UTF-8编码读取文件
                    return doc_path.read_text(encoding='utf-8')
                except UnicodeError as e:
                    logger.error(f"读取文档文件编码错误: {e}")
                    # 尝试其他编码
                    try:
                        return doc_path.read_text(encoding='gbk')
                    except UnicodeError:
                        logger.error(f"无法读取文档文件，编码不支持")
                        return None
                except (OSError, IOError) as e:
                    logger.error(f"读取文档文件失败: {e}")
                    return None
            return None
        except Exception as e:
            logger.error(f"获取算法文档时发生错误: {e}")
            return None
    
    def save_algorithm_documentation(
        self, 
        algorithm_id: int, 
        documentation: str
    ) -> bool:
        """保存算法文档"""
        try:
            # 验证参数
            if not isinstance(algorithm_id, int) or algorithm_id <= 0:
                logger.error(f"无效的算法ID: {algorithm_id}")
                return False
                
            if not isinstance(documentation, str):
                logger.error("文档内容必须是字符串类型")
                return False
            
            # 检查文档长度限制（例如5MB）
            max_size = 5 * 1024 * 1024  # 5MB
            if len(documentation.encode('utf-8')) > max_size:
                logger.error(f"文档文件过大，超过{max_size//1024//1024}MB限制")
                return False
            
            doc_path = self.algorithm_dir / str(algorithm_id) / "README.md"
            try:
                doc_path.parent.mkdir(parents=True, exist_ok=True)
                # 指定UTF-8编码写入文件
                doc_path.write_text(documentation, encoding='utf-8')
                logger.info(f"成功保存算法 {algorithm_id} 的文档")
                return True
            except (OSError, IOError) as e:
                logger.error(f"文档文件保存失败: {e}")
                return False
            except UnicodeError as e:
                logger.error(f"文档编码错误: {e}")
                return False
        except Exception as e:
            logger.error(f"保存算法文档失败: {e}")
            return False
    
    def create_execution_task(
        self,
        db: Session,
        algorithm_id: int,
        input_files: List[str],
        parameters: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> ExecutionTask:
        """创建执行任务记录"""
        task = AlgorithmExecution(
            # id will be auto-generated
            algorithm_id=algorithm_id,
            user_id=user_id,
            status=ExecutionStatus.QUEUED.value,
            input_files=json.dumps(input_files),
            parameters=json.dumps(parameters),
            created_at=datetime.utcnow()
        )
        
        db.add(task)
        db.commit()
        db.refresh(task)
        
        return self._task_model_to_schema(task, db)
    
    def get_execution_tasks(
        self,
        db: Session,
        algorithm_id: Optional[int] = None,
        status: Optional[str] = None,
        user_id: Optional[int] = None,
        limit: int = 50
    ) -> List[ExecutionTask]:
        """获取执行任务列表"""
        query = db.query(AlgorithmExecution)
        
        if algorithm_id:
            query = query.filter(AlgorithmExecution.algorithm_id == algorithm_id)
        if status:
            query = query.filter(AlgorithmExecution.status == status)
        if user_id:
            query = query.filter(AlgorithmExecution.user_id == user_id)
        
        tasks = query.order_by(
            AlgorithmExecution.created_at.desc()
        ).limit(limit).all()
        
        return [self._task_model_to_schema(task, db) for task in tasks]
    
    def update_execution_task(
        self,
        db: Session,
        task_id: int,
        status: Optional[ExecutionStatus] = None,
        progress: Optional[int] = None,
        logs: Optional[List[str]] = None,
        output_files: Optional[List[str]] = None,
        error_message: Optional[str] = None,
        container_id: Optional[str] = None
    ) -> Optional[ExecutionTask]:
        """更新执行任务"""
        task = db.query(AlgorithmExecution).filter(
            AlgorithmExecution.id == task_id
        ).first()
        
        if not task:
            return None
        
        if status:
            task.status = status.value
            if status == ExecutionStatus.RUNNING:
                task.start_time = datetime.utcnow()
            elif status in [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED]:
                task.end_time = datetime.utcnow()
        
        if progress is not None:
            task.progress = progress
        if logs:
            task.logs = json.dumps(logs)
        if output_files:
            task.output_files = json.dumps(output_files)
        if error_message:
            task.error_message = error_message
        if container_id:
            task.container_id = container_id
        
        task.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(task)
        
        return self._task_model_to_schema(task, db)
    
    def get_algorithm_stats(self, db: Session) -> Dict[str, Any]:
        """获取算法统计信息"""
        total_algorithms = db.query(func.count(AlgorithmModel.id)).scalar()
        ready_algorithms = db.query(func.count(AlgorithmModel.id)).filter(
            AlgorithmModel.status == 'ready'
        ).scalar()
        
        total_usage = db.query(func.sum(AlgorithmModel.usage_count)).scalar() or 0
        
        avg_rating = db.query(func.avg(AlgorithmModel.rating)).scalar() or 0
        
        containerized = db.query(func.count(AlgorithmModel.id)).filter(
            AlgorithmModel.docker_image.isnot(None)
        ).scalar()
        
        # 执行统计
        total_tasks = db.query(func.count(AlgorithmExecution.id)).scalar()
        running_tasks = db.query(func.count(AlgorithmExecution.id)).filter(
            AlgorithmExecution.status == ExecutionStatus.RUNNING.value
        ).scalar()
        completed_tasks = db.query(func.count(AlgorithmExecution.id)).filter(
            AlgorithmExecution.status == ExecutionStatus.COMPLETED.value
        ).scalar()
        
        return {
            "total_algorithms": total_algorithms,
            "ready_algorithms": ready_algorithms,
            "running_tasks": running_tasks,
            "containerized_algorithms": containerized,
            "total_usage": total_usage,
            "average_rating": round(avg_rating, 1),
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "success_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
        }
    
    def _model_to_schema(self, model: AlgorithmModel) -> Algorithm:
        """将数据库模型转换为Pydantic schema"""
        # 获取源代码（如果需要的话）
        source_code = None
        if model.source_code_path:
            try:
                source_code = self.get_algorithm_source_code(model.id)
            except Exception as e:
                logger.warning(f"无法读取算法 {model.id} 的源代码: {e}")
        
        # 安全地解析JSON字段
        def safe_json_loads(json_str: str, default_value=None):
            """安全地解析JSON字符串"""
            if not json_str:
                return default_value if default_value is not None else []
            try:
                return json.loads(json_str)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"JSON解析失败: {e}, 数据: {json_str[:100]}")
                return default_value if default_value is not None else []
        
        # 安全地解析参数列表
        def safe_parse_parameters(json_str: str):
            """安全地解析参数列表"""
            if not json_str:
                return []
            try:
                params_data = json.loads(json_str)
                if not isinstance(params_data, list):
                    logger.warning(f"参数数据不是列表格式: {type(params_data)}")
                    return []
                
                result = []
                for param in params_data:
                    try:
                        if isinstance(param, dict):
                            result.append(AlgorithmParameter(**param))
                        else:
                            logger.warning(f"参数项格式无效: {type(param)}")
                    except Exception as e:
                        logger.warning(f"解析参数项失败: {e}")
                return result
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"参数JSON解析失败: {e}")
                return []
        
        try:
            return Algorithm(
                id=model.id,
                name=model.name or "",
                version=model.version or "1.0.0",
                description=model.description or "",
                category=model.category or "未分类",
                language=model.language or "python",
                author=model.author or "",
                institution=model.institution or "",
                status=model.status or "registered",
                docker_image=model.docker_image,
                last_updated=model.updated_at.isoformat() + 'Z' if model.updated_at else "",
                usage_count=model.usage_count or 0,
                rating=model.rating or 0.0,
                tags=safe_json_loads(model.tags, []),
                input_formats=safe_json_loads(model.input_formats, []),
                output_formats=safe_json_loads(model.output_formats, []),
                parameters=safe_parse_parameters(model.parameters),
                is_public=model.is_public if model.is_public is not None else True,
                execution_time=model.avg_execution_time,
                memory_usage=model.max_memory_usage,
                execution_count=model.execution_count or 0,
                last_executed=model.last_executed,
                created_at=model.created_at,
                updated_at=model.updated_at,
                source_code=source_code
            )
        except Exception as e:
            logger.error(f"模型转换为schema失败: {e}")
            # 返回最小化的有效对象
            return Algorithm(
                id=model.id,
                name=model.name or f"算法_{model.id}",
                version="1.0.0",
                description=f"算法 {model.id}",
                category="未分类",
                language="python",
                author="",
                institution="",
                status="error",
                last_updated="",
                usage_count=0,
                rating=0.0,
                tags=[],
                input_formats=[],
                output_formats=[],
                parameters=[],
                is_public=True,
                execution_count=0,
                created_at=model.created_at,
                updated_at=model.updated_at
            )
    
    def _task_model_to_schema(self, model: AlgorithmExecution, db: Session) -> ExecutionTask:
        """将任务模型转换为schema"""
        # 获取算法名称
        algorithm = None
        try:
            algorithm = db.query(AlgorithmModel).filter(
                AlgorithmModel.id == model.algorithm_id
            ).first()
        except Exception as e:
            logger.warning(f"获取算法信息失败: {e}")
        
        # 安全地解析JSON字段
        def safe_json_loads_task(json_str: str, default_value):
            """安全地解析任务相关的JSON字符串"""
            if not json_str:
                return default_value
            try:
                return json.loads(json_str)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"任务JSON解析失败: {e}, 数据: {json_str[:100]}")
                return default_value
        
        # 安全地解析执行状态
        def safe_parse_status(status_str: str):
            """安全地解析执行状态"""
            try:
                return ExecutionStatus(status_str)
            except (ValueError, TypeError) as e:
                logger.warning(f"执行状态解析失败: {e}, 状态: {status_str}")
                return ExecutionStatus.QUEUED  # 默认状态
        
        try:
            return ExecutionTask(
                id=model.id,
                algorithm_id=model.algorithm_id,
                algorithm_name=algorithm.name if algorithm else f"算法_{model.algorithm_id}",
                status=safe_parse_status(model.status),
                start_time=model.start_time or model.created_at,
                end_time=model.end_time,
                input_files=safe_json_loads_task(model.input_files, []),
                output_files=safe_json_loads_task(model.output_files, []),
                parameters=safe_json_loads_task(model.parameters, {}),
                progress=model.progress or 0,
                logs=safe_json_loads_task(model.logs, []),
                error_message=model.error_message,
                container_id=model.container_id
            )
        except Exception as e:
            logger.error(f"任务模型转换为schema失败: {e}")
            # 返回最小化的有效任务对象
            return ExecutionTask(
                id=model.id,
                algorithm_id=model.algorithm_id,
                algorithm_name=f"算法_{model.algorithm_id}",
                status=ExecutionStatus.FAILED,
                start_time=model.created_at,
                end_time=None,
                input_files=[],
                output_files=[],
                parameters={},
                progress=0,
                logs=[f"任务数据解析失败: {str(e)}"],
                error_message=f"任务数据解析失败: {str(e)}",
                container_id=None
            )


# 全局算法服务实例
algorithm_service = AlgorithmService()
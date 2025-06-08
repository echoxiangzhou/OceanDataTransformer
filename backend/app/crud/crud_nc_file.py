from typing import List, Optional, Union, Dict, Any
from sqlalchemy.orm import Session
from app.models.nc_file import NCFile, ConversionTask
from app.schemas.nc_file import NCFileCreate, NCFileUpdate, ConversionTaskCreate, ConversionTaskUpdate


class CRUDNCFile:
    def get(self, db: Session, id: int) -> Optional[NCFile]:
        return db.query(NCFile).filter(NCFile.id == id).first()

    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        conversion_status: Optional[str] = None
    ) -> List[NCFile]:
        from sqlalchemy import func, distinct
        from sqlalchemy.orm import aliased
        
        # 创建子查询，找出每个原始文件名的最新记录
        subquery = (
            db.query(
                NCFile.original_filename,
                func.max(NCFile.id).label('max_id')
            )
            .group_by(NCFile.original_filename)
            .subquery()
        )
        
        # 基于子查询获取去重后的记录
        query = (
            db.query(NCFile)
            .join(subquery, NCFile.id == subquery.c.max_id)
        )
        
        if conversion_status:
            query = query.filter(NCFile.conversion_status == conversion_status)
            
        return query.order_by(NCFile.created_at.desc()).offset(skip).limit(limit).all()

    def get_count(
        self, 
        db: Session, 
        *, 
        conversion_status: Optional[str] = None
    ) -> int:
        from sqlalchemy import func
        
        # 创建子查询，找出每个原始文件名的最新记录
        subquery = (
            db.query(
                NCFile.original_filename,
                func.max(NCFile.id).label('max_id')
            )
            .group_by(NCFile.original_filename)
            .subquery()
        )
        
        # 基于子查询计算去重后的记录数
        query = (
            db.query(NCFile)
            .join(subquery, NCFile.id == subquery.c.max_id)
        )
        
        if conversion_status:
            query = query.filter(NCFile.conversion_status == conversion_status)
            
        return query.count()

    def get_by_filename(self, db: Session, *, filename: str) -> Optional[NCFile]:
        return db.query(NCFile).filter(NCFile.original_filename == filename).first()

    def create(self, db: Session, *, obj_in: Union[NCFileCreate, Dict[str, Any]]) -> NCFile:
        if isinstance(obj_in, dict):
            create_data = obj_in
        else:
            create_data = obj_in.model_dump(exclude_unset=True)
        
        db_obj = NCFile(**create_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: NCFile, obj_in: Union[NCFileUpdate, Dict[str, Any]]) -> NCFile:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> NCFile:
        obj = db.query(NCFile).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj


class CRUDConversionTask:
    def get(self, db: Session, id: int) -> Optional[ConversionTask]:
        return db.query(ConversionTask).filter(ConversionTask.id == id).first()

    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[ConversionTask]:
        query = db.query(ConversionTask)
        
        if status:
            query = query.filter(ConversionTask.status == status)
            
        return query.order_by(ConversionTask.created_at.desc()).offset(skip).limit(limit).all()

    def get_by_status(self, db: Session, *, status: str) -> List[ConversionTask]:
        return db.query(ConversionTask).filter(ConversionTask.status == status).all()

    def create(self, db: Session, *, obj_in: ConversionTaskCreate) -> ConversionTask:
        db_obj = ConversionTask(
            original_file_path=obj_in.original_file_path,
            original_filename=obj_in.original_filename,
            original_format=obj_in.original_format,
            target_format=obj_in.target_format,
            conversion_options=obj_in.conversion_options
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: ConversionTask, obj_in: Union[ConversionTaskUpdate, Dict[str, Any]]) -> ConversionTask:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_progress(self, db: Session, *, task_id: int, progress: float) -> ConversionTask:
        db_obj = self.get(db, task_id)
        if db_obj:
            db_obj.progress = progress
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def set_status(self, db: Session, *, task_id: int, status: str, error_message: str = None) -> ConversionTask:
        db_obj = self.get(db, task_id)
        if db_obj:
            db_obj.status = status
            if error_message:
                db_obj.error_message = error_message
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> ConversionTask:
        obj = db.query(ConversionTask).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj


nc_file = CRUDNCFile()
conversion_task = CRUDConversionTask()
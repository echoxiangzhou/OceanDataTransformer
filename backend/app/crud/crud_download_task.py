from typing import List, Optional, Union, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.download_task import DownloadTask
from app.schemas.download_task import DownloadTaskCreate, DownloadTaskUpdate

class CRUDDownloadTask:
    def get(self, db: Session, id: int) -> Optional[DownloadTask]:
        return db.query(DownloadTask).filter(DownloadTask.id == id).first()

    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None,
        source_id: Optional[int] = None
    ) -> List[DownloadTask]:
        query = db.query(DownloadTask)
        
        if status:
            query = query.filter(DownloadTask.status == status)
        if source_id:
            query = query.filter(DownloadTask.source_id == source_id)
            
        return query.order_by(DownloadTask.created_at.desc()).offset(skip).limit(limit).all()

    def get_by_status(self, db: Session, *, status: str) -> List[DownloadTask]:
        return db.query(DownloadTask).filter(DownloadTask.status == status).all()

    def create(self, db: Session, *, obj_in: DownloadTaskCreate) -> DownloadTask:
        db_obj = DownloadTask(
            source_id=obj_in.source_id,
            save_path=obj_in.save_path,
            filename_pattern=obj_in.filename_pattern,
            max_retries=obj_in.max_retries,
            timeout=obj_in.timeout,
            status="pending"
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: DownloadTask, obj_in: Union[DownloadTaskUpdate, Dict[str, Any]]) -> DownloadTask:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_progress(self, db: Session, *, task_id: int, progress: float, downloaded_size: int = None) -> DownloadTask:
        db_obj = self.get(db, task_id)
        if db_obj:
            db_obj.progress = progress
            if downloaded_size is not None:
                db_obj.downloaded_size = downloaded_size
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def set_status(self, db: Session, *, task_id: int, status: str, error_message: str = None) -> DownloadTask:
        db_obj = self.get(db, task_id)
        if db_obj:
            db_obj.status = status
            if error_message:
                db_obj.error_message = error_message
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> DownloadTask:
        obj = db.query(DownloadTask).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj

download_task = CRUDDownloadTask()
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.data_source import DataSource
from app.schemas.data_source import DataSourceCreate, DataSourceUpdate

class CRUDDataSource:
    def get(self, db: Session, id: int) -> Optional[DataSource]:
        return db.query(DataSource).filter(DataSource.id == id).first()

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[DataSource]:
        return db.query(DataSource).filter(DataSource.is_active == True).offset(skip).limit(limit).all()

    def get_by_name(self, db: Session, *, name: str) -> Optional[DataSource]:
        return db.query(DataSource).filter(DataSource.name == name).first()

    def create(self, db: Session, *, obj_in: DataSourceCreate) -> DataSource:
        db_obj = DataSource(
            name=obj_in.name,
            url=obj_in.url,
            description=obj_in.description,
            protocol=obj_in.protocol,
            auth_required=obj_in.auth_required,
            username=obj_in.username,
            password=obj_in.password  # In production, this should be encrypted
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: DataSource, obj_in: DataSourceUpdate) -> DataSource:
        update_data = obj_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> DataSource:
        obj = db.query(DataSource).get(id)
        if obj:
            obj.is_active = False  # Soft delete
            db.commit()
        return obj

data_source = CRUDDataSource()
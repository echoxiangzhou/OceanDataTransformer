"""remove_user_foreign_key

Revision ID: 33a3d9f0060f
Revises: d82923a1ca09
Create Date: 2025-06-08 17:20:45.829382

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '33a3d9f0060f'
down_revision: Union[str, None] = 'd82923a1ca09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('algorithm_executions', 'progress',
               existing_type=mysql.FLOAT(),
               type_=sa.Integer(),
               existing_nullable=True)
    op.alter_column('algorithm_executions', 'input_data',
               existing_type=mysql.JSON(),
               nullable=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('algorithm_executions', 'input_data',
               existing_type=mysql.JSON(),
               nullable=False)
    op.alter_column('algorithm_executions', 'progress',
               existing_type=sa.Integer(),
               type_=mysql.FLOAT(),
               existing_nullable=True)
    # ### end Alembic commands ###

"""Initial migration

Revision ID: a00aa7b497bf
Revises: 
Create Date: 2025-06-07 11:24:29.404526

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a00aa7b497bf'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('algorithms',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('version', sa.String(length=50), nullable=True),
    sa.Column('docker_image', sa.String(length=255), nullable=False),
    sa.Column('input_schema', sa.JSON(), nullable=True),
    sa.Column('output_schema', sa.JSON(), nullable=True),
    sa.Column('dependencies', sa.JSON(), nullable=True),
    sa.Column('tags', sa.JSON(), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('python_code', sa.Text(), nullable=True),
    sa.Column('dockerfile_content', sa.Text(), nullable=True),
    sa.Column('execution_count', sa.Integer(), nullable=True),
    sa.Column('last_executed', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_algorithms_category'), 'algorithms', ['category'], unique=False)
    op.create_index(op.f('ix_algorithms_id'), 'algorithms', ['id'], unique=False)
    op.create_index(op.f('ix_algorithms_name'), 'algorithms', ['name'], unique=False)
    op.create_index(op.f('ix_algorithms_status'), 'algorithms', ['status'], unique=False)
    op.create_table('conversion_tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('original_file_path', sa.Text(), nullable=False),
    sa.Column('target_format', sa.String(length=50), nullable=True),
    sa.Column('conversion_options', sa.JSON(), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('progress', sa.Float(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('netcdf_file_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversion_tasks_id'), 'conversion_tasks', ['id'], unique=False)
    op.create_index(op.f('ix_conversion_tasks_status'), 'conversion_tasks', ['status'], unique=False)
    op.create_table('data_sources',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('url', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('protocol', sa.String(length=50), nullable=True),
    sa.Column('auth_required', sa.Boolean(), nullable=True),
    sa.Column('username', sa.String(length=255), nullable=True),
    sa.Column('password', sa.String(length=255), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_data_sources_id'), 'data_sources', ['id'], unique=False)
    op.create_index(op.f('ix_data_sources_name'), 'data_sources', ['name'], unique=False)
    op.create_table('netcdf_files',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('original_filename', sa.String(length=255), nullable=False),
    sa.Column('converted_filename', sa.String(length=255), nullable=False),
    sa.Column('file_path', sa.Text(), nullable=False),
    sa.Column('file_size', sa.Integer(), nullable=False),
    sa.Column('format_version', sa.String(length=50), nullable=True),
    sa.Column('dimensions', sa.JSON(), nullable=True),
    sa.Column('variables', sa.JSON(), nullable=True),
    sa.Column('global_attributes', sa.JSON(), nullable=True),
    sa.Column('time_range', sa.JSON(), nullable=True),
    sa.Column('spatial_bounds', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_netcdf_files_id'), 'netcdf_files', ['id'], unique=False)
    op.create_table('algorithm_executions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('algorithm_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('progress', sa.Float(), nullable=True),
    sa.Column('input_data', sa.JSON(), nullable=False),
    sa.Column('output_data', sa.JSON(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('logs', sa.JSON(), nullable=True),
    sa.Column('container_id', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['algorithm_id'], ['algorithms.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_algorithm_executions_id'), 'algorithm_executions', ['id'], unique=False)
    op.create_index(op.f('ix_algorithm_executions_status'), 'algorithm_executions', ['status'], unique=False)
    op.create_table('download_tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('source_id', sa.Integer(), nullable=False),
    sa.Column('save_path', sa.Text(), nullable=False),
    sa.Column('filename_pattern', sa.String(length=255), nullable=True),
    sa.Column('max_retries', sa.Integer(), nullable=True),
    sa.Column('timeout', sa.Integer(), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('progress', sa.Float(), nullable=True),
    sa.Column('file_size', sa.Integer(), nullable=True),
    sa.Column('downloaded_size', sa.Integer(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('task_metadata', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['source_id'], ['data_sources.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_download_tasks_id'), 'download_tasks', ['id'], unique=False)
    op.create_index(op.f('ix_download_tasks_status'), 'download_tasks', ['status'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_download_tasks_status'), table_name='download_tasks')
    op.drop_index(op.f('ix_download_tasks_id'), table_name='download_tasks')
    op.drop_table('download_tasks')
    op.drop_index(op.f('ix_algorithm_executions_status'), table_name='algorithm_executions')
    op.drop_index(op.f('ix_algorithm_executions_id'), table_name='algorithm_executions')
    op.drop_table('algorithm_executions')
    op.drop_index(op.f('ix_netcdf_files_id'), table_name='netcdf_files')
    op.drop_table('netcdf_files')
    op.drop_index(op.f('ix_data_sources_name'), table_name='data_sources')
    op.drop_index(op.f('ix_data_sources_id'), table_name='data_sources')
    op.drop_table('data_sources')
    op.drop_index(op.f('ix_conversion_tasks_status'), table_name='conversion_tasks')
    op.drop_index(op.f('ix_conversion_tasks_id'), table_name='conversion_tasks')
    op.drop_table('conversion_tasks')
    op.drop_index(op.f('ix_algorithms_status'), table_name='algorithms')
    op.drop_index(op.f('ix_algorithms_name'), table_name='algorithms')
    op.drop_index(op.f('ix_algorithms_id'), table_name='algorithms')
    op.drop_index(op.f('ix_algorithms_category'), table_name='algorithms')
    op.drop_table('algorithms')
    # ### end Alembic commands ###

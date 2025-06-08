import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import xarray as xr
import netCDF4 as nc
from PIL import Image
import h5py

from app.schemas.import_wizard import (
    FileType, 
    FileValidationRequest, 
    FileValidationResponse,
    CFComplianceCheck,
    ColumnMapping,
    MetadataConfig
)
from app.schemas.common import ErrorDetail, ValidationResult

logger = logging.getLogger(__name__)


class ValidationService:
    """Enhanced validation service for import wizard"""
    
    def __init__(self):
        self.max_file_size = 100 * 1024 * 1024  # 100MB default
        self.supported_formats = {
            'csv': self._validate_csv,
            'txt': self._validate_text,
            'nc': self._validate_netcdf,
            'netcdf': self._validate_netcdf,
            'hdf5': self._validate_hdf5,
            'h5': self._validate_hdf5,
            'tiff': self._validate_tiff,
            'tif': self._validate_tiff,
            'grib': self._validate_grib,
            'grib2': self._validate_grib
        }
    
    def validate_file_upload(self, file_path: str, filename: str) -> FileValidationResponse:
        """Comprehensive file validation"""
        errors = []
        warnings = []
        
        try:
            # Check file existence
            if not os.path.exists(file_path):
                errors.append(ErrorDetail(
                    code="FILE_NOT_FOUND",
                    message=f"File not found: {file_path}"
                ))
                return FileValidationResponse(
                    is_valid=False,
                    file_type=FileType.CSV,  # default
                    file_size=0,
                    validation_errors=errors
                )
            
            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size > self.max_file_size:
                errors.append(ErrorDetail(
                    code="FILE_TOO_LARGE",
                    message=f"File size ({file_size} bytes) exceeds maximum allowed ({self.max_file_size} bytes)"
                ))
            
            if file_size == 0:
                errors.append(ErrorDetail(
                    code="EMPTY_FILE",
                    message="File is empty"
                ))
            
            # Detect file type
            file_type = self._detect_file_type(file_path, filename)
            if file_type is None:
                errors.append(ErrorDetail(
                    code="UNSUPPORTED_FORMAT",
                    message=f"Unsupported file format for: {filename}"
                ))
                file_type = FileType.CSV  # fallback
            
            # Perform format-specific validation
            validation_result = None
            if file_type.value in self.supported_formats and not errors:
                try:
                    validation_result = self.supported_formats[file_type.value](file_path)
                except Exception as e:
                    errors.append(ErrorDetail(
                        code="FORMAT_VALIDATION_FAILED",
                        message=f"Format validation failed: {str(e)}"
                    ))
            
            # Build response
            response = FileValidationResponse(
                is_valid=len(errors) == 0,
                file_type=file_type,
                file_size=file_size,
                validation_errors=errors,
                validation_warnings=warnings
            )
            
            # Add format-specific results
            if validation_result:
                response.estimated_rows = validation_result.get('estimated_rows')
                response.detected_columns = validation_result.get('detected_columns', [])
                response.has_time_column = validation_result.get('has_time_column', False)
                response.has_coordinates = validation_result.get('has_coordinates', False)
                response.recommendations = validation_result.get('recommendations', [])
                
                # Add any format-specific warnings
                if 'warnings' in validation_result:
                    warnings.extend(validation_result['warnings'])
                    response.validation_warnings = warnings
            
            return response
            
        except Exception as e:
            logger.error(f"File validation failed: {e}")
            return FileValidationResponse(
                is_valid=False,
                file_type=FileType.CSV,
                file_size=0,
                validation_errors=[ErrorDetail(
                    code="VALIDATION_ERROR",
                    message=f"Validation failed: {str(e)}"
                )]
            )
    
    def _detect_file_type(self, file_path: str, filename: str) -> Optional[FileType]:
        """Detect file type based on extension and content"""
        # First try by extension
        extension = Path(filename).suffix.lower().lstrip('.')
        
        extension_mapping = {
            'csv': FileType.CSV,
            'txt': FileType.TXT,
            'nc': FileType.NETCDF,
            'netcdf': FileType.NETCDF,
            'hdf5': FileType.HDF5,
            'h5': FileType.HDF5,
            'tiff': FileType.TIFF,
            'tif': FileType.TIFF,
            'grib': FileType.GRIB,
            'grib2': FileType.GRIB
        }
        
        if extension in extension_mapping:
            return extension_mapping[extension]
        
        # Try content-based detection
        try:
            # Test NetCDF
            with nc.Dataset(file_path, 'r'):
                return FileType.NETCDF
        except:
            pass
        
        try:
            # Test HDF5
            with h5py.File(file_path, 'r'):
                return FileType.HDF5
        except:
            pass
        
        try:
            # Test if it's a delimited text file
            with open(file_path, 'r') as f:
                first_line = f.readline()
                if ',' in first_line or ';' in first_line or '\t' in first_line:
                    return FileType.CSV
        except:
            pass
        
        return None
    
    def _validate_csv(self, file_path: str) -> Dict[str, Any]:
        """Validate CSV file"""
        try:
            # Try to read first few rows to check format
            df = pd.read_csv(file_path, nrows=10)
            
            recommendations = []
            warnings = []
            
            # Check for empty columns
            empty_cols = df.columns[df.isnull().all()].tolist()
            if empty_cols:
                warnings.append(ErrorDetail(
                    code="EMPTY_COLUMNS",
                    message=f"Found empty columns: {empty_cols}"
                ))
            
            # Detect potential coordinate columns
            coord_indicators = ['lat', 'lon', 'time', 'depth', 'level', 'x', 'y', 'z']
            potential_coords = []
            for col in df.columns:
                col_lower = col.lower()
                if any(indicator in col_lower for indicator in coord_indicators):
                    potential_coords.append(col)
            
            if potential_coords:
                recommendations.append(f"Potential coordinate columns detected: {potential_coords}")
            
            # Check for time columns
            has_time = any('time' in col.lower() or 'date' in col.lower() for col in df.columns)
            
            # Get full row count efficiently
            with open(file_path, 'r') as f:
                row_count = sum(1 for line in f) - 1  # subtract header
            
            return {
                'estimated_rows': row_count,
                'detected_columns': df.columns.tolist(),
                'has_time_column': has_time,
                'has_coordinates': len(potential_coords) > 0,
                'recommendations': recommendations,
                'warnings': warnings
            }
            
        except Exception as e:
            raise ValueError(f"Invalid CSV format: {e}")
    
    def _validate_text(self, file_path: str) -> Dict[str, Any]:
        """Validate text file"""
        try:
            # Try different delimiters
            delimiters = ['\t', ' ', ';', '|']
            best_delimiter = None
            max_cols = 0
            
            for delimiter in delimiters:
                try:
                    df = pd.read_csv(file_path, delimiter=delimiter, nrows=5)
                    if len(df.columns) > max_cols:
                        max_cols = len(df.columns)
                        best_delimiter = delimiter
                except:
                    continue
            
            if best_delimiter is None:
                raise ValueError("Could not detect delimiter")
            
            # Read with best delimiter
            df = pd.read_csv(file_path, delimiter=best_delimiter, nrows=10)
            
            with open(file_path, 'r') as f:
                row_count = sum(1 for line in f) - 1
            
            return {
                'estimated_rows': row_count,
                'detected_columns': df.columns.tolist(),
                'has_time_column': any('time' in col.lower() for col in df.columns),
                'has_coordinates': False,
                'recommendations': [f"Detected delimiter: '{best_delimiter}'"]
            }
            
        except Exception as e:
            raise ValueError(f"Invalid text format: {e}")
    
    def _validate_netcdf(self, file_path: str) -> Dict[str, Any]:
        """Validate NetCDF file"""
        try:
            with xr.open_dataset(file_path) as ds:
                coord_vars = list(ds.coords.keys())
                data_vars = list(ds.data_vars.keys())
                
                # Check CF compliance
                conventions = ds.attrs.get('Conventions', '')
                is_cf_compliant = 'CF' in conventions
                
                recommendations = []
                if not is_cf_compliant:
                    recommendations.append("File is not CF-compliant. Consider converting to CF-1.8 standard.")
                
                has_time = 'time' in coord_vars
                has_coords = len(coord_vars) > 0
                
                # Estimate data size
                total_size = sum(var.size for var in ds.data_vars.values())
                
                return {
                    'estimated_rows': total_size,
                    'detected_columns': coord_vars + data_vars,
                    'has_time_column': has_time,
                    'has_coordinates': has_coords,
                    'recommendations': recommendations
                }
                
        except Exception as e:
            raise ValueError(f"Invalid NetCDF format: {e}")
    
    def _validate_hdf5(self, file_path: str) -> Dict[str, Any]:
        """Validate HDF5 file"""
        try:
            with h5py.File(file_path, 'r') as f:
                def collect_datasets(name, obj):
                    if isinstance(obj, h5py.Dataset):
                        datasets.append(name)
                
                datasets = []
                f.visititems(collect_datasets)
                
                return {
                    'estimated_rows': None,
                    'detected_columns': datasets,
                    'has_time_column': any('time' in name.lower() for name in datasets),
                    'has_coordinates': False,
                    'recommendations': ["HDF5 files may require custom processing"]
                }
                
        except Exception as e:
            raise ValueError(f"Invalid HDF5 format: {e}")
    
    def _validate_tiff(self, file_path: str) -> Dict[str, Any]:
        """Validate TIFF file"""
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                bands = getattr(img, 'n_frames', 1)
                
                return {
                    'estimated_rows': height,
                    'detected_columns': [f'band_{i+1}' for i in range(bands)],
                    'has_time_column': False,
                    'has_coordinates': False,
                    'recommendations': ["TIFF files will be converted to raster data variables"]
                }
                
        except Exception as e:
            raise ValueError(f"Invalid TIFF format: {e}")
    
    def _validate_grib(self, file_path: str) -> Dict[str, Any]:
        """Validate GRIB file"""
        try:
            # Try to open with xarray
            ds = xr.open_dataset(file_path, engine='cfgrib')
            
            coord_vars = list(ds.coords.keys())
            data_vars = list(ds.data_vars.keys())
            
            return {
                'estimated_rows': None,
                'detected_columns': coord_vars + data_vars,
                'has_time_column': 'time' in coord_vars,
                'has_coordinates': True,
                'recommendations': ["GRIB files typically contain meteorological data"]
            }
            
        except Exception as e:
            raise ValueError(f"Invalid GRIB format: {e}")
    
    def validate_cf_compliance(self, file_path: str) -> CFComplianceCheck:
        """Check CF-1.8 compliance of NetCDF file"""
        try:
            with xr.open_dataset(file_path) as ds:
                issues = []
                missing_attrs = []
                invalid_attrs = []
                coord_issues = []
                var_issues = []
                global_issues = []
                
                # Check global attributes
                required_global_attrs = ['Conventions', 'title', 'institution', 'source', 'history']
                for attr in required_global_attrs:
                    if attr not in ds.attrs:
                        missing_attrs.append(attr)
                        global_issues.append(ErrorDetail(
                            code="MISSING_GLOBAL_ATTR",
                            message=f"Missing required global attribute: {attr}",
                            field=attr
                        ))
                
                # Check Conventions attribute
                conventions = ds.attrs.get('Conventions', '')
                if 'CF-1.8' not in conventions:
                    global_issues.append(ErrorDetail(
                        code="INVALID_CONVENTIONS",
                        message=f"Conventions should include CF-1.8, found: {conventions}",
                        field="Conventions"
                    ))
                
                # Check coordinate variables
                for coord_name, coord in ds.coords.items():
                    if coord_name in ['latitude', 'lat']:
                        if 'units' not in coord.attrs:
                            coord_issues.append(ErrorDetail(
                                code="MISSING_COORD_UNITS",
                                message=f"Latitude coordinate missing units",
                                field=coord_name
                            ))
                        elif coord.attrs.get('units') != 'degrees_north':
                            coord_issues.append(ErrorDetail(
                                code="INVALID_COORD_UNITS",
                                message=f"Latitude units should be 'degrees_north'",
                                field=coord_name
                            ))
                    
                    elif coord_name in ['longitude', 'lon']:
                        if 'units' not in coord.attrs:
                            coord_issues.append(ErrorDetail(
                                code="MISSING_COORD_UNITS",
                                message=f"Longitude coordinate missing units",
                                field=coord_name
                            ))
                        elif coord.attrs.get('units') != 'degrees_east':
                            coord_issues.append(ErrorDetail(
                                code="INVALID_COORD_UNITS",
                                message=f"Longitude units should be 'degrees_east'",
                                field=coord_name
                            ))
                
                # Check data variables
                for var_name, var in ds.data_vars.items():
                    if 'units' not in var.attrs:
                        var_issues.append(ErrorDetail(
                            code="MISSING_VAR_UNITS",
                            message=f"Data variable '{var_name}' missing units",
                            field=var_name
                        ))
                
                # Calculate compliance score
                total_checks = len(required_global_attrs) + len(ds.coords) + len(ds.data_vars)
                failed_checks = len(missing_attrs) + len(coord_issues) + len(var_issues) + len(global_issues)
                compliance_score = max(0, (total_checks - failed_checks) / total_checks * 100) if total_checks > 0 else 0
                
                # Generate recommendations
                recommendations = []
                if missing_attrs:
                    recommendations.append(f"Add missing global attributes: {', '.join(missing_attrs)}")
                if coord_issues:
                    recommendations.append("Fix coordinate variable attributes")
                if var_issues:
                    recommendations.append("Add units to data variables")
                
                return CFComplianceCheck(
                    is_compliant=compliance_score >= 90,
                    cf_version="CF-1.8",
                    required_attributes=required_global_attrs,
                    missing_attributes=missing_attrs,
                    invalid_attributes=invalid_attrs,
                    coordinate_issues=coord_issues,
                    variable_issues=var_issues,
                    global_attribute_issues=global_issues,
                    compliance_score=compliance_score,
                    recommendations=recommendations
                )
                
        except Exception as e:
            logger.error(f"CF compliance check failed: {e}")
            return CFComplianceCheck(
                is_compliant=False,
                cf_version="CF-1.8",
                compliance_score=0,
                recommendations=[f"Failed to check compliance: {str(e)}"]
            )
    
    def validate_column_mapping(self, column_mapping: List[ColumnMapping], 
                               available_columns: List[str]) -> ValidationResult:
        """Validate column mapping configuration"""
        errors = []
        warnings = []
        
        # Check if all mapped columns exist
        mapped_columns = [mapping.original_name for mapping in column_mapping]
        for col in mapped_columns:
            if col not in available_columns:
                errors.append(ErrorDetail(
                    code="COLUMN_NOT_FOUND",
                    message=f"Mapped column '{col}' not found in data",
                    field=col
                ))
        
        # Check for required coordinate types
        coord_types = [mapping.dimension for mapping in column_mapping 
                      if mapping.type.value == 'coordinate']
        
        if 'time' not in coord_types:
            warnings.append(ErrorDetail(
                code="MISSING_TIME_COORDINATE",
                message="No time coordinate specified. Consider adding time dimension."
            ))
        
        # Check for duplicate standard names
        standard_names = [mapping.standard_name for mapping in column_mapping 
                         if mapping.standard_name]
        duplicate_names = set([name for name in standard_names if standard_names.count(name) > 1])
        
        for name in duplicate_names:
            errors.append(ErrorDetail(
                code="DUPLICATE_STANDARD_NAME",
                message=f"Duplicate standard name: {name}"
            ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def validate_metadata_config(self, metadata_config: MetadataConfig) -> ValidationResult:
        """Validate metadata configuration"""
        errors = []
        warnings = []
        
        # Check required basic info
        if metadata_config.basic_info:
            if not metadata_config.basic_info.title:
                warnings.append(ErrorDetail(
                    code="MISSING_TITLE",
                    message="Dataset title is recommended"
                ))
        
        # Check institution info
        if metadata_config.institution_info:
            if not metadata_config.institution_info.institution:
                warnings.append(ErrorDetail(
                    code="MISSING_INSTITUTION",
                    message="Institution information is recommended"
                ))
        
        # Validate spatial coverage
        if metadata_config.spatiotemporal_coverage:
            coverage = metadata_config.spatiotemporal_coverage
            
            # Check latitude bounds
            if coverage.geospatial_lat_min is not None and coverage.geospatial_lat_max is not None:
                if coverage.geospatial_lat_min > coverage.geospatial_lat_max:
                    errors.append(ErrorDetail(
                        code="INVALID_LAT_BOUNDS",
                        message="Minimum latitude cannot be greater than maximum latitude"
                    ))
                if not (-90 <= coverage.geospatial_lat_min <= 90):
                    errors.append(ErrorDetail(
                        code="INVALID_LAT_VALUE",
                        message="Latitude values must be between -90 and 90 degrees"
                    ))
                if not (-90 <= coverage.geospatial_lat_max <= 90):
                    errors.append(ErrorDetail(
                        code="INVALID_LAT_VALUE",
                        message="Latitude values must be between -90 and 90 degrees"
                    ))
            
            # Check longitude bounds  
            if coverage.geospatial_lon_min is not None and coverage.geospatial_lon_max is not None:
                if not (-180 <= coverage.geospatial_lon_min <= 180):
                    errors.append(ErrorDetail(
                        code="INVALID_LON_VALUE",
                        message="Longitude values must be between -180 and 180 degrees"
                    ))
                if not (-180 <= coverage.geospatial_lon_max <= 180):
                    errors.append(ErrorDetail(
                        code="INVALID_LON_VALUE",
                        message="Longitude values must be between -180 and 180 degrees"
                    ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )


# Global instance
validation_service = ValidationService()
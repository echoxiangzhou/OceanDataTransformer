/**
 * 从文件数据中自动提取属性信息的工具函数
 */

interface ExtractedAttributes {
  spatiotemporal_coverage: {
    geospatial_lat_min?: number
    geospatial_lat_max?: number
    geospatial_lon_min?: number
    geospatial_lon_max?: number
    geospatial_vertical_min?: number
    geospatial_vertical_max?: number
    time_coverage_start?: string
    time_coverage_end?: string
  }
  data_variables: string[]
  coordinate_variables: string[]
  detected_units: { [key: string]: string }
  data_quality: {
    total_records: number
    missing_data_percentage: number
    complete_records: number
  }
}

export const extractFileAttributes = (previewData: any): ExtractedAttributes => {
  const result: ExtractedAttributes = {
    spatiotemporal_coverage: {},
    data_variables: [],
    coordinate_variables: [],
    detected_units: {},
    data_quality: {
      total_records: previewData.total_rows || 0,
      missing_data_percentage: 0,
      complete_records: 0
    }
  }

  if (!previewData.sample_data || !previewData.columns) {
    return result
  }

  const data = previewData.sample_data
  const columns = previewData.columns

  // 识别坐标和数据变量
  columns.forEach((column: string) => {
    const columnLower = column.toLowerCase()
    
    // 识别坐标变量
    if (isCoordinateColumn(columnLower)) {
      result.coordinate_variables.push(column)
    } else {
      result.data_variables.push(column)
    }
    
    // 推断单位
    const units = inferUnits(columnLower)
    if (units) {
      result.detected_units[column] = units
    }
  })

  // 提取空间范围
  extractSpatialRange(data, columns, result)
  
  // 提取时间范围
  extractTemporalRange(data, columns, result)
  
  // 计算数据质量统计
  calculateDataQuality(data, columns, result)

  return result
}

const isCoordinateColumn = (columnName: string): boolean => {
  const coordinatePatterns = [
    'lat', 'latitude', 'y',
    'lon', 'longitude', 'x', 'lng',
    'time', 'date', 'datetime', 't',
    'depth', 'level', 'z', 'elevation', 'altitude'
  ]
  
  return coordinatePatterns.some(pattern => 
    columnName.includes(pattern) || columnName === pattern
  )
}

const inferUnits = (columnName: string): string | null => {
  const unitMappings: { [key: string]: string } = {
    'lat': 'degrees_north',
    'latitude': 'degrees_north',
    'lon': 'degrees_east', 
    'longitude': 'degrees_east',
    'lng': 'degrees_east',
    'depth': 'm',
    'level': 'm',
    'elevation': 'm',
    'altitude': 'm',
    'temp': 'degree_C',
    'temperature': 'degree_C',
    'sal': 'psu',
    'salinity': 'psu',
    'pressure': 'dbar',
    'speed': 'm/s',
    'velocity': 'm/s'
  }

  for (const [pattern, unit] of Object.entries(unitMappings)) {
    if (columnName.includes(pattern)) {
      return unit
    }
  }

  return null
}

const extractSpatialRange = (data: any[], columns: string[], result: ExtractedAttributes) => {
  // 查找纬度列
  const latColumns = columns.filter(col => 
    ['lat', 'latitude', 'y'].some(pattern => 
      col.toLowerCase().includes(pattern)
    )
  )
  
  // 查找经度列
  const lonColumns = columns.filter(col => 
    ['lon', 'longitude', 'lng', 'x'].some(pattern => 
      col.toLowerCase().includes(pattern)
    )
  )
  
  // 查找深度列
  const depthColumns = columns.filter(col => 
    ['depth', 'level', 'z', 'elevation'].some(pattern => 
      col.toLowerCase().includes(pattern)
    )
  )

  // 提取纬度范围
  if (latColumns.length > 0) {
    const latValues = data.map(row => parseFloat(row[latColumns[0]])).filter(val => !isNaN(val))
    if (latValues.length > 0) {
      result.spatiotemporal_coverage.geospatial_lat_min = Math.min(...latValues)
      result.spatiotemporal_coverage.geospatial_lat_max = Math.max(...latValues)
    }
  }

  // 提取经度范围
  if (lonColumns.length > 0) {
    const lonValues = data.map(row => parseFloat(row[lonColumns[0]])).filter(val => !isNaN(val))
    if (lonValues.length > 0) {
      result.spatiotemporal_coverage.geospatial_lon_min = Math.min(...lonValues)
      result.spatiotemporal_coverage.geospatial_lon_max = Math.max(...lonValues)
    }
  }

  // 提取深度范围
  if (depthColumns.length > 0) {
    const depthValues = data.map(row => parseFloat(row[depthColumns[0]])).filter(val => !isNaN(val))
    if (depthValues.length > 0) {
      result.spatiotemporal_coverage.geospatial_vertical_min = Math.min(...depthValues)
      result.spatiotemporal_coverage.geospatial_vertical_max = Math.max(...depthValues)
    }
  }
}

const extractTemporalRange = (data: any[], columns: string[], result: ExtractedAttributes) => {
  // 查找时间列
  const timeColumns = columns.filter(col => 
    ['time', 'date', 'datetime', 't'].some(pattern => 
      col.toLowerCase().includes(pattern)
    )
  )

  if (timeColumns.length > 0) {
    const timeValues = data.map(row => {
      const timeStr = row[timeColumns[0]]
      if (!timeStr) return null
      
      try {
        // 尝试解析各种时间格式
        const date = new Date(timeStr)
        return isNaN(date.getTime()) ? null : date
      } catch {
        return null
      }
    }).filter(date => date !== null) as Date[]

    if (timeValues.length > 0) {
      const sortedTimes = timeValues.sort((a, b) => a.getTime() - b.getTime())
      result.spatiotemporal_coverage.time_coverage_start = sortedTimes[0].toISOString()
      result.spatiotemporal_coverage.time_coverage_end = sortedTimes[sortedTimes.length - 1].toISOString()
    }
  }
}

const calculateDataQuality = (data: any[], columns: string[], result: ExtractedAttributes) => {
  if (data.length === 0) return

  let totalCells = 0
  let missingCells = 0
  let completeRecords = 0

  data.forEach(row => {
    let recordComplete = true
    columns.forEach(column => {
      totalCells++
      const value = row[column]
      if (value === null || value === undefined || value === '' || value === 'NaN') {
        missingCells++
        recordComplete = false
      }
    })
    if (recordComplete) {
      completeRecords++
    }
  })

  result.data_quality.missing_data_percentage = totalCells > 0 ? (missingCells / totalCells) * 100 : 0
  result.data_quality.complete_records = completeRecords
}

// 生成智能的元数据建议
export const generateMetadataSuggestions = (
  extractedAttributes: ExtractedAttributes,
  filename: string,
  fileType: string
) => {
  const suggestions = {
    basic_info: {
      title: generateTitle(filename, extractedAttributes),
      summary: generateSummary(extractedAttributes, fileType),
      keywords: generateKeywords(extractedAttributes)
    },
    institution_info: {
      source: `Converted from ${fileType?.toUpperCase()} file`
    },
    spatiotemporal_coverage: extractedAttributes.spatiotemporal_coverage,
    quality_info: {
      processing_level: 'Level 1',
      standard_name_vocabulary: 'CF Standard Name Table v79',
      conventions: 'CF-1.8'
    }
  }

  return suggestions
}

const generateTitle = (filename: string, attributes: ExtractedAttributes): string => {
  const baseName = filename.replace(/\.[^/.]+$/, '') // 移除扩展名
  const variables = attributes.data_variables.slice(0, 3).join(', ')
  
  if (variables) {
    return `${baseName} - ${variables} 数据集`
  }
  
  return `${baseName} 海洋数据集`
}

const generateSummary = (attributes: ExtractedAttributes, fileType: string): string => {
  const { spatiotemporal_coverage, data_variables, data_quality } = attributes
  
  let summary = `该数据集包含 ${data_variables.length} 个数据变量`
  
  if (data_quality.total_records > 0) {
    summary += `，共 ${data_quality.total_records} 条记录`
  }
  
  if (spatiotemporal_coverage.time_coverage_start && spatiotemporal_coverage.time_coverage_end) {
    const startDate = new Date(spatiotemporal_coverage.time_coverage_start).toLocaleDateString()
    const endDate = new Date(spatiotemporal_coverage.time_coverage_end).toLocaleDateString()
    summary += `，时间范围从 ${startDate} 至 ${endDate}`
  }
  
  if (spatiotemporal_coverage.geospatial_lat_min !== undefined) {
    summary += `，空间覆盖范围：纬度 ${spatiotemporal_coverage.geospatial_lat_min?.toFixed(2)}° 至 ${spatiotemporal_coverage.geospatial_lat_max?.toFixed(2)}°`
  }
  
  summary += `。数据来源于 ${fileType?.toUpperCase()} 格式文件。`
  
  return summary
}

const generateKeywords = (attributes: ExtractedAttributes): string => {
  const keywords = ['oceanography', 'marine data']
  
  // 基于数据变量添加关键词
  attributes.data_variables.forEach(variable => {
    const varLower = variable.toLowerCase()
    if (varLower.includes('temp')) keywords.push('temperature')
    if (varLower.includes('sal')) keywords.push('salinity') 
    if (varLower.includes('pressure')) keywords.push('pressure')
    if (varLower.includes('depth')) keywords.push('depth')
    if (varLower.includes('current')) keywords.push('ocean currents')
  })
  
  // 去重并返回
  return [...new Set(keywords)].join(', ')
}
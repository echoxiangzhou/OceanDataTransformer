import { useState, useEffect, useCallback } from 'react'
import { dataSourceService } from '../services/dataSourceService'
import type { DataSource, DataSourceCreate } from '@/types/domain'

export function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDataSources = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await dataSourceService.getDataSources()
      setDataSources(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data sources')
    } finally {
      setLoading(false)
    }
  }, [])

  const createDataSource = useCallback(async (sourceData: DataSourceCreate) => {
    try {
      const newSource = await dataSourceService.createDataSource(sourceData)
      setDataSources(prev => [newSource, ...prev])
      return newSource
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create data source')
      throw err
    }
  }, [])

  const updateDataSource = useCallback(async (id: number, sourceData: Partial<DataSourceCreate>) => {
    try {
      const updatedSource = await dataSourceService.updateDataSource(id, sourceData)
      setDataSources(prev => 
        prev.map(source => source.id === id ? updatedSource : source)
      )
      return updatedSource
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data source')
      throw err
    }
  }, [])

  const deleteDataSource = useCallback(async (id: number) => {
    try {
      await dataSourceService.deleteDataSource(id)
      setDataSources(prev => prev.filter(source => source.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data source')
      throw err
    }
  }, [])

  const testConnection = useCallback(async (id: number) => {
    try {
      const result = await dataSourceService.testConnection(id)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test connection')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchDataSources()
  }, [fetchDataSources])

  return {
    dataSources,
    loading,
    error,
    fetchDataSources,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection,
  }
}
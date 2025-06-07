import { useEffect, useState, useCallback } from 'react'
import { websocketService, TaskUpdate, SchedulerStatus } from '@/services/websocketService'

interface WebSocketConnection {
  isConnected: boolean
  clientId: string
  reconnectAttempts: number
}

export function useWebSocket() {
  const [connection, setConnection] = useState<WebSocketConnection>({
    isConnected: false,
    clientId: '',
    reconnectAttempts: 0
  })

  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect().catch(console.error)

    // Listen for connection status changes
    const unsubscribe = websocketService.onConnection((data) => {
      setConnection(websocketService.getConnectionStatus())
    })

    // Update initial status
    setConnection(websocketService.getConnectionStatus())

    return () => {
      unsubscribe()
      websocketService.disconnect()
    }
  }, [])

  const subscribeToTask = useCallback((taskId: number) => {
    websocketService.subscribeToTask(taskId)
  }, [])

  const unsubscribeFromTask = useCallback((taskId: number) => {
    websocketService.unsubscribeFromTask(taskId)
  }, [])

  const getSchedulerStatus = useCallback(() => {
    websocketService.getSchedulerStatus()
  }, [])

  return {
    connection,
    subscribeToTask,
    unsubscribeFromTask,
    getSchedulerStatus,
    websocketService
  }
}

export function useTaskProgress(taskId: number) {
  const [progress, setProgress] = useState<TaskUpdate | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!taskId) return

    setIsSubscribed(true)
    const unsubscribe = websocketService.onTaskUpdate(taskId, (data: TaskUpdate) => {
      setProgress(data)
    })

    return () => {
      unsubscribe()
      setIsSubscribed(false)
    }
  }, [taskId])

  return {
    progress,
    isSubscribed
  }
}

export function useSchedulerStatus() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null)

  useEffect(() => {
    const unsubscribe = websocketService.onSchedulerStatus((data: SchedulerStatus) => {
      setStatus(data)
    })

    // Request initial status
    websocketService.getSchedulerStatus()

    return unsubscribe
  }, [])

  return status
}

export function useWebSocketNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = websocketService.onNotification((data) => {
      setNotifications(prev => [...prev, {
        ...data,
        id: Date.now(),
        timestamp: new Date().toISOString()
      }])
    })

    return unsubscribe
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const removeNotification = useCallback((id: string | number) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return {
    notifications,
    clearNotifications,
    removeNotification
  }
}
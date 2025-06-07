interface WebSocketMessage {
  type: string
  task_id?: number
  timestamp?: string
  data?: any
  message?: string
  error?: string
}

interface TaskUpdate {
  progress: number
  downloaded_size: number
  total_size: number
  status: string
}

interface SchedulerStatus {
  running_tasks: number
  pending_tasks: number
  max_concurrent: number
  scheduler_running: boolean
  running_task_ids: number[]
  pending_task_ids: number[]
}

type EventCallback = (data: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private clientId: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 5000
  private isConnected = false
  
  // Event listeners
  private taskUpdateListeners: Map<number, EventCallback[]> = new Map()
  private schedulerStatusListeners: EventCallback[] = []
  private notificationListeners: EventCallback[] = []
  private connectionListeners: EventCallback[] = []

  constructor() {
    this.clientId = this.generateClientId()
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      const wsUrl = `ws://localhost:8000/api/v1/ws/ws/${this.clientId}`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.notifyConnectionListeners({ type: 'connected' })
        resolve()
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnected = false
        this.notifyConnectionListeners({ type: 'disconnected' })
        this.handleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.notifyConnectionListeners({ type: 'error', error })
        reject(error)
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
    })
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'task_update':
        if (message.task_id) {
          this.notifyTaskUpdateListeners(message.task_id, message.data)
        }
        break
        
      case 'scheduler_status':
        this.notifySchedulerStatusListeners(message.data)
        break
        
      case 'notification':
        this.notifyNotificationListeners(message.data)
        break
        
      case 'subscription_confirmed':
      case 'unsubscription_confirmed':
        console.log(message.message)
        break
        
      case 'pong':
        console.log('Received pong')
        break
        
      case 'error':
        console.error('WebSocket server error:', message.message)
        break
        
      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectInterval)
    } else {
      console.error('Max reconnection attempts reached')
      this.notifyConnectionListeners({ type: 'max_attempts_reached' })
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  // Subscription methods
  subscribeToTask(taskId: number) {
    this.sendMessage({
      type: 'subscribe_task',
      task_id: taskId
    })
  }

  unsubscribeFromTask(taskId: number) {
    this.sendMessage({
      type: 'unsubscribe_task',
      task_id: taskId
    })
  }

  getSchedulerStatus() {
    this.sendMessage({
      type: 'get_scheduler_status'
    })
  }

  ping() {
    this.sendMessage({
      type: 'ping',
      timestamp: new Date().toISOString()
    })
  }

  private sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  // Event listener management
  onTaskUpdate(taskId: number, callback: (data: TaskUpdate) => void) {
    if (!this.taskUpdateListeners.has(taskId)) {
      this.taskUpdateListeners.set(taskId, [])
    }
    this.taskUpdateListeners.get(taskId)!.push(callback)
    
    // Auto-subscribe to task
    this.subscribeToTask(taskId)
    
    return () => this.offTaskUpdate(taskId, callback)
  }

  offTaskUpdate(taskId: number, callback: EventCallback) {
    const listeners = this.taskUpdateListeners.get(taskId)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
        if (listeners.length === 0) {
          this.taskUpdateListeners.delete(taskId)
          this.unsubscribeFromTask(taskId)
        }
      }
    }
  }

  onSchedulerStatus(callback: (data: SchedulerStatus) => void) {
    this.schedulerStatusListeners.push(callback)
    return () => this.offSchedulerStatus(callback)
  }

  offSchedulerStatus(callback: EventCallback) {
    const index = this.schedulerStatusListeners.indexOf(callback)
    if (index > -1) {
      this.schedulerStatusListeners.splice(index, 1)
    }
  }

  onNotification(callback: EventCallback) {
    this.notificationListeners.push(callback)
    return () => this.offNotification(callback)
  }

  offNotification(callback: EventCallback) {
    const index = this.notificationListeners.indexOf(callback)
    if (index > -1) {
      this.notificationListeners.splice(index, 1)
    }
  }

  onConnection(callback: EventCallback) {
    this.connectionListeners.push(callback)
    return () => this.offConnection(callback)
  }

  offConnection(callback: EventCallback) {
    const index = this.connectionListeners.indexOf(callback)
    if (index > -1) {
      this.connectionListeners.splice(index, 1)
    }
  }

  // Notification methods
  private notifyTaskUpdateListeners(taskId: number, data: TaskUpdate) {
    const listeners = this.taskUpdateListeners.get(taskId)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  private notifySchedulerStatusListeners(data: SchedulerStatus) {
    this.schedulerStatusListeners.forEach(callback => callback(data))
  }

  private notifyNotificationListeners(data: any) {
    this.notificationListeners.forEach(callback => callback(data))
  }

  private notifyConnectionListeners(data: any) {
    this.connectionListeners.forEach(callback => callback(data))
  }

  // Status methods
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

export const websocketService = new WebSocketService()
export type { TaskUpdate, SchedulerStatus }
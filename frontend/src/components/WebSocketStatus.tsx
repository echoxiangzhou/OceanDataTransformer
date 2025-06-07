import React from 'react'
import { Wifi, WifiOff, RotateCw } from 'lucide-react'

interface WebSocketStatusProps {
  isConnected: boolean
  reconnectAttempts: number
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  isConnected,
  reconnectAttempts
}) => {
  if (isConnected) {
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <Wifi className="h-4 w-4" />
        <span className="text-xs">实时连接</span>
      </div>
    )
  }

  if (reconnectAttempts > 0) {
    return (
      <div className="flex items-center space-x-1 text-yellow-600">
        <RotateCw className="h-4 w-4 animate-spin" />
        <span className="text-xs">重连中 ({reconnectAttempts})</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-red-600">
      <WifiOff className="h-4 w-4" />
      <span className="text-xs">连接断开</span>
    </div>
  )
}
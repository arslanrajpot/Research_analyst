import React, { useState, useEffect } from 'react';
import './RealTimeStatus.css';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const wsBaseUrl = apiBaseUrl.replace(/^http/i, 'ws').replace(/\/$/, '');

const RealTimeStatus = ({ isVisible, onClose }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [subtasks, setSubtasks] = useState({});
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [ws, setWs] = useState(null);
  const [currentStage, setCurrentStage] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Connect to WebSocket with retry logic
    let websocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;

    const connectWebSocket = () => {
      try {
        websocket = new WebSocket(`${wsBaseUrl}/ws/research-client`);
        
        websocket.onopen = () => {
          console.log('WebSocket connected');
          setConnectionStatus('connected');
          reconnectAttempts = 0; // Reset on successful connection
          
          // Send connection established message
          websocket.send(JSON.stringify({
            type: 'connection_established',
            client_id: 'research-client'
          }));
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);

            switch (data.type) {
              case 'workflow_start':
                setTotalTasks(data.total_tasks);
                setCompletedTasks(0);
                setSubtasks({});
                break;

              case 'subtask_update':
                setSubtasks(prev => ({
                  ...prev,
                  [data.task_id]: {
                    name: data.task_name,
                    status: data.status,
                    description: data.description,
                    timestamp: data.timestamp
                  }
                }));
                
                if (data.status === 'completed') {
                  setCompletedTasks(prev => prev + 1);
                }
                break;

              case 'research_progress':
                // Handle research progress updates
                console.log('Research progress:', data);
                setCurrentStage(data.stage);
                setCurrentMessage(data.message);
                setOverallProgress(data.progress);
                break;

              case 'error_update':
                console.error('Research error:', data);
                setConnectionStatus('error');
                break;

              case 'connection_established':
                setConnectionStatus('connected');
                break;

              default:
                console.log('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        websocket.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('disconnected');
          
          // Attempt to reconnect if not manually closed
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            setTimeout(connectWebSocket, reconnectDelay);
          }
        };

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('error');
        };

        setWs(websocket);
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionStatus('error');
      }
    };

    // Start initial connection
    connectWebSocket();

    // Ping mechanism to keep connection alive
    const pingInterval = setInterval(() => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send('ping');
      }
    }, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval);
      if (websocket) {
        websocket.close();
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const subtaskList = Object.values(subtasks);

  return (
    <div className="real-time-status-overlay">
      <div className="real-time-status-modal">
        <div className="status-header">
          <h3>🔍 Research Progress</h3>
          <div className={`connection-indicator ${connectionStatus}`}>
            {connectionStatus === 'connected' ? '🟢 Connected' : 
             connectionStatus === 'error' ? '🔴 Error' : '🔴 Disconnected'}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="status-content">
          {/* Current Stage */}
          {currentStage && (
            <div className="current-stage">
              <h4>🔍 Current Stage: {currentStage}</h4>
              <p className="stage-message">{currentMessage}</p>
              <div className="stage-progress-bar">
                <div 
                  className="stage-progress-fill" 
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              <div className="stage-progress-percentage">{overallProgress}%</div>
            </div>
          )}

          {/* Overall Progress */}
          <div className="overall-progress">
            <div className="progress-info">
              <h4>Research Progress</h4>
              <span className="progress-text">{completedTasks}/{totalTasks} tasks completed</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progress-percentage">{progress}%</div>
          </div>

          {/* Subtasks */}
          {subtaskList.length > 0 && (
            <div className="subtasks-section">
              <h4>📋 Research Tasks</h4>
              <div className="subtasks-list">
                {subtaskList.map((task, index) => (
                  <div key={index} className={`subtask-item ${task.status}`}>
                    <div className="subtask-icon">
                      {task.status === 'completed' ? '✅' :
                       task.status === 'in_progress' ? '🔄' :
                       task.status === 'error' ? '❌' : '⏳'}
                    </div>
                    <div className="subtask-content">
                      <div className="subtask-name">{task.name}</div>
                      <div className="subtask-description">{task.description}</div>
                    </div>
                    <div className="subtask-status">
                      {task.status === 'completed' ? 'Done' :
                       task.status === 'in_progress' ? 'Working...' :
                       task.status === 'error' ? 'Failed' : 'Waiting'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Status */}
          <div className="connection-status">
            <div className="status-info">
              <span className="status-label">Status:</span>
              <span className={`status-value ${connectionStatus}`}>
                {connectionStatus === 'connected' ? 'Connected to research engine' :
                 connectionStatus === 'error' ? 'Connection error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeStatus;

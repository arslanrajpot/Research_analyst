import React, { useState, useEffect } from 'react';
import './ResearchLoadingOverlay.css';

const ResearchLoadingOverlay = ({ isVisible, onClose, query }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [currentStage, setCurrentStage] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [subtasks, setSubtasks] = useState({});
  const [totalTasks, setTotalTasks] = useState(8); // Default to 8 tasks
  const [completedTasks, setCompletedTasks] = useState(0);
  const [ws, setWs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isVisible) return;

    // Connect to WebSocket with retry logic
    let websocket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;

    const connectWebSocket = () => {
      try {
        websocket = new WebSocket('ws://localhost:8000/ws/research-client');
        
        websocket.onopen = () => {
          console.log('WebSocket connected for research loading');
          setConnectionStatus('connected');
          setError(null);
          reconnectAttempts = 0;
          
          // Send connection established message
          websocket.send(JSON.stringify({
            type: 'connection_established',
            client_id: 'research-client'
          }));
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Research loading WebSocket message:', data);

            switch (data.type) {
              case 'workflow_start':
                setTotalTasks(data.total_tasks || 8);
                setCompletedTasks(0);
                setSubtasks({});
                break;

              case 'subtask_update':
                setSubtasks(prev => {
                  const newSubtasks = { ...prev };
                  const existingTask = newSubtasks[data.task_id];
                  
                  // Only update if this is a new task or if status changed
                  if (!existingTask || existingTask.status !== data.status) {
                    newSubtasks[data.task_id] = {
                      name: data.task_name,
                      status: data.status,
                      description: data.description,
                      timestamp: data.timestamp
                    };
                    
                    // Only count completed tasks, and only if it wasn't already completed
                    if (data.status === 'completed' && (!existingTask || existingTask.status !== 'completed')) {
                      setCompletedTasks(prev => prev + 1);
                    }
                  }
                  
                  return newSubtasks;
                });
                break;

              case 'research_progress':
                setCurrentStage(data.stage);
                setCurrentMessage(data.message);
                setOverallProgress(data.progress);
                break;

              case 'error_update':
                setError(data.error_message);
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
          setError('Connection error occurred');
        };

        setWs(websocket);
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionStatus('error');
        setError('Failed to connect to research engine');
      }
    };

    // Start initial connection
    connectWebSocket();

    // Ping mechanism to keep connection alive
    const pingInterval = setInterval(() => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (websocket) {
        websocket.close();
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  // Calculate progress using both task completion and overall progress
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progress = overallProgress > 0 ? overallProgress : taskProgress;
  const subtaskList = Object.values(subtasks);

  return (
    <div className="research-loading-overlay">
      <div className="research-loading-modal">
        <div className="loading-header">
          <div className="loading-title">
            <h3>🔍 Generating Research Report</h3>
            <p className="query-text">"{query}"</p>
          </div>
          <div className={`connection-indicator ${connectionStatus}`}>
            {connectionStatus === 'connected' ? '🟢 Connected' : 
             connectionStatus === 'error' ? '🔴 Error' : '🔴 Disconnected'}
          </div>
        </div>

        <div className="loading-content">
          {/* Error Display */}
          {error && (
            <div className="error-section">
              <h4>❌ Error</h4>
              <p>{error}</p>
              <button 
                className="retry-btn"
                onClick={() => {
                  setError(null);
                  setConnectionStatus('disconnected');
                  // Trigger reconnection
                  window.location.reload();
                }}
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Single Progress Section */}
          {!error && (
            <div className="overall-progress">
              <div className="progress-info">
                <h4>Research Progress</h4>
                {currentStage && (
                  <div className="current-stage-info">
                    <span className="current-stage-text">🔍 {currentStage}</span>
                    {currentMessage && (
                      <span className="stage-message">{currentMessage}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${progress}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                ></div>
              </div>
              <div className="progress-percentage">{progress}%</div>
              {progress > 0 && progress < 100 && (
                <div className="progress-status">
                  {progress < 30 ? "🔍 Gathering data..." :
                   progress < 60 ? "📊 Processing information..." :
                   progress < 90 ? "🧠 Analyzing insights..." :
                   "📝 Generating report..."}
                </div>
              )}
            </div>
          )}

          {/* Subtasks */}
          {subtaskList.length > 0 && !error && (
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

          {/* Loading Animation */}
          {!currentStage && !error && (
            <div className="loading-animation">
              <div className="spinner"></div>
              <p>Initializing research engine...</p>
            </div>
          )}
        </div>

        <div className="loading-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchLoadingOverlay;



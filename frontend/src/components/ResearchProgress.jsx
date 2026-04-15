import React, { useState, useEffect } from 'react';
import './ResearchProgress.css';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const wsBaseUrl = apiBaseUrl.replace(/^http/i, 'ws').replace(/\/$/, '');

const ResearchProgress = ({ isVisible, onClose }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [subtasks, setSubtasks] = useState({});
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (!isVisible) return;

    // Connect to WebSocket
    const websocket = new WebSocket(`${wsBaseUrl}/ws/research-client`);
    
    // Send connection message to establish connection
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
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
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const subtaskList = Object.values(subtasks);

  return (
    <div className="research-progress-overlay">
      <div className="research-progress-modal">
        <div className="progress-header">
          <div className="progress-title">
            <h3>🔍 Generating Research Report</h3>
            <div className={`connection-indicator ${connectionStatus}`}>
              {connectionStatus === 'connected' ? '🟢 Connected' : 
               connectionStatus === 'error' ? '🔴 Error' : '🔴 Disconnected'}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="progress-content">
          {/* Overall Progress */}
          <div className="overall-progress">
            <div className="progress-info">
              <span className="progress-text">
                {progress > 0 ? `Research in progress...` : 'Preparing research...'}
              </span>
              <span className="progress-percentage">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Subtasks Grid */}
          {subtaskList.length > 0 && (
            <div className="subtasks-grid">
              {subtaskList.map((task, index) => (
                <div key={index} className={`subtask-card ${task.status}`}>
                  <div className="subtask-icon">
                    {task.status === 'completed' ? '✅' :
                     task.status === 'in_progress' ? '🔄' :
                     task.status === 'error' ? '❌' : '⏳'}
                  </div>
                  <div className="subtask-content">
                    <div className="subtask-name">{task.name}</div>
                    <div className="subtask-description">{task.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status Message */}
          <div className="status-message">
            {connectionStatus === 'connected' ? 
              'Research engine is actively gathering data from multiple sources...' :
              connectionStatus === 'error' ? 
              'Connection error - please try again' : 
              'Connecting to research engine...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchProgress;



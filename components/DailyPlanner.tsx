'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Task {
  id: string;
  content: string;
  completed: boolean;
  time: string;
}

export function DailyPlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 현재 날짜 표시
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    };
    setCurrentDate(date.toLocaleDateString('ko-KR', options));
    
    // 로컬 스토리지에서 저장된 일정 불러오기
    const savedTasks = localStorage.getItem('dailyTasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  useEffect(() => {
    // 일정이 변경될 때마다 로컬 스토리지에 저장
    localStorage.setItem('dailyTasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (newTask.trim() === '') return;
    
    const task: Task = {
      id: uuidv4(),
      content: newTask,
      completed: false,
      time: newTaskTime || '00:00'
    };
    
    setTasks([...tasks, task]);
    setNewTask('');
    setNewTaskTime('');
    setIsModalOpen(false);
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(
      tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-cover bg-center py-8 px-4" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1551491603-7d8aeac4c6df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80")' }}>
      <div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
        <div className="bg-indigo-600 p-4 text-center">
          <h1 className="text-2xl font-bold text-white">일일 계획표</h1>
          <p className="text-indigo-100 mt-1">{currentDate}</p>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <button
              onClick={openModal}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              새 일정 추가하기
            </button>
          </div>
          
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-center text-gray-700 py-4 bg-white/50 rounded-lg">오늘의 할 일을 추가해보세요!</p>
            ) : (
              tasks
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(task => (
                  <div
                    key={task.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg bg-white/80 hover:bg-white transition-colors"
                  >
                    <div className="flex-shrink-0 mr-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTaskCompletion(task.id)}
                        className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <p className={`${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {task.content}
                      </p>
                      {task.time && (
                        <p className="text-sm text-gray-500 mt-1">
                          {task.time}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeModal}></div>
          <div className="bg-white rounded-xl p-6 z-10 w-11/12 max-w-md mx-auto shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">새 일정 추가</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">
                  할 일
                </label>
                <input
                  id="task"
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="할 일을 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  시간
                </label>
                <input
                  id="time"
                  type="time"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={addTask}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface TimeSlot {
  id: string;
  startTime: string; // "HH:MM" format
  endTime: string;   // "HH:MM" format
  task: string;
  completed: boolean;
  notified: boolean;
  alarmDisabled: boolean;
  color: string;     // Color for the task
  isNextDay?: boolean; // 종료 시간이 다음날인지 여부
}

type ModalType = 'add_task' | 'change_time' | 'set_time_range' | null;

// 시간을 숫자로 변환하는 함수 (예: "14:30" -> 14.5)
function timeToDecimal(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes / 60);
}

// 숫자 시간을 문자열 시간으로 변환하는 함수 (예: 14.5 -> "14:30")
function decimalToTime(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// 시간대를 원의 각도(0-360)로 변환하는 함수 - 1~24시 기준
function timeToAngle(time: string): number {
  const decimal = timeToDecimal(time);
  // 0~23.x 시간을 1~24 기준으로 변환 (0시는 24시)
  const adjustedDecimal = decimal === 0 ? 24 : decimal;
  
  // 23시 이후 시간은 각도 계산을 조정하여 겹치지 않도록 함
  if (adjustedDecimal >= 23) {
    // 23시는 345도, 24시는 360도가 되도록 약간 조정
    return ((adjustedDecimal - 1) / 24) * 360 - 0.5;
  }
  // 1시~3시는 각도 계산을 조정하여 겹치지 않도록 함
  if (adjustedDecimal >= 1 && adjustedDecimal <= 3) {
    // 1시~3시 구간은 각도를 약간 조정
    return ((adjustedDecimal - 1) / 24) * 360 + 0.5;
  }
  return ((adjustedDecimal - 1) / 24) * 360;
}

// 랜덤 색상 생성 함수 (하얀색, 회색, 하늘색으로 제한)
function getRandomColor(): string {
  const colors = [
    'rgba(255, 255, 255, 0.6)', // 하얀색 (반투명)
    'rgba(235, 235, 245, 0.6)', // 연한 회색
    'rgba(215, 215, 225, 0.6)', // 중간 회색
    'rgba(235, 245, 255, 0.6)', // 연한 하늘색
    'rgba(215, 235, 255, 0.6)', // 중간 하늘색
    'rgba(185, 215, 255, 0.6)'  // 진한 하늘색
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 신규 색상 팔레트
const NEW_COLOR_PALETTE = [
  'rgba(255, 255, 255, 0.6)', // 하얀색 (반투명)
  'rgba(235, 235, 245, 0.6)', // 연한 회색
  'rgba(215, 215, 225, 0.6)', // 중간 회색
  'rgba(235, 245, 255, 0.6)', // 연한 하늘색
  'rgba(215, 235, 255, 0.6)', // 중간 하늘색
  'rgba(185, 215, 255, 0.6)'  // 진한 하늘색
];

export function CircularPlannerPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [currentSeconds, setCurrentSeconds] = useState('00');
  const [timeRange, setTimeRange] = useState({ start: 6, end: 22 });  // 기본 시간 범위: 6시~22시
  
  // 베트남 배경 이미지 배열
  const [backgroundImages] = useState([
    "https://images.unsplash.com/photo-1528127269322-539801943592?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", // 기존 이미지
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", // 하롱베이
    "https://images.unsplash.com/photo-1557750255-c76072a7aad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", // 호이안
    "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", // 호치민
    "https://images.unsplash.com/photo-1555921015-5532091f6026?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", // 하노이
    "https://images.unsplash.com/photo-1613072832507-d7fced2e3f76?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", // 닌빈
    "https://images.unsplash.com/photo-1583417406759-3144425a2e8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", // 베트남 시골
    "https://images.unsplash.com/photo-1470723710355-95304d8aece4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"  // 사파
  ]);
  
  // 현재 표시 중인 배경 이미지 인덱스
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  
  // 슬라이드 방향 (1: 오른쪽에서 왼쪽, -1: 왼쪽에서 오른쪽)
  const [slideDirection, setSlideDirection] = useState(1);
  
  // 이미지 전환 애니메이션 진행 중 여부
  const [isSliding, setIsSliding] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    const savedTimeSlots = localStorage.getItem('circularTimeSlots');
    if (savedTimeSlots) {
      let slots = JSON.parse(savedTimeSlots);
      
      // 기존 일정의 색상을 새로운 팔레트로 업데이트
      const updatedSlots = slots.map((slot: TimeSlot) => {
        // 기존 색상이 새로운 팔레트에 없으면 랜덤하게 새 색상 할당
        if (!NEW_COLOR_PALETTE.includes(slot.color)) {
          return {
            ...slot,
            color: NEW_COLOR_PALETTE[Math.floor(Math.random() * NEW_COLOR_PALETTE.length)]
          };
        }
        return slot;
      });
      
      setTimeSlots(updatedSlots);
    }

    // 저장된 시간 범위 불러오기
    const savedTimeRange = localStorage.getItem('timeRange');
    if (savedTimeRange) {
      setTimeRange(JSON.parse(savedTimeRange));
    }
  }, []);

  // 일정이 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('circularTimeSlots', JSON.stringify(timeSlots));
  }, [timeSlots]);

  // 시간 범위가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('timeRange', JSON.stringify(timeRange));
  }, [timeRange]);

  // 현재 시간 업데이트 및 알람 체크
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const currentTimeString = `${hours}:${minutes}`;
      setCurrentTime(currentTimeString);
      setCurrentSeconds(seconds);
      
      // 알람 체크
      timeSlots.forEach(slot => {
        if (
          slot.task &&
          !slot.completed &&
          !slot.notified && 
          !slot.alarmDisabled &&
          (currentTimeString === slot.startTime || 
           // 5분 전 알림 추가
           currentTimeString === getTimeBeforeMinutes(slot.startTime, 5))
        ) {
          playAlarm();
          showNotification(slot, currentTimeString === slot.startTime ? false : true);
          
          // 알람이 울렸음을 표시
          setTimeSlots(prev => 
            prev.map(item => 
              item.id === slot.id ? { ...item, notified: true } : item
            )
          );
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeSlots]);

  // 특정 시간으로부터 n분 전 시간을 반환하는 함수
  const getTimeBeforeMinutes = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    date.setMinutes(date.getMinutes() - minutes);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const playAlarm = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('알람 재생 실패:', error);
      });
    }
  };

  const showNotification = (slot: TimeSlot, isEarly: boolean = false) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`일정 알림 ${isEarly ? '(5분 전)' : ''}`, {
          body: `${slot.startTime} - ${slot.task}`,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`일정 알림 ${isEarly ? '(5분 전)' : ''}`, {
              body: `${slot.startTime} - ${slot.task}`,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  const addTask = () => {
    if (newTask.trim() === '' || newStartTime === '' || newEndTime === '') return;
    
    const actualEndTime = getActualTime(newEndTime);
    const isNextDay = isNextDayTime(newEndTime);
    
    // 시작 시간과 종료 시간 비교 (다음날 고려)
    if (!isNextDay && timeToDecimal(newStartTime) >= timeToDecimal(actualEndTime)) {
      alert('종료 시간은 시작 시간보다 나중이어야 합니다.');
      return;
    }
    
    const newTimeSlot: TimeSlot = {
      id: editingSlotId || uuidv4(),
      startTime: newStartTime,
      endTime: actualEndTime,
      task: newTask,
      completed: false,
      notified: false,
      alarmDisabled: false,
      color: getRandomColor(),
      isNextDay: isNextDay
    };
    
    // 겹치는 시간대 확인 및 제거
    setTimeSlots(prev => {
      // 겹치는 일정 확인 함수
      const isOverlapping = (slot: TimeSlot, newSlot: TimeSlot): boolean => {
        // 편집 중인 일정은 제외
        if (editingSlotId && slot.id === editingSlotId) return false;
        
        const slot1Start = timeToDecimal(slot.startTime);
        const slot1End = timeToDecimal(slot.endTime) + (slot.isNextDay ? 24 : 0);
        
        const slot2Start = timeToDecimal(newSlot.startTime);
        const slot2End = timeToDecimal(newSlot.endTime) + (newSlot.isNextDay ? 24 : 0);
        
        // 완전히 겹치는 경우를 더 정확하게 확인
        // (특히 시작/종료 시간이 완전히 일치하는 경우 처리)
        if (slot1Start === slot2Start && slot1End === slot2End) {
          return true;
        }
        
        // 겹치는 경우:
        // (1) slot1이 slot2 내에 포함되는 경우
        // (2) slot2가 slot1 내에 포함되는 경우
        // (3) slot1의 시작이 slot2 내에 있는 경우
        // (4) slot2의 시작이 slot1 내에 있는 경우
        return (
          (slot1Start >= slot2Start && slot1Start < slot2End) ||
          (slot1End > slot2Start && slot1End <= slot2End) ||
          (slot2Start >= slot1Start && slot2Start < slot1End) ||
          (slot2End > slot1Start && slot2End <= slot1End)
        );
      };
      
      // 겹치는 일정이 있는지 확인
      const overlappingSlots = prev.filter(slot => isOverlapping(slot, newTimeSlot));
      
      // 겹치는 일정이 있으면 알림
      if (overlappingSlots.length > 0) {
        const deletedTasks = overlappingSlots.map(slot => slot.task).join(', ');
        alert(`다음 일정과 시간이 겹치므로 자동으로 삭제됩니다: ${deletedTasks}`);
      }
      
      // 겹치지 않는 일정들만 유지하고 새 일정 추가
      const nonOverlappingSlots = prev.filter(slot => !isOverlapping(slot, newTimeSlot));
      
      if (editingSlotId) {
        // 기존 일정 수정인 경우
        return nonOverlappingSlots.map(slot => 
          slot.id === editingSlotId ? newTimeSlot : slot
        );
      } else {
        // 새 일정 추가인 경우
        return [...nonOverlappingSlots, newTimeSlot];
      }
    });
    
    closeModal();
  };

  const toggleTaskCompletion = (id: string) => {
    setTimeSlots(prev => 
      prev.map(slot => 
        slot.id === id ? { ...slot, completed: !slot.completed } : slot
      )
    );
  };

  const toggleAlarm = (id: string) => {
    setTimeSlots(prev => 
      prev.map(slot => 
        slot.id === id ? { ...slot, alarmDisabled: !slot.alarmDisabled } : slot
      )
    );
  };

  const deleteTask = (id: string) => {
    setTimeSlots(prev => prev.filter(slot => slot.id !== id));
  };

  const openAddTaskModal = () => {
    setNewTask('');
    // 시작 시간 기본값 설정
    setNewStartTime(decimalToTime(timeRange.start));
    // 종료 시간 기본값 설정 (시작 시간 + 1시간, 24시 넘어가지 않도록)
    const endTime = Math.min(timeRange.start + 1, 24);
    setNewEndTime(decimalToTime(endTime));
    setEditingSlotId(null);
    setModalType('add_task');
    setIsModalOpen(true);
  };

  const openEditTaskModal = (id: string) => {
    const slot = timeSlots.find(s => s.id === id);
    if (slot) {
      setNewTask(slot.task);
      setNewStartTime(slot.startTime);
      setNewEndTime(slot.endTime);
      setEditingSlotId(id);
      setModalType('add_task');
      setIsModalOpen(true);
    }
  };

  const openTimeRangeModal = () => {
    setModalType('set_time_range');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setEditingSlotId(null);
    setNewTask('');
    setNewStartTime('');
    setNewEndTime('');
  };

  const updateTimeRange = () => {
    // 시작 시간이 종료 시간보다 크거나 같은 경우
    if (timeRange.start >= timeRange.end) {
      alert('종료 시간은 시작 시간보다 커야 합니다.');
      return;
    }
    
    // 시간 범위가 너무 좁은 경우 (최소 3시간)
    if (timeRange.end - timeRange.start < 3) {
      alert('시간 범위는 최소 3시간 이상이어야 합니다.');
      return;
    }
    
    // 시간 범위 변경 적용
    localStorage.setItem('timeRange', JSON.stringify(timeRange));
    
    closeModal();
  };

  // 시간 옵션 생성 함수 (30분 간격, 1~24시 기준)
  const generateTimeOptions = (isForEndTime = false) => {
    const options = [];
    // 1시부터 24시까지 (0시는 24시로 표시)
    for (let hour = 1; hour <= 24; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      options.push(`${hourStr}:00`);
      if (hour < 24) { // 24:30은 없으므로 제외
        options.push(`${hourStr}:30`);
      }
    }
    
    // 종료 시간 선택일 경우 다음날 새벽 시간대 추가
    if (isForEndTime) {
      // 다음날 새벽 1시~6시 (30분 간격)
      for (let hour = 1; hour <= 6; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        options.push(`다음날 ${hourStr}:00`);
        options.push(`다음날 ${hourStr}:30`);
      }
    }
    
    return options;
  };

  // 모든 사용 가능한 시간 옵션 생성 (다음날 포함)
  const getAllTimeOptions = () => {
    return generateTimeOptions(true);
  };

  // 오늘/다음날 표시를 제외한 실제 시간 추출
  const getActualTime = (timeWithDay: string): string => {
    if (timeWithDay.startsWith('다음날 ')) {
      return timeWithDay.substring(4); // '다음날 ' 제거
    }
    return timeWithDay;
  };

  // 시간이 다음날인지 확인
  const isNextDayTime = (timeWithDay: string): boolean => {
    return timeWithDay.startsWith('다음날 ');
  };

  // CSS 스타일 추가 - 모달 내 시간 선택 드롭다운 스크롤을 위한 스타일
  useEffect(() => {
    // 스타일 태그 생성
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Nanum+Brush+Script&family=Nanum+Pen+Script&family=Nanum+Gothic:wght@400;700&display=swap');
      
      select {
        max-height: 200px !important;
      }
      
      .time-select-container {
        position: relative;
      }
      
      .time-select {
        appearance: auto;
        height: auto;
        max-height: 200px;
        overflow-y: auto !important;
      }
      
      .clock-title {
        font-family: 'Nanum Brush Script', 'Nanum Pen Script', cursive;
        font-weight: 400;
        font-size: 4rem;
        letter-spacing: 2px;
        background: linear-gradient(to right, #4facfe, #00f2fe, #0077ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: none !important;
      }
      
      .seconds-display {
        display: inline-block;
        min-width: 1.5rem;
        text-align: center;
      }
      
      .background-fade {
        transition: opacity 0.5s ease;
      }
      
      .bg-control-button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background-color: rgba(0, 0, 0, 0.3);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.3s;
        z-index: 10;
      }
      
      .bg-control-button:hover {
        opacity: 0.8;
      }
      
      .bg-prev {
        left: 20px;
      }
      
      .bg-next {
        right: 20px;
      }
      
      .bg-indicator {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 10;
      }
      
      .bg-indicator-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.5);
        transition: background-color 0.3s, transform 0.3s;
        cursor: pointer;
      }
      
      .bg-indicator-dot.active {
        background-color: white;
        transform: scale(1.2);
      }

      /* 배경 이미지 슬라이드 효과 */
      .bg-slider-container {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background-color: #000; /* 배경 기본 색상을 검정으로 설정하여 흰색 깜빡임 방지 */
      }

      .bg-slider {
        display: flex;
        height: 100%;
        width: 100%;
        position: relative;
        transition: transform 2.5s cubic-bezier(0.22, 1, 0.36, 1); /* 더 긴 전환 시간과 부드러운 이징 커브 */
      }

      .bg-slide {
        min-width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        position: absolute;
        top: 0;
        left: 0;
        will-change: transform, opacity; /* 성능 향상 */
        transition: opacity 2s ease-in-out; /* 페이드 인/아웃 효과도 부드럽게 */
      }

      .bg-slide-current {
        z-index: 2;
      }

      .bg-slide-next {
        z-index: 1;
      }
    `;
    document.head.appendChild(styleTag);
    
    // 컴포넌트 언마운트 시 스타일 태그 제거
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // 원의 각도에 따른 위치 계산 (중심점 기준)
  const getPositionFromAngle = (angle: number, radius: number) => {
    const radians = ((angle - 90) * Math.PI) / 180; // -90은 12시 방향에서 시작하기 위함
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;
    return { x, y };
  };

  // 현재 시간의 각도 계산 - 1~24시 기준
  const currentTimeAngle = (() => {
    const decimal = timeToDecimal(currentTime);
    // 0시는 24시로 처리
    const adjustedDecimal = decimal === 0 ? 24 : decimal;
    return ((adjustedDecimal - 1) / 24) * 360 - 90; // -90은 12시 방향에서 시작하기 위함
  })();

  // 시간대별 활동 라벨을 반환하는 함수
  const getActivityLabel = (hour: number): string => {
    if (hour >= 6 && hour < 8) return '기상/준비';
    if (hour >= 8 && hour < 10) return '아침 활동';
    if (hour >= 10 && hour < 12) return '공부 시간';
    if (hour >= 12 && hour < 14) return '점심/휴식';
    if (hour >= 14 && hour < 16) return '오후 활동';
    if (hour >= 16 && hour < 18) return '운동/놀이';
    if (hour >= 18 && hour < 20) return '저녁 시간';
    if (hour >= 20 && hour < 22) return '마무리';
    if (hour >= 22 || hour < 6) return '취침 시간';
    return '자유 시간';
  };

  // 배경 이미지 자동 전환 효과
  useEffect(() => {
    // 이미지를 순차적으로 전환하는 단순한 로직으로 변경
    const intervalId = setInterval(() => {
      // 다음 이미지로 이동 (항상 정방향 전환)
      setSlideDirection(1);
      setIsSliding(true);
      
      // 다음 이미지 인덱스 계산
      setCurrentBackgroundIndex(prevIndex => (prevIndex + 1) % backgroundImages.length);
      
      // 애니메이션이 완료된 후 슬라이딩 상태 해제
      setTimeout(() => {
        setIsSliding(false);
      }, 2600); // 트랜지션 완료 대기
      
    }, 8000); // 8초마다 이미지 전환
    
    return () => clearInterval(intervalId);
  }, [backgroundImages.length]); // isSliding 의존성 제거하여 더 안정적으로 작동

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 배경 이미지 슬라이더 */}
      <div className="bg-slider-container">
        <div 
          className="bg-slider"
          style={{ 
            transform: isSliding ? `translateX(-100%)` : 'translateX(0)', // 항상 왼쪽으로 슬라이드
          }}
        >
          {/* 현재 이미지 */}
          <div 
            className="bg-slide bg-slide-current"
            style={{ 
              backgroundImage: `url("${backgroundImages[currentBackgroundIndex]}")`,
              transform: 'translateX(0)',
              opacity: 1,
              filter: 'brightness(0.85)', // 약간 어둡게 하여 텍스트가 더 잘 보이도록
            }}
          ></div>
          
          {/* 다음 이미지 (항상 오른쪽에서 왼쪽으로 이동) */}
          <div 
            className="bg-slide bg-slide-next"
            style={{ 
              backgroundImage: `url("${backgroundImages[(currentBackgroundIndex + 1) % backgroundImages.length]}")`,
              transform: 'translateX(100%)', // 항상 오른쪽에 배치
              opacity: isSliding ? 1 : 0, // 슬라이딩 중에만 보이도록
              filter: 'brightness(0.85)', // 약간 어둡게 하여 텍스트가 더 잘 보이도록
            }}
          ></div>
        </div>
      </div>
      
      <div className="min-h-screen py-8 px-4 flex items-center justify-center relative z-10">
        <div className="w-full max-w-5xl mx-auto bg-transparent backdrop-blur-none rounded-xl overflow-hidden p-6">
          <div className="text-center mb-6">
            <h1 className="clock-title mb-3">갱생 Timetable</h1>
            <p className="text-white font-medium" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>{currentDate}</p>
            <p className="text-white text-md mt-1 font-medium" style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}>
              현재 시간: <span className="text-yellow-200">{currentTime}</span>
              <span className="text-yellow-200 ml-1">:</span>
              <span className="seconds-display text-yellow-200 animate-pulse">{currentSeconds}</span>
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            {/* 원형 타임라인 컨테이너 - 크게 보이도록 수정 */}
            <div className="w-full max-w-2xl h-[600px] relative mx-auto mb-8" ref={containerRef}>
              {/* 원형 타임라인 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* 원형 타임라인 SVG */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                    {/* 원형 배경 */}
                    <circle cx="50" cy="50" r="45" fill="white" fillOpacity="0.02" stroke="#e5e7eb" strokeWidth="0.5" />
                    
                    {/* 시간 마커 (시간별) */}
                    {Array.from({ length: 24 }).map((_, i) => {
                      // 1부터 24까지 시간 표시 (0시는 24시로 변경)
                      const displayHour = i + 1; // 1부터 24까지
                      
                      // 전체 360도에 균등하게 배치 (12시 방향이 시작점)
                      const angle = (i / 24) * 360 - 90;
                      
                      // 모든 시간 레이블에 동일한 반지름 적용
                      const labelRadius = 48; // 레이블 위치 반지름
                      
                      const labelX = 50 + labelRadius * Math.cos(angle * Math.PI / 180);
                      const labelY = 50 + labelRadius * Math.sin(angle * Math.PI / 180);
                      
                      // 특정 시간은 진한 회색으로 표시
                      const isHighlightedHour = [1, 2, 18, 19, 23, 24].includes(displayHour);
                      
                      return (
                        <g key={`hour-${displayHour}`}>
                          {/* 시간 레이블 */}
                          <text
                            x={labelX}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={isHighlightedHour ? "#64748b" : "#e5e7eb"}
                            fontSize="2.5"
                            fontWeight="500"
                          >
                            {displayHour}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* 일정별 원형 조각 */}
                    {timeSlots.map((slot, index) => {
                      // 시간을 1~24시 기준의 각도로 변환
                      const startAngle = timeToAngle(slot.startTime) - 90;
                      let endAngle = timeToAngle(slot.endTime) - 90;
                      
                      // 종료 시간이 다음날인 경우 각도 조정
                      if (slot.isNextDay) {
                        // 정확한 각도 계산을 위해 조정
                        endAngle = (timeToAngle(slot.endTime) + 360) - 90;
                      }
                      
                      const angleSize = endAngle - startAngle;
                      
                      // 시작 시간이 23시 이후이고, 종료 시간이 다음날인 경우 특별 처리
                      const is23toNextDay = timeToDecimal(slot.startTime) >= 23 && slot.isNextDay;
                      
                      // SVG 아크 계산
                      const radius = 45; // 원형 배경과 동일한 반지름
                      const startX = 50 + radius * Math.cos(startAngle * Math.PI / 180);
                      const startY = 50 + radius * Math.sin(startAngle * Math.PI / 180);
                      const endX = 50 + radius * Math.cos(endAngle * Math.PI / 180);
                      const endY = 50 + radius * Math.sin(endAngle * Math.PI / 180);
                      
                      // 텍스트 위치 계산 (조각의 중앙)
                      const midAngle = startAngle + angleSize / 2;
                      
                      // 특정 시간대(9:30-11:00)의 텍스트 위치 조정
                      const is930to1100 = (
                        (timeToDecimal(slot.startTime) >= 9.5 && timeToDecimal(slot.startTime) <= 9.6) && 
                        (timeToDecimal(slot.endTime) >= 11.0 && timeToDecimal(slot.endTime) <= 11.1)
                      );
                      
                      // 텍스트 위치 조정 (특정 시간대는 더 바깥쪽에 배치)
                      const textRadiusMultiplier = is930to1100 ? 0.85 : 0.7;
                      const textRadius = radius * textRadiusMultiplier;
                      const textX = 50 + textRadius * Math.cos(midAngle * Math.PI / 180);
                      const textY = 50 + textRadius * Math.sin(midAngle * Math.PI / 180);
                      
                      // 큰 조각일 경우에만 시간 표시
                      const showTime = angleSize > 10;
                      
                      // 시간 표시 위치도 조정 (특정 시간대는 더 안쪽에 배치)
                      const timeRadiusMultiplier = is930to1100 ? 0.35 : 0.4;
                      const timeX = 50 + (radius * timeRadiusMultiplier) * Math.cos(midAngle * Math.PI / 180);
                      const timeY = 50 + (radius * timeRadiusMultiplier) * Math.sin(midAngle * Math.PI / 180);
                      
                      return (
                        <g key={slot.id} onClick={() => openEditTaskModal(slot.id)} style={{ cursor: 'pointer' }}>
                          {/* 일정 섹션 - 투명도 높임 */}
                          <path
                            d={`M 50 50 L ${startX} ${startY} A ${radius} ${radius} 0 ${angleSize > 180 ? 1 : 0},1 ${endX} ${endY} Z`}
                            fill={slot.completed ? 'rgba(240, 240, 245, 0.3)' : slot.color}
                            fillOpacity={slot.completed ? 0.3 : (is23toNextDay ? 0.65 : 0.75)}
                            stroke="#a0aec0"
                            strokeWidth="0.5"
                            strokeOpacity="0.7"
                            className="transition-all hover:fill-opacity-90"
                          />
                          
                          {/* 텍스트 라벨 */}
                          {angleSize > 15 && (
                            <>
                              {/* 텍스트 외곽선 (배경에 더 잘 보이도록) */}
                              <text
                                x={textX}
                                y={textY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="none"
                                stroke="rgba(0,0,0,0.7)"
                                strokeWidth="0.6"
                                fontSize="2.4"
                                fontWeight={slot.completed ? '400' : '700'}
                                className={slot.completed ? 'line-through' : ''}
                              >
                                {slot.task}
                              </text>
                              
                              {/* 텍스트 본체 */}
                              <text
                                x={textX}
                                y={textY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={slot.completed ? '#d1d5db' : '#ffffff'}
                                fontSize="2.4"
                                fontWeight={slot.completed ? '400' : '700'}
                                style={{ textShadow: '0px 0px 3px rgba(0,0,0,0.7)' }}
                                className={slot.completed ? 'line-through' : ''}
                              >
                                {slot.task}
                              </text>
                            </>
                          )}
                          
                          {/* 시간 표시 (충분히 큰 조각일 때만) */}
                          {showTime && (
                            <>
                              {/* 시간 텍스트 외곽선 */}
                              <text
                                x={timeX}
                                y={timeY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="none"
                                stroke="rgba(0,0,0,0.7)"
                                strokeWidth="0.4"
                                fontSize="1.8"
                                fontWeight="400"
                              >
                                {slot.startTime}-{slot.isNextDay ? '다음날 ' : ''}{slot.endTime}
                              </text>
                              
                              {/* 시간 텍스트 본체 */}
                              <text
                                x={timeX}
                                y={timeY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={slot.completed ? '#d1d5db' : '#ffffff'}
                                fontSize="1.8"
                                fontWeight="400"
                                style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.7)' }}
                              >
                                {slot.startTime}-{slot.isNextDay ? '다음날 ' : ''}{slot.endTime}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}

                    {/* 현재 시간 표시기 - 세련된 디자인으로 수정 */}
                    {currentTimeAngle !== -1 && (
                      <>
                        {/* 시침 표시 - 중심에서 원의 끝까지 */}
                        <g className="time-hand">
                          {/* 시침 그림자 효과 */}
                          <line
                            x1="50"
                            y1="50"
                            x2={50 + 43 * Math.cos(currentTimeAngle * Math.PI / 180)}
                            y2={50 + 43 * Math.sin(currentTimeAngle * Math.PI / 180)}
                            stroke="rgba(0, 0, 0, 0.2)"
                            strokeWidth="1.0"
                            strokeLinecap="round"
                          />
                          
                          {/* 시침 본체 */}
                          <line
                            x1="50"
                            y1="50"
                            x2={50 + 42 * Math.cos(currentTimeAngle * Math.PI / 180)}
                            y2={50 + 42 * Math.sin(currentTimeAngle * Math.PI / 180)}
                            stroke="rgba(79, 172, 254, 0.7)"
                            strokeWidth="0.6"
                            strokeLinecap="round"
                          />
                          
                          {/* 시침 중심점 장식 */}
                          <circle
                            cx="50"
                            cy="50"
                            r="1.5"
                            fill="rgba(79, 172, 254, 0.7)"
                            stroke="rgba(255, 255, 255, 0.6)"
                            strokeWidth="0.3"
                          />
                          
                          {/* 시침 끝부분 화살표 */}
                          <polygon
                            points={`
                              ${50 + 41 * Math.cos(currentTimeAngle * Math.PI / 180)},${50 + 41 * Math.sin(currentTimeAngle * Math.PI / 180)}
                              ${50 + 44 * Math.cos((currentTimeAngle - 1) * Math.PI / 180)},${50 + 44 * Math.sin((currentTimeAngle - 1) * Math.PI / 180)}
                              ${50 + 45 * Math.cos(currentTimeAngle * Math.PI / 180)},${50 + 45 * Math.sin(currentTimeAngle * Math.PI / 180)}
                              ${50 + 44 * Math.cos((currentTimeAngle + 1) * Math.PI / 180)},${50 + 44 * Math.sin((currentTimeAngle + 1) * Math.PI / 180)}
                            `}
                            fill="rgba(79, 172, 254, 0.7)"
                            stroke="rgba(255, 255, 255, 0.4)"
                            strokeWidth="0.2"
                          />
                        </g>
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>
            
            {/* 버튼 섹션 - 중앙 정렬 */}
            <div className="flex justify-center space-x-6 mt-4">
              <button
                onClick={openAddTaskModal}
                className="bg-blue-500/80 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all flex items-center shadow-lg"
                style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)', fontWeight: '600', letterSpacing: '0.5px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                일정 추가
              </button>
              
              <button
                onClick={openTimeRangeModal}
                className="bg-cyan-500/80 text-white px-6 py-3 rounded-lg hover:bg-cyan-600 transition-all flex items-center shadow-lg"
                style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)', fontWeight: '600', letterSpacing: '0.5px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                시간 범위 설정
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-transparent" onClick={closeModal}></div>
          <div className="bg-white/95 rounded-xl p-8 z-10 w-11/12 max-w-md mx-auto shadow-2xl relative border border-blue-200">
            <button 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
              onClick={closeModal}
              aria-label="닫기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {modalType === 'add_task' && (
              <>
                <h2 className="text-2xl font-bold text-blue-800 mb-6">
                  {editingSlotId ? '일정 편집' : '새 일정 추가'}
                </h2>
                
                <div className="space-y-5">
                  <div>
                    <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
                      할 일
                    </label>
                    <input
                      id="task"
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="할 일을 입력하세요"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-2">
                        시작 시간
                      </label>
                      <div className="time-select-container relative">
                        <select
                          id="start-time"
                          value={newStartTime}
                          onChange={(e) => {
                            setNewStartTime(e.target.value);
                            // 종료 시간이 시작 시간보다 빠르면 시작 시간 + 1시간으로 설정
                            // (다음날 시간이 아닌 경우에만)
                            const endTimeWithoutDay = getActualTime(newEndTime);
                            if (!isNextDayTime(newEndTime) && timeToDecimal(e.target.value) >= timeToDecimal(endTimeWithoutDay)) {
                              const startDecimal = timeToDecimal(e.target.value);
                              const endDecimal = Math.min(startDecimal + 1, 24);
                              setNewEndTime(decimalToTime(endDecimal));
                            }
                          }}
                          className="time-select w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {generateTimeOptions().map((time, index) => (
                            <option key={`start-${index}`} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-2">
                        종료 시간
                      </label>
                      <div className="time-select-container relative">
                        <select
                          id="end-time"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="time-select w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {getAllTimeOptions()
                            .filter(time => {
                              // 다음날 시간은 항상 선택 가능
                              if (isNextDayTime(time)) return true;
                              // 오늘 시간은 시작 시간보다 나중이어야 함
                              return timeToDecimal(time) > timeToDecimal(newStartTime);
                            })
                            .map((time, index) => (
                              <option key={`end-${index}`} value={time}>
                                {time}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {editingSlotId && (
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        id="toggle-alarm"
                        checked={!timeSlots.find(s => s.id === editingSlotId)?.alarmDisabled}
                        onChange={() => {
                          if (editingSlotId) {
                            toggleAlarm(editingSlotId);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                      />
                      <label htmlFor="toggle-alarm" className="text-sm text-gray-700">
                        알람 활성화 (시작 시간 및 5분 전)
                      </label>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 flex space-x-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    취소
                  </button>
                  <button
                    onClick={addTask}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {editingSlotId ? '수정' : '추가'}
                  </button>
                </div>
              </>
            )}
            
            {modalType === 'set_time_range' && (
              <>
                <h2 className="text-2xl font-bold text-blue-800 mb-6">시간 범위 설정</h2>
                
                <div className="space-y-5">
                  <p className="text-sm text-gray-600">
                    원형 타임라인에 표시할 시간 범위를 설정하세요. 최소 3시간 이상이어야 합니다.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start-hour" className="block text-sm font-medium text-gray-700 mb-2">
                        시작 시간
                      </label>
                      <div className="time-select-container relative">
                        <select
                          id="start-hour"
                          value={timeRange.start}
                          onChange={(e) => setTimeRange(prev => ({ ...prev, start: Number(e.target.value) }))}
                          className="time-select w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {/* 1시부터 24시까지 옵션 표시 */}
                          {Array.from({ length: 24 }).map((_, i) => {
                            const hour = i + 1; // 1부터 24까지
                            return (
                              <option key={`start-hour-${hour}`} value={hour}>
                                {hour}:00
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="end-hour" className="block text-sm font-medium text-gray-700 mb-2">
                        종료 시간
                      </label>
                      <div className="time-select-container relative">
                        <select
                          id="end-hour"
                          value={timeRange.end}
                          onChange={(e) => setTimeRange(prev => ({ ...prev, end: Number(e.target.value) }))}
                          className="time-select w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {/* 1시부터 24시까지 옵션 표시 (시작 시간 이후만) */}
                          {Array.from({ length: 24 }).map((_, i) => {
                            const hour = i + 1; // 1부터 24까지
                            return (
                              <option 
                                key={`end-hour-${hour}`} 
                                value={hour}
                                disabled={hour <= timeRange.start} // 시작 시간보다 이전이면 비활성화
                              >
                                {hour}:00
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex space-x-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    취소
                  </button>
                  <button
                    onClick={updateTimeRange}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    적용
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* 알람 소리 */}
      <audio ref={audioRef} preload="auto">
        <source src="https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3" type="audio/mpeg" />
        알람 소리를 지원하지 않는 브라우저입니다.
      </audio>
    </div>
  );
} 
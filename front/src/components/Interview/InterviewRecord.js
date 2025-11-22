import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewRecord.css';
import interviewerImg from '../../assets/interviewer.png';
import bgImg from '../../assets/background.png';
// import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

function InterviewRecord() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 음성 인식
  const volumeRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 질문 리스트 (임시 하드코딩 → 나중에 백엔드 연동)
  const QUESTIONS = [
    { id: 1, title: '다른 사람이 생각하는 자신의 장점과 단점을 말해주세요.' },
    { id: 2, title: '갈등을 해결했던 경험을 말해주세요.' },
    { id: 3, title: '본인이 맡았던 역할 중 가장 어려웠던 점은?' },
  ];

  const hiddenVideoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(5); // timer 시간 설정
  const [recording, setRecording] = useState(false);

  // 팝업 상태
  const [showPopup, setShowPopup] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);

  // 질문 팝업 3초간 표시 후 인터뷰 시작
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(false); // 팝업 숨기기
      startInterviewProcess(); // 스트림 연결 + 녹화 시작
    }, 3000);

    return () => clearTimeout(timer);
  }, [questionIndex]);

  // 오디오 분석 함수
  const createAudioAnalyzer = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.1;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.onaudioprocess = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const isNowSpeaking = volume > 20; // threshold 조절 가능

      setIsSpeaking(isNowSpeaking);
    };
  };

  // 카메라 + 녹화 시작
  const startInterviewProcess = async () => {
    try {
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = stream;

        hiddenVideoRef.current.onloadedmetadata = () => {
          hiddenVideoRef.current.play();
        };
        // 오디오 분석 시작
        createAudioAnalyzer(stream);
      }
      // 녹화 시작
      startRecording(stream);
    } catch (err) {
      console.error(err);
      setError('카메라/마이크 연결에 실패했습니다. 권한을 확인해주세요.');
    }
  };

  // 영상 업로드 함수
  const uploadVideoToServer = async (blob, questionId) => {
    try {
      const formData = new FormData();
      formData.append('video', blob, `question_${questionId}.webm`);
      formData.append('interviewId', id);
      formData.append('questionNumber', questionId);

      const res = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('업로드 실패');

      console.log('업로드 성공');
    } catch (err) {
      console.error('업로드 에러:', err);
    }
  };

  // ffmpeg 인스턴스 준비
  // const ffmpeg = createFFmpeg({
  //   log: true,
  //   corePath: process.env.PUBLIC_URL + '/ffmpeg-core.js',
  // });

  // 페이지 로드시 ffmpeg 먼저 load
  // useEffect(() => {
  //   const loadFFmpeg = async () => {
  //     if (!ffmpeg.isLoaded()) {
  //       console.log('FFmpeg Loading...');
  //       await ffmpeg.load();
  //       console.log('FFmpeg Loaded!');
  //     }
  //   };
  //   loadFFmpeg();
  // }, []);

  // mm:ss 포맷
  // const formatTime = (sec) => {
  //   const m = String(Math.floor(sec / 60)).padStart(2, '0');
  //   const s = String(sec % 60).padStart(2, '0');
  //   return `${m}:${s}`;
  // };

  // 녹화 시작 (일단 webm 형식으로 저장)
  const startRecording = (stream) => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { type: 'video/webm' });

    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      console.log('Saved webm size:', blob.size);

      // 서버 업로드
      await uploadVideoToServer(blob, questionIndex + 1);

      // webm → mp4 저장 형식 변환
      // const mp4Blob = await convertToMP4(webmBlob);

      // 안정적인 다운로드 트리거 방식

      // const url = URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.style.display = 'none';
      // a.href = url;
      // a.download = `interview_${questionIndex + 1}.webm`; // 파일명

      // document.body.appendChild(a);
      // a.click();
      // document.body.removeChild(a);

      // setTimeout(() => URL.revokeObjectURL(url), 1000);

      // 다음 질문으로 이동
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview_${questionIndex + 1}.webm`; // 파일명

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      handleNextQuestion();
    };

    recorder.start();
    setRecording(true);
  };

  // webm → mp4 변환 함수
  /*
  const convertToMP4 = async (blob) => {
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }

    // webm 파일 저장
    await ffmpeg.writeFile('input.webm', await fetchFile(blob));

    // 변환 실행
    await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);

    // 변환된 파일 읽기
    const data = await ffmpeg.readFile('output.mp4');

    // 변환 결과 크기 출력
    console.log('output.mp4 size:', data.length);

    return new Blob([data.buffer], { type: 'video/mp4' });
  }; */

  // 녹화 종료
  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  // 다음 질문으로 이동
  const handleNextQuestion = () => {
    const next = questionIndex + 1;

    if (next >= QUESTIONS.length) {
      // 모든 질문 끝 → 총평 페이지로 이동
      navigate(`/interview/${id}/summary`);
      return;
    }
    // 다음 질문 진행
    setQuestionIndex(next);
    setTimeLeft(5);
    setShowPopup(true);
  };

  // 타이머 동작
  useEffect(() => {
    if (!recording) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          stopRecording(); // 시간 초과시 자동 종료
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [recording]);

  return (
    <div className="record-page" style={{ backgroundImage: `url(${bgImg})` }}>
      {/* 질문 팝업 */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h2>{questionIndex + 1}번째 질문</h2>
            <p>{QUESTIONS[questionIndex].title}</p>
          </div>
        </div>
      )}
      {/* 웹캠 hidden */}
      <video ref={hiddenVideoRef} autoPlay playsInline className="hidden-video" />

      {/* 화면에 보이는 면접관 image */}
      {!showPopup && (
        <>
          <div className={`record-box ${isSpeaking ? 'speaking' : ''}`}>
            <img src={interviewerImg} alt="interviewer" className="interview-image" />

            {recording && <div className="record-timer timer-top-right">남은 시간: {timeLeft}초</div>}
          </div>

          <p className="record-guide">면접관을 쳐다보며 말씀해주세요.</p>
        </>
      )}

      {error && <div className="record-error">{error}</div>}
    </div>
  );
}

export default InterviewRecord;

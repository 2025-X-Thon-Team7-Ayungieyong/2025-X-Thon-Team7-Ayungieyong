import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewRecord.css';
import interviewerImg from '../../assets/interviewer.png';
import bgImg from '../../assets/background.png';
// import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

function InterviewRecord() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isSpeaking, setIsSpeaking] = useState(false);

  // 질문 리스트
  const QUESTIONS = [
    {
      id: 1,
      title:
        '\n프론트엔드 중심의 경험이 많은데,\n\n백엔드 역량은 어떤 식으로 보완해 왔는지,\n그리고 입사 후 1년 안에 어떤 수준의 백엔드 개발자로 성장할 계획인지 설명해주세요.',
    },
    {
      id: 2,
      title:
        '\n대규모 트래픽 환경을 가정할 때,\n로그인, 채팅, 푸시 같은 핵심 API를 어떻게 설계하실 건가요?\n\n성능과 안정성을 위해 어떤 아키텍처적 고려를 하실지 구체적으로 말씀해주세요.',
    },
    {
      id: 3,
      title:
        '\n이미 운영 중인 레거시 백엔드를 점진적으로 개선해야 한다면,\n어떤 기준으로 우선순위를 정하고, 어떻게 협업 구조를 설계해 개선을 추진할지\n\n본인의 실제 경험을 바탕으로 설명해 주세요.',
    },
  ];

  const hiddenVideoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  // const streamRef = useRef(null);

  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(30); // timer 시간 설정
  const [recording, setRecording] = useState(false);

  // 팝업 상태
  const [showPopup, setShowPopup] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);

  const audioRef = useRef(null);
  const isPlayingRef = useRef(false); // 중복 재생 방지
  const hasPlayedRef = useRef(false); // 팝업당 1회 재생
  const firstRender = useRef(true);

  const playTTS = async (text) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    // 이전 오디오 종료(초기화는 절대 금지)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      const res = await fetch('https://twilight-wind-0c08.eun0110.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const { audioContent } = await res.json();

      const audio = new Audio('data:audio/mp3;base64,' + audioContent);
      audioRef.current = audio;

      return new Promise((resolve) => {
        audio.onended = () => {
          isPlayingRef.current = false;
          resolve();
        };
        audio.play().catch((err) => {
          console.error('play error:', err);
          isPlayingRef.current = false;
          resolve();
        });
      });
    } catch (err) {
      console.error(err);
      isPlayingRef.current = false;
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    hasPlayedRef.current = false;
  }, [questionIndex]);

  useEffect(() => {
    // 팝업 켜져 있고, 이번 질문에서 아직 TTS 안 했을 때만 실행
    if (showPopup && !hasPlayedRef.current) {
      hasPlayedRef.current = true;

      (async () => {
        await playTTS(QUESTIONS[questionIndex].title);

        // TTS 끝 → 팝업 닫고 녹화 시작
        setShowPopup(false);
        startInterviewProcess();
      })();
    }
  }, [showPopup, questionIndex]);

  // 오디오 분석 함수
  const createAudioAnalyzer = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    // analyser.smoothingTimeConstant = 0.1;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.onaudioprocess = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
      // const isNowSpeaking = volume > 20; // threshold 조절 가능

      // setIsSpeaking(isNowSpeaking);
      setIsSpeaking(volume > 20);
    };
  };

  // 녹화 시작
  const startInterviewProcess = async () => {
    try {
      // setError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // streamRef.current = stream;

      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = stream;

        // hiddenVideoRef.current.onloadedmetadata = () => {
        hiddenVideoRef.current.play();
        // };
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
  // const uploadVideoToServer = async (blob, questionId) => {
  //   try {
  //     const formData = new FormData();
  //     // formData.append('video', blob, `question_${questionId}.webm`);
  //     const file = new File([blob], `question_${questionId}.webm`, {
  //       type: 'video/webm',
  //     });

  //     formData.append('video', file);
  //     formData.append('interviewId', id);
  //     formData.append('questionId', questionId);

  //     const res = await fetch('/api/video/upload', {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     if (!res.ok) throw new Error('업로드 실패');

  //     console.log('업로드 성공');
  //   } catch (err) {
  //     console.error('업로드 에러:', err);
  //   }
  // };

  // 서버에 영상 업로드 대신 sessionStorage에 저장 (프론트에서 임시 처리)
  const saveVideoLocally = (blob, questionId) => {
    const url = URL.createObjectURL(blob);
    sessionStorage.setItem(`video_${questionId}`, url);
    console.log(`Saved blob URL to sessionStorage: video_${questionId}`);
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
      // await uploadVideoToServer(blob, questionIndex + 1);

      // 서버 X, sessionStorage 저장
      saveVideoLocally(blob, questionIndex + 1);

      handleNextQuestion();
    };

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
    //   const url = URL.createObjectURL(blob);
    //   const a = document.createElement('a');
    //   a.style.display = 'none';
    //   a.href = url;
    //   a.download = `interview_${questionIndex + 1}.webm`; // 파일명

    //   document.body.appendChild(a);
    //   a.click();
    //   document.body.removeChild(a);

    //   setTimeout(() => URL.revokeObjectURL(url), 1000);

    //   handleNextQuestion();
    // };

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
    setTimeLeft(30);
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
            <p style={{ whiteSpace: 'pre-line' }}>{QUESTIONS[questionIndex].title}</p>
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

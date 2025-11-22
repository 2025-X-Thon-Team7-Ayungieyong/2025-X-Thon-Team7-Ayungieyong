/**
 * 영상 분석 오케스트레이터
 * - AI 에이전트에 표정/음성 분석 위임
 * - 에이전트 미구현 시 명확한 에러 처리
 */
class AnalysisService {
  /**
   * 비디오 분석
   * @param {Object} video - 비디오 정보
   * @returns {Promise<{expression: Object, voice: Object}>}
   */
  async analyze(video) {
    try {
      // AI 에이전트 로드 시도
      const aiAgents = require("../ai-agents");
      const { expressionDetectorAgent, voiceDetectorAgent } = aiAgents;

      // 에이전트 존재 및 함수 확인
      if (!expressionDetectorAgent?.analyze || !voiceDetectorAgent?.analyze) {
        throw new Error("AI agent not implemented");
      }

      // 표정 분석과 음성 분석을 병렬로 실행
      const [expression, voice] = await Promise.all([
        expressionDetectorAgent.analyze(video.video_path),
        voiceDetectorAgent.analyze(video.video_path),
      ]);

      return {
        expression,
        voice,
      };
    } catch (error) {
      // AI 에이전트 미구현 에러
      if (
        error.message.includes("not implemented") ||
        error.code === "MODULE_NOT_FOUND"
      ) {
        throw new Error(
          "영상 분석 AI 기능이 아직 구현되지 않았습니다. AI 담당자에게 문의하세요."
        );
      }

      // 기타 에러
      console.error("Analysis error:", error);
      throw new Error("영상 분석 중 오류가 발생했습니다.");
    }
  }
}

module.exports = new AnalysisService();

import { fetchChatMessages } from '../api/chat'

/** 이력을 다시 보는 간격 */
const INTERVAL_MS = 5_000
/** 여기까지 안 오면 그만 기다린다 */
const LIMIT_MS = 180_000
/** 이력 조회가 내리 이만큼 실패하면 서버가 내려간 것으로 본다 */
const FAILURE_LIMIT = 3

/**
 * 시간 제한을 넘긴 질문의 답을 대화 이력에서 기다린다.
 *
 * <p>화면이 요청을 끊어도 서버는 답을 만들어 이력에 남긴다. 그 사이를 실패로 단정하면 사용자가 같은 질문을
 * 다시 던지고 모델이 한 번 더 돈다.
 *
 * <p>서버는 질문과 답을 한 쌍으로 저장한다. 그래서 이력 끝이 「내 질문 → 답변」이면 그 답이 이 질문의 것이다.
 *
 * @param alive 새 대화 등으로 이 기다림이 쓸모없어졌는지 묻는다
 * @returns 도착한 답변, 끝내 오지 않으면 null
 */
export async function waitForAnswer(question: string, alive: () => boolean): Promise<string | null> {
  const until = Date.now() + LIMIT_MS
  let failures = 0
  while (Date.now() < until) {
    // 남은 시간보다 오래 자지 않는다. 제한 직전에 잠들면 제한을 넘긴 뒤에 조회가 나간다
    await sleep(Math.min(INTERVAL_MS, until - Date.now()))
    if (!alive() || Date.now() >= until) return null
    const found = await answerFor(question)
    if (found.error) {
      failures += 1
      if (failures >= FAILURE_LIMIT) return null
      continue
    }
    failures = 0
    if (found.answer !== null) return Date.now() < until ? found.answer : null
  }
  return null
}

/**
 * 이력 끝에 이 질문의 답이 붙었는지 본다.
 *
 * <p>조회가 한 번 실패한 것은 기다림을 끝낼 이유가 아니다. 다만 내리 실패하면 서버가 내려간 것이므로
 * 부르는 쪽이 그것을 가릴 수 있게 실패인지 아닌지를 함께 돌려준다.
 */
async function answerFor(question: string): Promise<{ answer: string | null; error: boolean }> {
  try {
    const messages = await fetchChatMessages()
    const answer = messages.at(-1)
    const asked = messages.at(-2)
    if (answer?.role !== 'assistant' || asked?.role !== 'user' || asked.text !== question) {
      return { answer: null, error: false }
    }
    return { answer: answer.text, error: false }
  } catch {
    return { answer: null, error: true }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

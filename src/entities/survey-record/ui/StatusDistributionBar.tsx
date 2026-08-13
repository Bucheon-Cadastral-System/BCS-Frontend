import { SURVEY_STATUS_DOT, SURVEY_STATUS_LABEL, SURVEY_STATUS_ORDER } from '../model/status'
import type { SurveyStatus } from '../model/status'

/**
 * 조사 상태 분포 막대 — 갈래마다 개수만큼 폭을 나눠 가진다.
 *
 * <p>한 색으로 채운 진행률 막대를 대신한다. 채워진 길이는 그대로 조사한 만큼이라 진행률로 읽히면서,
 * 그 안에서 무엇이 정상이고 무엇이 망실인지까지 한 줄로 드러난다.
 *
 * <p>미조사는 칠하지 않고 바탕(track) 색으로 남긴다. 아직 아무 일도 일어나지 않은 갈래라 칠하지 않는 편이
 * 뜻에 맞고, 그러면 색이 든 만큼이 곧 조사한 만큼이 된다.
 *
 * <p>색은 지도 마커·목록 마크와 같은 값을 쓴다. 폭은 개수에 따라 정해지는 값이라 클래스로 적을 수 없어
 * 인라인으로 준다. 색만으로 뜻을 전하지 않도록 갈래와 개수를 이름으로도 실어 둔다.
 *
 * <p>판의 프로젝트 상세와 대화 판의 조사 현황 카드가 함께 쓴다. 같은 사실을 두 화면이 다르게 그리면
 * 사용자가 둘을 견주며 어느 쪽이 맞는지 의심하게 되므로, 갈래를 아는 자리에서는 늘 이 막대를 세운다.
 */
export function StatusDistributionBar(props: { countByStatus: Record<SurveyStatus, number> }) {
  const total = SURVEY_STATUS_ORDER.reduce((sum, status) => sum + props.countByStatus[status], 0)
  const label = SURVEY_STATUS_ORDER.map(
    (status) => `${SURVEY_STATUS_LABEL[status]} ${props.countByStatus[status]}`,
  ).join(', ')

  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-track" role="img" aria-label={label}>
      {total === 0
        ? null
        : SURVEY_STATUS_ORDER.map((status) =>
            props.countByStatus[status] === 0 ? null : (
              <span
                key={status}
                style={{ flexGrow: props.countByStatus[status] }}
                className={`h-full transition-[flex-grow] duration-500 ease-out ${
                  status === 'todo' ? 'bg-track' : SURVEY_STATUS_DOT[status]
                }`}
              />
            ),
          )}
    </div>
  )
}

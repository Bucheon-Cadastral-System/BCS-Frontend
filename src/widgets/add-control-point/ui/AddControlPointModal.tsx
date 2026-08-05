import { useEffect, useEffectEvent, useState } from 'react'
import { POINT_TYPES } from '@/entities/control-point'
import type { PointType } from '@/entities/control-point'
import { TM_ORIGINS } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'
import { MODAL_CANCEL_BTN, MODAL_DANGER_BTN, MODAL_INPUT, MODAL_SELECT, MODAL_SUBMIT_BTN, Modal, ModalField } from '@/shared/ui/Modal'
import { FormNotice } from '@/shared/ui/FormNotice'
import { useFormNotice } from '@/shared/lib/useFormNotice'

export interface AddControlPointValues {
  pointNo: string
  name: string
  type: PointType
  /** 성과 좌표(권위값) — 측량 관례상 X=북(northing), Y=동(easting). 경위도는 서버가 여기서 파생한다 */
  northing: number
  easting: number
  tmEpsg: TmEpsg
}

/**
 * 기준점 한 점 입력 — 성과 좌표(TM)가 권위값이라 사용자가 직접 입력하고, 경위도는 서버가 그 값에서 파생한다.
 * 좌표를 손에 들고 있지 않을 때를 위해 '지도에서 위치 찍기'로 시작값을 채울 수 있다(찍은 값은 시작값일 뿐 실제 성과가 아니다).
 * 여러 점을 파일로 넣는 등록은 파일 등록 창이 맡는다 — 이 창은 파일을 받지 않는다.
 */
export function AddControlPointModal(props: {
  defaultType: PointType
  defaultEpsg: TmEpsg
  /**
   * 지도에서 찍어 온 시작값 — 값이 새로 오면 좌표 칸을 채운다(입력하던 다른 값은 유지).
   * 숫자만으로는 어느 원점 기준인지 알 수 없으므로 변환에 쓴 원점을 함께 받아 같이 맞춘다.
   */
  picked: { northing: number; easting: number; epsg: TmEpsg } | null
  /** 같은 이름·종류의 기준점 — 있으면 등록이 임포트 규칙대로 그 점을 갱신하므로, 입력 중에 미리 알린다 */
  existingOf: (name: string, type: PointType) => { pointNo: string } | null
  /** 지도 클릭을 기다리는 중 — 이때 모달은 숨고 지도만 보인다 */
  picking: boolean
  onPick: () => void
  submitting: boolean
  onSubmit: (values: AddControlPointValues) => void
  onCancel: () => void
}) {
  const [pointNo, setPointNo] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<PointType>(props.defaultType)
  const [tmEpsg, setTmEpsg] = useState<TmEpsg>(props.defaultEpsg)
  const [northing, setNorthing] = useState('')
  const [easting, setEasting] = useState('')
  const form = useFormNotice()

  // 지도에서 찍어 오면 좌표만 갱신 — 모달은 마운트를 유지하므로 관리번호·이름 등 입력값은 그대로 남는다
  const picked = props.picked
  const clearNotice = useEffectEvent(() => form.clear())
  useEffect(() => {
    if (!picked) return
    // 값이 코드로 바뀌면 입력 이벤트가 나지 않아 문구가 저절로 거두어지지 않는다
    clearNotice()
    setNorthing(picked.northing.toFixed(2))
    setEasting(picked.easting.toFixed(2))
    setTmEpsg(picked.epsg) // 좌표와 원점이 어긋나면 저장되는 경위도가 찍은 위치와 달라진다
  }, [picked])

  const n = Number(northing)
  const e = Number(easting)
  // 빈 문자열·공백은 Number()가 0으로 바꾸므로, 값이 비면 좌표 없음으로 본다
  const coordsValid = northing.trim() !== '' && easting.trim() !== '' && Number.isFinite(n) && Number.isFinite(e)
  // 같은 이름·종류의 점 — 있으면 이 등록은 새 점이 아니라 그 점의 갱신이 된다(임포트와 같은 규칙)
  const existing = name.trim() === '' ? null : props.existingOf(name.trim(), type)

  function submit() {
    if (props.submitting) return
    // 못 채운 칸은 창 안에서 알린다 — 브라우저 기본 말풍선은 우리 규격 밖에서 그려진다
    if (!form.validate()) return
    if (!coordsValid) {
      form.fail('좌표를 숫자로 입력해 주세요.')
      return
    }
    props.onSubmit({
      pointNo: pointNo.trim(),
      name: name.trim(),
      type,
      northing: n,
      easting: e,
      tmEpsg,
    })
  }

  return (
    <Modal
      title="기준점 추가"
      busy={props.submitting}
      hidden={props.picking}
      onClose={props.onCancel}
      onSubmit={submit}
      formRef={form.formRef}
      footer={
        <>
          <button type="button" className={MODAL_DANGER_BTN} onClick={props.onCancel} disabled={props.submitting}>
            취소
          </button>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <FormNotice message={form.notice} />
            <button type="submit" className={MODAL_SUBMIT_BTN} disabled={props.submitting}>
              {props.submitting ? '등록 중…' : '등록'}
            </button>
          </div>
        </>
      }
    >
      <ModalField label="관리번호" required>
        <input className={MODAL_INPUT} value={pointNo} onChange={(ev) => setPointNo(ev.target.value)} placeholder="예: 41192D000012345" required />
      </ModalField>

      <ModalField label="기준점명" required>
        <input className={MODAL_INPUT} value={name} onChange={(ev) => setName(ev.target.value)} placeholder="예: 1234공" required />
        {/* 막지 않는다 — 성과 정정이 곧 이 흐름이라, 무엇이 벌어지는지만 미리 말한다 */}
        {existing !== null && (
          <p className="mt-1.5 break-keep text-[11px] leading-[1.5] wrap-anywhere text-amber">
            같은 이름·종류의 기준점이 이미 있습니다(관리번호 {existing.pointNo}) — 등록하면 그 점의 성과가 갱신됩니다.
          </p>
        )}
      </ModalField>

      <ModalField label="종류">
        <select className={MODAL_SELECT} value={type} onChange={(ev) => setType(ev.target.value as PointType)}>
          {POINT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </ModalField>

      <ModalField label="원점">
        <select className={MODAL_SELECT} value={tmEpsg} onChange={(ev) => setTmEpsg(ev.target.value as TmEpsg)}>
          {TM_ORIGINS.map((o) => (
            <option key={o.epsg} value={o.epsg}>
              {o.label} ({o.epsg})
            </option>
          ))}
        </select>
      </ModalField>

      <div className="grid grid-cols-2 gap-2">
        <ModalField label="X 좌표 (북, m)" required>
          <input className={MODAL_INPUT} value={northing} onChange={(ev) => setNorthing(ev.target.value)} inputMode="decimal" placeholder="예: 545000.00" required />
        </ModalField>
        <ModalField label="Y 좌표 (동, m)" required>
          <input className={MODAL_INPUT} value={easting} onChange={(ev) => setEasting(ev.target.value)} inputMode="decimal" placeholder="예: 181000.00" required />
        </ModalField>
      </div>

      <button
        type="button"
        onClick={props.onPick}
        className={`${MODAL_CANCEL_BTN} w-full`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2" />
        </svg>
        지도에서 위치 찍기
      </button>
    </Modal>
  )
}
